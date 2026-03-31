# Flow Around Obstacle

**Slug:** `flow-around-obstacle`
**Category:** Advanced
**Difficulty:** Advanced
**Source:** `src/islands/demos/FlowAroundObstacle.svelte` / `src/pages/demos/flow-around-obstacle.astro`

---

## Overview

This demo shows text flowing around a draggable obstacle -- an ellipse or rectangle -- in real time. The obstacle can be dragged to any position within the text area, and an auto-orbit mode drives it along a continuous figure-8 path so every frame triggers a full relayout. Lines that are displaced by the obstacle are highlighted in the accent color, making the effect immediately visible.

This matters because CSS `shape-outside` only works with floats and is limited to simple, static shapes at fixed positions. Pretext's `layoutNextLine()` gives you programmatic per-line width control, meaning you can flow text around any shape, at any position, with any animation -- something that is impractical or impossible with CSS alone. The demo proves this by running full relayout at 60fps while an obstacle follows a complex animated path.

---

## Pretext APIs Used

| Function | Import | Purpose |
|---|---|---|
| `prepareWithSegments(text, font)` | `@chenglou/pretext` via `src/lib/pretext` | One-time text analysis with segment data; returns a `PreparedTextWithSegments` handle |
| `layoutNextLine(prepared, cursor, maxWidth)` | `@chenglou/pretext` via `src/lib/pretext` | Lays out one line at a time with a custom width, returns `LayoutLine` or `null` when text is exhausted |
| `buildFont(size)` | `src/lib/pretext` | Helper that builds a CSS font string like `"16px Inter, sans-serif"` |

**Types used:** `LayoutCursor` (tracks position in the prepared text between successive `layoutNextLine` calls)

**Data used:** `SAMPLE_TEXTS.long` -- a longer sample paragraph imported from the pretext helper module, used as the default text content.

---

## How It Works

### Step 1: Prepare the text

On every recomputation, `buildFont(fontSize)` constructs the CSS font string, then `prepareWithSegments(text, font)` performs the full Unicode segmentation, word boundary detection, and glyph measurement pass. The result is a `PreparedTextWithSegments` handle that encodes everything needed for layout.

### Step 2: Compute available width per line

The `getAvailableWidth(y, lineHeight)` function determines how much horizontal space is available at a given vertical position. It receives the y-coordinate and line height, then checks whether the line overlaps the obstacle (with a 14px padding buffer).

**For elliptical obstacles:**
1. Compute the obstacle's center (`cx`, `cy`) and padded radii (`rx`, `ry`).
2. Find the vertical midpoint of the line.
3. Compute `dy` = normalized vertical distance from the line midpoint to the obstacle center.
4. If `|dy| >= 1`, the line is outside the ellipse -- return full container width.
5. Otherwise, solve the ellipse equation: `dx = rx * sqrt(1 - dy^2)` to find the horizontal extent of blockage.
6. Compute `left = cx - dx` and `right = cx + dx`.
7. If the obstacle is near the left edge (left <= 60px), return the right-side region. Otherwise, return the left-side region.

**For rectangular obstacles:**
1. Simple axis-aligned bounding box (AABB) check with padding.
2. If the obstacle's left edge is near the container edge (left <= 60px), text goes to the right of the obstacle. Otherwise, text uses the left side.

### Step 3: Layout loop

The `computeFlow()` function iterates line by line:

1. Initialize cursor at `{ segmentIndex: 0, graphemeIndex: 0 }`.
2. Start at `y = 0`.
3. For each iteration (up to 500 safety limit):
   a. Call `getAvailableWidth(y, lineHeight)` to get `{ x, maxWidth }`.
   b. If `maxWidth < 20`, skip this line position (advance `y` by `lineHeight`).
   c. Call `layoutNextLine(prepared, cursor, maxWidth)`.
   d. If `null` is returned, all text has been laid out -- exit.
   e. Determine if the line is displaced (`maxWidth < containerWidth - 10`).
   f. Store the line with its text content, x offset, y position, computed width, and displaced flag.
   g. Advance cursor to `line.end` and `y` by `lineHeight`.

