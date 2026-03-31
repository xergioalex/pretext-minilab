# Text Breakout

## Overview

Text Breakout reimagines the classic Breakout arcade game using words from a paragraph as bricks. A ball bounces around the canvas, and when it hits a word-brick, that word is destroyed. The remaining words instantly relayout into a tighter paragraph using Pretext, and the brick positions update accordingly. The game runs entirely on Canvas at 60fps.

This demo matters because it turns text layout into a game mechanic. Each brick destruction triggers a full text relayout -- the paragraph contracts as words are removed, bricks shift to new positions, and the player watches structured text dissolve word by word. It proves Pretext is fast enough to serve as the layout engine for a real-time game where layout changes are gameplay events.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepareWithSegments(text, font)` | Prepares the remaining text (after word removals) with segment data. Called after every brick destruction. |
| `layoutWithLines(prepared, maxWidth, lineHeight)` | Computes the full multi-line layout, returning line objects with segment positions. Used to derive brick positions from the layout result. |
| `buildFont(fontSize)` | Constructs the font descriptor for Canvas text rendering and Pretext preparation. |

## How It Works

### Step 1: Initial Brick Construction

On mount:

1. Start with the full paragraph text.
2. Call `prepareWithSegments(text, buildFont(fontSize))`.
3. Call `layoutWithLines(prepared, containerWidth, lineHeight)`.
4. Iterate the returned lines. For each line, iterate the word segments to extract individual word boundaries.
5. For each word, create a brick object: `{ word, x, y, width, height, alive, color }`.
6. Color is assigned based on line index, cycling through a predefined palette to create visual rows.

### Step 2: Game Loop (requestAnimationFrame)

Each frame performs these operations in order:

**Ball Physics:**
- Update position: `x += vx`, `y += vy`.
- Wall collisions: if ball hits left/right wall, reverse `vx`. If ball hits top wall, reverse `vy`.
- If ball falls below the paddle (bottom of canvas), reset ball to center with default velocity. There is no lives system -- the game is forgiving.

**Paddle Tracking:**
- Paddle x-position follows the mouse x-position (via `mousemove` on the canvas element).
- Paddle is clamped to stay within canvas bounds.

**Paddle Collision:**
- If ball overlaps the paddle rectangle (AABB check) and is moving downward:
  - Reverse `vy` (bounce upward).
  - Add horizontal spin based on where the ball hit relative to paddle center. Hitting the left edge adds leftward velocity; hitting the right edge adds rightward velocity. This gives the player directional control.

**Brick Collision:**
- For each alive brick, perform AABB collision check with the ball.
- On collision:
  - Mark the brick as dead (`alive = false`).
  - Reverse `vy` (bounce away from brick).
  - Increment score.
  - Trigger relayout (see Step 3).

**Win Check:**
- If all bricks are dead, transition to 'won' state.

### Step 3: Relayout After Destruction

When a brick is destroyed:

1. Filter the word list to only alive bricks.
2. Reconstruct the text string by joining alive words with spaces.
3. Call `prepareWithSegments(newText, font)`.
4. Call `layoutWithLines(prepared, containerWidth, lineHeight)`.
5. Map the new layout positions back to the surviving brick objects, updating their `x`, `y`, `width`, and `height`.

This is the key moment: the paragraph visibly contracts. Words that were on line 5 may now appear on line 4. The entire brick field restructures in a single frame.

### Step 4: Rendering

All rendering happens on a 2D Canvas context (see Visual Rendering below).

## State Management

| Variable | Type | Description |
|---|---|---|
| `gameState` | `$state('ready')` | Current game state: `'ready'`, `'playing'`, or `'won'`. |
| `score` | `$state(0)` | Number of destroyed word-bricks. |
| `ballX`, `ballY` | `$state` | Ball center position. |
| `ballVX`, `ballVY` | `$state` | Ball velocity components. |
| `paddleX` | `$state` | Paddle center x-position, follows mouse. |
| `bricks` | `$state([])` | Array of brick objects with alive/dead status and positions. |
| `text` | derived | Current text string, reconstructed from alive bricks. |
| `prepared` | derived | Cached `PreparedTextWithSegments`, recomputed after each destruction. |

Constants (not reactive):
- Ball radius: ~6px
- Paddle width: ~100px, height: ~12px
- Line height: `fontSize * 1.5`

## Controls

| Control | Type | Effect |
|---|---|---|
| Mouse Movement | mousemove on canvas | Controls paddle horizontal position. |
| Click (ready state) | click on canvas | Starts the game, launching the ball. |
| Click (won state) | click on canvas | Resets the game to initial state. |

There are no sliders during gameplay to avoid distraction. Font size and container dimensions are fixed at mount time.

## Visual Rendering

All rendering uses the Canvas 2D API with DPR-aware sizing.

### Bricks
- Each alive brick is drawn as a rounded rectangle.
- The word text is centered within the brick using `ctx.fillText` with `textAlign: 'center'` and `textBaseline: 'middle'`.
- Brick color is assigned by line index at initial layout, cycling through a palette (e.g., purples, blues, greens, oranges).
- Dead bricks are not drawn.

### Paddle
- Rounded rectangle at the bottom of the canvas.
- Accent color (`#7c6cf0`) with subtle gradient.
- Width ~100px, height ~12px.

