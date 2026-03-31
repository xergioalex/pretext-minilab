# Rich Inline Segments

**Slug:** `rich-text-lines`
**Category:** Advanced
**Difficulty:** Advanced
**Source:** `src/islands/demos/RichTextLines.svelte` / `src/pages/demos/rich-text-lines.astro`

---

## Overview

This demo shows how to render text with mixed inline styles -- bold, code, accent, and badge -- by computing line breaks on concatenated plain text and then mapping styled segments back to each line for rendering. The user adjusts the container width and font size, and the styled text reflows in real time with each segment retaining its visual style across line breaks.

This matters because real-world content is rarely unstyled plain text. Rich text editors, documentation renderers, chat applications, and CMS frontends all need to handle mixed inline styles. Pretext handles this by separating the concerns: line breaking operates on the flat concatenated string (where word boundaries and widths are computed uniformly), and styling is applied after the fact by mapping character ranges back to the original segment definitions. This is fundamentally simpler than trying to measure styled text directly, where different fonts, sizes, and decorations would each affect glyph widths differently.

---

## Pretext APIs Used

| Function | Import | Purpose |
|---|---|---|
| `prepareWithSegments(text, font)` | `@chenglou/pretext` via `src/lib/pretext` | Prepares the flat concatenated text with segment tracking |
| `layoutWithLines(prepared, maxWidth, lineHeight)` | `@chenglou/pretext` via `src/lib/pretext` | Returns `{ height, lineCount, lines[] }` with per-line text content |
| `buildFont(size)` | `src/lib/pretext` | Helper that builds a CSS font string like `"16px Inter, sans-serif"` |

**Types used:** `LayoutLine` (each entry in the `lines` array, containing `text`, `width`, and cursor information)

---

## How It Works

### Step 1: Define rich segments

The content is defined as an array of `Segment` objects, each with a `text` string and a `style` field (`'normal'`, `'bold'`, `'code'`, `'accent'`, or `'badge'`). The pre-composed content explains Pretext capabilities using a mix of all five styles:

```typescript
interface Segment {
  text: string;
  style: 'normal' | 'bold' | 'code' | 'accent' | 'badge';
}

const richSegments: Segment[] = [
  { text: 'Pretext ', style: 'bold' },
  { text: 'turns text layout into a ', style: 'normal' },
  { text: 'programmable primitive', style: 'accent' },
  // ... more segments
];
```

### Step 2: Concatenate into flat text

All segment texts are joined into a single flat string:
```typescript
flatText = richSegments.map(s => s.text).join('');
```

This flat string is what Pretext uses for line breaking. The key insight is that line breaks are computed on the unstyled text, not on individual styled runs.

### Step 3: Prepare and layout

The flat text is prepared with `prepareWithSegments(flatText, font)`, then laid out with `layoutWithLines(prepared, width, lineHeight)`. The line height is computed as `fontSize * 1.7`. The result includes a `lines` array where each entry contains the text content of that line.

### Step 4: Build segment offset map

Before mapping segments to lines, cumulative character offsets are computed for each segment:
```typescript
const segmentOffsets = [];
let offset = 0;
for (const seg of richSegments) {
  segmentOffsets.push({ start: offset, end: offset + seg.text.length, segment: seg });
  offset += seg.text.length;
}
```

This creates a lookup structure: segment 0 covers characters `[0, 8)`, segment 1 covers `[8, 33)`, and so on.

### Step 5: Map segments to lines

For each line returned by `layoutWithLines`:

1. Determine the line's character range in the flat string using `findApproxStart()`, which walks through all lines summing their text lengths to find the starting character position.
2. Compute `lineStart` and `lineEnd` in the flat string.
3. For each segment in `segmentOffsets`, check if it overlaps the line's character range.
4. If it does, extract the overlapping portion: `flatText.slice(max(segStart, lineStart), min(segEnd, lineEnd))`.
5. Store the sliced text with its original style.

The result is an array of lines, each containing an array of `{ text, style }` pairs that can be rendered with the appropriate visual treatment.

### Step 6: Render styled lines

Each line is rendered as a flex row of styled spans. The rendering dispatch is a simple if-else chain on the style field, applying the appropriate Svelte markup for each style type.

---

## State Management

