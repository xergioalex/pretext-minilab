# Text Rain

## Overview

Text Rain is a canvas-based particle system inspired by Camille Utterback's art installation of the same name. Characters fall like rain from the top of the canvas, land on a mouse-controlled horizontal shelf, and then snap to their home positions to form readable text. The transition from chaos to order reveals how Pretext provides exact character positions for reassembly without relying on DOM rendering.

This demo matters because it separates text measurement from text rendering. Pretext computes the exact (x, y) position of every character in a laid-out paragraph. These positions become "home" targets for a particle system, enabling text to exist as a physical simulation that resolves into legible layout.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepareWithSegments(text, font)` | Prepares text with segment data for per-character position extraction. Called once per font size change. |
| `layoutWithLines(prepared, maxWidth, lineHeight)` | Computes full layout with line-level detail, providing character positions that serve as particle home targets. |
| `buildFont(fontSize)` | Constructs the font descriptor for the given pixel size. |

## How It Works

### Step 1: Text Preparation and Home Position Computation

On mount or when font size changes:

```
const font = buildFont(fontSize);
const prepared = prepareWithSegments(text, font);
const result = layoutWithLines(prepared, containerWidth, lineHeight);
```

From the layout result, each character's home position is extracted: the (x, y) coordinate where it belongs in the final laid-out paragraph.

### Step 2: Particle Initialization

Each character becomes a particle with:

```
{
  char: 'a',
  homeX: 120, homeY: 40,   // from layoutWithLines
  x: random(0, canvasWidth), y: -random(0, 200), // start above canvas
  vy: random(1, 3),        // fall speed
  state: 'falling'         // falling | landed | homing | home
}
```

### Step 3: Physics Simulation

Each frame, particles are updated based on their state:

- **Falling**: `y += vy`. Gravity accelerates the particle downward.
- **Landed**: the particle has hit the shelf (mouse y-position). It sits on the shelf until the snap trigger.
- **Homing**: the particle interpolates toward its home position using eased lerp: `x += (homeX - x) * 0.08; y += (homeY - y) * 0.08`.
- **Home**: the particle has arrived at its home position and renders crisply.

### Step 4: Mouse Shelf

The horizontal shelf follows the mouse y-position. Falling particles collide with the shelf:

```
if (particle.state === 'falling' && particle.y >= shelfY) {
  particle.y = shelfY;
  particle.vy = 0;
  particle.state = 'landed';
}
```

Moving the shelf up catches particles earlier; moving it down lets them fall further.

### Step 5: Snap-to-Home Trigger

When the user clicks or after a timer, all landed particles transition to the 'homing' state and begin interpolating toward their home positions. Once within 1 pixel of home, they snap to exact position and enter the 'home' state.

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(16)` | Font size in pixels (range 12-24). |
| `containerWidth` | `$state(600)` | Layout width for computing home positions (range 300-800). |
| `fallSpeed` | `$state(2)` | Base fall speed multiplier (range 0.5-5). |
| `particles` | internal | Array of particle objects with position, velocity, and state. |
| `shelfY` | internal | Current mouse y-position (the shelf height). |
| `prepared` | derived | Cached `PreparedTextWithSegments` object. |
| `lineHeight` | derived | Computed as `fontSize * 1.6`. |

## Controls

| Control | Type | Range | Effect |
|---|---|---|---|
| Font Size | Slider | 12 - 24 px | Changes text size; recomputes home positions and resets particles. |
| Fall Speed | Slider | 0.5 - 5x | Controls how fast characters fall. |
| Reset | Button | click | Resets all particles to falling state above the canvas. |
| Mouse Position | Mouse | canvas area | Controls the horizontal shelf height where particles land. |

## Visual Rendering

### Falling Characters
Falling particles render in the accent color (`#7c6cf0`) at 50% opacity. Each character is drawn at its current (x, y) position using canvas `fillText()`. A slight motion blur effect (previous position at lower opacity) suggests movement.

### Landed Characters
Characters resting on the shelf render at 70% opacity in the accent color, clustered along the shelf line.

### Homing Characters
Characters in transit to their home positions render with increasing opacity as they approach home. A subtle trail connects their current position to their home position.

### Home Characters
Characters at their final positions render at full opacity in the standard text color, forming the complete, readable paragraph.

### Shelf Line
A horizontal line at the mouse y-position, drawn in accent color at low opacity, shows the current shelf.

## Key Technical Insight

The architectural lesson of Text Rain is that **Pretext provides exact character positions for reassembly without rendering**. The `layoutWithLines()` API returns the precise (x, y) coordinate of every character in the laid-out text. These coordinates are normally used for rendering, but here they serve as target positions for a particle system.

This decoupling of measurement from rendering enables:
- **Text as particles**: characters exist as independent physics objects that resolve into layout
- **Animated text assembly**: characters fly in from any direction to form words
- **Text explosions**: reverse the process -- characters scatter from their home positions
- **Morphing between layouts**: interpolate character positions between two different layout configurations

No browser API gives you per-character positions for arbitrary text layout. `getBoundingClientRect()` works only for DOM elements, not individual characters within a text node. Canvas `measureText()` gives width but not per-character offsets. Pretext provides this data as a direct output of the layout computation.

## How to Replicate

1. **Prepare text and compute layout**: call `prepareWithSegments(text, buildFont(fontSize))` and `layoutWithLines(prepared, width, lineHeight)`. Extract per-character (x, y) positions from the line data.

2. **Create particles**: for each character, create a particle object with a home position (from layout), a random starting position above the canvas, and a fall velocity.

3. **Run the simulation loop**: use `requestAnimationFrame`. Each frame, update particle positions based on their state (falling, landed, homing, home).

4. **Implement the shelf**: track mouse y-position. Falling particles that reach the shelf y-position stop and transition to the landed state.

5. **Implement snap-to-home**: on click or timer, transition all landed particles to the homing state. Interpolate toward home positions using eased lerp.

6. **Render on canvas**: draw each character at its current position using `ctx.fillText()`. Vary opacity and color by particle state.

7. **Add controls**: expose font size and fall speed as sliders. Add a reset button that returns all particles to the falling state.

8. **Experiment with variations**: try different starting formations (circle, grid, random), different easing functions for homing, or bidirectional mode where characters scatter and reassemble continuously.
