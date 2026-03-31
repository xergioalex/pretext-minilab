# Basic Paragraph Measurement

**Slug:** `measure-height`
**Category:** Foundational
**Difficulty:** Beginner
**Source:** `src/islands/demos/MeasureHeight.svelte` / `src/pages/demos/measure-height.astro`

---

## Overview

This is the simplest and most fundamental demo in Pretext Lab. It showcases the core two-phase workflow that underpins every other demo: **prepare once, layout at any width instantly**. The user types text into an editable textarea, adjusts width, font size, and line height via sliders, and sees real-time measurements -- height in pixels, line count, prepare time in milliseconds, and layout time in microseconds. An auto-play mode continuously animates the width slider back and forth to demonstrate that relayout is essentially free.

This demo matters because it makes the prepare/layout split tangible. Users can see that `prepare()` runs in milliseconds (doing the heavy work of Unicode segmentation, word boundary detection, and font measurement), while `layout()` runs in microseconds (pure arithmetic). The counter display reinforces this: prepare count stays low while layout count climbs rapidly.

---

## Pretext APIs Used

| Function | Import | Purpose |
|---|---|---|
| `prepare(text, font)` | `@chenglou/pretext` via `src/lib/pretext` | One-time text analysis; returns an opaque `PreparedText` handle |
| `layout(prepared, maxWidth, lineHeight)` | `@chenglou/pretext` via `src/lib/pretext` | Returns `{ height, lineCount }` given a prepared handle and target width |
| `profilePrepare(text, font)` | `@chenglou/pretext` via `src/lib/pretext` | Returns a `PrepareProfile` with timing breakdown (`totalMs`) of the prepare step |
| `buildFont(size)` | `src/lib/pretext` | Helper that builds a CSS font string like `"16px Inter, sans-serif"` |

**Types used:** `PreparedText`, `LayoutResult`, `PrepareProfile`

---

## How It Works

### Step 1: Prepare phase

When the text content or font size changes, the `doPrepare()` function runs. It calls `buildFont(fontSize)` to construct a CSS font string, then calls `profilePrepare(text, font)` to get timing data and `prepare(text, font)` to produce the opaque `PreparedText` handle. This handle encodes all the expensive analysis (Unicode segmentation, word boundaries, glyph widths) and can be reused across any number of layout calls. A `prepareCount` counter increments on each call.

### Step 2: Layout phase

When the width, line height, or the prepared data changes, `doLayout()` runs. It wraps `layout(prepared, width, lineHeight)` in `performance.now()` calls to measure execution time in microseconds. The result object contains `height` (total pixel height of the paragraph) and `lineCount` (number of wrapped lines). A `layoutCount` counter increments on each call.

### Step 3: Reactive separation via $effect

Two separate `$effect` blocks enforce the prepare/layout split:

- **Effect 1** tracks `text` and `fontSize`. When either changes, it calls `doPrepare()` (via `untrack` to avoid circular dependencies), which in turn triggers the second effect because `prepared` is updated.
- **Effect 2** tracks `width`, `lineHeight`, and `prepared`. When any of these change, it calls `doLayout()`. Crucially, dragging the width slider only triggers this second effect -- `prepare()` is not re-run.

### Step 4: Auto-play animation

On mount, `startAutoPlay()` begins a `requestAnimationFrame` loop that increments or decrements the `width` state variable by 3 pixels per frame, bouncing between 150px and 700px. This drives rapid layout recalculations, demonstrating that `layout()` can run at 60fps without issue.

### Step 5: Visual rendering

The results are rendered as a metrics strip with color-coded bars, a width ruler with tick marks, a text preview box, and a height marker on the left edge.

---

## State Management

All state uses Svelte 5 runes (`$state`):

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `text` | `string` | `SAMPLE_TEXTS.medium` | The paragraph text to measure |
| `fontSize` | `number` | `16` | Font size in pixels |
| `width` | `number` | `400` | Container width in pixels |
| `lineHeight` | `number` | `24` | Line height in pixels |
| `prepared` | `PreparedText \| null` | `null` | Cached prepared data from `prepare()` |
| `result` | `LayoutResult \| null` | `null` | Latest layout result `{ height, lineCount }` |
| `profile` | `PrepareProfile \| null` | `null` | Timing breakdown from `profilePrepare()` |
| `layoutTimeUs` | `number` | `0` | Layout execution time in microseconds |
| `prepareCount` | `number` | `0` | How many times `prepare()` has been called |
| `layoutCount` | `number` | `0` | How many times `layout()` has been called |
| `autoPlaying` | `boolean` | `false` | Whether auto-play animation is active |