### Ball
- Circle drawn with `arc()`.
- Subtle glow effect via Canvas `shadowBlur` and `shadowColor`.
- White or accent-colored fill.

### Overlays
- **Ready state**: semi-transparent dark overlay with game title ("Text Breakout") and instruction ("Click to start") centered on canvas.
- **Won state**: congratulations message with final score displayed.

### HUD
- Score counter and remaining word count displayed at top of canvas.

## Key Technical Insight

Text Breakout demonstrates that **text layout can be a game mechanic, not just a rendering concern**. In traditional game development, text is static UI chrome -- labels, scores, menus. Here, the text paragraph IS the game world.

The critical performance requirement is relayout speed after brick destruction. When a word is destroyed:
- A new text string must be prepared (tokenization + font measurement).
- The full layout must be recomputed.
- Brick positions must be updated.

All of this happens within a single frame (~16ms budget). If relayout took 50ms, the game would stutter every time the player scored. Pretext completes the entire prepare-and-layout cycle in under 1ms for paragraph-length text, leaving the vast majority of the frame budget for physics, collision detection, and rendering.

This opens the door to text-based games where the words themselves are interactive objects: typing games where completed words collapse the paragraph, puzzle games where rearranging words changes the layout, or narrative games where the text physically responds to player actions.

## How to Replicate

1. **Extract words as bricks**: prepare text with `prepareWithSegments`, layout with `layoutWithLines`, then iterate lines and segments to build a brick array with position and size data.

2. **Set up Canvas game loop**: create a `requestAnimationFrame` loop with standard game phases: input, physics, collision, render.

3. **Implement ball physics**: simple Euler integration with velocity. Reflect velocity components on wall and paddle collisions. Add spin from paddle hit position.

4. **Detect brick collisions**: AABB (axis-aligned bounding box) check between ball bounds and each alive brick. On hit, mark brick dead and reverse ball vertical velocity.

5. **Relayout on destruction**: after marking a brick dead, reconstruct the text from surviving words, re-prepare with Pretext, re-layout, and update surviving brick positions from the new layout result.

6. **Render each frame**: clear canvas, draw alive bricks with word text, draw paddle and ball, draw HUD. Use Canvas `shadowBlur` for glow effects.

7. **Handle game states**: implement ready/playing/won state machine. Ready shows an overlay with click-to-start. Won shows score and click-to-reset.

8. **Polish**: add color palettes for brick rows, smooth paddle tracking, ball trail effects, and victory animation.
