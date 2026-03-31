# Editorial Engine

**Slug:** `editorial-engine`
**Category:** Advanced, Flagship
**Difficulty:** Advanced
**Source:** `src/islands/demos/EditorialEngine.svelte` / `src/pages/demos/editorial-engine.astro`

---

## Overview

This is the flagship demo of Pretext Lab -- a sophisticated editorial layout engine with multiple floating orbs that text flows around, a drop cap, three switchable themes (dark, cream, newspaper), an optional line guides overlay, and animated bouncing orbs. It combines per-line width control, obstacle avoidance, typographic ornamentation, and dynamic relayout into a single cohesive demonstration.

This matters because it recreates editorial patterns that have existed in print for centuries -- text flowing around images, decorative drop capitals, multi-column themes -- but that have been impractical on the web. CSS offers limited float-based wrapping and no programmatic control over per-line layout. Pretext makes all of these patterns composable: each line's width and position is computed individually based on the current obstacle positions, and the entire layout is recomputed every animation frame without perceptible lag.

The demo uses a custom article text ("In the beginning was the word, and the word had width...") rendered in Georgia serif, reinforcing the editorial feel. Two orbs bounce independently within the layout area, and the text dynamically reflows around both simultaneously.

---

## Pretext APIs Used

| Function | Import | Purpose |
|---|---|---|
| `prepareWithSegments(text, font)` | `@chenglou/pretext` via `src/lib/pretext` | Prepares the article text with segment tracking for per-line layout |
| `layoutNextLine(prepared, cursor, maxWidth)` | `@chenglou/pretext` via `src/lib/pretext` | Lays out one line at a time with a per-line custom width; returns `LayoutLine` or `null` |
| `buildFont(size, fontFamily)` | `src/lib/pretext` | Builds a CSS font string; this demo passes `'Georgia, Times New Roman, serif'` as the font family |

**Types used:** `LayoutCursor` (tracks position in the prepared text between successive `layoutNextLine` calls)

---

## How It Works

### Step 1: Prepare the text

On each layout computation, `buildFont(fontSize, 'Georgia, Times New Roman, serif')` constructs a serif font string (unlike most other demos which use Inter). Then `prepareWithSegments(articleText, font)` performs the full analysis pass.

### Step 2: Define orb physics

Two orbs are defined with independent positions, velocities, radii, and colors:

- **Orb 1**: radius 60, purple (`#7c6cf0`), initial velocity `(0.8, 0.5)`.
- **Orb 2**: radius 45, teal (`#3ecf8e`), initial velocity `(-0.6, 0.7)`.

Each frame, the animation loop updates each orb's position by adding its velocity. When an orb hits a boundary, the corresponding velocity component is reversed (elastic bounce), and the position is clamped to keep the orb fully within bounds. The horizontal boundary is the text width; the vertical boundary extends to 400px.

### Step 3: Per-line obstacle detection

The `isLineBlockedByOrb(y, orb, pad)` function checks whether a given line at vertical position `y` is blocked by an orb:

1. Compute the line's vertical midpoint relative to the content area (`lineMid = y + lineHeight/2 - contentTop`).
2. Compute `dy` = distance from the line midpoint to the orb center.
3. If `|dy| >= r` (orb radius + padding), the line is not blocked.
4. Otherwise, compute `dx = sqrt(r^2 - dy^2)` -- the horizontal extent of the circular blockage.
5. Return `{ blocked: true, left: cx - dx, right: cx + dx }`.

### Step 4: Layout loop with multiple obstacles

The `computeLayout()` function performs the per-line layout:

1. Compute text margins (24px on each side) and effective text width.
2. Initialize cursor at `{ segmentIndex: 0, graphemeIndex: 0 }`.
3. Start at `y = contentTop` (70px, below the editorial header).
4. For each line (up to 500 safety limit):
   a. Start with `availableWidth = textWidth` and `xOffset = margin`.
   b. Check each orb for blockage at this y position:
      - If the orb blocks and its left edge is past the midpoint, text uses the left side: `availableWidth = check.left - margin`.
      - If the orb blocks and its right edge is before the midpoint, text uses the right side: `xOffset = check.right + margin`, adjust available width.
      - If the orb is centered, default to the left side.
   c. If `availableWidth < 30`, skip this line (advance y).
   d. Call `layoutNextLine(prepared, cursor, availableWidth)`.
   e. If `null`, all text is laid out.
   f. Store line with text, x offset, y position, line width, and displaced flag.
   g. Advance cursor and y.
