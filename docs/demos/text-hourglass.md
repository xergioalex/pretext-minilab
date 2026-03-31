# Text Hourglass

## Overview

Text Hourglass shapes text into an hourglass silhouette that doubles as a functional timer. The width at each y-position follows a mathematical function that pinches at the center and expands at the top and bottom. When timer mode is activated, characters fade from top to bottom, simulating sand draining through the neck.

This demo matters because it proves that any mathematical function can define a text container shape. The hourglass width is computed analytically -- not from a lookup table or bitmap -- and Pretext lays out each line to fit the computed width. This pattern generalizes to any function that maps y to width.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepareWithSegments(text, font)` | Prepares text with segment data for line-by-line layout. Called once per font size change. |
| `layoutNextLine(prepared, cursor, availableWidth)` | Lays out a single line at the width defined by the hourglass function. Called once per visible line. |
| `buildFont(fontSize)` | Constructs the font descriptor for the given pixel size. |
| `LayoutCursor` type | Maintains read position between successive `layoutNextLine` calls. |

## How It Works

### Step 1: Text Preparation

On mount or when font size changes:

```
const font = buildFont(fontSize);
const prepared = prepareWithSegments(text, font);
```

### Step 2: Hourglass Width Function

The width at each y-position is:

```
function hourglassWidth(y, height, maxWidth, neckWidth) {
  const midY = height / 2;
  const t = Math.abs(y - midY) / midY; // 0 at center, 1 at edges
  return neckWidth + t * (maxWidth - neckWidth);
}
```

At the vertical center (`y = midY`), the width equals `neckWidth`. At the top and bottom edges (`y = 0` or `y = height`), the width equals `maxWidth`. The interpolation is linear, creating the classic hourglass taper.

### Step 3: Line-by-Line Layout

```
let cursor = { offset: 0 };
let y = 0;
const lines = [];

while (y + lineHeight <= hourglassHeight) {
  const width = hourglassWidth(y + lineHeight / 2, hourglassHeight, maxWidth, neckWidth);
  if (width < minLineWidth) { y += lineHeight; continue; }
  const line = layoutNextLine(prepared, cursor, width);
  if (!line) break;
  const x = (maxWidth - width) / 2;
  lines.push({ line, x, y, width });
  y += lineHeight;
}
```

Lines at the neck may be too narrow for text; these are skipped while the cursor does not advance.

### Step 4: Timer Mode

When timer mode is active, a progress value advances from 0 to 1 over the configured duration. Characters above `progress * hourglassHeight` are rendered with decreasing opacity, creating the illusion of sand draining from the top half through the neck into the bottom half.

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(14)` | Font size in pixels (range 10-20). |
| `hourglassHeight` | `$state(500)` | Total height of the hourglass in pixels (range 300-700). |
| `maxWidth` | `$state(500)` | Width at the top and bottom edges in pixels (range 300-700). |
| `neckWidth` | `$state(80)` | Width at the center pinch in pixels (range 30-200). |
| `timerActive` | `$state(false)` | Whether the timer animation is running. |
| `timerProgress` | `$state(0)` | Timer progress from 0 to 1. |
| `lines` | `$state([])` | Computed line data for the current configuration. |
| `prepared` | derived | Cached `PreparedTextWithSegments` object. |
| `lineHeight` | derived | Computed as `fontSize * 1.5`. |

## Controls

| Control | Type | Range | Effect |
|---|---|---|---|
| Font Size | Slider | 10 - 20 px | Changes text size; triggers re-preparation. |
| Height | Slider | 300 - 700 px | Total height of the hourglass shape. |
| Neck Width | Slider | 30 - 200 px | Width at the narrowest point. Smaller values create a more dramatic pinch. |
| Timer Mode | Button | toggle | Starts/stops the sand-draining animation. |

## Visual Rendering

### SVG Hourglass Outline
An SVG path traces the hourglass silhouette behind the text. The outline uses the accent color (`#7c6cf0`) at low opacity, with slightly rounded corners at the neck for visual polish.

### Text Lines
Each line is positioned at its computed `(x, y)`, centered within the hourglass boundary. In timer mode, line opacity is modulated by the timer progress -- lines above the drain line fade to near-invisible.

### Timer Sand Effect
In timer mode, a subtle gradient overlay sweeps downward, and characters in the drained region reduce their opacity. The neck region may pulse with a glow effect to simulate sand passing through.

### Width Guides
Faint horizontal bars show the available width at each line position, making the hourglass taper visible even in sparse text areas.

## Key Technical Insight

The architectural lesson of Text Hourglass is that **any mathematical function can define the text container shape**. The hourglass function is:

```
width(y) = neckWidth + |y - midY| / midY * (maxWidth - neckWidth)
```

But you can substitute any function:
- **Sinusoidal**: `neckWidth + sin(y/height * pi) * (maxWidth - neckWidth)` for a vase shape
- **Quadratic**: `neckWidth + (y/height)^2 * (maxWidth - neckWidth)` for a parabolic taper
- **Piecewise**: different functions for top half and bottom half
- **Data-driven**: width derived from a dataset, creating a text-based bar chart

Pretext does not know or care that the widths form an hourglass. It sees a sequence of width values, one per line, and lays out text accordingly. The shape is entirely in the caller's code, not in the layout engine.

## How to Replicate

1. **Prepare text once**: call `prepareWithSegments(text, buildFont(fontSize))` when text or font changes.

2. **Define the hourglass function**: implement a function that takes y, height, maxWidth, and neckWidth, and returns the width at that y-position. The linear interpolation from neckWidth at center to maxWidth at edges is the simplest approach.

3. **Compute per-line widths**: for each line at position y, evaluate the hourglass function. Skip lines where the width is below a minimum threshold.

4. **Layout line by line**: call `layoutNextLine(prepared, cursor, hourglassWidth)` in a loop. Center each line horizontally.

5. **Render the results**: position each line at its computed (x, y). Draw an SVG outline of the hourglass behind the text.

6. **Add timer mode**: track a progress value from 0 to 1. Modulate line opacity based on whether the line is above or below the progress threshold. Use `requestAnimationFrame` to advance progress.

7. **Add controls**: expose font size, height, and neck width as sliders. Add a timer toggle button.

8. **Experiment with other functions**: replace the linear interpolation with quadratic, sinusoidal, or data-driven functions. The layout loop is unchanged -- only the width computation differs.
