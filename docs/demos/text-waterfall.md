# Text Waterfall Cascade

## Overview

Text Waterfall Cascade flows text down a series of 3-8 shelves of decreasing width, creating a cascading visual where text narrows as it descends -- like water flowing down a stepped waterfall. The cursor carries forward between shelves, so text continuity is preserved across the entire cascade.

This demo matters because it demonstrates Pretext's ability to maintain seamless text flow across arbitrarily many width changes. Each shelf has its own width, and the text simply continues from where it left off on the previous shelf. No browser layout model supports this kind of stepped, narrowing text container.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepareWithSegments(text, font)` | Prepares text with segment data for line-by-line layout. Called once per font size change. |
| `layoutNextLine(prepared, cursor, availableWidth)` | Lays out a single line at the current shelf's width. Called per line per shelf. |
| `buildFont(fontSize)` | Constructs the font descriptor for the given pixel size. |
| `LayoutCursor` type | Maintains read position between successive `layoutNextLine` calls, carrying seamlessly across shelves. |

## How It Works

### Step 1: Text Preparation

On mount or when font size changes:

```
const font = buildFont(fontSize);
const prepared = prepareWithSegments(text, font);
```

### Step 2: Shelf Geometry Computation

Shelf widths are linearly interpolated from `startWidth` to `endWidth`:

```
for (let i = 0; i < shelfCount; i++) {
  const t = i / (shelfCount - 1);
  const width = startWidth + t * (endWidth - startWidth);
  shelves.push({ width, height: shelfHeight });
}
```

Each shelf is centered horizontally, creating a cascade offset as widths decrease.

### Step 3: Sequential Shelf Fill

```
let cursor = { offset: 0 };
let globalY = 0;

for (const shelf of shelves) {
  let localY = 0;
  const shelfX = (maxWidth - shelf.width) / 2;

  while (localY + lineHeight <= shelf.height) {
    const line = layoutNextLine(prepared, cursor, shelf.width);
    if (!line) break;
    lines.push({ line, x: shelfX, y: globalY + localY, width: shelf.width });
    localY += lineHeight;
  }
  globalY += shelf.height;
}
```

The cursor carries forward between shelves. When a shelf fills, the next shelf picks up at the exact character where the previous shelf ended.

### Step 4: Auto-Play Animation

An optional auto-play mode smoothly animates the shelf count from minimum to maximum and back, creating a breathing cascade effect. The animation uses `requestAnimationFrame` with a configurable speed.

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(15)` | Font size in pixels (range 11-20). |
| `shelfCount` | `$state(5)` | Number of shelves (range 3-8). |
| `startWidth` | `$state(700)` | Width of the top shelf in pixels (range 400-900). |
| `endWidth` | `$state(200)` | Width of the bottom shelf in pixels (range 100-400). |
| `shelfHeight` | `$state(120)` | Height of each shelf in pixels (range 60-200). |
| `playing` | `$state(false)` | Whether auto-play animation is running. |
| `lines` | `$state([])` | All computed line data across all shelves. |
| `prepared` | derived | Cached `PreparedTextWithSegments` object. |
| `lineHeight` | derived | Computed as `fontSize * 1.5`. |

## Controls

| Control | Type | Range | Effect |
|---|---|---|---|
| Shelf Count | Slider | 3 - 8 | Number of cascade levels. More shelves create a finer staircase. |
| Start Width | Slider | 400 - 900 px | Width of the top (widest) shelf. |
| End Width | Slider | 100 - 400 px | Width of the bottom (narrowest) shelf. |
| Font Size | Slider | 11 - 20 px | Changes text size; triggers re-preparation. |
| Shelf Height | Slider | 60 - 200 px | Height of each shelf before overflow to next. |
| Auto-Play | Button | toggle | Animates shelf count up and down continuously. |

## Visual Rendering

### Shelf Backgrounds
Each shelf is drawn as a bordered rectangle, centered horizontally. Shelf backgrounds alternate between two subtle shades, making the cascade steps visible.

### Cascade Edges
Vertical lines connect the edges of adjacent shelves, creating the stepped waterfall outline. These lines use the accent color at low opacity.

### Text Lines
Each line is positioned at its computed `(x, y)` within its shelf. Lines are centered within their shelf's width. Text uses the standard theme color.

### Shelf Labels
Small labels at the top-right of each shelf indicate its width in pixels, providing a visual reference for the cascade progression.

## Key Technical Insight

The architectural lesson of Text Waterfall Cascade is that **`layoutNextLine`'s cursor seamlessly carries across any number of width changes**. The cursor is an opaque value that records the exact byte offset in the prepared text. It does not store any information about the previous line's width, container, or position.

This means:
- You can change width on every single line (as in Wave Distortion)
- You can change width in blocks (as in this cascade)
- You can route the same text through completely different containers
- You can pause layout, serialize the cursor, and resume later

The cursor is the key abstraction that makes Pretext's line-by-line API composable. Each `layoutNextLine` call is stateless except for the cursor -- there is no hidden layout context, no container state, no accumulated line metrics. This is what makes Pretext fundamentally different from browser layout engines.

## How to Replicate

1. **Prepare text once**: call `prepareWithSegments(text, buildFont(fontSize))` when text or font changes.

2. **Define shelf geometry**: compute an array of shelf widths by interpolating from start to end width. Set a uniform height for each shelf.

3. **Center shelves horizontally**: compute each shelf's x-offset as half the difference between the maximum width and the shelf's width.

4. **Layout shelf by shelf**: for each shelf, call `layoutNextLine(prepared, cursor, shelfWidth)` in a loop until the shelf height is filled. Do not reset the cursor between shelves.

5. **Render the results**: position each line at its computed (x, y). Draw shelf backgrounds and cascade edge lines for visual structure.

6. **Add auto-play**: use `requestAnimationFrame` to animate the shelf count or widths over time. The layout recomputes each frame.

7. **Add controls**: expose shelf count, start width, end width, font size, and shelf height as sliders. Add a play/pause toggle for auto-play.

8. **Experiment with non-linear interpolation**: try easing functions (quadratic, exponential) for shelf width progression instead of linear interpolation. The layout loop remains identical.
