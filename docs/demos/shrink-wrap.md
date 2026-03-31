# Tight Multiline Shrink-Wrap

**Slug:** `shrink-wrap`
**Category:** Foundational
**Difficulty:** Intermediate
**Source:** `src/islands/demos/ShrinkWrap.svelte` / `src/pages/demos/shrink-wrap.astro`

---

## Overview

This demo solves a problem that CSS cannot: computing the tightest possible bounding box for multiline wrapped text. When text wraps into multiple lines, the container width is typically the `max-width` constraint, not the actual width of the content. CSS `width: fit-content` only shrink-wraps single-line text; for multiline text it still uses the full available width. Pretext's `layoutWithLines()` returns individual line widths, so you can find the widest line and set the container to exactly that width -- eliminating all wasted horizontal space.

The demo provides a bar chart visualization of every line's width, highlights the widest line, and lets the user toggle between the loose `max-width` container and the tight-fit container. The difference in width (space saved) is displayed as both a pixel value and a visual comparison.

---

## Pretext APIs Used

| Function | Import | Purpose |
|---|---|---|
| `prepareWithSegments(text, font)` | `@chenglou/pretext` via `src/lib/pretext` | Prepares text with segment-level detail (needed by `layoutWithLines`) |
| `layoutWithLines(prepared, maxWidth, lineHeight)` | `@chenglou/pretext` via `src/lib/pretext` | Returns `{ height, lineCount, lines[] }` where each line has a `width` property |
| `buildFont(size)` | `src/lib/pretext` | Constructs the CSS font string |

Note: This demo uses `prepareWithSegments()` instead of `prepare()` because `layoutWithLines()` requires the segment-level data to report per-line widths.

---

## How It Works

### Step 1: Prepare with segments

The `computeLayout()` function calls `buildFont(fontSize)` and then `prepareWithSegments(text, font)`. This produces a `PreparedTextWithSegments` handle that contains both the standard prepared data and a segments array with individual glyph/word measurements. The line height is computed as `fontSize * 1.5`.

### Step 2: Layout with per-line data

