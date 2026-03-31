# Text Earthquake

## Overview

Text Earthquake splits text along a diagonal fault line. When the user clicks, a crack appears through the text and the two halves separate like tectonic plates. Each side reflows to its new irregular shape -- the width of each line is determined by where the fault line crosses that y-position. An aftershock mode adds random displacement to simulate seismic tremors.

This demo matters because it shows that Pretext can split text along arbitrary lines and reflow both halves independently. The fault line position at each y determines the available width for that line on each side, and both halves maintain readable text through per-line variable width layout.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepareWithSegments(text, font)` | Prepares text with segment data for line-by-line layout. Called once per font size change. |
| `layoutNextLine(prepared, cursor, availableWidth)` | Lays out a single line at the width determined by the fault line position. Called per line per half. |
| `buildFont(fontSize)` | Constructs the font descriptor for the given pixel size. |
| `LayoutCursor` type | Maintains read position between successive `layoutNextLine` calls within each half. |

## How It Works

### Step 1: Text Preparation

On mount or when font size changes:

```
const font = buildFont(fontSize);
const prepared = prepareWithSegments(text, font);
```

### Step 2: Fault Line Computation

The fault line is a diagonal crossing the text area, defined by an angle and a center point:

```
function faultX(y, centerX, centerY, angle) {
  return centerX + (y - centerY) * Math.tan(angle);
}
```

At each y-position, `faultX(y)` gives the x-coordinate of the crack.

### Step 3: Pre-Quake Layout

Before the earthquake triggers, text is laid out normally across the full width. This establishes the visual starting point.

### Step 4: Post-Quake Split

When the earthquake triggers, two separate layout passes run:

**Left half:**
```
let cursorLeft = { offset: 0 };
let y = 0;
while (y < textHeight) {
  const width = faultX(y, ...) - separation / 2;
  if (width < minWidth) { y += lineHeight; continue; }
  const line = layoutNextLine(prepared, cursorLeft, width);
  if (!line) break;
  leftLines.push({ line, x: -separation / 2, y, width });
  y += lineHeight;
}
```

**Right half:**
```
let cursorRight = { offset: 0 };
y = 0;
while (y < textHeight) {
  const fx = faultX(y, ...) + separation / 2;
  const width = totalWidth - fx;
  if (width < minWidth) { y += lineHeight; continue; }
  const line = layoutNextLine(prepared, cursorRight, width);
  if (!line) break;
  rightLines.push({ line, x: fx + separation / 2, y, width });
  y += lineHeight;
}
```

Each half gets its own cursor and lays out independently. The text content in each half is different (left half gets the beginning of the text, right half gets the same or different text).

### Step 5: Separation Animation

After the crack appears, the two halves slide apart over time:

```
separation = lerp(0, maxSeparation, easeOut(t));
```

The separation value is added/subtracted from each half's x-positions.

### Step 6: Aftershock

In aftershock mode, random displacement is applied to each half:

```
shakeX = (Math.random() - 0.5) * shakeIntensity;
shakeY = (Math.random() - 0.5) * shakeIntensity;
```

The intensity decays over time, simulating diminishing tremors.

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(15)` | Font size in pixels (range 11-20). |
| `containerWidth` | `$state(700)` | Total container width in pixels (range 400-900). |
| `faultAngle` | `$state(0.2)` | Fault line angle in radians (range -0.8 to 0.8). |
| `separation` | `$state(0)` | Current separation distance between halves in pixels. |
| `maxSeparation` | `$state(60)` | Maximum separation when fully split (range 20-120). |
| `quakeActive` | `$state(false)` | Whether the earthquake has been triggered. |
| `aftershock` | `$state(false)` | Whether aftershock tremors are active. |
| `leftLines` | `$state([])` | Computed line data for the left half. |
| `rightLines` | `$state([])` | Computed line data for the right half. |
| `prepared` | derived | Cached `PreparedTextWithSegments` object. |
| `lineHeight` | derived | Computed as `fontSize * 1.5`. |

## Controls

| Control | Type | Range | Effect |
|---|---|---|---|
| Fault Angle | Slider | -0.8 to 0.8 rad | Adjusts the diagonal angle of the fault line. 0 is vertical. |
| Separation | Slider | 20 - 120 px | Maximum distance between halves when fully split. |
| Font Size | Slider | 11 - 20 px | Changes text size; triggers re-preparation and relayout. |
| Trigger Earthquake | Button | click | Starts the crack and separation animation. |
| Aftershock | Button | toggle | Enables/disables random tremor displacement. |
| Reset | Button | click | Returns halves to original position and removes the crack. |

## Visual Rendering

### Fault Line Crack
A jagged SVG path traces the fault line through the text. The path uses small random offsets from the mathematical diagonal to simulate a natural crack. The crack glows with an accent-colored (`#7c6cf0`) drop shadow.

### Left Half
The left half of the text renders at its computed positions, shifted left by `separation / 2`. Lines are trimmed to the fault boundary.

### Right Half
The right half renders at its computed positions, shifted right by `separation / 2`. Lines begin at the fault boundary and extend to the right edge.

### Aftershock Shake
When aftershock is active, both halves undergo random sub-pixel displacement that decays over 2-3 seconds, simulating seismic tremors.

### Debris Particles
Small particle effects along the crack line simulate falling rubble during the initial split and during aftershocks.

## Key Technical Insight

The architectural lesson of Text Earthquake is that **splitting text along arbitrary lines and reflowing both halves is only possible with per-line width control**. The fault line creates a different width boundary at every y-position for each half. The left half's width decreases where the fault moves left; the right half's width decreases where the fault moves right.

No CSS layout model supports this:
- You cannot split a text block along a diagonal
- `clip-path` can visually clip but does not reflow text
- `shape-outside` affects only float wrapping, not arbitrary splits

Pretext makes it possible because `layoutNextLine()` accepts any width. The fault line is just a function that produces two widths (left and right) at each y-position. The layout engine does not know it is rendering a geological simulation -- it simply lays out text at the widths it is given.

This pattern generalizes to:
- **Tearing effects**: rip text along a curved path
- **Folding effects**: fold text along a crease, reflowing each panel
- **Masking effects**: arbitrary shapes that text reflows around

## How to Replicate

1. **Prepare text once**: call `prepareWithSegments(text, buildFont(fontSize))` when text or font changes.

2. **Define the fault line function**: implement a function that takes y-position and returns the x-coordinate of the fault. A simple diagonal is `centerX + (y - centerY) * tan(angle)`.

3. **Compute per-line widths for each half**: for each y-position, the left half width is `faultX(y) - separation/2` and the right half width is `totalWidth - faultX(y) - separation/2`.

4. **Layout each half independently**: use separate cursors for left and right halves. Call `layoutNextLine(prepared, cursor, halfWidth)` per line per half.

5. **Animate the separation**: use `requestAnimationFrame` to interpolate separation from 0 to maxSeparation with easing.

6. **Draw the crack**: create a jagged SVG path along the fault line with small random offsets. Add a glow effect with CSS drop shadow or SVG filter.

7. **Add aftershock**: apply random displacement to each half's rendering offset. Decay the displacement intensity over time.

8. **Add controls**: expose fault angle, separation, and font size as sliders. Add buttons for triggering the earthquake, toggling aftershock, and resetting.