### Step 4: Figure-8 orbit animation

When orbit mode is active, `startOrbit()` launches a `requestAnimationFrame` loop:
- Compute orbit center as the middle of the container.
- On each frame, increment `orbitAngle` by 0.012.
- `obsX = centerX + sin(orbitAngle) * radiusX` (horizontal oscillation).
- `obsY = centerY + sin(orbitAngle * 2) * radiusY` (vertical oscillation at double frequency, creating the figure-8).
- The changed obstacle position triggers the reactive `$effect`, which calls `computeFlow()`.

### Step 5: Drag interaction

Mouse and touch drag handlers:
1. `startDrag` / `startTouchDrag`: Stop the orbit, set `dragging = true`, compute the offset between the pointer position and the obstacle origin for smooth movement.
2. `onMouseMove` / `onTouchMove`: While dragging, update `obsX` and `obsY` based on pointer position minus the stored offset, clamped to container bounds.
3. `onMouseUp`: Set `dragging = false`.

---

## State Management

All state uses Svelte 5 runes (`$state` and `$derived`):

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `text` | `string` | `SAMPLE_TEXTS.long` | The paragraph text to flow around the obstacle |
| `fontSize` | `number` | `16` | Font size in pixels |
| `wrapperWidth` | `number` | `0` | Measured width of the outer container (bound via `bind:clientWidth`) |
| `containerWidth` | `number` (derived) | `650` fallback | Effective container width; derived from `wrapperWidth` |
| `lineHeight` | `number` | `26` | Line height in pixels |
| `obsX` | `number` | `350` | Obstacle x position (top-left) |
| `obsY` | `number` | `80` | Obstacle y position (top-left) |
| `obsWidth` | `number` | `160` | Obstacle width in pixels |
| `obsHeight` | `number` | `140` | Obstacle height in pixels |
| `obsShape` | `'rect' \| 'circle'` | `'circle'` | Shape of the obstacle (circle = ellipse, rect = rectangle) |
| `lines` | `Array<{text, x, y, width, displaced}>` | `[]` | Computed line data for rendering |
| `dragging` | `boolean` | `false` | Whether the user is currently dragging the obstacle |
| `dragOffset` | `{x, y}` | `{0, 0}` | Pointer offset from obstacle origin for smooth dragging |
| `orbitActive` | `boolean` | `true` | Whether the auto-orbit animation is running |
| `orbitAngle` | `number` | `0` | Current angle in the figure-8 orbit path |

Non-reactive: `orbitFrame` (number) stores the `requestAnimationFrame` handle for cleanup.

---

## Controls

| Control | Type | Range | Behavior |
|---|---|---|---|
| **Width** | Range slider | 350--850px | Bound to `containerWidth`; triggers relayout |
| **Font** | Range slider | 12--26px | Bound to `fontSize`; triggers prepare + relayout |
| **Shape** | Toggle buttons | Ellipse / Rect | Switches `obsShape`; triggers relayout with different collision geometry |
| **Auto-orbit / Pause** | Button | Toggle | Starts or stops the figure-8 animation loop |
| **Drag** | Mouse/touch on obstacle | Free position | Stops orbit, enters drag mode, updates obstacle position on move |

---

## Visual Rendering

### Stats bar

Three pill-shaped badges displayed above the canvas:
- **Total lines**: count of all rendered lines.
- **Displaced lines**: count of lines whose width was reduced by the obstacle (shown in accent color).
- **API indicator**: shows `layoutNextLine()` as the API in use.

### Flow canvas

A relatively positioned container with dark background, rounded corners, and a large drop shadow. It expands vertically to fit all lines plus the obstacle.

