# Wave Distortion

## Overview

Wave Distortion applies a continuous sine wave to vary the column width of each text line, creating a flowing, organic animation where text undulates like a flag in the wind. No two lines share the same width at any given moment, and the wave phase advances every frame, producing perpetual motion.

This demo matters because it shows that Pretext can drive layout shapes that are impossible with CSS. No CSS property allows per-line width variation -- `column-width`, `max-width`, and `shape-outside` all operate at the block or float level. With Pretext and `layoutNextLine()`, any mathematical function can define the layout boundary for every line independently.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepareWithSegments(text, font)` | Prepares text with segment data for line-by-line layout. Called once per font size change. |
| `layoutNextLine(prepared, cursor, availableWidth)` | Lays out a single line within the given width. Called once per visible line per frame, each time with a width derived from the sine wave. |
| `buildFont(fontSize)` | Constructs the font descriptor for the given pixel size. |
| `LayoutCursor` type | Maintains read position between successive `layoutNextLine` calls. |

## How It Works

### Step 1: Text Preparation

On mount or when font size changes:

```
const font = buildFont(fontSize);
const prepared = prepareWithSegments(text, font);
```

The prepared object is cached and reused across all animation frames.

### Step 2: Phase Accumulation

Each animation frame advances the wave phase:

```
phase += speed * 0.03;
```

The `speed` multiplier (0.2x to 5x) controls how fast the wave travels through the text. The constant `0.03` calibrates the base animation rate to feel smooth at 60fps.

### Step 3: Per-Line Width Computation

For each line at vertical position `y` with the given `lineHeight`:

```
lineMid = y + lineHeight / 2;
waveVal = Math.sin((lineMid / 100) * frequency + phase);
offset = waveVal * amplitude;
```

The `waveVal` ranges from -1 to 1. Multiplied by `amplitude`, it produces a pixel offset.

- **Positive offset**: text is pushed from the left. The line starts at `x = offset` and has `width = containerWidth - offset`.
- **Negative offset**: text is pushed from the right. The line starts at `x = 0` and has `width = containerWidth + offset` (since offset is negative, this reduces the width from the right side).
- **Minimum width**: clamped to 40px to prevent lines from collapsing entirely.

### Step 4: Line-by-Line Layout

With computed widths:

```
let cursor = { offset: 0 };
let y = 0;
const lines = [];

while (y < visibleHeight) {
  const { x, width } = computeWaveWidth(y, lineHeight, phase, frequency, amplitude, containerWidth);
  const line = layoutNextLine(prepared, cursor, width);
  if (!line) break;
  lines.push({ line, x, y, width });
  y += lineHeight;
}
```

### Step 5: Animation Loop

A `requestAnimationFrame` loop drives the phase forward and triggers re-layout every frame. A play/pause toggle controls whether the phase advances.

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(16)` | Font size in pixels (range 11-22). |
| `containerWidth` | `$state(700)` | Maximum container width in pixels (range 400-950). |
| `amplitude` | `$state(100)` | Wave amplitude in pixels (range 20-250). Controls how far lines shift. |
| `frequency` | `$state(3)` | Wave frequency (range 1-8, step 0.5). Controls how many wave cycles fit vertically. |
| `speed` | `$state(1)` | Animation speed multiplier (range 0.2-5, step 0.1). |
| `phase` | internal | Accumulated wave phase. Not directly exposed as a control. |
| `playing` | `$state(true)` | Whether the animation is running. |
| `lines` | `$state([])` | Computed line data for the current frame. |
| `prepared` | derived | Cached `PreparedTextWithSegments` object. |
| `lineHeight` | derived | Computed as `fontSize * 1.6`. |

## Controls

| Control | Type | Range | Effect |
|---|---|---|---|
| Font Size | Slider | 11 - 22 px | Changes text size; triggers text re-preparation. |
| Container Width | Slider | 400 - 950 px | Sets the base width before wave distortion is applied. |
| Wave Amplitude | Slider | 20 - 250 px | Controls the maximum horizontal displacement of lines. Higher values create more dramatic waves. |
| Wave Frequency | Slider | 1 - 8 (step 0.5) | Controls vertical density of wave cycles. Higher values create tighter oscillations. |
| Wave Speed | Slider | 0.2x - 5x (step 0.1) | Controls animation speed. 1x is the default rate. |
| Play / Pause | Button | toggle | Freezes or resumes the wave animation. |

## Visual Rendering

### Wave Guides
For each line, a subtle accent-colored (`#7c6cf0` at low opacity) rectangle is drawn showing the available space for that line. These guides make the wave shape visible even where there is no text.

### SVG Wave Overlay
Two SVG paths trace the left edge and right edge of the wave:
- The left edge path connects all the `x` values of each line.
- The right edge path connects all the `x + width` values.
- Paths are drawn with a gradient stroke that transitions from purple to green via HSL interpolation.
- Stroke width is thin (1-2px) and semi-transparent to avoid competing with the text.

### Text Lines
- Each line is positioned absolutely at its computed `(x, y)` coordinates.
- Text uses the standard theme color against the demo background.

## Key Technical Insight

The architectural lesson of Wave Distortion is **layout as a function of any mathematical expression**. The wave function is simply:

```
width(y, t) = containerWidth - |amplitude * sin(frequency * y/100 + t)|
```

But the same pattern works with:
- **Perlin noise**: organic, non-repeating undulations
- **User-drawn curves**: freehand shape boundaries
- **Physics simulations**: spring-damped oscillations
- **Audio input**: text that dances to music

Pretext's `layoutNextLine()` accepts any width value. The layout engine does not care where the number comes from. This decouples layout geometry from layout computation entirely, making text a first-class participant in generative art, data visualization, and interactive design.

No CSS layout model provides this capability. `shape-outside` works only with floats and requires predefined shapes. `column-width` is uniform across all columns. Pretext makes per-line width variation trivial.

## How to Replicate

1. **Prepare text once**: call `prepareWithSegments(text, buildFont(fontSize))` when text or font changes.

2. **Define your wave function**: choose amplitude, frequency, and speed parameters. The sine function is the simplest starting point, but any periodic or aperiodic function works.

3. **Set up the animation loop**: use `requestAnimationFrame`. Each frame, increment the phase by `speed * deltaFactor`.

4. **Compute per-line geometry**: for each line at position y, evaluate your wave function to get the horizontal offset. Derive the line's x-position and available width from the offset. Clamp the width to a minimum (40px) to avoid degenerate layouts.

5. **Layout line by line**: call `layoutNextLine(prepared, cursor, computedWidth)` in a loop until the text is exhausted or you have filled the visible area.

6. **Render the results**: position each line at its computed (x, y). Optionally draw wave guide rectangles and SVG edge paths for visual polish.

7. **Add controls**: expose amplitude, frequency, and speed as sliders. Add a play/pause toggle. Connect font size and container width sliders to trigger text re-preparation and re-layout respectively.

8. **Experiment with other functions**: replace `Math.sin` with noise functions, damped oscillators, or live data feeds. The layout loop remains identical -- only the width computation changes.
