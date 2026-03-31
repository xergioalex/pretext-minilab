# Dragon Chase

## Overview

Dragon Chase is the flagship demo of Pretext Lab. A serpentine chain of 40 glowing spheres follows the mouse cursor while text reflows around every orb in real time at 60fps. Each sphere has a radius that decreases linearly from head to tail, creating an organic trail that carves dynamic exclusion zones through the text. The demo proves that Pretext can handle hundreds of variable-width layout calls per frame without dropping below 60fps -- something impossible with DOM-based text measurement.

This matters because it demonstrates the most extreme use case for programmatic text layout: an arbitrary, continuously moving shape that the text must flow around, recomputed every single animation frame.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepareWithSegments(text, font)` | Tokenizes the input text into measured segments once, producing a `PreparedTextWithSegments` object that can be reused across all subsequent layout calls. |
| `layoutNextLine(prepared, cursor, availableWidth)` | Lays out one line of text at a time, returning a `LayoutLine` or `null`. Called repeatedly per frame with a different `availableWidth` for each line based on sphere collision geometry. |
| `buildFont(fontSize)` | Constructs the font descriptor object required by `prepare` and `prepareWithSegments`. |
| `LayoutCursor` type | Tracks the current position within the prepared text between successive `layoutNextLine` calls. |
| `SAMPLE_TEXTS.long` | Provides a sufficiently long sample paragraph to fill the visible area and demonstrate reflow. |

## How It Works

### Step 1: Text Preparation (once, or when font size changes)

When the component mounts or the font size slider changes, the text is prepared:

```
const font = buildFont(fontSize);
const prepared = prepareWithSegments(text, font);
```

This is the expensive step -- font metrics are measured via Canvas. The result is cached and reused every frame.

### Step 2: Chain Physics (every frame)

The chain is an array of 40 spheres, each stored as `[x, y, radius]`.

- **Head**: follows the mouse position with an easing factor of 0.12 (`head += (mouse - head) * 0.12`), giving smooth, organic motion.
- **Body segments**: each segment follows the previous one, maintaining a constant distance of 8px between centers. The position is computed by finding the angle from the current segment to the previous one and placing it exactly 8px away.
- **Radius**: linearly interpolated from ~24px at the head (segment 0) to ~3px at the tail (segment 39).
- **Idle animation**: if the mouse has not moved for 2 seconds, the head automatically traces a figure-8 (Lissajous) pattern to keep the demo visually active.

### Step 3: Per-Line Collision Detection (every frame)

For each candidate text line at vertical position `y`:

1. Iterate all 40 spheres.
2. For each segment, check if the vertical distance between the line's vertical center and the segment center is less than the segment's radius. If so, the segment blocks that line.
3. Compute the horizontal extent (left edge, right edge) of each blocking segment at the line's y-position using circle geometry: `halfWidth = sqrt(radius^2 - verticalDistance^2)`.
4. Accumulate the leftmost and rightmost horizontal blockage across all 40 spheres.
5. Determine which side of the blockage has more available space (left of obstacles vs. right of obstacles).
6. Use the wider side as the available width for that line.

This means up to 40 collision checks per line, and the layout may produce 30-50+ visible lines per frame.

### Step 4: Line-by-Line Layout (every frame)

With the available width computed for each line:

```
let cursor = { offset: 0 };
let y = 0;
const lines = [];

while (y < containerHeight) {
  const availableWidth = computeAvailableWidth(y, lineHeight, dragonSegments);
  const line = layoutNextLine(prepared, cursor, availableWidth);
  if (!line) break;
  lines.push({ line, x: computeXOffset(y), y });
  y += lineHeight;
}
```

Each call to `layoutNextLine` advances the cursor through the prepared text and returns the glyphs that fit within the given width.

### Step 5: Rendering

The computed lines and spheres are drawn to the screen.

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(16)` | Current font size in pixels, controlled by slider (range 11-22). |
| `containerWidth` | `$state(700)` | Width of the text container in pixels, controlled by slider. |
| `mouseX`, `mouseY` | `$state` | Current mouse position relative to the container. |
| `segments` | `$state([...])` | Array of 40 `[x, y, radius]` tuples representing the sphere chain. |
| `lines` | `$state([])` | Computed text lines for the current frame, each with position and content. |
| `lastMouseMove` | `$state` | Timestamp of last mouse movement, used to trigger idle animation after 2s. |
| `prepared` | derived | The `PreparedTextWithSegments` object, recomputed when `fontSize` or text changes. |
| `lineHeight` | derived | Computed as `fontSize * 1.5`. |

## Controls

| Control | Type | Range | Effect |
|---|---|---|---|
| Font Size | Slider | 11 - 22 px | Changes text size; triggers re-preparation of text and re-layout. |
| Container Width | Slider | 400 - 950 px | Changes the maximum available width for text layout. |
| Mouse Position | Mouse move | Container bounds | Drives the head sphere position; all segments follow. |

## Visual Rendering

### Sphere Chain
- Each of the 40 spheres is drawn as a circle with a radial gradient.
- Hue varies per segment across the purple range (260-300 degrees in HSL), creating a subtle color shift from head to tail.
- The head segment has two small white circles for eyes.
- Opacity fades toward the tail (segment 0 is fully opaque, segment 39 is nearly transparent).
- An optional glow effect (CSS `filter: blur` or Canvas shadow) surrounds each segment.

### Text Lines
- Each line is positioned absolutely at its computed `(x, y)` coordinates.
- Lines that have been displaced by the sphere chain (i.e., their available width differs from the full container width) are colored with the accent color (`#7c6cf0`) to visually highlight the reflow effect.
- Undisplaced lines use the standard text color.

## Key Technical Insight

The core lesson of Dragon Chase is **throughput under adversarial conditions**. Every frame requires:

- 40 sphere position updates (physics)
- ~30-50 lines x 40 spheres = 1,200-2,000 collision checks (geometry)
- ~30-50 calls to `layoutNextLine()`, each with a unique width (text layout)

With DOM-based measurement, each `layoutNextLine` equivalent would require setting an element's width, inserting text, and reading back the resulting height -- triggering a browser reflow. At 30-50 reflows per frame at 60fps, the browser would be computing 1,800-3,000 reflows per second. This is fundamentally impossible in DOM.

Pretext reduces text layout to pure arithmetic over pre-measured glyph data. No DOM reads, no reflows, no style recalculations. The entire per-frame computation is a tight loop of number crunching that completes in under 2ms.

## How to Replicate

1. **Prepare text once**: call `prepareWithSegments(text, buildFont(fontSize))` and cache the result. Re-prepare only when the text or font size changes.

2. **Model your obstacle**: define the chain as an array of circle segments. Implement a simple "follow the leader" chain where each segment trails the previous one at a fixed distance.

3. **Add mouse tracking**: attach a `mousemove` listener to your container. Apply easing to the head position for smooth following.

4. **Implement idle animation**: track time since last mouse move. After a threshold (e.g., 2 seconds), drive the head along a parametric curve (figure-8 / Lissajous).

5. **Compute per-line exclusion**: for each text line at vertical position y, iterate all segments and determine horizontal blockage using circle-line intersection math.

6. **Layout line by line**: use `layoutNextLine()` in a loop, passing the computed available width for each line. Accumulate results into a lines array.

7. **Render with `requestAnimationFrame`**: draw spheres as gradient circles. Position text lines at their computed coordinates. Highlight displaced lines.

8. **Optimize**: avoid re-preparing text every frame. Only the layout loop (step 6) and physics (step 2) run per frame. Keep segment count and collision checks proportional to what your target hardware can handle at 60fps.
