# OCR Reconstruction

- **Slug:** `ocr-reconstruction`
- **Category:** Practical
- **Difficulty:** Advanced
- **Source:** `src/islands/demos/OcrReconstruction.svelte`, `src/pages/demos/ocr-reconstruction.astro`

## Overview

This demo starts from noisy OCR boxes and reconstructs a readable document. Headlines, captions, notes, and body blocks are inferred into a cleaner reading order before the rebuilt layout is rendered.

## Pretext APIs Used

| API | Why it is used |
|-----|----------------|
| `prepare()` | Prepare compact text fragments such as captions or notes |
| `layout()` | Measure short blocks in isolation |
| `layoutNextLine()` | Flow the reconstructed body text through clean columns |

## How It Works

1. OCR rectangles arrive with position, width, role, and text.
2. Blocks are sorted into an inferred reading order.
3. Headline, caption, and note fragments are preserved as separate roles.
4. Body fragments are merged into one continuous body text.
5. The clean body is flowed into reconstructed columns with `layoutNextLine()`.

## State Management

- `reconstruction`: split view or cleaner reconstructed view
- `showOrder`: overlay the inferred reading order
- `density`: affects the desired column compactness
- `lines`: the reconstructed body lines

## Controls

- Split/clean mode
- Density slider
- Reading-order toggle

## Visual Rendering

The demo shows raw OCR fragments on one side and a rebuilt document on the other. The contrast makes the reconstruction step explicit instead of hidden.

## Key Technical Insight

OCR systems usually provide geometry before semantic structure. Pretext becomes useful after role inference, when the application needs to test what the repaired reading surface will look like before export or editing.

## How to Replicate

1. Capture OCR fragments as rectangles plus text.
2. Infer role and reading order.
3. Merge compatible body fragments into one logical text stream.
4. Preserve special fragments like captions and notes.
5. Flow the cleaned body through explicit reconstructed columns.