Non-reactive: `animFrame` (number) stores the `requestAnimationFrame` handle for cleanup.

---

## Controls

| Control | Type | Range | Behavior |
|---|---|---|---|
| **Text** | `<textarea>` | Free text, 2 rows | Bound to `text`; changing it triggers `prepare()` + `layout()` |
| **Font size** | Range slider | 10--40px | Bound to `fontSize`; changing it triggers `prepare()` + `layout()` |
| **Width** | Range slider | 100--800px | Bound to `width`; changing it triggers only `layout()` |
| **Line height** | Range slider | 12--60px | Bound to `lineHeight`; changing it triggers only `layout()` |
| **Auto-play / Stop** | Button | Toggle | Starts/stops `requestAnimationFrame` loop that animates width |

---

## Visual Rendering

### Metrics strip

Four metrics displayed in a horizontal row, each with a label, a monospace value, and a color-coded progress bar:

- **Height** (accent purple `#7c6cf0`): paragraph height in pixels, bar width proportional to `height / 5`
- **Lines** (green `#3ecf8e`): line count, bar width proportional to `lineCount * 8`
- **Prepare** (orange `#f5a623`): prepare time in milliseconds (from `profilePrepare().totalMs`), bar proportional to `totalMs * 20`
- **Layout** (cyan `#06b6d4`): layout time in microseconds, bar proportional to `layoutTimeUs / 3`

A counter shows cumulative prepare and layout call counts, separated by a dot.

### Width ruler

A horizontal ruler at the top of the preview area, styled with an accent-colored bottom border. Three tick marks show pixel values at the left edge (0), center (width/2), and right edge (width). The ruler width tracks the current `width` state.

### Preview box

A `<div>` with the actual text content, styled with the current `fontSize`, `lineHeight`, and `width`. It has a secondary background, border, and rounded corners. The width transitions smoothly (0.08s) for fluid animation during auto-play.

### Height marker

A vertical bracket on the left side of the preview, whose height matches the computed `result.height`. The pixel value is displayed vertically (rotated via `writing-mode: vertical-lr`). This provides a visual ruler showing the exact height Pretext computed.

---

## Key Technical Insight

**`prepare()` is the expensive step; `layout()` is the hot path.**

The entire design of Pretext hinges on this split. In this demo, you can observe it directly: `prepare()` runs in the range of 0.5--3ms (it must do Unicode segmentation, identify word boundaries, and measure glyph widths using the Canvas API). `layout()` runs in 1--50 microseconds -- roughly 100x faster -- because it is pure arithmetic operating on the pre-computed data.

This means that the common interactive operations (resizing a panel, dragging a divider, responsive breakpoint changes) only hit the cheap path. The expensive path runs once when the user finishes typing. Traditional DOM measurement cannot make this distinction: every `offsetHeight` read forces a full reflow regardless of what changed.

The counter display makes this visceral: during auto-play, the layout count climbs by hundreds while the prepare count stays fixed.

---

## How to Replicate

To build a similar text measurement tool using Pretext:

1. **Install Pretext:** `npm install @chenglou/pretext`

2. **Build a font string:** Use a helper like `buildFont(size)` to produce a CSS font string (`"16px Inter, sans-serif"`). This must match the font actually rendered in the browser for measurements to be accurate.

3. **Prepare the text:** Call `prepare(text, font)` once when the text or font changes. Store the returned `PreparedText` handle. Optionally call `profilePrepare()` to get timing data.

4. **Layout at any width:** Call `layout(prepared, maxWidth, lineHeight)` whenever the container width changes. This returns `{ height, lineCount }`. Measure with `performance.now()` to confirm microsecond-level performance.

5. **Cache prepared data:** Structure your reactive system so that `prepare()` only re-runs when text or font changes. Width and line-height changes should only call `layout()`. In Svelte 5, use two separate `$effect` blocks with `untrack()` to enforce this boundary.

6. **Add auto-play:** Use `requestAnimationFrame` to animate the width between bounds. This demonstrates that `layout()` sustains 60fps.

7. **Display metrics:** Show height, line count, and timing data. The contrast between millisecond prepare time and microsecond layout time is the core lesson.
