# Text Origami Panels

- **Slug:** `text-origami`
- **Category:** Spectacular
- **Difficulty:** Spectacular
- **Source:** `src/islands/demos/TextOrigami.svelte`, `src/pages/demos/text-origami.astro`

## Overview

This demo imagines a paragraph printed across a foldable sheet. The content flows continuously across multiple panels while each crease changes the effective width inside its panel.

## Pretext APIs Used

| API | Why it is used |
|-----|----------------|
| `prepareWithSegments()` | Prepare the text once for the folded sheet |
| `layoutNextLine()` | Continue the reading cursor across many panels |

## How It Works

1. The sheet is divided into a variable number of paper panels.
2. Each panel receives a fold angle derived from the global fold depth.
3. That angle reduces the effective interior width of the panel.
4. The same cursor is carried from panel to panel with `layoutNextLine()`.
5. The panels are rendered with 3D transforms to suggest a folded object.

## State Management

- `folds`: crease depth
- `panels`: number of sheet panels
- `panelLayout`: panel geometry and angle
- `lines`: all flowed lines grouped by panel

## Controls

- Fold depth slider
- Panel count slider
- Crease overlay toggle

## Visual Rendering

Each panel is a transformed card with a visible crease. Lines are positioned inside the correct panel so the sheet feels continuous even though the geometry is segmented.

## Key Technical Insight

The challenge is not 3D rendering. The challenge is preserving reading continuity when every region has a different effective width. Pretext makes that possible by treating the folded object as a list of measured regions.

## How to Replicate

1. Define panels as sequential regions.
2. Convert fold angle into usable interior width.
3. Flow a single cursor across those regions.
4. Render each region with a transform that matches its fold state.
5. Keep the cursor continuous so the sheet behaves like one document.
