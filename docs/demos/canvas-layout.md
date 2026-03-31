# Canvas Text Layout

**Slug:** `canvas-layout`
**Category:** Practical
**Difficulty:** Intermediate
**Source:** `src/islands/demos/CanvasLayout.svelte`
**Page:** `src/pages/demos/canvas-layout.astro`

---

## Overview

This demo renders multiline text onto an HTML5 `<canvas>` element using Pretext for line breaking. The Canvas 2D API has no built-in multiline text support — `fillText()` only draws a single line. Pretext bridges this gap by computing line breaks, line widths, and total height, which the demo then uses to draw each line individually with optional visualizations.

The demo supports three color modes (mono, rainbow, heat map), toggleable line boxes and width fill bars, a text editor, and an auto-resize animation that oscillates the width to show real-time line reflow on canvas.

---

## Pretext APIs Used

| API | Purpose |
|-----|---------|
| `prepareWithSegments(text, font)` | Prepares text with segment data, enabling per-line text extraction |
| `layoutWithLines(prepared, maxWidth, lineHeight)` | Computes line breaks and returns individual line objects with text and width |
| `buildFont(fontSize, fontFamily)` | Constructs the font string; this demo explicitly passes `'Inter, sans-serif'` |

Note: This demo uses `prepareWithSegments()` + `layoutWithLines()` (not the basic `prepare()` + `layout()`) because it needs access to each line's text content and width for canvas rendering.

---

## How It Works

### 1. Text Preparation and Layout

On every render cycle:

1. Call `buildFont(fontSize, 'Inter, sans-serif')` to get the font descriptor.
2. Call `prepareWithSegments(text, font)` to create a `PreparedTextWithSegments` object.
3. Call `layoutWithLines(prepared, width, lineHeight)` to get the full layout result with a `lines` array.
4. Each line object contains `text` (the string content for that line) and `width` (the pixel width of that line).

### 2. Canvas DPR-Aware Setup

The canvas is sized to account for `window.devicePixelRatio`:

1. Compute logical dimensions: `canvasW = width + padding + 20`, `canvasH = result.height + 60`.
2. Set `canvas.width` and `canvas.height` to logical dimensions multiplied by DPR.
3. Set `canvas.style.width` and `canvas.style.height` to logical dimensions (CSS pixels).
4. Call `ctx.scale(dpr, dpr)` so all drawing commands use logical coordinates.

This ensures crisp text on high-DPI displays (Retina, 4K monitors).

### 3. Background and Grid

The render function reads CSS custom properties from the document (`--bg-demo`, `--text-primary`, `--text-muted`) to stay theme-aware. A subtle grid of horizontal lines is drawn at `lineHeight` intervals across the text area.

### 4. Per-Line Rendering

For each line in `result.lines`, the demo draws up to four elements:

1. **Line box** (if enabled) — A filled rectangle spanning the line's width and height. Alpha varies with fill ratio. Color depends on mode: accent purple (mono), cycling hue (rainbow), or warm-to-cool gradient (heat).

2. **Width fill bar** (if enabled) — A small horizontal bar to the right of the width boundary, proportional to `line.width / width`. Acts as a miniature bar chart showing how full each line is.

3. **Text** — The line's text content drawn with `ctx.fillText()` at the computed position. Color varies by mode.

4. **Line number** — A small monospace number to the left of the text area, drawn with `ctx.textAlign = 'right'`.

### 5. Width Boundary

A dashed vertical line is drawn at the `width` position with a label showing the pixel value. This makes the wrapping constraint visible.

### 6. Auto-Resize Animation

The auto-play mode uses `requestAnimationFrame` to oscillate the width between 200px and 700px, incrementing by 2px per frame. This triggers a full re-layout and re-render on every frame, demonstrating that Pretext's line breaking is fast enough for 60fps canvas animation.

---

## State Management

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `text` | `string` | `SAMPLE_TEXTS.editorial` | The text content to render |
| `fontSize` | `number` | `18` | Font size in pixels |
| `width` | `number` | `520` | Maximum line width for wrapping |
| `lineHeight` | `number` | `30` | Vertical spacing between lines |
| `showLineBoxes` | `boolean` | `true` | Whether to draw colored rectangles behind each line |
| `showWidthMarkers` | `boolean` | `true` | Whether to draw fill ratio bars on the right |
| `colorMode` | `'mono' \| 'rainbow' \| 'heat'` | `'mono'` | Color scheme for lines and visualizations |
| `autoPlaying` | `boolean` | `false` | Whether the auto-resize animation is running |
| `lineCount` | `number` | `0` | Computed total number of lines (display only) |
| `totalHeight` | `number` | `0` | Computed total text height (display only) |