5. Store `totalHeight = y` for container sizing.

### Step 5: Drop cap rendering

When the drop cap toggle is enabled, the first line's first character is rendered as a large float:
- Font size is `fontSize * 4` (e.g., 68px at the default 17px).
- Line height is `lineHeight * 3`.
- Rendered as a `<span class="drop-cap">` with `float: left`, bold weight, and the first orb's color.
- The remaining text of the first line follows immediately after.

Note: The current implementation uses CSS `float: left` for the drop cap positioning rather than computing indented widths for subsequent lines via `layoutNextLine`. This is a pragmatic simplification -- a full implementation would use the same per-line width technique used for orb avoidance.

### Step 6: Theme switching

Three themes are defined as color palettes:

| Theme | Background | Text | Muted | Rule |
|---|---|---|---|---|
| **Dark** | `#0c0c14` | `#d4d4d8` | `#555` | `#d4d4d8` |
| **Cream** | `#faf8f3` | `#1a1a1a` | `#888` | `#1a1a1a` |
| **Newspaper** | `#f5f0e8` | `#222` | `#999` | `#222` |

Theme colors are applied as inline styles on the canvas and header elements. The background transitions smoothly (0.4s). Displaced lines use a lighter purple (`#c4b5fd`) in dark theme and the standard text color in light themes.

### Step 7: Orb animation loop

The `animateOrbs()` function runs via `requestAnimationFrame`:
1. Update each orb's position by its velocity.
2. Bounce off horizontal and vertical boundaries.
3. Clamp positions to bounds.
4. Trigger `computeLayout()` to reflow text around the new positions.
5. Schedule the next frame.

Cleanup on unmount cancels the animation frame.

---

## State Management

All state uses Svelte 5 runes (`$state` and `$derived`):

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `wrapperWidth` | `number` | `0` | Measured width of the outer container (bound via `bind:clientWidth`) |
| `containerWidth` | `number` (derived) | `720` fallback | Effective container width; derived from `wrapperWidth` |
| `fontSize` | `number` | `17` | Font size in pixels |
| `lineHeight` | `number` | `30` | Line height in pixels (approximately `fontSize * 1.667`) |
| `showDropCap` | `boolean` | `true` | Whether to render the first character as a large drop cap |
| `showGuides` | `boolean` | `false` | Whether to show horizontal line guides |
| `theme` | `'cream' \| 'dark' \| 'newspaper'` | `'dark'` | Active visual theme |
| `orbs` | `Orb[]` | Two orbs (purple, teal) | Array of floating obstacle objects with position, velocity, radius, and colors |
| `orbsActive` | `boolean` | `true` | Whether the orb bounce animation is running |
| `lines` | `Array<{text, x, y, lineWidth, displaced}>` | `[]` | Computed line data for rendering |
| `totalHeight` | `number` | `0` | Total height of the laid-out text (for container sizing) |

Non-reactive: `animFrame` (number) stores the `requestAnimationFrame` handle; `contentTop` (constant 70) is the vertical offset below the header; `articleText` (constant string) is the article content; `themes` (constant object) maps theme names to color palettes.

A single `$effect` tracks `containerWidth`, `fontSize`, `lineHeight`, and `showDropCap`. Changes to any of these trigger `computeLayout()` via `untrack()`. Orb-driven relayout happens inside the animation loop directly, not through the effect.

---

## Controls

| Control | Type | Range | Behavior |
|---|---|---|---|
| **Column** | Range slider | 450--900px | Bound to `containerWidth`; triggers relayout |
| **Font** | Range slider | 14--24px | Bound to `fontSize`; triggers prepare + relayout |
| **Drop Cap** | Toggle button | On/Off | Toggles `showDropCap`; the first character renders large or normal |
| **Guides** | Toggle button | On/Off | Toggles `showGuides`; shows/hides horizontal dashed lines at each line position |
| **Theme** | Three buttons | dark / cream / newspaper | Switches the color palette applied to the canvas |
| **Animate orbs / Pause** | Button | Toggle | Starts or stops the bouncing orb animation |

---

## Visual Rendering

### Editorial header

The header area sits at the top of the canvas and includes:
- A **thick rule** (4px height) in the theme's rule color.
- A **masthead** with "FEATURE" on the left and "PRETEXT MINI-LAB" on the right, in muted color, tiny uppercase text with wide letter-spacing.
- A **title** ("The Word Had Width") in Georgia serif, 2rem, bold, with tight letter-spacing.
- A **thin divider** (1px) in the theme's muted color.

