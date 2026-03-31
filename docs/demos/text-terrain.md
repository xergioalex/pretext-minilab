# Text Terrain Map

## Overview

Text Terrain Map sweeps the container width from a minimum to a maximum value, calling `layout()` at hundreds of sample points, and plots the resulting text height as a topographic elevation chart on a canvas. The result is a complete visualization of the width-height landscape for a given text and font, revealing how text height changes as width varies.

This demo matters because it exploits the fact that Pretext's `layout()` is so cheap (sub-millisecond) that you can compute hundreds of samples in a single frame. This enables exploratory visualization of layout behavior -- something impossible with browser layout engines where each measurement requires a DOM reflow.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepare(text, font)` | Prepares text for layout. Called once per font size change. |
| `layout(prepared, maxWidth, lineHeight)` | Computes layout metrics (height, lineCount) for a given width. Called hundreds of times to generate the terrain data. |
| `buildFont(fontSize)` | Constructs the font descriptor for the given pixel size. |

## How It Works

### Step 1: Text Preparation

On mount or when font size changes:

```
const font = buildFont(fontSize);
const prepared = prepare(text, font);
```

### Step 2: Width Sweep

The width range is sampled at regular intervals:

```
const samples = [];
const step = (maxSweepWidth - minSweepWidth) / sampleCount;

for (let w = minSweepWidth; w <= maxSweepWidth; w += step) {
  const result = layout(prepared, w, lineHeight);
  samples.push({ width: w, height: result.height, lineCount: result.lineCount });
}
```

Typically 200-400 samples are computed. The entire sweep completes in well under 100ms.

### Step 3: Terrain Rendering

The samples are plotted as a gradient-filled area chart on a canvas:

```
ctx.beginPath();
ctx.moveTo(xScale(samples[0].width), yScale(samples[0].height));
for (const s of samples) {
  ctx.lineTo(xScale(s.width), yScale(s.height));
}
ctx.lineTo(canvasWidth, canvasHeight);
ctx.lineTo(0, canvasHeight);
ctx.closePath();
```

The fill uses a vertical gradient: red tones for high line counts (narrow widths, tall layouts) transitioning to blue tones for low line counts (wide widths, short layouts).

### Step 4: Contour Lines

Horizontal contour lines are drawn at each line-count change boundary:

```
for (let i = 1; i < samples.length; i++) {
  if (samples[i].lineCount !== samples[i - 1].lineCount) {
    // draw vertical marker at this width
  }
}
```

These contour lines show exact widths where the layout gains or loses a line.

### Step 5: Crosshair Interaction

On mouse hover, a crosshair follows the cursor. The x-position maps to a width value, and the chart shows the corresponding height and line count. A text preview panel below the chart renders the text at the hovered width.

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(16)` | Font size in pixels (range 11-24). |
| `minSweepWidth` | `$state(100)` | Minimum width for the sweep (range 50-300). |
| `maxSweepWidth` | `$state(800)` | Maximum width for the sweep (range 400-1200). |
| `sampleCount` | `$state(300)` | Number of sample points (range 100-500). |
| `hoveredWidth` | `$state(null)` | Width value under the crosshair, or null if not hovering. |
| `samples` | `$state([])` | Array of { width, height, lineCount } sample points. |
| `prepared` | derived | Cached `PreparedText` object. |
| `lineHeight` | derived | Computed as `fontSize * 1.5`. |

## Controls

| Control | Type | Range | Effect |
|---|---|---|---|
| Font Size | Slider | 11 - 24 px | Changes text size; triggers re-preparation and full resweep. |
| Min Width | Slider | 50 - 300 px | Left boundary of the sweep range. |
| Max Width | Slider | 400 - 1200 px | Right boundary of the sweep range. |
| Text Input | Textarea | free text | Custom text to analyze. Triggers re-preparation and resweep. |

## Visual Rendering

### Terrain Area Chart
A canvas-based area chart fills the vertical space between the plotted height curve and the bottom axis. The fill gradient transitions from warm reds (many lines, narrow widths) to cool blues (few lines, wide widths), evoking a topographic elevation map.

### Contour Lines
Vertical dashed lines mark widths where the line count changes. Each contour is labeled with the line count, creating a topographic legend along the chart.

### Crosshair
On hover, a vertical and horizontal crosshair line tracks the mouse position. A tooltip displays the exact width, height, and line count at the hovered point.

### Text Preview
Below the chart, a text preview panel renders the text at the currently hovered width (or a default width when not hovering). This provides immediate visual feedback connecting the chart data to actual layout.

### Axis Labels
The x-axis shows width in pixels, the y-axis shows height in pixels. Grid lines at regular intervals aid readability.

## Key Technical Insight

The architectural lesson of Text Terrain Map is that **layout() is so cheap you can compute hundreds of samples to visualize the entire width-height landscape**. With browser layout engines, each measurement requires a DOM reflow -- measuring 300 widths would take 300 reflows, easily hundreds of milliseconds. Pretext completes the same sweep in under 50ms.

This enables:
- **Layout debugging tools**: visualize how text height responds to width changes
- **Responsive design analysis**: find optimal breakpoints by examining the height curve
- **Animation planning**: identify width ranges where the layout is stable (flat regions) vs. volatile (steep regions)
- **Performance profiling**: since layout cost is proportional to text length and line count, the terrain map reveals the computational landscape

The staircase shape of the terrain curve is itself insightful: text height changes in discrete steps (one line height at a time), with flat plateaus between steps. The widths at step boundaries are the critical points where adding one more pixel of width eliminates an entire line.

## How to Replicate

1. **Prepare text once**: call `prepare(text, buildFont(fontSize))` when text or font changes.

2. **Define the sweep range**: set minimum and maximum width values and a sample count.

3. **Run the sweep**: in a loop, call `layout(prepared, width, lineHeight)` at each sample width. Store the results in an array.

4. **Plot the area chart**: use a canvas to draw the height curve as a filled area. Apply a gradient fill keyed to line count.

5. **Add contour lines**: iterate through samples and draw vertical markers where `lineCount` changes between adjacent samples.

6. **Add crosshair interaction**: track mouse position over the chart canvas. Map x to width and display the corresponding height and line count in a tooltip.

7. **Add a text preview**: render the text at the hovered width below the chart, connecting the abstract data to concrete layout.

8. **Add controls**: expose font size, sweep range, and text input. Each change triggers a full resweep, which completes near-instantly thanks to Pretext's performance.
