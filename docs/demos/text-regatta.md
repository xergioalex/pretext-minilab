# Text Regatta

- **Slug:** `text-regatta`
- **Category:** Spectacular
- **Difficulty:** Flagship
- **Source:** `src/islands/demos/TextRegatta.svelte`, `src/pages/demos/text-regatta.astro`

## Overview

This demo turns a paragraph into an animated sea and sends a sailboat through it. The text is the water surface itself: every line is shaped by swell, current, and a boat-driven wake rather than a normal static container.

## Pretext APIs Used

| API | Why it is used |
|-----|----------------|
| `prepareWithSegments()` | Prepare the sea text once for fast repeated flow |
| `layoutNextLine()` | Generate one water line at a time with frame-dependent widths |

## How It Works

1. The sea is modeled as a stack of line bands.
2. Each band samples swell, current, and wake values.
3. Those values determine the line's x-offset and available width.
4. `layoutNextLine()` generates the next piece of readable water.
5. The sailboat follows a route that continuously changes the wake field.

## State Management

- `wind`: how strongly the current and route are driven
- `swell`: baseline wave amplitude
- `wake`: turbulence intensity around the boat
- `boatX`, `boatY`, `boatTilt`: vessel pose
- `seaLines`: current water-text lines

## Controls

- Wind slider
- Swell slider
- Wake slider
- Font slider
- Autopilot toggle
- Guide toggle

## Visual Rendering

The stage uses a sky-to-sea gradient, foam accents, line guides, a sailboat SVG, and a wake ribbon. The text itself supplies the readable water surface, so the scene feels typographic rather than decorative.

## Key Technical Insight

The important trick is that the boat does not just sit on top of a wave animation. Its route feeds back into the layout field, so the text-water is recomputed as a surface that responds to navigation.

## How to Replicate

1. Model the water as a sequence of line bands.
2. Define wave, current, and wake functions over y.
3. Turn those values into line width and x-offset.
4. Drive a vessel route through the same field.
5. Use `layoutNextLine()` on every band to keep the sea readable while it moves.