`layoutWithLines(prepared, maxWidth, lineHeight)` returns a result object containing:
- `height`: total paragraph height
- `lineCount`: number of wrapped lines
- `lines[]`: an array of line objects, each with a `width` property (the actual pixel width of that line's content)

### Step 3: Find the widest line

The function iterates over `result.lines`, tracking the maximum `line.width` encountered. It also builds a `lineWidths` array of rounded integer widths for display. The widest line width is ceiling-rounded: `Math.ceil(maxLineW)`.

### Step 4: Compute display width

The display width depends on the `isTight` toggle:
- **Loose mode** (`isTight = false`): `displayWidth = maxWidth` (the full slider value)
- **Tight mode** (`isTight = true`): `displayWidth = widestLineWidth + 2` (tightest possible bounding box, plus 2px padding to avoid sub-pixel rounding issues)

### Step 5: Toggle and auto-play

The "Snap to tight fit" / "Expand" button toggles `isTight` and immediately recomputes the layout. The auto-play mode toggles `isTight` every 1.2 seconds using a `requestAnimationFrame` + `setTimeout` combination, creating a rhythmic expand/contract animation.

### Step 6: Reactive recomputation

A single `$effect` tracks `text`, `fontSize`, `maxWidth`, and `isTight`. Any change triggers `computeLayout()` via `untrack()`.

---

## State Management

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `text` | `string` | `'The quick brown fox jumps over the lazy dog near the river.'` | Input text |
| `fontSize` | `number` | `20` | Font size in pixels |
| `maxWidth` | `number` | `500` | Maximum container width (the "loose" width) |
| `isTight` | `boolean` | `false` | Whether tight-fit mode is active |
| `autoPlaying` | `boolean` | `false` | Whether auto-play is running |
| `computedHeight` | `number` | `0` | Total paragraph height from layout |
| `lineCount` | `number` | `0` | Number of wrapped lines |
| `widestLineWidth` | `number` | `0` | Width of the widest line in pixels |
| `displayWidth` | `number` | `500` | Actual container width (either maxWidth or widestLineWidth+2) |
| `lineWidths` | `number[]` | `[]` | Array of per-line widths in pixels |

Non-reactive: `animFrame` (number) for animation cleanup.

---

## Controls

| Control | Type | Range | Behavior |
|---|---|---|---|
| **Text** | `<textarea>` | Free text, 2 rows | Triggers full recomputation |
| **Font size** | Range slider | 12--40px | Triggers full recomputation |
| **Max width** | Range slider | 120--700px | Triggers full recomputation |
| **Snap to tight fit / Expand** | Button | Toggle | Switches between loose and tight display width |
| **Auto-play** | Button | Toggle | Starts/stops 1.2-second toggle cycle |

---

## Visual Rendering

### Metrics pills

A horizontal row of rounded pills displaying:

- **Lines**: line count
- **Max width**: the slider value in pixels
- **Widest line** (accent-highlighted): the widest line width in pixels
- **Display** (accent-highlighted when tight): the actual display width
- **Saved**: the difference between max width and widest line width

### Width comparison bars

Two horizontal bars stacked vertically:

- **Max bar**: gray fill at full width (proportional to `maxWidth / 700`)
- **Tight bar**: accent-colored fill showing `widestLineWidth / maxWidth` ratio within the same track

Each bar has a label ("Max" or "Tight") and a pixel value. The tight value is styled with accent color and bold weight.

### Per-line width visualization

A vertical list where each line is represented as a horizontal bar:

- **Line number** (monospace, right-aligned)
- **Fill bar**: width proportional to `lineWidth / maxWidth`, rendered inside a track
- **Pixel value** (monospace)

The widest line is highlighted: its fill bar is green (`#3ecf8e`) at full opacity, while other lines use the accent color at 50% opacity. The widest line's value is also green and bold. Bar widths transition smoothly (0.3s ease).

### Preview box

The text is rendered in a `<div>` whose width matches `displayWidth`. When in tight mode:
- The border color changes to accent
- A box shadow glows with `accent-dim`
- The width transitions with a smooth cubic-bezier curve (0.4s)

The transition between loose and tight modes is visually satisfying -- the container smoothly snaps inward to hug the text.

---

## Key Technical Insight

**CSS `width: fit-content` does not tightly wrap multiline text.**

This is a fundamental limitation of CSS layout. When text wraps to multiple lines, `fit-content` resolves to the `max-content` width (the width needed to avoid any wrapping), which defeats the purpose if the text already wraps. There is no CSS property that means "set the width to the widest wrapped line."

Pretext solves this by returning per-line widths from `layoutWithLines()`. The tightest bounding box is simply `Math.max(...lineWidths)` -- the width of the widest line after wrapping. This is useful for:

- **Tooltip and popover sizing:** No wasted horizontal space around wrapped content
- **Chat bubble width:** Each bubble can be exactly as wide as its widest line
- **Caption sizing:** Image captions that hug the text tightly
- **Label positioning:** Precisely positioned labels in data visualizations

The demo makes this visible by toggling between the two modes and showing exactly how many pixels are saved.

---

## How to Replicate

To build tight multiline shrink-wrapping:

1. **Use `prepareWithSegments()` instead of `prepare()`:** The `layoutWithLines()` function requires segment-level data, so you must use the segments-aware preparation function.

2. **Call `layoutWithLines(prepared, maxWidth, lineHeight)`:** This returns the standard `height` and `lineCount` plus a `lines` array where each line object has a `width` property.

3. **Find the widest line:** `const tightWidth = Math.ceil(Math.max(...result.lines.map(l => l.width)))`. Add a small padding (1--2px) to account for sub-pixel rounding.

4. **Set the container width:** Use the widest line width as the container's CSS `width`. The text will still wrap identically because the line-breaking decisions were made at `maxWidth` -- you are just removing the unused space to the right of the widest line.

5. **Add a toggle:** Let users switch between `maxWidth` (loose) and `tightWidth` (tight) to see the difference. Apply a CSS transition on the `width` property for a smooth animation.

6. **Visualize per-line widths:** Render a bar chart showing each line's width relative to `maxWidth`. Highlight the widest line. This makes the shrink-wrap operation intuitive.

7. **Handle edge cases:** When text is short enough to fit on one line, tight width equals the text's natural width. When all lines are equally wide (rare), tight mode has no effect. The demo handles both gracefully.
