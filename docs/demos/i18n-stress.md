# Multilingual Stress Test

**Slug:** `i18n-stress`
**Category:** Practical
**Difficulty:** Advanced
**Source:** `src/islands/demos/I18nStress.svelte`
**Page:** `src/pages/demos/i18n-stress.astro`

---

## Overview

This demo stress-tests Pretext against 9 diverse Unicode text samples spanning different scripts, writing directions, and edge cases. It shows how Pretext handles English, Spanish, Chinese, Japanese, Arabic, mixed bidirectional text, emoji, long unbroken strings, and whitespace-heavy content. For each sample, the demo computes the full layout and displays line counts, heights, rendered previews, and a line-by-line breakdown table.

The demo is deliberately honest about both Pretext's strengths and the inherent complexity of multilingual text layout. It serves as both a test harness and an educational tool for understanding Unicode layout challenges.

---

## Pretext APIs Used

| API | Purpose |
|-----|---------|
| `prepare(text, font)` | Basic text preparation (used internally) |
| `layout(prepared, maxWidth, lineHeight)` | Basic height/line count computation |
| `prepareWithSegments(text, font)` | Prepares text with segment data for per-line extraction |
| `layoutWithLines(prepared, maxWidth, lineHeight)` | Returns full line-by-line breakdown with text and width per line |
| `buildFont(fontSize)` | Constructs the font descriptor |

The demo primarily uses `prepareWithSegments()` + `layoutWithLines()` to get the detailed per-line data needed for the breakdown tables.

---

## How It Works

### 1. Sample Definition

Nine text samples are defined, each with:

- `label` — Display name (e.g., "Chinese (Simplified)")
- `lang` — Language/script identifier used for rendering direction
- `text` — The actual Unicode text content
- `note` — A brief explanation of what makes this sample interesting

### 2. The Nine Samples

| # | Label | Script | Challenge |
|---|-------|--------|-----------|
| 1 | English | Latin | Baseline behavior — standard word-boundary line breaking |
| 2 | Spanish | Latin (extended) | Accented characters (e, i, u with accents), ñ, inverted punctuation |
| 3 | Chinese (Simplified) | CJK | Every character is a potential break point; no spaces between words |
| 4 | Japanese | Mixed CJK | Kanji + Hiragana + Katakana; kinsoku (line-breaking prohibition) rules apply |
| 5 | Arabic | Arabic (RTL) | Right-to-left script; bidirectional text handling required |
| 6 | Mixed Bidi | Multiple | Arabic + English + Japanese + Spanish in one paragraph; complex direction changes |
| 7 | Emoji-heavy | Emoji/Symbol | Grapheme clusters, composite emoji (skin tone, ZWJ sequences), variation selectors |
| 8 | Long unbroken | Latin | A single string with underscores and no spaces; tests overflow/break behavior |
| 9 | Whitespace-heavy | Latin | Multiple consecutive spaces between words; tests whitespace collapsing |

### 3. Computation

A single `computeAll()` function processes all 9 samples:

