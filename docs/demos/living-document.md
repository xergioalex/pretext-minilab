# Living Document System

- **Slug:** `living-document`
- **Category:** Advanced
- **Difficulty:** Flagship
- **Source:** `src/islands/demos/LivingDocument.svelte`, `src/pages/demos/living-document.astro`

## Overview

This demo treats a document surface like a scheduling problem. Story modules compete for prominence, the lead story expands into a multi-region block, and lower-priority modules repack into the remaining space using predicted text heights.

## Pretext APIs Used

| API | Why it is used |
|-----|----------------|
| `prepare()` | Prepare compact card bodies once per font configuration |
| `layout()` | Predict card heights for repacking without DOM reads |
| `layoutNextLine()` | Flow the lead story across multiple measured regions |

## How It Works

1. Story blocks start from a base priority.
2. Urgency, density, and recirculation bias modify those priorities.
3. The top-ranked story becomes the lead module.
4. The lead module gets a multi-region composition using `layoutNextLine()`.
5. Remaining modules are packed into columns using predicted heights from `layout()`.

## State Management

- `surface`: desktop, tablet, or mobile target
- `urgency`, `density`, `recirculationBias`: scoring inputs
- `featureLines`: the flowed lines for the lead story
- `cards`: packed secondary modules
- `boardHeight`: overall predicted document height

## Controls

- Surface preset buttons
- Urgency slider
- Density slider
- Recirculation bias slider
- Guide toggle

## Visual Rendering

The lead story is rendered as an editorial block with explicit line placement. Secondary modules are absolutely positioned cards whose heights come from Pretext, not the DOM.

## Key Technical Insight

The interesting part is not responsive resizing by itself. The interesting part is that text-aware priority changes become cheap enough to happen continuously because the document can predict reading cost before paint.

## How to Replicate

1. Model your surface as ranked content blocks.
2. Use `layout()` to estimate compact module heights.
3. Reserve special regions for the lead item.
4. Flow the lead item through those regions with `layoutNextLine()`.
5. Pack the rest of the modules by predicted height instead of post-render measurement.
