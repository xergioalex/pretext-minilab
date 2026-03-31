# Resize Relayout Playground

**Slug:** `resize-relayout`
**Category:** Foundational
**Difficulty:** Beginner
**Source:** `src/islands/demos/ResizeRelayout.svelte` / `src/pages/demos/resize-relayout.astro`

---

## Overview

This demo demonstrates batch relayout at interactive frame rates. Sixteen distinct text blocks -- each containing a different quote about typography and text layout -- are prepared once and then relayouted simultaneously every time the user drags the width slider. The total layout time for all 16 blocks and the per-block average are displayed in microseconds, making the performance characteristics immediately visible.

This matters because real applications rarely measure a single paragraph. Chat interfaces, card grids, virtualized lists, and editorial layouts routinely need to compute dimensions for dozens or hundreds of text blocks during a single resize event. This demo proves that Pretext can handle batch relayout at frame-rate speeds because each `layout()` call is pure arithmetic operating on pre-computed data -- no DOM reads, no reflows, no layout thrashing.

---

## Pretext APIs Used

| Function | Import | Purpose |
|---|---|---|
| `prepare(text, font)` | `@chenglou/pretext` via `src/lib/pretext` | One-time analysis for each text block; returns `PreparedText` |
| `layout(prepared, maxWidth, lineHeight)` | `@chenglou/pretext` via `src/lib/pretext` | Returns `{ height, lineCount }` for each block at the current width |
| `buildFont(size)` | `src/lib/pretext` | Constructs the CSS font string |

**Types used:** `PreparedText`, `LayoutResult`

---

## How It Works

### Step 1: Define sample texts and colors

The component defines an array of 16 hard-coded quotes about text layout, typography, and Pretext. Each quote is paired with a distinct color from a 16-color palette (`blockColors` array) that includes purple, green, orange, red, cyan, pink, and other accent colors.

### Step 2: Prepare all blocks once

The `prepareAll()` function iterates over all 16 texts, calling `buildFont(fontSize)` once and then `prepare(text, font)` for each. It also performs an initial `layout()` for each block at the current width with a line height of `fontSize * 1.5`. The results are stored as an array of `BlockData` objects, each containing `text`, `color`, `prepared` (the cached handle), and `result` (the layout output).

### Step 3: Relayout all blocks on width change

The `relayoutAll()` function maps over the `blocks` array, calling `layout(b.prepared, width, lineHeight)` for each block. The total execution time is measured with `performance.now()` and converted to microseconds. Crucially, `prepare()` is not called again -- only the cheap `layout()` path runs.

### Step 4: Reactive effect separation

Two `$effect` blocks enforce the prepare/layout boundary:

- **Effect 1** tracks `fontSize`. When font size changes, `prepareAll()` re-runs (all 16 blocks are re-prepared with the new font metrics).
- **Effect 2** tracks `width`. When width changes, `relayoutAll()` runs if blocks exist. This is the hot path during slider interaction.

### Step 5: Auto-resize animation

On mount, `startAutoPlay()` begins a `requestAnimationFrame` loop that moves `width` by 4 pixels per frame, bouncing between 160px and 650px. This drives continuous relayout of all 16 blocks at frame rate.

### Step 6: Render the block list

Each block is rendered as a card with a colored left border, a header showing a color dot and metadata (line count and height), and the full text content. The container constrains all blocks to `max-width: {width}px` with a smooth transition.

---

## State Management

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `width` | `number` | `400` | Shared container width for all blocks |
| `fontSize` | `number` | `14` | Font size (triggers re-prepare of all blocks) |
| `totalLayoutUs` | `number` | `0` | Total layout time in microseconds for all 16 blocks |
| `autoPlaying` | `boolean` | `false` | Whether auto-resize animation is active |
| `blocks` | `BlockData[]` | `[]` | Array of 16 block objects, each with `text`, `color`, `prepared`, and `result` |

Non-reactive: `animFrame` (number) for `requestAnimationFrame` cleanup.

