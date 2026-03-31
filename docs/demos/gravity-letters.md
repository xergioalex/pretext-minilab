# Gravity Letters

## Overview

Gravity Letters transforms individual characters into physics particles. Each letter falls under gravity, bounces off container walls, and can be exploded outward from the center. Characters are colored by their velocity -- fast-moving letters glow with the accent color while settled letters use the standard text color. A reset button smoothly animates every letter back to its Pretext-computed home position, reassembling readable text from chaos.

This demo matters because it proves that Pretext provides exact per-character positioning. The layout engine knows where every character belongs, enabling a seamless round-trip between structured text and freeform particle animation. Reset is not a "reload" -- it is a smooth interpolation back to mathematically precise target positions.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepareWithSegments(text, font)` | Prepares text with segment-level data for extracting per-character positioning. |
| `layoutWithLines(prepared, maxWidth, lineHeight)` | Computes the full multi-line layout. Lines and segments provide the home coordinates for each character. |
| `buildFont(fontSize)` | Constructs the font descriptor used for both Pretext preparation and Canvas text measurement. |

## How It Works

### Step 1: Character Position Extraction

On mount or when font size changes:

1. Call `prepareWithSegments(text, buildFont(fontSize))`.
2. Call `layoutWithLines(prepared, containerWidth, lineHeight)`.
3. For each line in the result, iterate characters one by one.
4. For each character, measure its width using `ctx.measureText(char).width` on a Canvas context with the matching font.
5. Build a letter object:
   - `char`: the character string.
   - `homeX`: cumulative x offset within the line + half the character width (center point).
   - `homeY`: line index * lineHeight + lineHeight / 2 (vertical center).
   - `x`, `y`: current position (initially equal to home position).
   - `vx`, `vy`: velocity components (initially 0).
   - `rotation`: current rotation angle (initially 0).
   - `vr`: rotational velocity (initially 0).
   - `fallen`: whether the letter has been affected by physics.
   - `width`: measured character width.

### Step 2: Physics Simulation (per frame when active)

When physics mode is active, each letter is updated:

```
// Apply gravity
vx += gravityX * 0.3;
vy += gravityY * 0.3;

// Apply damping
vx *= 0.98;
vy *= 0.98;

// Update position
x += vx;
y += vy;

// Wall bounce
if (x < 0 || x > containerWidth) { vx *= -0.6; x = clamp(x, 0, containerWidth); }
if (y < 0 || y > containerHeight) { vy *= -0.6; y = clamp(y, 0, containerHeight); }

// Rotation
vr *= 0.98;  // rotational friction
rotation += vr;
```

### Step 3: Shake Effect

When shake is active (intensity > 0):
- Each frame, add random velocity impulses: `vx += (Math.random() - 0.5) * intensity`, same for `vy`.
- Add random rotational impulse: `vr += (Math.random() - 0.5) * intensity * 0.1`.
- Intensity decays each frame: `intensity *= 0.95`. When below a threshold, set to 0.

### Step 4: Reset Animation

When reset is triggered:
- Disable physics mode.
- Each frame, interpolate (lerp) each letter toward its home position:
  ```
  x += (homeX - x) * 0.08;
  y += (homeY - y) * 0.08;
  rotation += (0 - rotation) * 0.08;
  ```
- Velocity is zeroed out.
- When all letters are within a small epsilon of their home positions, snap them exactly and stop the animation loop.

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(24)` | Font size in pixels (range 14-36). |
| `letters` | `$state([])` | Array of letter particle objects with position, velocity, and home data. |
| `gravityX`, `gravityY` | `$state` | Gravity direction vector. Default (0, 1) for downward. |
| `physicsActive` | `$state(false)` | Whether physics simulation is running. |
| `shakeIntensity` | `$state(0)` | Current shake magnitude, decays over time. |
| `prepared` | derived | Cached `PreparedTextWithSegments` object. |
| `lineHeight` | derived | Computed as `fontSize * 1.5`. |

## Controls

