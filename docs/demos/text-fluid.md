# Text Fluid Field

- **Slug:** `text-fluid`
- **Category:** Spectacular
- **Difficulty:** Spectacular
- **Source:** `src/islands/demos/TextFluid.svelte`, `src/pages/demos/text-fluid.astro`

## Overview

This demo lets a paragraph move through a synthetic velocity field made of vortices and a cursor attractor. Each line samples that field to decide how wide it can be and how far it should drift.

## Pretext APIs Used

| API | Why it is used |
|-----|----------------|
| `prepareWithSegments()` | Prepare the long paragraph once |
| `layoutNextLine()` | Generate lines against a field-dependent width and offset |

## How It Works

1. A simple vector field is generated from moving vortices and the pointer.
2. Each y-position samples the field magnitude and direction.
3. Magnitude reduces width; direction shifts x-offset.
4. `layoutNextLine()` creates one line at a time using those sampled values.
5. The resulting lines are color-coded by local field intensity.

## State Management

- `energy`: field intensity
- `pointer`: attractor position
- `vortices`: moving field sources
- `lines`: current flowed text lines
- `showField`, `pinCursor`: visualization controls

## Controls

- Field energy slider
- Field overlay toggle
- Cursor pin toggle

## Visual Rendering

The stage shows field samples, a pointer attractor, drifting vortex zones, and line text with hue tied to local force.

## Key Technical Insight

This is more than a wave effect. The width function is no longer a single formula of y; it becomes a live field sampled per line, which is exactly the kind of geometry CSS is awkward at expressing.

## How to Replicate

1. Build a cheap vector field over normalized coordinates.
2. Map field magnitude to available width.
3. Map field direction to per-line x-offset.
4. Flow the paragraph with `layoutNextLine()`.
5. Visualize the field so the layout logic is legible to the viewer.
