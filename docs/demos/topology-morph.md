# Topology Morph

- **Slug:** `topology-morph`
- **Category:** Advanced
- **Difficulty:** Advanced
- **Source:** `src/islands/demos/TopologyMorph.svelte`, `src/pages/demos/topology-morph.astro`

## Overview

This demo shows one document morphing between radically different region topologies: columns, stairs, canyons, and ribbon-like paths. The text is not re-authored; only the spatial path changes.

## Pretext APIs Used

| API | Why it is used |
|-----|----------------|
| `prepareWithSegments()` | Prepare the source document once |
| `layoutNextLine()` | Generate one line at a time while the topology changes |

## How It Works

1. Each topology defines width and x-offset as a function of y.
2. A morph progress interpolates between the source and target topology.
3. For each line, the interpolated geometry produces a width and x-offset.
4. `layoutNextLine()` uses that geometry to continue the reading path.
5. The result is animated to show continuity across topological change.

## State Management

- `fromTopology`, `toTopology`: source and target spatial systems
- `progress`: morph amount
- `autoplay`: auto-advances between topologies
- `lines`: current flowed lines

## Controls

- Source topology buttons
- Target topology buttons
- Morph slider
- Autoplay toggle
- Guide toggle

## Visual Rendering

The demo renders line guides and the final line text inside a single stage, making the underlying topology legible during the morph.

## Key Technical Insight

Responsive design usually jumps between breakpoints. This demo shows a smoother idea: the reading topology itself can be interpolated, letting the document migrate between layouts instead of snapping between them.

## How to Replicate

1. Define multiple topology functions.
2. Interpolate their width and x-offset outputs.
3. Feed the interpolated geometry into `layoutNextLine()`.
4. Preserve a single reading cursor during the transition.
5. Render guides so the topology shift is visible, not magical.
