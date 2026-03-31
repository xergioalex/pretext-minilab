# PDF Reflow Engine

- **Slug:** `pdf-reflow-engine`
- **Category:** Advanced
- **Difficulty:** Advanced
- **Source:** `src/islands/demos/PdfReflowEngine.svelte`, `src/pages/demos/pdf-reflow-engine.astro`

## Overview

This demo shows one article being recomposed into multiple output surfaces: phone, tablet, editorial spread, and poster. It behaves like a planning engine for publication formats rather than a normal responsive container.

## Pretext APIs Used

| API | Why it is used |
|-----|----------------|
| `prepare()` | Prepare the title and body content for each preset |
| `layout()` | Measure headline height and preset-level body density |
| `layoutNextLine()` | Flow the article body through explicit columns and reserved quote space |

## How It Works

1. Each preset defines width, height, column count, and font sizes.
2. The title is measured first to determine where the article body can begin.
3. Explicit regions are created for each preset.
4. The body flows through those regions with a continuous cursor.
5. A reserved quote region can remove width from part of one column.

## State Management

- `presetId`: selected output format
- `emphasizeHeadline`: adjusts headline scale
- `reserveQuote`: toggles reserved editorial space
- `lines`: flowed article body
- `metrics`: per-preset comparison stats

## Controls

- Preset buttons
- Headline emphasis slider
- Quote reserve toggle
- Region guide toggle

## Visual Rendering

The active preset is drawn as a faux printed page. Title, byline, quote, and body lines are all placed intentionally, making the result feel like a lightweight composition engine.

## Key Technical Insight

Responsive design usually adapts one layout. Reflow engines instead ask how one source document should become many different compositions. Pretext makes that possible because text cost is queryable before rendering.

## How to Replicate

1. Define presets as geometry plus typography.
2. Measure headline and supporting blocks before flowing the body.
3. Generate explicit columns or regions for each preset.
4. Use `layoutNextLine()` with one cursor across those regions.
5. Compare presets using predicted line counts and consumed height.