1. Build the font with `buildFont(fontSize)`.
2. Compute line height as `fontSize * 1.6`.
3. For each sample:
   - Call `prepareWithSegments(text, font)`.
   - Call `layoutWithLines(prepared, width, lineHeight)`.
   - Store the `height`, `lineCount`, and `lines` array (with each line's text and width rounded to integers).

### 4. Reactive Updates

A single `$effect` block watches `width` and `fontSize`. When either changes, `computeAll()` is called inside `untrack()` to recompute all 9 samples simultaneously.

---

## State Management

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `width` | `number` | `400` | Maximum line width for all samples |
| `fontSize` | `number` | `16` | Font size applied to all samples |
| `results` | `SampleResult[]` | `[]` | Computed layout results for all 9 samples |

The `SampleResult` interface contains:
- `sample` — Reference to the original `Sample` object
- `height` — Total computed height in pixels
- `lineCount` — Number of lines after wrapping
- `lines` — Array of `{ text: string; width: number }` for each line

---

## Controls

| Control | Type | Range | Effect |
|---------|------|-------|--------|
| Width | Range slider | 150-700px | Adjusts the wrapping width for all samples simultaneously |
| Font size | Range slider | 12-28px | Changes the font size for all samples |

The controls are intentionally minimal. The focus is on observing how different scripts respond to the same width and font size constraints.

---

## Visual Rendering

### Per-Sample Card

Each of the 9 samples is rendered as a card containing:

1. **Header row** — The sample label (e.g., "Japanese") in accent color on the left, and stats ("4 lines . 102px") in monospace on the right.

2. **Note** — An italic description of the sample's complexity (e.g., "Mixed Kanji, Hiragana, Katakana — kinsoku rules apply.").

3. **Rendered preview** — The actual text displayed in an HTML element with the correct `max-width`, `font-size`, `line-height`, and crucially, `direction` set to `rtl` for the Arabic sample. This preview shows what the text looks like when rendered by the browser.

4. **Line-by-line table** — Each computed line is shown as a row containing:
   - Line number (monospace, muted)
   - Line text (truncated with ellipsis if it overflows)
   - Line width in pixels (monospace, accent color)

   Rows highlight on hover for readability.

### RTL Handling

The Arabic sample's preview uses `direction: rtl` in its inline style. This is determined by checking `r.sample.lang === 'ar'`.

### Honesty Note

At the bottom of all samples, a bordered card provides an honest assessment:

> "Text layout is globally complex. Pretext handles many Unicode edge cases, including CJK line breaking (kinsoku), grapheme clusters, and bidirectional text. However, perfect rendering across all scripts, browsers, and font combinations remains an ongoing challenge for any text layout system."

This transparency is a deliberate design choice — the demo shows capabilities without overpromising.

---

## Key Technical Insight

Text layout is not a solved problem in the general case. Different scripts have fundamentally different rules:

- **Latin** scripts break at word boundaries (spaces, hyphens).
- **CJK** scripts can break between almost any character, but certain characters must not start or end a line (kinsoku shori).
- **Arabic** is written right-to-left, with characters that change shape based on position (initial, medial, final, isolated forms).
- **Bidirectional** text requires the Unicode Bidirectional Algorithm to determine visual ordering.
- **Emoji** can be multi-codepoint sequences (skin tone modifiers, ZWJ family sequences) that must not be broken mid-cluster.

Pretext leverages `Intl.Segmenter` (where available) to handle grapheme cluster boundaries correctly, which covers most of these cases. The demo makes it possible to observe where Pretext succeeds and where edge cases remain, providing a realistic picture of the state of programmatic text layout.

---

## How to Replicate

1. **Curate diverse text samples** — Include at least: a Latin baseline, a CJK script (Chinese or Japanese), an RTL script (Arabic or Hebrew), mixed-direction text, emoji with composite sequences, and stress cases (long unbroken strings, excessive whitespace).

2. **Add metadata per sample** — Each sample should have a label, language tag, and a note explaining what makes it interesting. The language tag drives rendering decisions (e.g., `direction: rtl`).

3. **Compute layouts in batch** — Write a single function that iterates all samples, calling `prepareWithSegments()` + `layoutWithLines()` for each. Store the results in an array.

4. **Display per-line breakdowns** — For each sample, render a table of lines showing the line number, text content, and pixel width. This makes it visible exactly where Pretext chose to break each line.

5. **Apply correct text direction** — For RTL samples, set `direction: rtl` on the rendered preview element. For mixed-direction text, let the browser's bidi algorithm handle visual ordering.

6. **Be honest about limitations** — If a sample produces unexpected results (e.g., a long unbroken string that overflows), document it. This builds trust and helps users understand what to expect in production.

7. **Keep controls simple** — Width and font size are the only parameters that matter for this demo. The insight comes from observing 9 samples under the same constraints, not from adjusting many parameters.
