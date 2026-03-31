# Typographic Heatmap

## Overview

Typographic Heatmap color-codes each line of text by character density (characters per pixel of width), revealing patterns in text composition that are invisible to the naked eye. Two visualization modes -- density and fill ratio -- expose different aspects of typographic quality. A side bar chart displays density per line, and a river detection algorithm highlights consecutive aligned whitespace gaps.

This demo matters because Pretext gives per-line metrics (character count, line width, segment positions) that no browser API exposes. These metrics enable quantitative typography analysis: identifying loose lines, tight lines, and whitespace rivers that degrade readability.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepareWithSegments(text, font)` | Prepares text with segment data for per-line analysis. Called once per font size change. |
| `layoutWithLines(prepared, maxWidth, lineHeight)` | Computes layout with full line-level detail (character ranges, widths). Provides the per-line data needed for density analysis. |
| `buildFont(fontSize)` | Constructs the font descriptor for the given pixel size. |

## How It Works

### Step 1: Text Preparation and Layout

On mount or when font size or width changes:

```
const font = buildFont(fontSize);
const prepared = prepareWithSegments(text, font);
const result = layoutWithLines(prepared, containerWidth, lineHeight);
```

The `result.lines` array contains per-line data including character ranges and positions.

### Step 2: Density Computation

For each line, character density is computed:

```
for (const line of result.lines) {
  const charCount = line.endOffset - line.startOffset;
  const density = charCount / containerWidth; // chars per pixel
}
```

Densities are normalized relative to the maximum density in the text to produce a 0-1 value for color mapping.

### Step 3: Fill Ratio Mode

In fill ratio mode, the metric is how much of the available width each line actually uses:

```
const fillRatio = line.usedWidth / containerWidth;
```

Lines that nearly fill the width (ratio close to 1.0) are considered well-set. Lines with low fill ratios (short last lines of paragraphs, or lines with wide word gaps) are highlighted.

### Step 4: Color Mapping

Normalized metrics map to a color scale:

- **Density mode**: low density (loose lines) = cool blue, high density (tight lines) = hot red
- **Fill ratio mode**: low fill = yellow warning, high fill = green optimal

### Step 5: River Detection

Rivers are consecutive lines where whitespace gaps align vertically:

```
for each line, find positions of space characters
for consecutive lines, check if any space positions are within a threshold of each other
mark sequences of 3+ aligned spaces as rivers
```

Detected rivers are highlighted with a semi-transparent overlay.

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(16)` | Font size in pixels (range 11-22). |
| `containerWidth` | `$state(600)` | Container width in pixels (range 300-900). |
| `mode` | `$state('density')` | Visualization mode: density or fill ratio. |
| `text` | `$state(...)` | Input text. Defaults to a long prose passage. |
| `lines` | `$state([])` | Computed line data with density/fill metrics. |
| `rivers` | `$state([])` | Detected whitespace river coordinates. |
| `prepared` | derived | Cached `PreparedTextWithSegments` object. |
| `lineHeight` | derived | Computed as `fontSize * 1.6`. |

## Controls

| Control | Type | Range | Effect |
|---|---|---|---|
| Font Size | Slider | 11 - 22 px | Changes text size; triggers re-preparation and reanalysis. |
| Width | Slider | 300 - 900 px | Container width. Different widths produce different density patterns. |
| Mode | Toggle | density / fill ratio | Switches the color-coding metric. |
| Text Input | Textarea | free text | Custom text to analyze. |

## Visual Rendering

### Color-Coded Lines
Each line of text has a background color derived from its density or fill ratio. Colors use a perceptually uniform scale to ensure differences are visually meaningful. Text renders in white or dark color depending on background luminance for readability.

### Side Bar Chart
A vertical bar chart alongside the text shows the density (or fill ratio) of each line. Bars are colored to match the line backgrounds. The chart provides a quantitative view that complements the qualitative color overlay.

### River Highlights
Detected whitespace rivers are marked with semi-transparent accent-colored (`#7c6cf0`) vertical strips that span the aligned gap positions across consecutive lines. A subtle glow effect draws attention to the river paths.

### Density Legend
A color scale legend at the top maps colors to density values, allowing users to read exact values from line colors.

## Key Technical Insight

The architectural lesson of Typographic Heatmap is that **Pretext gives per-line metrics that reveal typography quality invisible to the naked eye**. Professional typographers spend significant effort adjusting text to avoid loose lines, tight lines, and whitespace rivers. But without per-line metrics, this analysis requires manual inspection.

Pretext's `layoutWithLines()` returns:
- Exact character ranges per line (enabling density computation)
- Line widths (enabling fill ratio analysis)
- Character positions (enabling whitespace gap detection)

This data enables automated typography quality tools:
- **Readability scoring**: flag lines with extreme density
- **River detection**: identify distracting whitespace patterns
- **Hyphenation optimization**: test different hyphenation strategies and measure their impact on line density uniformity
- **Font comparison**: compare how different fonts distribute text across lines at the same width

No browser API provides per-line character counts or fill ratios. You would need to measure individual characters with `measureText()` and manually track line breaks -- a slow, error-prone process.

## How to Replicate

1. **Prepare text and layout**: call `prepareWithSegments(text, buildFont(fontSize))` and `layoutWithLines(prepared, width, lineHeight)`.

2. **Compute per-line metrics**: for each line in the result, calculate character density (chars / width) or fill ratio (used width / available width).

3. **Normalize metrics**: find the min and max values across all lines and normalize to a 0-1 range for color mapping.

4. **Map to colors**: use a color scale (e.g., blue-to-red for density, yellow-to-green for fill ratio) to assign a background color to each line.

5. **Detect rivers**: for each pair of consecutive lines, find space character positions that are within a pixel threshold of each other. Mark sequences of 3+ aligned spaces as rivers.

6. **Render color-coded lines**: draw each line with its computed background color. Overlay river highlights where detected.

7. **Add a side bar chart**: draw a vertical bar for each line showing its metric value. Color bars to match line backgrounds.

8. **Add controls**: expose font size, width, mode toggle, and text input. Each change triggers reanalysis and rerendering.
