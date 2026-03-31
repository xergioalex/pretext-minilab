# Text Collision World

## Overview

Text Collision World is a canvas-based physics simulation where 6-8 text blocks behave as rigid bodies. Each block has gravity, AABB (axis-aligned bounding box) collision, wall bouncing, and drag-to-throw interaction. Pretext computes each block's dimensions instantly -- width from the text content and height from `layout()` -- enabling text to participate as physical objects at 60fps.

This demo matters because it treats text blocks as first-class physics objects with accurate dimensions. Rather than using fixed-size rectangles, each block's bounding box is derived from actual text layout metrics. When font size changes, blocks resize and the physics simulation adapts immediately.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepare(text, font)` | Prepares text for layout. Called once per block per font size change. |
| `layout(prepared, maxWidth, lineHeight)` | Computes block height and line count for AABB dimensions. Called per block when width or font changes. |
| `layoutWithLines(prepared, maxWidth, lineHeight)` | Provides per-line data for canvas text rendering. Called per block per frame for visible blocks. |
| `buildFont(fontSize)` | Constructs the font descriptor for the given pixel size. |

## How It Works

### Step 1: Block Initialization

Each block is created with a text snippet, a fixed width, and physics properties:

```
const blocks = texts.map((text, i) => ({
  text,
  prepared: prepare(text, buildFont(fontSize)),
  width: 150 + Math.random() * 100,
  x: Math.random() * canvasWidth,
  y: Math.random() * canvasHeight * 0.3,
  vx: 0, vy: 0,
  angle: 0,
  mass: 1
}));
```

Each block's height is computed via `layout()`:

```
const result = layout(block.prepared, block.width, lineHeight);
block.height = result.height;
```

### Step 2: Gravity and Velocity

Each frame, gravity accelerates blocks downward:

```
for (const block of blocks) {
  block.vy += gravity;
  block.x += block.vx;
  block.y += block.vy;
}
```

### Step 3: Wall Collision

Blocks bounce off canvas edges with damping:

```
if (block.y + block.height > canvasHeight) {
  block.y = canvasHeight - block.height;
  block.vy *= -restitution; // e.g., -0.6
}
// Similar for left, right, top walls
```

### Step 4: Block-to-Block AABB Collision

Pairs of blocks are tested for overlap. On collision, velocities are exchanged based on mass and overlap direction:

```
for (let i = 0; i < blocks.length; i++) {
  for (let j = i + 1; j < blocks.length; j++) {
    if (aabbOverlap(blocks[i], blocks[j])) {
      resolveCollision(blocks[i], blocks[j]);
    }
  }
}
```

### Step 5: Drag-to-Throw

Mouse interaction: press on a block to grab it, drag to move, release to throw. The throw velocity is computed from the mouse velocity at release:

```
block.vx = (mouseX - prevMouseX) * throwScale;
block.vy = (mouseY - prevMouseY) * throwScale;
```

### Step 6: Canvas Rendering

Each block is rendered by drawing its text line by line on the canvas:

```
const result = layoutWithLines(block.prepared, block.width, lineHeight);
for (const line of result.lines) {
  ctx.fillText(lineText, block.x + line.x, block.y + line.y);
}
```

A border rectangle shows the block's AABB for visual clarity.

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(14)` | Font size in pixels (range 11-20). |
| `gravity` | `$state(0.3)` | Gravity acceleration per frame (range 0.1-1.0). |
| `blocks` | `$state([...])` | Array of block objects with physics properties. |
| `dragging` | `$state(null)` | Index of the block being dragged, or null. |
| `prepared` | per block | Each block caches its own `PreparedText` object. |
| `lineHeight` | derived | Computed as `fontSize * 1.4`. |

## Controls

| Control | Type | Range | Effect |
|---|---|---|---|
| Font Size | Slider | 11 - 20 px | Changes text size; all blocks re-prepare and resize. Physics adapts to new dimensions. |
| Drop | Button | click | Spawns a new block at a random position at the top of the canvas. |
| Shake | Button | click | Applies a random velocity impulse to all blocks, scattering them. |
| Reset | Button | click | Returns all blocks to initial positions with zero velocity. |
| Drag | Mouse | canvas area | Click and drag any block to move it. Release to throw. |

## Visual Rendering

### Text Blocks
Each block renders its text content on the canvas using `fillText()` per line. The block background is a semi-transparent dark rectangle with a subtle border in the accent color.

### AABB Outlines
Each block's bounding box is drawn as a thin rectangle. The active (dragging) block has a brighter, thicker border.

### Velocity Trails
Moving blocks leave a short trail (3-4 previous positions at decreasing opacity), giving a sense of motion.

### Floor and Walls
The canvas edges are drawn as solid lines to indicate the collision boundaries.

## Key Technical Insight

The architectural lesson of Text Collision World is that **Pretext computes block dimensions instantly, enabling text as physical objects at 60fps**. In a physics simulation, every object needs an accurate bounding box. For text blocks, this means knowing the height of laid-out text at a given width -- a value that depends on line breaking.

With browser APIs, computing text height requires:
1. Creating a DOM element
2. Setting its width and text content
3. Forcing a reflow
4. Reading `offsetHeight`
5. Cleaning up the element

This round-trip to the DOM is far too slow for 6-8 blocks at 60fps (480+ reflows per second). Pretext's `layout()` returns the height in microseconds, with no DOM involvement.

This enables:
- **Text as physics objects**: blocks with accurate dimensions in real-time simulations
- **Collision detection**: AABB boxes derived from actual text metrics, not hardcoded sizes
- **Dynamic resizing**: change font size and all blocks instantly update their dimensions
- **Stacking and piling**: blocks settle and stack naturally because their heights are correct

## How to Replicate

1. **Create text blocks**: define 6-8 text snippets with varying lengths. For each, call `prepare(text, buildFont(fontSize))` and `layout(prepared, blockWidth, lineHeight)` to get the block height.

2. **Initialize physics properties**: give each block a position, velocity, and mass. Set gravity as a constant downward acceleration.

3. **Run the physics loop**: use `requestAnimationFrame`. Each frame: apply gravity, update positions, detect wall collisions, detect block-to-block collisions, resolve overlaps.

4. **Implement AABB collision**: for each pair of blocks, check if their bounding boxes overlap. On overlap, separate them along the axis of least overlap and exchange velocities.

5. **Implement drag-to-throw**: track mouse events on the canvas. On mousedown over a block, start dragging. On mousemove, update block position. On mouseup, apply the mouse velocity to the block.

6. **Render on canvas**: for each block, call `layoutWithLines()` and draw each line with `ctx.fillText()`. Draw block borders and velocity trails.

7. **Add controls**: expose font size as a slider. Add Drop, Shake, and Reset buttons. When font size changes, re-prepare all blocks and recompute their heights.

8. **Experiment with variations**: try circular text blocks (using layout height as diameter), rotated blocks (rotate the canvas context), or blocks that split on impact (re-layout text into smaller widths).