### Obstacle glow

A large semi-transparent element positioned behind the obstacle, with a radial gradient fading from `rgba(124, 108, 240, 0.15)` to transparent. Blurred with `filter: blur(12px)`. For circles, the border-radius is 50%.

### Obstacle body

The draggable element itself:
- Background: linear gradient from purple-25% to purple-20% opacity.
- 2px solid accent border.
- `backdrop-filter: blur(12px)` for a frosted glass effect.
- Hover state adds a 50px glow shadow.
- Cursor changes from `grab` to `grabbing` when active.
- Contains an icon (spinning emoji when orbiting, arrow emoji when static) and an uppercase label ("Orbiting" or "Drag me").

### Pulsing ring

When orbit mode is active, an absolutely positioned ring element inside the obstacle plays a 2-second `pulse` animation: scaling from 0.5 to 1.5 while fading from 0.8 to 0 opacity, creating a radar-like pulse effect.

### Text lines

Each line is an absolutely positioned `<div>` with `white-space: nowrap`:
- Positioned at the computed `(x, y)` from the layout loop.
- Font size and line height match the slider values.
- Normal lines render at 75% opacity in the primary text color.
- Displaced lines render at 100% opacity in the accent color, making the flow effect clearly visible.

---

## Key Technical Insight

**CSS `shape-outside` is limited to floats and simple shapes. Pretext gives you programmatic per-line width control around any shape at any position.**

The core technique is the per-line layout loop: instead of calling `layout()` for the whole paragraph at a fixed width, you call `layoutNextLine()` for each line individually, passing a different `maxWidth` depending on what the obstacle blocks at that line's vertical position. The cursor returned by each call tells you exactly where to resume for the next line.

This pattern generalizes to any obstacle shape (not just ellipses and rectangles), any number of obstacles, and any animation. The figure-8 orbit proves that full relayout every frame is feasible -- `layoutNextLine()` is fast enough to lay out hundreds of lines per frame at 60fps because it operates on pre-computed data from `prepareWithSegments()`.

The collision detection is pure geometry (ellipse equation, AABB checks) and is completely decoupled from the text layout. You could swap in physics-based obstacles, path-following shapes, or user-drawn curves without changing the layout code at all.

---

## How to Replicate

To build a similar text-flows-around-obstacle feature using Pretext:

1. **Install Pretext:** `npm install @chenglou/pretext`

2. **Prepare the text:** Call `prepareWithSegments(text, buildFont(fontSize))` once when the text or font changes. Store the handle for reuse.

3. **Define your obstacle:** Store the obstacle's position, size, and shape. Implement a function that, given a y-coordinate and line height, returns `{ x, maxWidth }` -- the horizontal offset and available width at that line position.

4. **Implement collision detection:** For an ellipse, solve the standard equation `(dx/rx)^2 + (dy/ry)^2 = 1` to find the horizontal extent of blockage at each line's vertical position. For a rectangle, use a simple AABB overlap test. Add padding to avoid text touching the obstacle edge.

5. **Layout loop:** Initialize a `LayoutCursor` at `{ segmentIndex: 0, graphemeIndex: 0 }`. Iterate line by line: query available width at the current y, call `layoutNextLine(prepared, cursor, availableWidth)`, store the result with its position, advance cursor to `line.end`, advance y by the line height. Stop when `layoutNextLine` returns `null`.

6. **Render lines absolutely:** Position each line at its computed `(x, y)` with `position: absolute` and `white-space: nowrap`. Highlight displaced lines with a different color for visual feedback.

7. **Add interactivity:** Implement drag handlers that update the obstacle position and trigger relayout. For animation, use `requestAnimationFrame` to update the position each frame -- Pretext is fast enough to handle this.

8. **Add orbit animation:** Use parametric equations (`sin` for x, `sin(2t)` for y) to trace a figure-8 path. Increment the angle each frame and update the obstacle position.
