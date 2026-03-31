# Subtitle Composer

- **Slug:** `subtitle-composer`
- **Category:** Practical
- **Difficulty:** Advanced
- **Source:** `src/islands/demos/SubtitleComposer.svelte`, `src/pages/demos/subtitle-composer.astro`

## Overview

This demo turns subtitle composition into a measurable layout system. Safe zones, speaker identity, emphasis, cue timing, and reading speed are all part of the problem, not afterthoughts.

## Pretext APIs Used

| API | Why it is used |
|-----|----------------|
| `prepareWithSegments()` | Preserve token boundaries for emphasis-aware subtitle text |
| `layoutWithLines()` | Get exact wrapped lines for each subtitle cue |

## How It Works

1. Subtitle cues define start/end time, speaker, emphasis words, and raw text.
2. The active cue is selected from the playback time.
3. A safe-zone width is computed from the frame dimensions.
4. `layoutWithLines()` wraps the cue inside that safe zone.
5. The result is rendered as a subtitle block with optional speaker chip.

## State Management

- `currentTime` and `playing`: playback controls
- `safeWidth`: horizontal subtitle safe area
- `bottomOffset`: vertical safe-zone position
- `emphasizeSpeaker`: toggles speaker chip rendering
- `cueLines`: current wrapped subtitle lines

## Controls

- Playback toggle
- Timeline scrubber
- Safe width slider
- Bottom offset slider
- Speaker chip toggle

## Visual Rendering

The demo uses a faux cinematic frame with a dashed safe-zone overlay. Wrapped cue lines are centered within that region and emphasis words are highlighted.

## Key Technical Insight

Subtitle systems need deterministic wrapping before paint because timing, translation, and readability are tightly coupled. Pretext fits naturally as the cue measurement layer for that pipeline.

## How to Replicate

1. Model subtitles as timed cues with metadata.
2. Convert your subtitle safe area into a target width.
3. Prepare each cue with segments if emphasis matters.
4. Use `layoutWithLines()` to get stable subtitle lines.
5. Render the lines inside the safe zone alongside timing and speaker information.
