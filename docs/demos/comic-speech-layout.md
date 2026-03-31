# Comic Speech Layout

- **Slug:** `comic-speech-layout`
- **Category:** Advanced
- **Difficulty:** Advanced
- **Source:** `src/islands/demos/ComicSpeechLayout.svelte`, `src/pages/demos/comic-speech-layout.astro`

## Overview

This demo composes comic speech balloons from measured dialogue. Instead of drawing a balloon and hoping the text fits, it measures the text first, sizes the balloon from the wrapped lines, and then positions the dialogue inside the panel.

## Pretext APIs Used

| API | Why it is used |
|-----|----------------|
| `prepareWithSegments()` | Preserve dialogue and emphasis structure |
| `layoutWithLines()` | Get exact wrapped lines and widths for each balloon |

## How It Works

1. Each dialogue line gets a target maximum width.
2. The text is prepared and wrapped with `layoutWithLines()`.
3. The widest measured line determines balloon width.
4. Line count determines balloon height.
5. The balloon and tail are drawn from those measured dimensions.

## State Management

- `dramatic`: changes perceived emphasis and balloon scale
- `panelTightness`: reduces available width inside each panel
- `showTails`: toggles speech-tail rendering
- `bubbles`: the measured balloon layouts

## Controls

- Dramatic emphasis slider
- Panel tightness slider
- Bubble tail toggle

## Visual Rendering

The stage is split into comic panels with simple characters, balloons, and optional tails. Each balloon is sized from the measured line widths, not guessed padding.

## Key Technical Insight

Comic lettering is a narrative layout problem. Panel rhythm, emphasis, and tail credibility all depend on having reliable text measurements before the balloon is painted.

## How to Replicate

1. Assign a max width per balloon.
2. Wrap dialogue with `layoutWithLines()`.
3. Derive balloon width from the widest measured line.
4. Derive balloon height from line count.
5. Draw tails and panel composition after those dimensions are known.