The `BlockData` interface:
```typescript
interface BlockData {
  text: string;
  color: string;
  prepared: PreparedText;
  result: LayoutResult;
}
```

---

## Controls

| Control | Type | Range | Behavior |
|---|---|---|---|
| **Width** | Range slider | 120--700px | Bound to `width`; triggers `relayoutAll()` (layout only, no re-prepare) |
| **Font size** | Range slider | 10--24px | Bound to `fontSize`; triggers `prepareAll()` (full re-prepare + layout) |
| **Auto-resize / Stop** | Button | Toggle | Starts/stops the `requestAnimationFrame` animation loop |

---

## Visual Rendering

### Performance bar

A horizontal strip at the top displays three metrics:

- **Block count**: The number of blocks (always 16)
- **Total time**: Total `layout()` time for all blocks in microseconds
- **Per-block time**: `totalLayoutUs / blocks.length` in microseconds

A trailing note reads: "All 16 blocks relayouted via `layout()` -- no DOM reads"

### Block list

A scrollable container holds all 16 text blocks in a vertical stack, constrained to the current width. Each block is a card with:

- **Colored left border** (3px solid, using the block's assigned color)
- **Header row**: A small color dot (6px circle) and metadata text showing line count and height (e.g., "3L . 63px") in monospace
- **Text body**: The quote text, with `word-wrap: break-word` for overflow handling

The container's `max-width` transitions smoothly (0.06s) for fluid animation. Each block has a hover effect that highlights the border color.

### Color palette

The 16 colors are: `#7c6cf0` (purple), `#3ecf8e` (green), `#f5a623` (orange), `#ef4444` (red), `#06b6d4` (cyan), `#ec4899` (pink), `#8b5cf6` (violet), `#10b981` (emerald), `#f59e0b` (amber), `#6366f1` (indigo), `#14b8a6` (teal), `#e11d48` (rose), `#7c3aed` (purple-deep), `#059669` (green-dark), `#d946ef` (fuchsia), `#0ea5e9` (sky).

---

## Key Technical Insight

**DOM measurement for N blocks = N reflows. Pretext = N cheap arithmetic calls.**

The traditional approach to measuring 16 text blocks at a new width would require: create a hidden element, set its width, append each block's text, read `offsetHeight`, and remove it -- 16 times. Each `offsetHeight` read forces the browser to perform a synchronous layout reflow. If you do this on every frame during a resize drag, you get layout thrashing: the browser alternates between writing DOM properties and reading computed values, invalidating the layout cache each time.

With Pretext, all 16 blocks are prepared once (the expensive step). On resize, `layout()` runs 16 times -- but each call is pure arithmetic with no DOM interaction. The total time for all 16 calls typically lands in the range of 20--100 microseconds. That is orders of magnitude faster than 16 DOM reflows.

As N grows (to hundreds or thousands of blocks in a virtualized list), the gap between DOM measurement and Pretext becomes enormous. DOM reflow cost grows roughly linearly with document complexity, while Pretext's `layout()` cost remains constant per call regardless of what else is on the page.

---

## How to Replicate

To build a similar batch relayout system:

1. **Prepare all text blocks once:** When text content or font changes, iterate over your collection and call `prepare(text, font)` for each. Store the returned handles alongside the text data.

2. **Layout on resize:** In your resize handler (or reactive effect tracking width), iterate over the prepared handles and call `layout(prepared, width, lineHeight)` for each. This gives you the height and line count for every block at the new width.

3. **Measure total time:** Wrap the batch layout loop in `performance.now()` calls. Convert to microseconds by multiplying the delta by 1000. Display total and per-block averages.

4. **Separate prepare from layout effects:** Use your framework's reactivity system to ensure font/text changes trigger `prepare()`, while width-only changes trigger only `layout()`. In Svelte 5, this means two distinct `$effect` blocks.

5. **Add auto-resize:** Use `requestAnimationFrame` to animate width changes. This proves the system can sustain 60fps even with many blocks relayouting simultaneously.

6. **Render with metadata:** For each block, display the computed `lineCount` and `height` alongside the text. Use color-coding to visually distinguish blocks.
