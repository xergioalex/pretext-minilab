# Pretext: Complete Guide

A comprehensive guide to the `@chenglou/pretext` library — the programmable text layout engine that powers every demo in this project.

---

## Table of Contents

- [What Is Pretext?](#what-is-pretext)
- [The Core Insight](#the-core-insight)
- [Two-Phase Architecture](#two-phase-architecture)
- [API Reference](#api-reference)
- [Type Reference](#type-reference)
- [Usage Patterns](#usage-patterns)
- [Performance Characteristics](#performance-characteristics)
- [Unicode & Internationalization](#unicode--internationalization)
- [Constraints & Limitations](#constraints--limitations)
- [Why This Matters](#why-this-matters)

---

## What Is Pretext?

**Pretext** is a JavaScript/TypeScript library for multiline text measurement and layout **without DOM reflow**. It answers the question: _"If I put this text in a container of width W, how many lines will it wrap into and how tall will it be?"_ — instantly, without rendering anything.

- **Author**: Cheng Lou ([@chenglou](https://github.com/chenglou))
- **Repository**: [github.com/chenglou/pretext](https://github.com/chenglou/pretext)
- **Version**: 0.0.3
- **License**: MIT
- **Zero dependencies** (uses browser-native `Intl.Segmenter` and Canvas API)

---

## The Core Insight

Traditional web text measurement works like this:

```
Create hidden element → Set text & width → Append to DOM (reflow!) → Read offsetHeight (reflow!) → Remove → Repeat
```

Every measurement triggers **layout reflow** — the browser must recalculate the position and size of every element. This is expensive and scales poorly. Measuring 100 text blocks at different widths means 100+ reflows.

Pretext inverts this:

```
Prepare once (analyze + measure) → Layout at any width (pure arithmetic) → Layout at another width (pure arithmetic) → ...
```

The expensive work (Unicode segmentation, word boundary detection, font measurement) happens **once**. After that, computing layout at any width is just arithmetic on cached numbers — no DOM, no Canvas, no strings, no reflow.

---

## Two-Phase Architecture

### Phase 1: Prepare (Expensive, One-Time)

The `prepare()` function performs all the heavy lifting:

1. **Normalize whitespace** — collapse spaces according to CSS `white-space: normal` rules
2. **Segment text** — use `Intl.Segmenter` to find word boundaries (handles CJK, Thai, Arabic, etc.)
3. **Merge punctuation** — attach trailing punctuation to preceding words (e.g., `"better."` stays together)
4. **Split CJK** — break CJK words into individual graphemes (they can break between any character)
5. **Measure segments** — use Canvas `measureText()` for each segment, cache the widths
6. **Pre-measure graphemes** — for long words, measure individual graphemes to support `overflow-wrap: break-word`
7. **Correct emoji** — auto-detect and correct browser-specific emoji width inflation
8. **Compute bidi** — prepare bidirectional text metadata for custom renderers

The result is an opaque `PreparedText` handle that contains all cached measurements.

### Phase 2: Layout (Cheap, Repeated)

The `layout()` function takes the prepared handle and computes layout:

1. Walk through cached segment widths
2. Accumulate width until a line break is needed
3. Break lines according to CSS-like rules
4. Count lines, multiply by line height for total height

**No DOM. No Canvas. No strings.** Just arithmetic on cached numbers.

This is why resizing is essentially free — you're not re-measuring text, just re-computing where the breaks fall.

---

## API Reference

### Preparation Functions

#### `prepare(text, font, options?)`

The fundamental preparation function. Analyzes text and measures it against a font.

```typescript
import { prepare } from '@chenglou/pretext';

const prepared = prepare('Hello world, this is a test.', '16px Inter, sans-serif');
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | `string` | The text to prepare |
| `font` | `string` | CSS font string (e.g., `'16px Inter, sans-serif'`) |
| `options?` | `PrepareOptions` | Optional: `{ whiteSpace: 'normal' \| 'pre-wrap' }` |

**Returns:** `PreparedText` — an opaque handle for use with `layout()`.

**When to use:** When you only need height and line count, not individual line data.

---

#### `prepareWithSegments(text, font, options?)`

Like `prepare()` but returns a richer structure that exposes segment data. Required for `layoutWithLines()`, `layoutNextLine()`, and `walkLineRanges()`.

```typescript
import { prepareWithSegments } from '@chenglou/pretext';

const prepared = prepareWithSegments('Hello world', '16px Inter');
console.log(prepared.segments); // ['Hello', ' ', 'world']
```

**Returns:** `PreparedTextWithSegments` — includes `segments: string[]` plus internal measurement data.

**When to use:** When you need line-level data, per-line control, or segment access.

---

#### `profilePrepare(text, font, options?)`

Diagnostic helper that measures the time breakdown of the preparation phase.

```typescript
import { profilePrepare } from '@chenglou/pretext';

const profile = profilePrepare(longText, '16px Inter');
console.log(`Analysis: ${profile.analysisMs}ms, Measure: ${profile.measureMs}ms`);
```

**Returns:** `PrepareProfile` — timing breakdown.

**When to use:** Performance profiling and benchmarking.

---

### Layout Functions

#### `layout(prepared, maxWidth, lineHeight)`

The hot-path layout function. Computes height and line count in microseconds.

```typescript
import { prepare, layout } from '@chenglou/pretext';

const prepared = prepare('Long text here...', '16px Inter');
const result = layout(prepared, 400, 24); // 400px width, 24px line height
console.log(result.height);    // e.g., 96
console.log(result.lineCount); // e.g., 4
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `prepared` | `PreparedText` | Handle from `prepare()` or `prepareWithSegments()` |
| `maxWidth` | `number` | Container width in pixels |
| `lineHeight` | `number` | Line height in pixels |

**Returns:** `LayoutResult` — `{ lineCount: number, height: number }`

**Performance:** ~0.0002ms per call (pure arithmetic).

**When to use:** The default choice for most use cases. Resize handlers, virtual scrolling, masonry grids, chat bubbles.

---

#### `layoutWithLines(prepared, maxWidth, lineHeight)`

Returns full line data including text content and measured widths.

```typescript
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext';

const prepared = prepareWithSegments('The quick brown fox jumps over the lazy dog.', '16px Inter');
const result = layoutWithLines(prepared, 200, 24);

for (const line of result.lines) {
  console.log(`"${line.text}" — width: ${line.width}px`);
}
// "The quick brown fox" — width: 142px
// "jumps over the lazy" — width: 138px
// "dog." — width: 30px
```

**Returns:** `LayoutLinesResult` — `{ lineCount, height, lines: LayoutLine[] }`

Each `LayoutLine` contains:
- `text: string` — the text content of this line
- `width: number` — the measured width of this line
- `start: LayoutCursor` — inclusive start position
- `end: LayoutCursor` — exclusive end position

**When to use:** Canvas rendering, rich text rendering, shrink-wrap calculations, text visualization.

---

#### `layoutNextLine(prepared, start, maxWidth)`

Lays out a single line starting from a cursor position. Returns `null` when the text is exhausted.

```typescript
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext';
import type { LayoutCursor } from '@chenglou/pretext';

const prepared = prepareWithSegments(longText, '16px Inter');
let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
let y = 0;
const lineHeight = 24;

while (true) {
  const lineWidth = computeAvailableWidth(y); // Your custom logic!
  const line = layoutNextLine(prepared, cursor, lineWidth);
  if (!line) break;

  renderLine(line.text, 0, y, line.width);
  cursor = line.end;
  y += lineHeight;
}
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `prepared` | `PreparedTextWithSegments` | Handle from `prepareWithSegments()` |
| `start` | `LayoutCursor` | Where to start laying out (previous line's `end`) |
| `maxWidth` | `number` | Available width for this specific line |

**Returns:** `LayoutLine | null` — the laid-out line, or `null` if no text remains.

**When to use:** Variable-width layouts (text flowing around obstacles, sine wave distortions, editorial layouts). This is the most powerful API — each line can have a different width.

---

#### `walkLineRanges(prepared, maxWidth, onLine)`

Low-level batch geometry pass. Calls a callback for each line without materializing line text. More efficient than `layoutWithLines()` when you only need geometry.

```typescript
import { prepareWithSegments, walkLineRanges } from '@chenglou/pretext';

const prepared = prepareWithSegments(text, '16px Inter');
let maxLineWidth = 0;

const lineCount = walkLineRanges(prepared, containerWidth, (line) => {
  if (line.width > maxLineWidth) maxLineWidth = line.width;
});

console.log(`Tightest fit: ${maxLineWidth}px (${lineCount} lines)`);
```

**Returns:** `number` — the line count.

**When to use:** Shrinkwrap calculations, binary search for optimal width, balanced text, any case where you need line widths but not line text.

---

### Utility Functions

#### `clearCache()`

Clears all internal caches (canvas measurements, text analysis, grapheme segmentation).

```typescript
import { clearCache } from '@chenglou/pretext';
clearCache();
```

**When to use:** When cycling through many different fonts or text variants to release accumulated memory.

---

#### `setLocale(locale?)`

Sets the locale for future `prepare()` and `prepareWithSegments()` calls. Affects `Intl.Segmenter` behavior for proper Unicode text segmentation.

```typescript
import { setLocale } from '@chenglou/pretext';

setLocale('ja');  // Japanese segmentation rules
setLocale('th');  // Thai segmentation rules
setLocale();      // Reset to system default
```

**Note:** This clears all internal caches. Existing prepared text handles are not affected.

---

### Helper Functions (from this project)

These are defined in `src/lib/pretext/index.ts`:

#### `buildFont(size, family?)`

Constructs a CSS font string.

```typescript
import { buildFont } from '../../lib/pretext';

buildFont(16);                     // '16px Inter, sans-serif'
buildFont(20, 'Georgia, serif');   // '20px Georgia, serif'
```

#### `SAMPLE_TEXTS`

Pre-written sample texts of varying lengths:

| Key | Length | Content |
|-----|--------|---------|
| `short` | ~45 chars | "The quick brown fox..." |
| `medium` | ~230 chars | Description of Pretext's approach |
| `long` | ~650 chars | Extended essay on typography and Pretext |
| `editorial` | ~450 chars | Gutenberg-inspired editorial prose |

---

## Type Reference

### Input Types

#### `PrepareOptions`

```typescript
interface PrepareOptions {
  whiteSpace?: 'normal' | 'pre-wrap';
}
```

| Mode | Behavior |
|------|----------|
| `'normal'` (default) | Standard CSS whitespace collapsing. Multiple spaces become one. Newlines become spaces. |
| `'pre-wrap'` | Textarea-like. Preserves spaces, tabs, and `\n` hard breaks. Tabs follow `tab-size: 8`. |

### Output Types

#### `PreparedText`

Opaque branded type. Use with `layout()` only. Cannot be inspected directly.

#### `PreparedTextWithSegments` (extends `PreparedText`)

```typescript
interface PreparedTextWithSegments extends PreparedText {
  segments: string[];     // Array of text segments
  widths: number[];       // Width of each segment
  kinds: SegmentBreakKind[]; // Break behavior per segment
  // ... additional internal fields
}
```

#### `LayoutResult`

```typescript
interface LayoutResult {
  lineCount: number;  // Number of wrapped lines
  height: number;     // Total height = lineCount * lineHeight
}
```

#### `LayoutLine`

```typescript
interface LayoutLine {
  text: string;        // Text content of this line
  width: number;       // Measured width in pixels
  start: LayoutCursor; // Inclusive start cursor
  end: LayoutCursor;   // Exclusive end cursor
}
```

#### `LayoutCursor`

```typescript
interface LayoutCursor {
  segmentIndex: number;  // Index into segments array
  graphemeIndex: number;  // Grapheme index within segment (0 at boundaries)
}
```

#### `PrepareProfile`

```typescript
interface PrepareProfile {
  analysisMs: number;        // Time for text analysis
  measureMs: number;         // Time for canvas measurement
  totalMs: number;           // Total preparation time
  analysisSegments: number;  // Segments produced by analysis
  preparedSegments: number;  // Segments after preparation
  breakableSegments: number; // Segments with grapheme-level widths
}
```

#### `SegmentBreakKind`

```typescript
type SegmentBreakKind =
  | 'text'              // Regular text content
  | 'space'             // Ordinary collapsible space
  | 'preserved-space'   // Non-collapsing space (pre-wrap mode)
  | 'tab'               // Tab character
  | 'glue'              // Invisible break point (CJK punctuation)
  | 'zero-width-break'  // Invisible break point (script boundaries)
  | 'soft-hyphen'       // Discretionary hyphen (U+00AD)
  | 'hard-break';       // Newline character (\n)
```

---

## Usage Patterns

### Pattern 1: Prepare Once, Layout Many Times

The most common pattern. Prepare the text once, then relayout cheaply whenever the container width changes.

```typescript
// Prepare once (expensive, ~1ms)
const prepared = prepare(text, buildFont(16));

// Layout many times (cheap, ~0.0002ms each)
const at300 = layout(prepared, 300, 24);
const at400 = layout(prepared, 400, 24);
const at500 = layout(prepared, 500, 24);
```

**Used in:** Measure Height, Resize Relayout, DOM vs Pretext, Chat Bubbles, Masonry Cards

### Pattern 2: Variable-Width Line-by-Line Layout

Each line gets a different width based on obstacles, mathematical functions, or user interaction.

```typescript
const prepared = prepareWithSegments(text, buildFont(16));
let cursor = { segmentIndex: 0, graphemeIndex: 0 };
let y = 0;

while (true) {
  // Compute width based on position (obstacle, wave, etc.)
  const availableWidth = getWidthAtY(y);
  const line = layoutNextLine(prepared, cursor, availableWidth);
  if (!line) break;

  lines.push({ text: line.text, x: getOffsetAtY(y), y, width: line.width });
  cursor = line.end;
  y += lineHeight;
}
```

**Used in:** Dragon Chase, Editorial Engine, Flow Around Obstacle, Wave Distortion

### Pattern 3: Character Position Extraction

Extract the exact position of every character for particle-based animations.

```typescript
const prepared = prepareWithSegments(text, buildFont(fontSize));
const { lines } = layoutWithLines(prepared, width, lineHeight);
const chars = [];

const ctx = canvas.getContext('2d');
ctx.font = buildFont(fontSize);

for (let i = 0; i < lines.length; i++) {
  let x = 0;
  for (const char of lines[i].text) {
    const charWidth = ctx.measureText(char).width;
    chars.push({
      char,
      homeX: x + charWidth / 2,
      homeY: i * lineHeight + lineHeight / 2,
      x: /* current animated position */,
      y: /* current animated position */,
    });
    x += charWidth;
  }
}
```

**Used in:** Gravity Letters, Text Vortex

### Pattern 4: Canvas Rendering

Use Pretext for line breaking and render to Canvas 2D instead of the DOM.

```typescript
const prepared = prepareWithSegments(text, buildFont(fontSize));
const { lines } = layoutWithLines(prepared, width, lineHeight);

const ctx = canvas.getContext('2d');
ctx.font = buildFont(fontSize);
ctx.textBaseline = 'top';

for (let i = 0; i < lines.length; i++) {
  ctx.fillText(lines[i].text, 0, i * lineHeight);
}
```

**Used in:** Canvas Layout, Gravity Letters, Text Breakout, Text Vortex

### Pattern 5: Shrink-Wrap Computation

Find the tightest bounding box for wrapped text.

```typescript
const prepared = prepareWithSegments(text, buildFont(fontSize));
const { lines } = layoutWithLines(prepared, maxWidth, lineHeight);

const tightWidth = Math.max(...lines.map(line => line.width));
// tightWidth is the narrowest container that doesn't change line breaks
```

**Used in:** Shrink-Wrap

### Pattern 6: Rich Text Mapping

Layout plain text, then map styled segments back to each line.

```typescript
// Define styled segments
const segments = [
  { text: 'Hello ', style: 'normal' },
  { text: 'world', style: 'bold' },
  { text: '!', style: 'normal' },
];

// Concatenate and layout as plain text
const flatText = segments.map(s => s.text).join('');
const prepared = prepareWithSegments(flatText, buildFont(16));
const { lines } = layoutWithLines(prepared, 300, 24);

// Map segments back to lines using character offsets
// (See RichTextLines demo for full implementation)
```

**Used in:** Rich Inline Segments

---

## Performance Characteristics

### Benchmarks (Approximate)

| Operation | Time | Notes |
|-----------|------|-------|
| `prepare()` | ~0.04ms per text block | One-time cost, includes Canvas measurement |
| `layout()` | ~0.0002ms per call | Pure arithmetic, no DOM |
| `layoutWithLines()` | ~0.001ms per call | Slightly more than `layout()` due to string materialization |
| `layoutNextLine()` | ~0.001ms per call | Per-line, used in loops |

### Comparison: DOM vs Pretext

For resizing 500 text blocks:

| Approach | Time |
|----------|------|
| DOM measurement (create, measure, remove per block) | ~19ms |
| Pretext prepare (one-time) | ~19ms |
| Pretext layout (500 blocks) | ~0.09ms |

The prepare cost is comparable to DOM measurement. The advantage comes from relayout — every subsequent width change costs microseconds instead of milliseconds.

### Why This Matters

- **60fps budget**: 16.67ms per frame. DOM measurement of 100 blocks takes ~4ms. Pretext relayout of 100 blocks takes ~0.02ms.
- **Resize handlers**: Every pixel of drag triggers relayout. DOM measurement can't keep up; Pretext is imperceptible.
- **Virtual scrolling**: Need heights for thousands of items. Pretext can compute all of them in milliseconds.

---

## Unicode & Internationalization

Pretext uses `Intl.Segmenter` for Unicode-aware text segmentation, which means it handles:

| Script | Behavior |
|--------|----------|
| **Latin/Cyrillic** | Word-boundary breaking (spaces, hyphens) |
| **CJK (Chinese, Japanese, Korean)** | Per-character breaking (any character can be a break point) |
| **Japanese** | Kinsoku rules (certain punctuation can't start/end lines) |
| **Thai/Khmer/Lao** | Dictionary-based word breaking via Segmenter |
| **Arabic/Hebrew** | RTL support with bidi metadata |
| **Emoji** | Grapheme cluster handling (composite emoji stay together) |

### Setting Locale

For optimal segmentation in specific languages:

```typescript
import { setLocale } from '@chenglou/pretext';
setLocale('ja'); // Better Japanese segmentation
```

### Limitations

- **Bidi rendering**: Pretext computes bidi metadata but doesn't reorder characters. The browser's text renderer or your custom renderer must handle visual reordering.
- **Complex scripts**: Some scripts (e.g., Tibetan, Burmese) may not segment perfectly depending on browser support.
- **Font fallback**: Pretext measures with a single font. If the browser falls back to a different font for certain glyphs, measurements may differ slightly.

---

## Constraints & Limitations

| Limitation | Details |
|-----------|---------|
| **Requires Canvas API** | Uses `measureText()` for font measurement. Unavailable in SSR/Node.js without polyfills. |
| **Single font per prepare** | Each `prepare()` call uses one font. Mixed fonts require separate preparation. |
| **No `white-space: pre`** | Only `normal` and `pre-wrap` modes are supported. |
| **No `word-break: break-all`** | Only standard break behavior and `overflow-wrap: break-word`. |
| **No custom `line-break`** | Uses `auto` line-break mode only. |
| **`system-ui` font unsafe on macOS** | Use named fonts (Inter, Helvetica, etc.) instead of `system-ui`. |
| **Measurement accuracy** | Depends on browser Canvas implementation. May vary ~1px across browsers. |

---

## Why This Matters

### The Problem

The DOM's text layout is an **opaque, all-or-nothing operation**. You can't ask "how tall would this text be at 300px wide?" without actually rendering it. This forces a pattern of:

1. Create a hidden element
2. Set the text and width
3. Append to DOM (triggers reflow)
4. Read the computed height (triggers reflow)
5. Remove the element
6. Repeat for each text block

This couples measurement to rendering. You can't measure without rendering. You can't resize without reflows. You can't predict heights without the DOM.

### What Pretext Enables

By separating text analysis from layout computation, Pretext unlocks:

| Use Case | Without Pretext | With Pretext |
|----------|----------------|-------------|
| **Masonry grids** | Render cards, read heights, reposition (layout shift) | Predict heights, position before render (no shift) |
| **Virtual scrolling** | Estimate heights or render off-screen | Compute exact heights instantly |
| **Chat bubbles** | Render bubble, read height, position | Predict height, position instantly |
| **Text around shapes** | CSS `shape-outside` (limited to floats) | Per-line width control around any shape |
| **Canvas text** | No multiline support | Full line breaking for canvas rendering |
| **60fps animations** | DOM reflows break the frame budget | Arithmetic stays within budget |
| **Text games** | Impractical with DOM measurement | Text as a real-time game mechanic |

### The Bigger Picture

Pretext represents a philosophical shift: **text layout as a programmable primitive**. Instead of asking the browser to do layout for you and reading back the results, you do the layout yourself and render however you want. This puts the developer back in control of every line break, every measurement, every layout decision — something print typesetting has had for centuries but the web has lacked.

---

## Further Reading

- **Pretext Repository**: [github.com/chenglou/pretext](https://github.com/chenglou/pretext)
- **Demo Catalog**: See [demos/README.md](./demos/README.md) for detailed breakdowns of all 16 demos
- **Architecture**: See [architecture.md](./architecture.md) for how Pretext is integrated into this project
