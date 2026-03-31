# Text Vortex

## Overview

Text Vortex spins characters in a colorful vortex, spiral, or circular orbit, then smoothly reassembles them into readable text. Characters exist simultaneously as "content to read" and "particles to animate," transitioning between chaos and order with a single button click. Home positions are computed by the Pretext layout engine, and the reassembly animation interpolates every character to its exact typographic coordinate.

This demo matters because it showcases the full chaos-to-order pipeline: Pretext provides deterministic target positions without ever rendering text to the DOM, enabling smooth transitions from any arbitrary particle arrangement back to a properly typeset paragraph.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepareWithSegments(text, font)` | Prepares text with segment data. Called once per font size change. |
| `layoutWithLines(prepared, maxWidth, lineHeight)` | Computes the full paragraph layout, providing per-line segment positions that are used to derive per-character home coordinates. |
| `buildFont(fontSize)` | Constructs the font descriptor for the specified pixel size. |

## How It Works

### Step 1: Particle Initialization

On mount or when font size / container width changes:

1. Call `prepareWithSegments(text, buildFont(fontSize))`.
2. Call `layoutWithLines(prepared, containerWidth, lineHeight)`.
3. Walk lines and characters to extract per-character home positions (same technique as Gravity Letters: cumulative x-offset within each line, y from line index).
4. For each character, compute polar coordinates relative to the container center:
   - `homeAngle = Math.atan2(homeY - centerY, homeX - centerX)`
   - `homeRadius = Math.sqrt((homeX - centerX)^2 + (homeY - centerY)^2)`
5. Create particle object:
   - `char`: the character.
   - `homeX`, `homeY`: Cartesian home position from layout.
   - `x`, `y`: current Cartesian position.
   - `angle`: current polar angle (initialized from `homeAngle`).
   - `radius`: current polar radius (initialized from `homeRadius`).
   - `homeAngle`, `homeRadius`: polar home coordinates.
   - `width`: measured character width.
   - `rotation`: visual rotation of the character glyph.

### Step 2: Animation Modes

A time accumulator advances each frame. The current mode determines how particles move:

**Vortex Mode:**
- Each particle's angle increments by a speed factor that is inversely proportional to its radius (particles closer to center spin faster).
- `angle += (speedFactor / (radius + 50)) * deltaTime`
- Radius remains constant, creating a whirlpool effect where inner characters orbit rapidly and outer characters drift slowly.

**Spiral Mode:**
- Angle increments at a constant rate per particle.
- Radius oscillates sinusoidally: `radius = homeRadius + sin(time * spiralFreq + particleIndex) * oscillationAmplitude`.
- When radius exceeds bounds, it wraps, creating a breathing spiral.

**Circle Mode:**
- All particles orbit at fixed radii with constant angular velocity.
- `angle += constantSpeed * deltaTime`
- Produces a clean, uniform circular motion where the text forms a rotating ring structure.

**Text Mode (Reassemble):**
- No polar coordinate animation. Instead, the transition progress interpolates toward 1 (see Step 3).

### Step 3: Transition System

A `transitionProgress` value (0 to 1) controls the blend between chaotic and ordered states:

- **0**: fully in the current animation mode. Characters are at their polar-coordinate positions.
- **1**: fully assembled. Characters are at their Pretext home positions.

Each frame, `transitionProgress` lerps toward a target:
```
transitionProgress += (targetTransition - transitionProgress) * 0.04;
```

The displayed position of each character is:
```
displayX = lerp(polarX, homeX, transitionProgress);
displayY = lerp(polarY, homeY, transitionProgress);
displayRotation = lerp(currentRotation, 0, transitionProgress);
```

Where `polarX = centerX + radius * cos(angle)` and `polarY = centerY + radius * sin(angle)`.

When an animation mode button is pressed, `targetTransition` is set to 0 (disperse). When the reassemble button is pressed, `targetTransition` is set to 1 (converge).

### Step 4: Rendering

All rendering happens on a DPR-aware Canvas (see Visual Rendering below).

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(20)` | Font size in pixels (range 14-32). |
| `containerWidth` | `$state(600)` | Container width in pixels. |
| `mode` | `$state('text')` | Current animation mode: `'text'`, `'vortex'`, `'spiral'`, or `'circle'`. |
| `particles` | `$state([])` | Array of particle objects with character, home, current position, and polar data. |
| `transitionProgress` | `$state(1)` | Blend factor from chaos (0) to readable text (1). |
| `targetTransition` | `$state(1)` | Target value that `transitionProgress` lerps toward. |
| `time` | internal | Accumulated time for animation functions. |
| `prepared` | derived | Cached `PreparedTextWithSegments` object. |
| `lineHeight` | derived | Computed as `fontSize * 1.5`. |