| Control | Type | Effect |
|---|---|---|
| Font Size | Slider | 14 - 36 px. Changes letter size and triggers full re-extraction of home positions. |
| Fall Down | Button | Sets gravity to (0, 1), enables physics. Letters fall to the bottom. |
| Fall Up | Button | Sets gravity to (0, -1), enables physics. Letters fly to the top. |
| Fall Left | Button | Sets gravity to (-1, 0), enables physics. Letters slide to the left. |
| Fall Right | Button | Sets gravity to (1, 0), enables physics. Letters slide to the right. |
| Explode | Button | Applies outward velocity from the container center to each letter, enables physics. |
| Shake | Button | Sets shake intensity to 15. Random velocity impulses are applied each frame until intensity decays to 0. |
| Reset | Button | Disables physics and smoothly animates all letters back to their home positions. |

## Visual Rendering

All rendering uses the Canvas 2D API with DPR (device pixel ratio) awareness for crisp text on Retina displays.

### Background
- Filled with the theme background color matching the demo area.

### Letters
- Each letter is drawn at its current `(x, y)` position with its current `rotation`.
- Canvas transformations: `ctx.save()`, `ctx.translate(x, y)`, `ctx.rotate(rotation)`, `ctx.fillText(char, 0, 0)`, `ctx.restore()`.
- **Color by velocity**: the speed magnitude `sqrt(vx^2 + vy^2)` determines the color.
  - Fast letters (speed > threshold): accent color `#7c6cf0`.
  - Slow/settled letters: standard text color from theme.
  - Intermediate speeds: interpolated between the two.
- **Text shadow**: `ctx.shadowBlur` is proportional to speed, creating a glow effect on fast-moving letters.
- **Alpha**: smooth transition based on velocity magnitude. Very fast letters may have slightly reduced opacity for a motion-blur feel.

## Key Technical Insight

The core insight is that **Pretext knows the exact home position of every character**. This is not approximate -- it is the precise pixel coordinate where that character would be rendered in a properly typeset paragraph.

This enables a pattern that is impossible with DOM text rendering: decompose text into particles, apply arbitrary physics or animation, then reassemble to the exact original layout. With DOM text, you would need to:
1. Render the paragraph.
2. Use `Range` and `getBoundingClientRect()` to measure each character (triggering N reflows).
3. Store the positions.
4. Animate.
5. Hope the positions are still valid when you reassemble.

With Pretext, steps 1-3 are replaced by a single `layoutWithLines()` call that returns mathematically exact coordinates. There is no DOM involvement, no reflow cascade, and the positions are deterministic -- they will be identical every time for the same input parameters.

This pattern generalizes to any "text decomposition" use case: letter-by-letter reveal animations, text morphing between two paragraphs, characters that react to mouse proximity, or text that assembles from scattered positions on page load.

## How to Replicate

1. **Extract character positions**: prepare text with `prepareWithSegments`, layout with `layoutWithLines`, then walk lines and segments to compute per-character (x, y) home positions. Use Canvas `measureText` for individual character widths.

2. **Create particle objects**: for each character, store home position, current position, velocity, rotation, and rotational velocity.

3. **Implement physics loop**: use `requestAnimationFrame`. Apply gravity as a constant acceleration. Update velocity with damping (multiply by 0.98). Update position from velocity. Bounce off walls by reversing and attenuating the velocity component.

4. **Add action triggers**: buttons for directional gravity set the gravity vector and enable physics. Explode computes outward velocity from center for each letter. Shake adds random impulses.

5. **Implement reset**: disable physics, lerp each letter toward its home position each frame. Zero out velocity and rotation. Snap when close enough.

6. **Render on Canvas**: use `save/translate/rotate/fillText/restore` per character. Color based on velocity magnitude. Add shadow blur proportional to speed.

7. **Handle font size changes**: when the slider changes, re-extract all home positions via Pretext, reset letter current positions to the new homes, and clear all velocities.

8. **DPR awareness**: scale the canvas by `window.devicePixelRatio` for sharp rendering on high-DPI screens. Set canvas CSS size to logical size and canvas attribute size to physical size.