All state uses Svelte 5 runes (`$state`):

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `width` | `number` | `500` | Container max-width in pixels |
| `fontSize` | `number` | `16` | Font size in pixels |
| `flatText` | `string` | `''` | The concatenated plain text (recomputed on each layout) |
| `lineTexts` | `Array<{text, segments[]}>` | `[]` | Per-line data: the line's full text and its styled segment slices |

Non-reactive: `richSegments` (constant array of `Segment` objects defining the styled content).

A single `$effect` block tracks `width` and `fontSize`. When either changes, it calls `computeLayout()` via `untrack()` to recompute line breaks and segment mappings.

---

## Controls

| Control | Type | Range | Behavior |
|---|---|---|---|
| **Width** | Range slider | 200--700px | Bound to `width`; triggers relayout and segment remapping |
| **Font** | Range slider | 12--28px | Bound to `fontSize`; triggers prepare + relayout + segment remapping |

---

## Visual Rendering

### Stats row

Three stat cards displayed above the preview:
- **Lines**: the number of computed lines.
- **Segments**: the total number of styled segments in the source content (constant at 19).
- **Characters**: the total character count of the flat text.

### Preview box

A container with `max-width` bound to the width slider, secondary background, border, and rounded corners. The width transitions smoothly (0.2s ease) when the slider moves. Font size and line height are set inline.

Each line is rendered as a `<div class="rich-line">` containing styled spans:

- **normal**: Default text color, no special styling.
- **bold**: Rendered as `<strong>` -- font-weight 700, inherits the primary text color.
- **code**: Rendered as `<code class="inline-code">` -- monospace font (`var(--font-mono)`), 0.88em size, accent-tinted background (`rgba(124, 108, 240, 0.15)`), accent text color, 4px border-radius, 1px accent border.
- **accent**: Rendered as `<span class="inline-accent">` -- accent color (`var(--accent)`), font-weight 600.
- **badge**: Rendered as `<span class="inline-badge">` -- 0.8em font size, font-weight 600, accent-dim background, accent text color, pill shape (border-radius 9999px), 1px accent border.

### Segment legend

A card below the preview showing all five style types with live examples, so users understand the visual vocabulary without scrolling through the content.

---

## Key Technical Insight

**Real content is rarely plain text. Pretext handles mixed-style content by separating line breaking (on flat text) from rendering (with styles).**

The fundamental pattern is: concatenate all segment texts into one string, let Pretext compute optimal line breaks on that string, then map the character ranges of each line back to the original styled segments. This is simpler and more reliable than trying to measure each styled run independently (where bold text is wider, code uses a different font, badges have padding, etc.).

The tradeoff is explicit: this demo uses a single font for line breaking even though the rendered segments have different visual widths. Bold text is physically wider than normal weight, and code uses a monospace font with different metrics. In a production system, you would need per-segment font measurement -- potentially calling `prepare()` with different fonts and merging the results, or using a weighted average. This demo intentionally keeps it simple to show the API pattern: the line-break-then-map approach is the right architecture even if the measurement needs refinement.

This separation of concerns -- layout computation vs. visual rendering -- is a recurring theme in Pretext. The library handles the hard part (Unicode-aware line breaking with correct word boundaries) and leaves the rendering entirely to you.

---

## How to Replicate

To build a similar rich inline text renderer using Pretext:

1. **Install Pretext:** `npm install @chenglou/pretext`

2. **Define your segments:** Create an array of `{ text, style }` objects representing your rich content. Each segment is a run of text with a uniform style.

3. **Concatenate to flat text:** Join all segment texts into a single string: `segments.map(s => s.text).join('')`.

4. **Prepare and layout:** Call `prepareWithSegments(flatText, buildFont(fontSize))` and then `layoutWithLines(prepared, maxWidth, lineHeight)`.

5. **Build a segment offset map:** Iterate through your segments, tracking cumulative character offsets. Each entry records `{ start, end, segment }`.

6. **Map segments to lines:** For each line in the layout result, determine its character range in the flat string. Then, for each segment whose range overlaps the line's range, extract the overlapping text slice and pair it with the segment's style.

7. **Render with styles:** For each line, render its segment slices with the appropriate visual treatment -- `<strong>` for bold, `<code>` for code, colored `<span>` for accents, pill-shaped `<span>` for badges.

8. **Handle the tradeoff:** Be aware that this approach uses a single font for measurement. For production rich text where different styles have different widths, you would need per-segment font measurement or a more sophisticated merging strategy.