### Stats bar

Three pill badges above the canvas:
- Total line count.
- Number of displaced lines (accent colored).
- Number of floating obstacles.

### Orb glows

For each orb, a large absolutely positioned `<div>` (4x the orb radius) with a radial gradient from the orb's `glowColor` to transparent. Blurred with `filter: blur(16px)`. These sit behind the orbs and text, creating a soft ambient light effect.

### Orb bodies

Circular `<div>` elements with:
- Radial gradient from the orb's color at ~27% opacity (highlight at 35%/35%) to ~7% opacity.
- 1px border in the orb's color at ~40% opacity.
- `backdrop-filter: blur(4px)` for a subtle frosted glass effect.
- Box shadow combining an outer glow and inner glow.
- `pointer-events: none` -- orbs are not interactive in this demo (unlike Flow Around Obstacle).

### Line guides

When enabled, horizontal dashed lines are rendered at each line's y position, spanning the text width. The dash color uses the theme's muted color at low opacity (`22` hex alpha). These help visualize the baseline grid.

### Text lines

Each line is an absolutely positioned `<div>` with:
- `white-space: nowrap` to prevent browser rewrapping.
- Georgia serif font family.
- Position at computed `(x, y)`.
- Color from the active theme, with displaced lines using a lighter purple in dark theme.
- Smooth color transition (0.2s) when switching themes.

### Drop cap

When enabled, the first character of the first line is wrapped in a `<span class="drop-cap">`:
- `float: left` positions it to the left of subsequent text.
- Font size is 4x the base size.
- Line height covers approximately 3 lines.
- Color matches the first orb (purple).
- Bold weight, Georgia serif.

---

## Key Technical Insight

**This demo combines per-line width control, multi-obstacle avoidance, drop caps, theme switching, and dynamic relayout into a single editorial layout -- patterns that existed in print for centuries but were impractical on the web until Pretext.**

The architecture is surprisingly simple once you have `layoutNextLine()`: the entire layout is a while loop that queries obstacle positions, computes available width, lays out one line, and advances. Adding more obstacles is just another iteration in the inner loop. Adding a drop cap is a conditional width adjustment for the first few lines. Adding themes is pure CSS. The layout computation itself never changes.

The key performance insight is that even with two bouncing obstacles triggering full relayout every frame, the layout remains smooth. Each `layoutNextLine()` call operates on pre-computed data from `prepareWithSegments()`, making it pure arithmetic. The prepare step runs once; the layout loop runs hundreds of times per second without issue.

This demonstrates that Pretext enables a class of UI that was previously the domain of desktop publishing software: dynamic, interactive editorial layouts where text and graphics coexist and respond to each other in real time.

---

## How to Replicate

To build a similar editorial layout engine using Pretext:

1. **Install Pretext:** `npm install @chenglou/pretext`

2. **Choose a serif font:** Editorial layouts benefit from serif typography. Pass the font family to `buildFont()`: `buildFont(17, 'Georgia, Times New Roman, serif')`.

3. **Prepare the text:** Call `prepareWithSegments(articleText, font)` once. The result encodes all glyph measurements for the chosen font.

4. **Define your obstacles:** Create obstacle objects with position, velocity, radius, and color. For bouncing animation, update positions each frame and reverse velocity on boundary collision.

5. **Implement per-line collision detection:** For circular obstacles, use the circle equation: at each line's y position, compute whether the line is within the obstacle's vertical extent, and if so, how much horizontal space is blocked.

6. **Layout loop:** Initialize a `LayoutCursor`. For each line, check all obstacles, compute the available width (choosing the wider side when blocked), call `layoutNextLine(prepared, cursor, availableWidth)`, store the result, and advance.

7. **Add a drop cap:** For the first line, render the first character at 4x font size with `float: left`. Optionally, compute indented widths for the first few lines to avoid the drop cap area programmatically.

8. **Define themes:** Create color palette objects and apply them as inline styles or CSS variables. Transition the background color for smooth switching.

9. **Add line guides:** Render dashed horizontal lines at each computed line position. Toggle visibility with a boolean flag.

10. **Animate:** Use `requestAnimationFrame` to update obstacle positions and call `computeLayout()` each frame. Clean up the animation handle on component unmount.

11. **Render the header:** Add editorial chrome -- rules, masthead, title, dividers -- above the text area to complete the editorial feel. Position the text content below the header using a `contentTop` offset.
