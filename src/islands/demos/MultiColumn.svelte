<script lang="ts">
  import { prepareWithSegments, layoutNextLine, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import type { LayoutCursor } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const longText = `${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.long}`;
  const pullQuoteText = '"Pretext turns text layout into a programmable primitive."';

  let fontSize = $state(14);
  let columnCount = $state(3);
  let gap = $state(36);
  let lineHeight = $derived(Math.round(fontSize * 1.65));
  let wrapperWidth = $state(0);
  let containerWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 820);
  let columnHeight = $state(420);

  interface ColumnLine {
    text: string;
    x: number;
    y: number;
  }

  let columns: Array<{ lines: ColumnLine[]; x: number; width: number }> = $state([]);
  let totalLines = $state(0);

  function computeLayout() {
    const font = buildFont(fontSize);
    const prepared = prepareWithSegments(longText, font);
    const totalGaps = (columnCount - 1) * gap;
    const colWidth = Math.floor((containerWidth - totalGaps) / columnCount);
    const pullQuoteHeight = 80;
    const pullQuoteY = Math.round(columnHeight * 0.3);

    const result: typeof columns = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let total = 0;
    let done = false;

    for (let col = 0; col < columnCount; col++) {
      if (done) break;
      const colX = col * (colWidth + gap);
      const colLines: ColumnLine[] = [];
      let y = 0;
      let safety = 0;

      while (y < columnHeight && safety < 300) {
        safety++;

        // Skip over pull quote area in first column
        if (col === 0 && y >= pullQuoteY && y < pullQuoteY + pullQuoteHeight) {
          y = pullQuoteY + pullQuoteHeight;
          continue;
        }

        const line = layoutNextLine(prepared, cursor, colWidth);
        if (!line) { done = true; break; }
        colLines.push({ text: line.text, x: colX, y });
        cursor = line.end;
        y += lineHeight;
        total++;
      }

      result.push({ lines: colLines, x: colX, width: colWidth });
    }

    columns = result;
    totalLines = total;
  }

  onMount(() => { computeLayout(); });

  $effect(() => {
    fontSize; columnCount; gap; containerWidth; columnHeight; lineHeight;
    computeLayout();
  });
</script>

<div class="mc-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="col-btns">
      <button class:active={columnCount === 2} onclick={() => columnCount = 2}>2 Columns</button>
      <button class:active={columnCount === 3} onclick={() => columnCount = 3}>3 Columns</button>
    </div>
    <div class="ctrl">
      <label>Gap <span>{gap}px</span></label>
      <input type="range" min="20" max="60" bind:value={gap} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="12" max="20" bind:value={fontSize} />
    </div>
    <div class="ctrl">
      <label>Height <span>{columnHeight}px</span></label>
      <input type="range" min="300" max="700" bind:value={columnHeight} />
    </div>
  </div>

  <div class="mc-stats">
    <span class="stat-pill">{totalLines} total lines</span>
    {#each columns as col, i}
      <span class="stat-pill">Col {i + 1}: {col.lines.length} lines</span>
    {/each}
    <span class="stat-pill accent">{columns.length > 0 ? columns[0].width : 0}px wide</span>
  </div>

  <div class="mc-canvas" style="width: 100%; height: {columnHeight + 20}px;">
    <!-- Column separators -->
    {#each columns as col, i}
      {#if i > 0}
        <div
          class="col-separator"
          style="left: {col.x - gap / 2}px; height: {columnHeight}px;"
        ></div>
      {/if}

      <!-- Column header -->
      <div class="col-header" style="left: {col.x}px; width: {col.width}px;">
        Column {i + 1}
      </div>
    {/each}

    <!-- Pull quote -->
    {#if columns.length > 0}
      {@const pqY = Math.round(columnHeight * 0.3)}
      <div
        class="pull-quote"
        style="left: {columns[0].x}px; top: {pqY + 20}px; width: {columns[0].width}px;"
      >
        <p>{pullQuoteText}</p>
      </div>
    {/if}

    <!-- Drop cap for first line -->
    {#if columns.length > 0 && columns[0].lines.length > 0}
      {@const firstLine = columns[0].lines[0]}
      <div
        class="drop-cap"
        style="left: {firstLine.x}px; top: {firstLine.y + 20}px; font-size: {fontSize * 3}px; line-height: {lineHeight * 2.5}px;"
      >{firstLine.text.charAt(0)}</div>
      <div
        class="mc-line first-line"
        style="
          left: {firstLine.x + fontSize * 2}px;
          top: {firstLine.y + 20}px;
          font-size: {fontSize}px;
          line-height: {lineHeight}px;
        "
      >{firstLine.text.slice(1)}</div>
    {/if}

    <!-- Text lines (skip first line which has drop cap) -->
    {#each columns as col, ci}
      {#each col.lines as line, li}
        {#if !(ci === 0 && li === 0)}
          <div
            class="mc-line"
            style="
              left: {line.x}px;
              top: {line.y + 20}px;
              font-size: {fontSize}px;
              line-height: {lineHeight}px;
            "
          >{line.text}</div>
        {/if}
      {/each}
    {/each}
  </div>
</div>

<style>
  .mc-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 90px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .col-btns { display: flex; gap: 4px; }
  .col-btns button {
    padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-secondary); font-size: 0.78rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .col-btns button.active {
    background: var(--accent); color: #fff; border-color: var(--accent);
  }

  .mc-stats {
    display: flex; flex-wrap: wrap; gap: 8px;
  }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .mc-canvas {
    position: relative;
    background: var(--bg-demo);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    user-select: none;
    box-shadow: 0 12px 60px rgba(0,0,0,0.4);
    padding: 0 12px;
  }

  .col-separator {
    position: absolute;
    top: 10px;
    width: 1px;
    background: var(--border);
    opacity: 0.5;
  }

  .col-header {
    position: absolute;
    top: 2px;
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    opacity: 0.5;
    text-align: center;
  }

  .pull-quote {
    position: absolute;
    border-left: 3px solid var(--accent);
    padding: 12px 16px;
    background: rgba(124, 108, 240, 0.06);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }
  .pull-quote p {
    font-size: 1rem;
    font-style: italic;
    color: var(--accent);
    line-height: 1.5;
    margin: 0;
  }

  .drop-cap {
    position: absolute;
    color: var(--accent);
    font-weight: 700;
    pointer-events: none;
    opacity: 0.8;
  }

  .mc-line {
    position: absolute;
    white-space: nowrap;
    color: var(--text-primary);
    pointer-events: none;
  }

  .mc-line.first-line {
    color: var(--text-primary);
  }
</style>
