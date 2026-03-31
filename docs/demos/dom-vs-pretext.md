# DOM vs Pretext Architecture

**Slug:** `dom-vs-pretext`
**Category:** Foundational
**Difficulty:** Conceptual
**Source:** `src/islands/demos/DomVsPretext.svelte` / `src/pages/demos/dom-vs-pretext.astro`

---

## Overview

This demo provides a side-by-side visual and quantitative comparison of two fundamentally different approaches to text measurement: traditional DOM-based measurement and Pretext's prepare/layout model. It is not a rigorous benchmark -- it is an architectural explainer that makes the structural differences tangible through live timing data.

The DOM approach creates a hidden element, appends text, reads `offsetHeight` (forcing a reflow), removes the element, and repeats for every block at every width. The Pretext approach calls `prepare()` once per block, then `layout()` at multiple widths -- pure arithmetic with no DOM interaction. The demo runs both approaches on the same workload and displays the speedup factor, typically showing Pretext as 5--50x faster depending on block count and browser.

This matters because the performance difference is not about micro-optimization -- it reflects a fundamental architectural advantage. Decoupling text analysis from layout computation eliminates an entire class of performance problems (layout thrashing, forced synchronous layouts, reflow cascades).

---

## Pretext APIs Used

| Function | Import | Purpose |
|---|---|---|
| `prepare(text, font)` | `@chenglou/pretext` via `src/lib/pretext` | One-time text analysis; called once per block |
| `layout(prepared, maxWidth, lineHeight)` | `@chenglou/pretext` via `src/lib/pretext` | Cheap relayout; called once per block per width |
| `buildFont(size)` | `src/lib/pretext` | Constructs CSS font string (`"16px Inter, sans-serif"`) |

**Types used:** none explicitly (results used inline).

---

## How It Works

### Step 1: Configure the workload

The user selects a block count via a slider (10--500, step 10). A fixed sample text is used for all blocks: a two-sentence description of Pretext's architecture. The font is fixed at 16px with 24px line height.

### Step 2: Define test widths

The benchmark tests layout at 10 different widths: `[150, 200, 250, 300, 350, 400, 450, 500, 550, 600]`. This simulates a resize scenario where each block must be measured at multiple container widths.

### Step 3: Run the Pretext path

The `runFullComparison()` function first runs the Pretext approach:

1. **Prepare phase:** Loop over `blockCount` iterations, calling `prepare(sampleText, font)` for each. Store all prepared handles. Measure total time as `pretextPrepareTime`.
2. **Layout phase:** For each of the 10 widths, loop over all prepared handles and call `layout(prepared, width, lineHeight)`. Measure total time as `pretextLayoutTime`.

### Step 4: Run the DOM path

Then it runs the DOM approach:

1. **Create a hidden container:** A `<div>` with `position: absolute; visibility: hidden; left: -9999px` is appended to `document.body`. Its CSS font and line-height match the Pretext configuration.
2. **Measure each block at each width:** For each of the 10 widths, set the container's width, then for each block: create a child `<div>`, set its `textContent`, append it to the container, read `offsetHeight` (which forces a synchronous layout reflow), and remove the child.
3. **Cleanup:** Remove the hidden container from the DOM.
4. **Measure total time** as `relayoutDomTime`.

### Step 5: Compute the speedup

The speedup ratio is `relayoutDomTime / (pretextPrepareTime + pretextLayoutTime)`. This compares the total DOM cost against the total Pretext cost (including the one-time prepare step).

### Step 6: Auto-run on mount

The comparison runs automatically when the component mounts via `onMount(() => { runFullComparison(); })`. Users can re-run with different block counts.

---

## State Management

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `blockCount` | `number` | `100` | Number of text blocks to measure |
| `width` | `number` | `300` | Not used for display; part of the benchmark config |
| `hasRun` | `boolean` | `false` | Whether the benchmark has completed at least once |
| `running` | `boolean` | `false` | Whether the benchmark is currently executing |
| `domTime` | `number` | `0` | Total DOM measurement time in milliseconds |
| `pretextPrepareTime` | `number` | `0` | Pretext prepare phase time in milliseconds |
| `pretextLayoutTime` | `number` | `0` | Pretext layout phase time in milliseconds |
| `relayoutDomTime` | `number` | `0` | DOM total time (same as `domTime`) |
| `relayoutPretextTime` | `number` | `0` | Pretext layout time (same as `pretextLayoutTime`) |
| `relayoutRuns` | `number` | `0` | Number of width variations tested (always 10) |
| `speedup` | `number` | `0` | DOM time / Pretext total time ratio |

---

## Controls

| Control | Type | Range | Behavior |
|---|---|---|---|
| **Text blocks** | Range slider | 10--500, step 10 | Sets the number of blocks for the next benchmark run |
| **Run comparison / Run again** | Button | Click | Executes the full benchmark; disabled while running |

The button shows "Run comparison" before first run, "Running..." during execution, and "Run again" after completion.

---

## Visual Rendering

### Architecture cards

Two side-by-side cards in a 3-column grid (card -- vs indicator -- card):

