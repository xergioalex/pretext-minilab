# Multi-Column Magazine

## Overview

Multi-Column Magazine flows text across 2-3 columns with cursor continuity, simulating a print magazine layout. A pull quote spans between columns, and a drop cap adorns the first character. When one column fills to its height limit, the cursor carries forward seamlessly to the next column.

This demo matters because browsers provide `column-count` CSS but offer zero programmatic control over text flow between arbitrary regions. You cannot detect where a column break falls, insert spanning elements mid-flow, or route text from one container to another. Pretext's `layoutNextLine()` with its persistent cursor makes multi-region text flow trivial.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepareWithSegments(text, font)` | Prepares text with segment data for line-by-line layout. Called once per font size change. |
| `layoutNextLine(prepared, cursor, availableWidth)` | Lays out a single line within the column width. Called per line per column; cursor carries across columns. |
| `buildFont(fontSize)` | Constructs the font descriptor for the given pixel size. |
| `LayoutCursor` type | Maintains read position between successive `layoutNextLine` calls. The same cursor flows from column to column. |

## How It Works

### Step 1: Text Preparation

On mount or when font size changes:

```
const font = buildFont(fontSize);
const prepared = prepareWithSegments(text, font);
```

### Step 2: Column Geometry

The total available width is divided into columns with gaps:

```
const columnWidth = (totalWidth - (columnCount - 1) * gap) / columnCount;
```

Each column has a fixed height limit. When the accumulated y-position in a column reaches the limit, layout shifts to the next column.

### Step 3: Sequential Column Fill

```
let cursor = { offset: 0 };

for (let col = 0; col < columnCount; col++) {
  let y = 0;
  const colX = col * (columnWidth + gap);

  while (y + lineHeight <= columnHeight) {
    const line = layoutNextLine(prepared, cursor, columnWidth);
    if (!line) break;
    columns[col].push({ line, x: colX, y });
    y += lineHeight;
  }
}
```

The cursor is never reset between columns. When column 1 fills, the cursor position is wherever the text left off, and column 2 picks up from that exact character.

### Step 4: Drop Cap

The first character is extracted and rendered at a larger size (3x font size). The first few lines of the first column are given a reduced width to wrap around the drop cap, then subsequent lines use the full column width.

### Step 5: Pull Quote Insertion

A pull quote occupies a horizontal span between two columns at a configurable vertical position. Lines in affected columns are shortened or skipped in the pull quote region, and the pull quote text is rendered in a larger italic font centered in the span.

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(15)` | Font size in pixels (range 11-20). |
| `columnCount` | `$state(3)` | Number of columns (2 or 3). |
| `gap` | `$state(30)` | Gap between columns in pixels (range 15-60). |
| `columnHeight` | `$state(500)` | Maximum height of each column in pixels (range 300-700). |
| `lines` | `$state([])` | All computed line data across all columns. |
| `prepared` | derived | Cached `PreparedTextWithSegments` object. |
| `lineHeight` | derived | Computed as `fontSize * 1.6`. |

## Controls

| Control | Type | Range | Effect |
|---|---|---|---|
| Column Count | Selector | 2 / 3 | Switches between 2-column and 3-column layouts. |
| Column Gap | Slider | 15 - 60 px | Adjusts spacing between columns. |
| Font Size | Slider | 11 - 20 px | Changes text size; triggers re-preparation and relayout. |
| Column Height | Slider | 300 - 700 px | Sets the maximum height of each column before overflow to the next. |

## Visual Rendering

### Column Regions
Each column is drawn as a subtle bordered rectangle to delineate the flow regions. Column backgrounds use a slightly lighter shade of the demo background.

### Drop Cap
The first character renders at 3x the base font size, positioned at the top-left of the first column. It uses the accent color (`#7c6cf0`) for visual emphasis.

### Pull Quote
A centered, italic text block spans the gap between two columns. It is bordered above and below with accent-colored rules. The surrounding text reflows around it.

### Text Lines
Each line is positioned absolutely at its computed `(x, y)` within its column. Text uses the standard theme color.

## Key Technical Insight

The architectural lesson of Multi-Column Magazine is that **cursor continuity makes multi-region text flow trivial**. In browser CSS, `column-count` provides basic multi-column layout but gives no API access to where breaks occur. You cannot flow text from a sidebar into a main column, or from one page to another, or around an irregular obstacle that spans columns.

Pretext's `layoutNextLine()` returns a cursor that records exactly where in the text the line ended. Passing that same cursor to the next call -- even with a completely different width -- produces a seamless continuation. This means:
- Text can flow across columns of different widths
- Text can skip regions (pull quotes, images) and resume
- Text can flow across pages, panels, or any container sequence

No browser layout engine exposes this capability programmatically.

## How to Replicate

1. **Prepare text once**: call `prepareWithSegments(text, buildFont(fontSize))` when text or font changes.

2. **Compute column geometry**: divide available width by column count, accounting for gaps. Determine column height.

3. **Layout column by column**: for each column, call `layoutNextLine(prepared, cursor, columnWidth)` in a loop until the column height is filled. Do not reset the cursor between columns.

4. **Implement drop cap**: extract the first character, render it at a larger size, and reduce the available width of the first few lines in the first column to accommodate it.

5. **Add pull quote**: define a vertical region that spans columns. Skip or shorten lines in that region and render the pull quote text separately.

6. **Render the results**: position each line at its computed (x, y) within its column. Draw column borders, the drop cap, and the pull quote with appropriate styling.

7. **Add controls**: expose column count as a toggle, and gap, font size, and column height as sliders. Each change triggers a full relayout using the same cursor-continuity pattern.

8. **Experiment with varying column widths**: try columns of different widths (e.g., narrow sidebar + wide main). The cursor carries forward identically regardless of width changes.