---

## Controls

| Control | Type | Range | Effect |
|---------|------|-------|--------|
| Text | Textarea (2 rows) | Free text | Changes the text content to render |
| Width | Range slider | 200-800px | Adjusts the line wrapping width |
| Font | Range slider | 10-32px | Changes the font size |
| Line height | Range slider | 14-48px | Adjusts vertical line spacing |
| Color mode | Toggle group (mono/rainbow/heat) | 3 options | Switches the color scheme |
| Boxes | Toggle button | On/Off | Shows or hides line background rectangles |
| Fill bars | Toggle button | On/Off | Shows or hides width fill ratio bars |
| Auto-resize | Toggle button | — | Starts/stops the width oscillation animation |

---

## Visual Rendering

### Color Modes

- **Mono** — All text in the theme's primary text color. Line boxes use accent purple with varying alpha based on fill ratio. Fill bars use semi-transparent accent.

- **Rainbow** — Each line cycles through an 8-color palette: `['#7c6cf0', '#3ecf8e', '#f5a623', '#06b6d4', '#ec4899', '#8b5cf6', '#ef4444', '#10b981']`. Both text and decorations use the line's assigned color.

- **Heat** — Color is computed from the line's fill ratio (`line.width / width`). Full lines are warm (red), short lines are cool (blue). Uses `rgb(255 * ratio, 80, 255 * (1 - ratio))`. This makes it immediately visible which lines are tightly packed and which have slack.

### Canvas Elements

From back to front (painter's order):

1. Background fill (theme-aware)
2. Subtle horizontal grid lines
3. Line box rectangles (optional)
4. Text content per line
5. Line numbers on the left margin
6. Width fill bars on the right (optional)
7. Dashed width boundary line
8. Width label

### Stats Bar

Above the canvas, a stats row shows: line count, total height in pixels, and a note that the rendering uses `<canvas>` with no DOM text.

---

## Key Technical Insight

The HTML5 Canvas 2D API provides `fillText(text, x, y)` but has no concept of multiline text, line wrapping, or paragraph layout. If you call `fillText()` with a long string, it draws a single line that extends beyond the canvas boundary. The `measureText()` method gives you the width of a string but does not perform line breaking.

Pretext fills this gap completely. By calling `layoutWithLines()`, you get an array of line objects, each with its text content and pixel width. You then draw each line with `fillText()` at the appropriate y-offset. The same approach works for WebGL text rendering, SVG generation, PDF layout, or any rendering target that lacks built-in text wrapping.

This separation of concerns — Pretext handles *where* to break, your renderer handles *how* to draw — is the fundamental architectural pattern for portable text layout.

---

## How to Replicate

1. **Set up a DPR-aware canvas** — Multiply the canvas element's `width` and `height` by `window.devicePixelRatio`, set CSS dimensions to logical pixels, and call `ctx.scale(dpr, dpr)`.

2. **Prepare text with segments** — Use `prepareWithSegments(text, buildFont(fontSize, fontFamily))` to get a prepared object that supports per-line text extraction.

3. **Compute the layout** — Call `layoutWithLines(prepared, maxWidth, lineHeight)` to get `{ height, lineCount, lines }`.

4. **Render each line** — Loop through `result.lines`. For each line at index `i`:
   - Set `ctx.font` to your font string.
   - Set `ctx.textBaseline = 'top'`.
   - Call `ctx.fillText(line.text, xOffset, yOffset + i * lineHeight)`.
   - Optionally center the text vertically within the line height: `y + (lineHeight - fontSize) / 2`.

5. **Add visualizations** — Draw rectangles behind lines for debugging, add line numbers, or compute fill ratios for heat maps.

6. **Make it reactive** — In a Svelte `$effect` block, watch all parameters (text, width, fontSize, lineHeight, visual options) and call the render function on any change. Use `untrack()` to prevent circular dependencies.

7. **Animate** — Use `requestAnimationFrame` to smoothly change the width or other parameters, triggering a re-layout and re-render on each frame.