**DOM Approach card** (left):
A vertical flow diagram with styled step boxes:
1. "Create hidden element" (bad -- red-tinted)
2. "Set text + width" (bad)
3. "Append to DOM -> reflow" (danger -- red, bold)
4. "Read offsetHeight -> reflow" (danger)
5. "Remove element" (bad)
6. "Repeat for EVERY resize" (danger)

After the benchmark runs, a timing result appears: the total DOM time in large red monospace text, with a detail line like "100 blocks x 10 widths".

**Pretext Approach card** (right, with accent border):
A vertical flow diagram with styled step boxes:
1. "prepare(text, font) -- once" (prepare -- accent-colored)
2. "layout(prepared, width, lh)" (fast -- green-tinted)
3. "Pure arithmetic -- no DOM" (fast)
4. "Instant at any width" (fast)

After the benchmark, timing results appear: prepare time in small muted text, layout time in large green monospace text, and the label "layout hot path".

**Center "vs" indicator:**
Before running, shows "vs" in large muted text. After running, shows the speedup factor (e.g., "12x") in large green monospace with a "faster" label below.

### Bar comparison

After the benchmark completes, an animated bar chart appears:

- **DOM bar**: Red gradient (`#ef4444` to `#dc2626`), width proportional to its time (always 100%)
- **Pretext bar**: Green gradient (`#3ecf8e` to `#10b981`), width proportional to `pretextLayoutTime / domTime`

Both bars animate from zero width using a CSS `@keyframes barGrow` animation (0.6s cubic-bezier). Each bar displays its time value inside the bar in white monospace text.

A disclaimer in italic muted text reads: "Local approximate measurements -- not a rigorous benchmark. The architectural advantage (prepare once, relayout cheaply) is the key insight."

### Responsive layout

On screens narrower than 768px, the architecture grid switches from a 3-column layout to a single column.

---

## Key Technical Insight

**The architectural advantage is decoupling analysis from layout.**

DOM-based text measurement fundamentally couples two operations: writing (setting text content and width) and reading (getting computed height). The browser's layout engine cannot skip the full layout pass when you read `offsetHeight` because it must ensure the returned value reflects the current DOM state. This is called a "forced synchronous layout" or "layout thrashing" when it happens repeatedly.

Pretext breaks this coupling entirely:

- **Analysis** (`prepare()`): Runs once per text/font combination. Does the expensive work -- Unicode segmentation, word boundary detection, glyph width measurement via Canvas API. Produces an opaque data structure.
- **Layout** (`layout()`): Runs at any width, any number of times. Pure arithmetic -- no DOM reads, no browser layout engine involvement, no reflow.

The speedup factor shown in this demo is not just about raw speed. It reflects a qualitative architectural difference:

1. **DOM approach scales with document complexity.** More elements on the page = slower reflows, even for unrelated measurements.
2. **Pretext scales with nothing.** Each `layout()` call is independent of the DOM, the page, and other layout calls.
3. **DOM approach cannot be parallelized.** Reflows are synchronous and block the main thread.
4. **Pretext's layout is stateless.** In theory, it could run in a worker (though the current implementation uses Canvas for `prepare()`).

The real-world scenarios where this matters most: resize handlers that measure many elements, virtualized lists computing row heights, split-pane layouts recalculating text dimensions, and any UI where text measurement is on the critical path of user interaction.

---

## How to Replicate

To build a similar DOM vs Pretext comparison:

1. **Define a consistent workload:** Use the same text, font, and set of widths for both approaches. Control the block count with a slider.

2. **Implement the DOM measurement path:**
   ```javascript
   const container = document.createElement('div');
   container.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;';
   container.style.font = fontString;
   container.style.lineHeight = lineHeight + 'px';
   document.body.appendChild(container);

   for (const width of widths) {
     container.style.width = width + 'px';
     for (let i = 0; i < blockCount; i++) {
       const div = document.createElement('div');
       div.textContent = text;
       container.appendChild(div);
       const height = div.offsetHeight; // Forces reflow
       container.removeChild(div);
     }
   }
   document.body.removeChild(container);
   ```

3. **Implement the Pretext path:**
   ```javascript
   const font = buildFont(16);
   const prepareds = [];
   for (let i = 0; i < blockCount; i++) {
     prepareds.push(prepare(text, font));
   }
   for (const width of widths) {
     for (const p of prepareds) {
       layout(p, width, lineHeight);
     }
   }
   ```

4. **Measure both with `performance.now()`:** Wrap each path in timing calls. Use `await new Promise(r => setTimeout(r, 50))` before starting to let the browser settle.

5. **Compute the speedup:** `domTime / (pretextPrepareTime + pretextLayoutTime)`. Display as "Nx faster".

6. **Visualize the architecture:** Use step-by-step flow diagrams to show the structural difference. Color-code steps: red/danger for DOM reflow points, green for Pretext's fast path, accent for the one-time prepare step.

7. **Add the bar chart:** Animated bars make the magnitude difference visceral. Always render DOM at 100% width and Pretext proportionally smaller.

8. **Include a disclaimer:** These are local, approximate measurements. Browser, hardware, and page complexity all affect DOM measurement times. The architectural lesson is more important than the exact numbers.
