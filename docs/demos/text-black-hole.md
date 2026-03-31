# Text Black Hole

- **Slug:** `text-black-hole`
- **Category:** Spectacular
- **Difficulty:** Flagship
- **Source:** `src/islands/demos/TextBlackHole.svelte`, `src/pages/demos/text-black-hole.astro`

## Overview

This demo bends a paragraph through a fictional gravitational field. Near the singularity, lines are compressed; farther away, they recover width. Lensing offsets make the reading path curve instead of simply shrinking.

## Pretext APIs Used

| API | Why it is used |
|-----|----------------|
| `prepareWithSegments()` | Prepare the long text once |
| `layoutNextLine()` | Query line widths from a radial geometry field |

## How It Works

1. The singularity defines a center point.
2. Line width is reduced based on vertical distance to that point.
3. Lensing offsets move lines horizontally around the event horizon.
4. `layoutNextLine()` generates the document under those radial constraints.
5. Visual rings and a singularity marker reinforce the geometry.

## State Management

- `gravity`: controls radial compression
- `ring`: controls lateral lensing
- `singularityX`, `singularityY`: center of the field
- `autoOrbit`: animates the singularity path

## Controls

- Gravity slider
- Ring shear slider
- Accretion ring toggle
- Auto orbit toggle

## Visual Rendering

The demo uses a dark spatial stage with ring overlays and hue-shifted lines so the field feels like an active astrophysical object rather than a simple mask.

## Key Technical Insight

The important point is not the sci-fi theme. It is that the layout input is a radial field, not a normal box or obstacle. This expands the mental model of what can drive `layoutNextLine()`.

## How to Replicate

1. Define a singularity center.
2. Map distance to compression.
3. Map field shear to x-offset.
4. Flow lines one by one with `layoutNextLine()`.
5. Add visual scaffolding so the geometry is understandable.
