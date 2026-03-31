# Text Silhouette Fill

## Overview

Text Silhouette Fill pours text into arbitrary shapes -- heart, star, circle, diamond -- by computing per-line widths from the shape boundary at each y-position. The text conforms to the silhouette as if it were liquid filling a container, with each line precisely trimmed to the shape's outline.

This demo matters because CSS has no viable solution for flowing text into arbitrary shapes. The `shape-inside` property has been abandoned by browsers, and `shape-outside` only works with floats on block edges. Pretext's `layoutNextLine()` makes any mathematical or geometric boundary a text container by accepting a different width for every line.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepareWithSegments(text, font)` | Prepares text with segment data for line-by-line layout. Called once per font size change. |
| `layoutNextLine(prepared, cursor, availableWidth)` | Lays out a single line within the width defined by the shape boundary at that y-position. Called once per visible line. |
| `buildFont(fontSize)` | Constructs the font descriptor for the given pixel size. |
| `LayoutCursor` type | Maintains read position between successive `layoutNextLine` calls. |

## How It Works

### Step 1: Text Preparation

On mount or when font size changes:

```
const font = buildFont(fontSize);
const prepared = prepareWithSegments(text, font);
```

The prepared object is cached and reused whenever the shape or shape size changes.

### Step 2: Shape Boundary Computation

Each shape is defined as a function `shapeWidth(y, shapeSize)` that returns the horizontal extent of the shape at vertical position y. For example, the circle:

```
function circleWidth(y, radius) {
  const dy = y - radius;
  if (Math.abs(dy) > radius) return 0;
  return 2 * Math.sqrt(radius * radius - dy * dy);
}
```

The heart uses parametric curves, the star uses intersections with polygon edges, and the diamond uses a simple linear function based on distance from the vertical midpoint.

### Step 3: Line-by-Line Layout Within Shape

For each line at vertical position y:

```
let cursor = { offset: 0 };
let y = 0;
const lines = [];

while (y < shapeHeight) {
  const width = shapeWidth(y + lineHeight / 2, shapeSize);
  if (width < minLineWidth) { y += lineHeight; continue; }
  const line = layoutNextLine(prepared, cursor, width);
  if (!line) break;
  const x = (shapeSize - width) / 2; // center within shape
  lines.push({ line, x, y, width });
  y += lineHeight;
}
```

Lines where the shape is too narrow are skipped, and the cursor does not advance, preserving text continuity.

### Step 4: Centering Lines Within Shape

Each line is horizontally centered by computing the x-offset as half the difference between the shape's bounding width and the line's available width. This creates the visual effect of text hugging both sides of the shape.

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(14)` | Font size in pixels (range 10-20). |
| `shapeSize` | `$state(400)` | Shape bounding dimension in pixels (range 200-600). |
| `selectedShape` | `$state('heart')` | Active shape: heart, star, circle, or diamond. |
| `lines` | `$state([])` | Computed line data for the current shape. |
| `prepared` | derived | Cached `PreparedTextWithSegments` object. |
| `lineHeight` | derived | Computed as `fontSize * 1.5`. |

## Controls

| Control | Type | Range | Effect |
|---|---|---|---|
| Shape Selector | Button group | heart / star / circle / diamond | Switches the active shape boundary function. |
| Font Size | Slider | 10 - 20 px | Changes text size; triggers text re-preparation and relayout. |
| Shape Size | Slider | 200 - 600 px | Scales the shape bounding box. Larger shapes fit more text. |

## Visual Rendering

### SVG Shape Outline
An SVG path traces the selected shape's outline behind the text. The outline uses the accent color (`#7c6cf0`) at low opacity, providing a ghost silhouette that frames the text.

### Text Lines
Each line is positioned absolutely at its computed `(x, y)` coordinates, centered within the shape boundary. Text uses the standard theme color.

### Shape Fill Guides
Optional faint horizontal bars at each line position show the available width, making the shape visible even in areas where text is sparse.

## Key Technical Insight

The architectural lesson of Text Silhouette Fill is that **any closed shape can become a text container** when you have per-line width control. CSS `shape-inside` was proposed to solve this problem but was never implemented by browsers. Pretext sidesteps the issue entirely: any function that maps a y-coordinate to a width is a valid text container.

The same pattern works with:
- **SVG paths**: sample the path boundary at each y to get width
- **Bitmap masks**: scan each row of a binary image for leftmost/rightmost opaque pixels
- **User-drawn shapes**: rasterize a freehand curve into per-line widths
- **3D projections**: project a 3D shape's cross-section onto 2D line widths

The shape boundary computation is completely decoupled from the text layout. Pretext does not need to understand shapes -- it only needs a width per line.

## How to Replicate

1. **Prepare text once**: call `prepareWithSegments(text, buildFont(fontSize))` when text or font changes.

2. **Define shape boundary functions**: for each shape, write a function that takes a y-position and returns the width of the shape at that height. Use geometry (circle equation, polygon edge intersection) or lookup tables.

3. **Compute per-line widths**: for each line at position y, evaluate the shape function. Skip lines where the width is below a minimum threshold (e.g., 20px).

4. **Layout line by line**: call `layoutNextLine(prepared, cursor, shapeWidth)` in a loop. Center each line horizontally within the shape by computing the x-offset.

5. **Render the results**: position each line at its computed (x, y). Draw an SVG outline of the shape behind the text for visual context.

6. **Add shape switching**: maintain a map of shape names to boundary functions. When the user selects a new shape, recompute all line widths and relayout.

7. **Add controls**: expose font size and shape size as sliders. Connect the shape selector buttons to trigger relayout with the new boundary function.

8. **Experiment with custom shapes**: try loading SVG paths, bitmap masks, or user-drawn curves as shape boundaries. The layout loop remains identical -- only the width function changes.
