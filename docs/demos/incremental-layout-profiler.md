# Incremental Layout Profiler

- **Slug:** `incremental-layout-profiler`
- **Category:** Practical
- **Difficulty:** Advanced
- **Source:** `src/islands/demos/IncrementalLayoutProfiler.svelte`, `src/pages/demos/incremental-layout-profiler.astro`

## Overview

This demo exposes the difference between expensive prepare work and cheap relayout work. Instead of only saying “Pretext is fast,” it shows which interactions stay on the hot path and which ones invalidate preparation.

## Pretext APIs Used

| API | Why it is used |
|-----|----------------|
| `profilePrepare()` | Time the expensive preparation phase |
| `prepare()` | Create the reusable prepared text handle |
| `layout()` | Measure repeated width-only relayouts on the hot path |

## How It Works

1. A trace event is created for each interaction.
2. Width-only changes reuse the existing prepared text.
3. Text edits and font changes force a new `profilePrepare()` call and a new prepared handle.
4. `layout()` is executed repeatedly to estimate hot-path cost.
5. The trace is rendered like a mini devtool timeline.

## State Management

- `text`, `fontSize`, `width`, `lineHeight`: current document state
- `prepared`: cached prepared handle
- `trace`: latest invalidation events
- `totalHeight`, `lineCount`: current measured result

## Controls

- Editable textarea
- Width slider
- Font slider
- Buttons for width-only, edit, and font-change traces

## Visual Rendering

The left side shows the current preview. The right side shows a stacked trace list with prepare and layout costs, plus a hot-path vs re-prepare indicator.

## Key Technical Insight

Performance is not just a benchmark number. It is an invalidation model. Once you can see which interactions re-enter the expensive phase, you can design products around cache reuse instead of accidental re-preparation.

## How to Replicate

1. Hold onto a prepared text handle between interactions.
2. Treat width-only changes separately from content or font changes.
3. Time `profilePrepare()` and `layout()` independently.
4. Log those events into a trace list.
5. Build product interactions that maximize hot-path reuse.