## Controls

| Control | Type | Effect |
|---|---|---|
| Font Size | Slider | 14 - 32 px. Changes character size and recalculates all home positions. |
| Container Width | Slider | Sets the layout width for home position computation. |
| Vortex | Button | Activates vortex mode. Sets target transition to 0 (disperse). |
| Spiral | Button | Activates spiral mode. Sets target transition to 0 (disperse). |
| Circle | Button | Activates circle mode. Sets target transition to 0 (disperse). |
| Reassemble | Button | Sets target transition to 1. Characters smoothly converge to home positions regardless of current mode. |

## Visual Rendering

All rendering uses the Canvas 2D API with DPR-aware sizing.

### Center Glow
- A radial gradient is drawn at the container center.
- Gradient intensity is proportional to `1 - transitionProgress`: fully visible when characters are dispersed, fades to invisible as text reassembles.
- Color uses the accent hue at low opacity.

### Particles (Characters)
- Each particle is drawn with `save/translate/rotate/fillText/restore`.
- **Spinning state** (transition near 0): characters are colored with animated HSL values. The hue is derived from `angle + time`, creating a rainbow sweep as characters orbit. Saturation and lightness are vivid.
- **Settled state** (transition near 1): characters transition to the standard text color from the theme.
- The color blend follows `transitionProgress` -- partially assembled text shows muted, partially colored characters.
- Character rotation is interpolated: spinning characters rotate freely; assembled characters have rotation 0.

### Trail Lines
- When characters are dispersed (transition < 0.5), thin semi-transparent lines are drawn between particles that are spatially close to each other.
- This creates a mesh/constellation effect during vortex and spiral modes.
- Line opacity decreases as transition approaches 1.

### Mode Transitions
- Switching between vortex, spiral, and circle modes does not snap. The polar coordinates smoothly adapt because the transition system handles the blend.
- The visual effect is continuous motion -- characters redirect rather than teleport.

## Key Technical Insight

The fundamental insight is that **characters are simultaneously content and particles**. In a traditional rendering pipeline, text is an opaque block: you give the browser a string and a container, and it places glyphs internally. You cannot access individual glyph positions without expensive DOM measurement.

Pretext inverts this: you get exact glyph positions as data before any rendering occurs. This means:

1. You can treat each character as a particle with known home coordinates.
2. You can animate characters through any trajectory (polar orbits, physics, noise fields).
3. You can always reassemble to the exact typographic layout because the home positions are deterministic.

The chaos-to-order transition is the proof: characters that have been spinning in a vortex for 30 seconds land precisely on their correct positions when reassembled. There is no accumulation of floating-point error in the home positions because they are recomputed from Pretext's layout, not from the animation state.

This pattern enables effects like: text that assembles on scroll, hero text that coalesces from particles, reading mode that snaps scattered words into paragraphs, or interactive poetry where words drift and reform.

## How to Replicate

1. **Extract per-character positions**: use `prepareWithSegments` and `layoutWithLines` to get line-level layout data. Walk characters within each line to compute individual (x, y) home positions using Canvas `measureText`.

2. **Compute polar coordinates**: for each character, convert its home position to polar form (angle, radius) relative to the container center. Store both Cartesian and polar home values.

3. **Implement animation modes**: each mode defines how `angle` and `radius` change per frame. Vortex: angle speed inversely proportional to radius. Spiral: radius oscillates. Circle: constant angular velocity.

4. **Build the transition system**: maintain a `transitionProgress` (0-1) that lerps toward a target. Use it to interpolate between polar-computed positions and Cartesian home positions.

5. **Set up the render loop**: `requestAnimationFrame`. Advance time, update particle positions based on mode, apply transition interpolation, render to Canvas.

6. **Color by state**: use HSL with animated hue for spinning characters, standard text color for settled characters. Blend based on transition progress.

7. **Add trail lines**: when dispersed, draw lines between nearby particles for visual richness. Fade lines as transition approaches 1.

8. **Handle parameter changes**: when font size or container width changes, recompute all home positions via Pretext. Reset polar coordinates from new home values. Transition progress can remain unchanged for a smooth visual update.
