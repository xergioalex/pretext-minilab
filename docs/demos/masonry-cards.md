# Text-Aware Masonry Cards

**Slug:** `masonry-cards`
**Category:** Practical
**Difficulty:** Intermediate
**Source:** `src/islands/demos/MasonryCards.svelte`
**Page:** `src/pages/demos/masonry-cards.astro`

---

## Overview

This demo builds a masonry grid where every card's height is predicted with Pretext *before* any DOM element is created. Traditional masonry implementations render cards into the DOM, read their heights with `getBoundingClientRect()`, then reposition them — causing visible layout shift. This demo eliminates that entire cycle by computing exact text dimensions up front.

The result is a Pinterest-style masonry layout that packs cards into the shortest column first, with zero layout jank and instant recalculation when any parameter changes.

---

## Pretext APIs Used

| API | Purpose |
|-----|---------|
| `prepare(text, font)` | Prepares each card's text content for layout (Unicode analysis, font measurement) |
| `layout(prepared, maxWidth, lineHeight)` | Computes the wrapped height and line count for each card at a given width |
| `buildFont(fontSize)` | Constructs the font string used by both `prepare()` and `layout()` |

---

## How It Works

### 1. Card Data Definition

15 pre-written card texts of varying lengths are defined, each with a distinct accent color. Text ranges from single words ("Brief.", "Tiny.", "Fast.") to multi-sentence paragraphs, producing significant height variation across the grid.

### 2. Measurement Pass

For each card, the implementation:

1. Calls `buildFont(fontSize)` to construct the font descriptor.
2. Calls `prepare(text, font)` to create a `PreparedText` object.
3. Calls `layout(prepared, cardWidth - innerPad * 2, lineHeight)` to compute the wrapped height and line count. The `innerPad * 2` accounts for horizontal padding inside the card (20px on each side).
4. Adds vertical padding and the accent bar height to get the final card height: `result.height + innerPad * 2 + 8`.

### 3. Shortest-Column-First Packing

After measuring all cards, the packing algorithm runs:

1. Initialize an array of column heights, all starting at zero.
2. For each measured card, find the column with the smallest current height.
3. Set the card's `top` position to that column's current height.
4. Set the card's `col` index to place it horizontally.
5. Add `cardHeight + gap` to the column's running height.
6. The container's total height is the maximum of all column heights.

### 4. Absolute Positioning

Cards are positioned absolutely within a relatively-positioned container. Each card's `left` is computed as `col * (cardWidth + gap)` and `top` comes from the packing algorithm. The container width is set to `columns * cardWidth + (columns - 1) * gap`.

### 5. Reactive Recomputation

Any change to columns, card width, font size, or gap triggers a full recomputation. The `$effect` block watches all four variables and calls `computeLayout()` inside `untrack()` to avoid circular dependencies.

---

## State Management

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `columns` | `number` | `4` | Number of masonry columns |
| `cardWidth` | `number` | `240` | Width of each card in pixels |
| `fontSize` | `number` | `13` | Font size for card text |
| `gap` | `number` | `12` | Spacing between cards |
| `animateIn` | `boolean` | `true` | Whether entrance animation is active |
| `cards` | `CardInfo[]` | `[]` | Computed card data with positions |
| `containerHeight` | `number` | `0` | Total height of the masonry container |

The `CardInfo` interface extends each card with computed fields: `height`, `lineCount`, `col` (column index), and `top` (vertical position).

---

## Controls

| Control | Type | Range | Effect |
|---------|------|-------|--------|
| Columns | Range slider | 1-6 | Changes the number of masonry columns |
| Card width | Range slider | 140-350px | Adjusts individual card width |
| Font | Range slider | 10-22px | Changes card text font size |
| Gap | Range slider | 4-24px | Adjusts spacing between cards |
| Shuffle | Button | — | Randomizes card order and replays entrance animation |

The Shuffle button randomizes the `cardData` array order, briefly disables the entrance animation (50ms timeout), then re-enables it to create a staggered re-entrance effect.

---

## Visual Rendering

### Card Structure

Each card is composed of:

1. **Accent bar** — A 3px-tall colored strip at the top, using the card's distinct color.
2. **Body** — The card text content with 16px top / 20px horizontal padding.
3. **Footer** — A monospace line showing the line count (e.g., "3L") in the accent color and the computed height (e.g., "82px") in muted text.

### Animation

Cards animate in with a staggered entrance using CSS `@keyframes`:

- **From:** `opacity: 0`, `scale(0.92)`, `translateY(12px)`
- **To:** `opacity: 1`, `scale(1)`, `translateY(0)`
- **Stagger:** Each card's delay is `i * 30ms` (set via `--card-delay` CSS variable)
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (spring-like overshoot)

### Hover Effect

On hover, cards raise up 3px (`translateY(-3px)`), the border color changes to the card's accent color, and a box shadow appears (`0 8px 24px rgba(0,0,0,0.2)`).

### Transitions

Card position changes (`left`, `top`) animate smoothly with `0.4s cubic-bezier(0.16, 1, 0.3, 1)`, so resizing columns or changing card width produces a fluid rearrangement.

---

## Key Technical Insight

Traditional masonry layouts suffer from a fundamental problem: you cannot know a card's height until it has been rendered into the DOM. This forces a render-measure-reposition cycle that causes visible layout shift — content appears to jump as cards snap into their final positions.

Pretext breaks this dependency. By computing text dimensions with `prepare()` + `layout()`, every card's height is known before any DOM element exists. The packing algorithm runs on pure numbers, and when the DOM finally renders, every card is already in its correct position. This is the same approach needed for virtualized masonry grids (like Pinterest at scale), where you must know positions for thousands of off-screen cards without rendering them.

---

## How to Replicate

1. **Define your card data** — An array of objects with text content and any metadata (colors, tags, etc.).

2. **Measure all cards** — Loop through the array. For each card, call `prepare(text, buildFont(fontSize))` then `layout(prepared, innerWidth, lineHeight)`. Store the resulting height alongside the card data.

3. **Implement shortest-column-first packing** — Maintain an array of column heights. For each card, find the column with the minimum height, place the card there, and increment that column's height by `cardHeight + gap`.

4. **Render with absolute positioning** — Set the container to `position: relative` with a computed height (max of all column heights). Place each card with `position: absolute`, setting `left` and `top` from the packing results.

5. **Make it reactive** — Watch all layout parameters (columns, width, font size, gap) in a Svelte `$effect` block. On any change, re-measure and re-pack. CSS transitions on `left` and `top` will animate the rearrangement smoothly.

6. **Add entrance animation** — Use CSS `@keyframes` with a staggered delay per card index. Toggle the animation class off and on when shuffling to replay the effect.
