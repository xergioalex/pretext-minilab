<script lang="ts">
  import { prepareWithSegments, layoutNextLine, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import type { LayoutCursor } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const longText = `${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.long}`;

  let fontSize = $state(14);
  let shelfCount = $state(5);
  let startWidth = $state(700);
  let endWidth = $state(200);
  let lineHeight = $derived(Math.round(fontSize * 1.6));
  let shelfHeight = $state(150);
  let autoPlay = $state(false);
  let animFrame = 0;

  interface ShelfData {
    width: number;
    x: number;
    y: number;
    lines: Array<{ text: string; x: number; y: number }>;
  }

  let shelves: ShelfData[] = $state([]);
  let totalLines = $state(0);

  function computeLayout() {
    const font = buildFont(fontSize);
    const prepared = prepareWithSegments(longText, font);

    const result: ShelfData[] = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let globalY = 0;
    let total = 0;
    let done = false;

    for (let s = 0; s < shelfCount; s++) {
      if (done) break;
      const t = shelfCount > 1 ? s / (shelfCount - 1) : 0;
      const shelfWidth = Math.round(startWidth + (endWidth - startWidth) * t);
      // Center each shelf, offset slightly right for cascade
      const shelfX = Math.round((startWidth - shelfWidth) / 2 + s * 8);
      const shelfLines: ShelfData['lines'] = [];
      let y = 0;
      let safety = 0;

      while (y < shelfHeight && safety < 200) {
        safety++;
        const line = layoutNextLine(prepared, cursor, shelfWidth);
        if (!line) { done = true; break; }
        shelfLines.push({ text: line.text, x: 0, y });
        cursor = line.end;
        y += lineHeight;
        total++;
      }

      result.push({
        width: shelfWidth,
        x: shelfX,
        y: globalY,
        lines: shelfLines,
      });
      globalY += shelfHeight + 12; // gap between shelves
    }

    shelves = result;
    totalLines = total;
  }

  function tick() {
    if (!autoPlay) return;
    startWidth = Math.max(300, startWidth - 1);
    if (startWidth <= 300) {
      startWidth = 700;
    }
    computeLayout();
    animFrame = requestAnimationFrame(tick);
  }

  onMount(() => {
    computeLayout();
    autoPlay = true;
    tick();
    return () => { autoPlay = false; cancelAnimationFrame(animFrame); };
  });

  $effect(() => {
    fontSize; shelfCount; startWidth; endWidth; shelfHeight; lineHeight;
    if (!autoPlay) computeLayout();
  });
</script>

<div class="wf-demo">
  <div class="controls-bar">
    <div class="ctrl">
      <label>Shelves <span>{shelfCount}</span></label>
      <input type="range" min="3" max="8" bind:value={shelfCount} />
    </div>
    <div class="ctrl">
      <label>Start width <span>{startWidth}px</span></label>
      <input type="range" min="500" max="900" bind:value={startWidth} />
    </div>
    <div class="ctrl">
      <label>End width <span>{endWidth}px</span></label>
      <input type="range" min="100" max="400" bind:value={endWidth} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="12" max="20" bind:value={fontSize} />
    </div>
    <div class="ctrl">
      <label>Shelf H <span>{shelfHeight}px</span></label>
      <input type="range" min="80" max="250" bind:value={shelfHeight} />
    </div>
    <button
      class="play-btn"
      class:active={autoPlay}
      onclick={() => { autoPlay = !autoPlay; if (autoPlay) tick(); else cancelAnimationFrame(animFrame); }}
    >
      {autoPlay ? '⏸ Pause' : '▶ Auto-play'}
    </button>
  </div>

  <div class="wf-stats">
    <span class="stat-pill">{totalLines} total lines</span>
    <span class="stat-pill accent">{shelfCount} shelves</span>
    {#each shelves as shelf, i}
      <span class="stat-pill">{shelf.width}px / {shelf.lines.length} lines</span>
    {/each}
  </div>

  <div class="wf-canvas" style="width: {startWidth + shelfCount * 8 + 24}px; height: {shelves.length > 0 ? shelves[shelves.length - 1].y + shelfHeight + 20 : 400}px;">
    {#each shelves as shelf, si}
      <!-- Shelf background -->
      <div
        class="shelf-bg"
        style="
          left: {shelf.x}px;
          top: {shelf.y}px;
          width: {shelf.width}px;
          height: {shelfHeight}px;
          --shelf-hue: {220 + si * 25};
        "
      >
        <!-- Shelf label -->
        <span class="shelf-label">
          Shelf {si + 1} — {shelf.width}px
        </span>
      </div>

      <!-- Connector line to next shelf -->
      {#if si < shelves.length - 1}
        {@const nextShelf = shelves[si + 1]}
        <svg
          class="connector"
          style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none;"
        >
          <line
            x1={shelf.x + shelf.width / 2}
            y1={shelf.y + shelfHeight}
            x2={nextShelf.x + nextShelf.width / 2}
            y2={nextShelf.y}
            stroke="var(--accent)"
            stroke-width="1"
            stroke-dasharray="4 4"
            opacity="0.25"
          />
        </svg>
      {/if}

      <!-- Text lines -->
      {#each shelf.lines as line}
        <div
          class="wf-line"
          style="
            left: {shelf.x + line.x}px;
            top: {shelf.y + line.y}px;
            font-size: {fontSize}px;
            line-height: {lineHeight}px;
            --line-color: hsl({220 + si * 25}, 70%, 72%);
          "
        >{line.text}</div>
      {/each}
    {/each}
  </div>
</div>

<style>
  .wf-demo { display: flex; flex-direction: column; gap: var(--space-md); align-items: center; }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
    width: 100%;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 90px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .play-btn {
    padding: 6px 16px; border-radius: var(--radius-sm); border: 1px solid var(--accent);
    background: transparent; color: var(--accent); font-size: 0.78rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .play-btn:hover, .play-btn.active { background: var(--accent); color: #fff; }

  .wf-stats {
    display: flex; flex-wrap: wrap; gap: 8px; width: 100%;
  }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .wf-canvas {
    position: relative;
    background: var(--bg-demo);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    user-select: none;
    box-shadow: 0 12px 60px rgba(0,0,0,0.4);
    margin: 0 auto;
    max-width: 100%;
    padding: 10px;
  }

  .shelf-bg {
    position: absolute;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: hsla(var(--shelf-hue), 60%, 50%, 0.05);
    transition: all 0.2s ease;
  }

  .shelf-label {
    position: absolute;
    top: -16px;
    left: 4px;
    font-size: 0.58rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    opacity: 0.6;
  }

  .connector {
    position: absolute;
    inset: 0;
  }

  .wf-line {
    position: absolute;
    white-space: nowrap;
    color: var(--line-color, var(--text-primary));
    pointer-events: none;
  }
</style>
