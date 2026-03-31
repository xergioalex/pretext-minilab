<script lang="ts">
  import { prepareWithSegments, layoutWithLines, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const defaultText = SAMPLE_TEXTS.long;

  let text = $state(defaultText);
  let fontSize = $state(16);
  let maxWidth = $state(450);
  let mode = $state<'density' | 'fill'>('density');
  let hoveredLine = $state(-1);
  let wrapperWidth = $state(0);

  interface HeatLine {
    text: string;
    y: number;
    width: number;
    charCount: number;
    density: number;
    fillRatio: number;
    spacePositions: number[];
  }

  let lines: HeatLine[] = $state([]);
  let lineHeight = $derived(Math.round(fontSize * 1.6));
  let avgDensity = $derived(lines.length > 0 ? lines.reduce((s, l) => s + l.density, 0) / lines.length : 0);
  let minDensity = $derived(lines.length > 0 ? Math.min(...lines.map(l => l.density)) : 0);
  let maxDensity = $derived(lines.length > 0 ? Math.max(...lines.map(l => l.density)) : 0);

  // Detect "rivers" — consecutive lines where spaces align vertically
  // Precompute min/max metrics to avoid O(n²) in template
  let metricValues = $derived(lines.map(l => mode === 'density' ? l.density : l.fillRatio));
  let metricMin = $derived(metricValues.length > 0 ? Math.min(...metricValues) : 0);
  let metricMax = $derived(metricValues.length > 0 ? Math.max(...metricValues) : 0);
  let metricMaxForBar = $derived(metricMax || 1);

  let riverCount = $derived.by(() => {
    if (lines.length < 2) return 0;
    let rivers = 0;
    // For each pair of consecutive lines, check for vertically aligned spaces
    for (let i = 0; i < lines.length - 1; i++) {
      const a = lines[i].spacePositions;
      const b = lines[i + 1].spacePositions;
      for (const posA of a) {
        for (const posB of b) {
          if (Math.abs(posA - posB) < fontSize * 0.5) {
            rivers++;
            break;
          }
        }
      }
    }
    return rivers;
  });

  function computeLayout() {
    const font = buildFont(fontSize);
    const prepared = prepareWithSegments(text, font);
    const result = layoutWithLines(prepared, maxWidth, lineHeight);

    // Measure space positions using a canvas
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.font = font;

    lines = [];
    for (let i = 0; i < result.lines.length; i++) {
      const line = result.lines[i];
      const lineText = line.text;
      const measured = tempCtx.measureText(lineText);
      const lineW = measured.width;
      const charCount = lineText.length;
      const density = lineW > 0 ? charCount / lineW : 0;
      const fillRatio = maxWidth > 0 ? lineW / maxWidth : 0;

      // Find space positions (pixel offsets)
      const spacePositions: number[] = [];
      for (let ci = 0; ci < lineText.length; ci++) {
        if (lineText[ci] === ' ') {
          const sub = lineText.substring(0, ci);
          spacePositions.push(tempCtx.measureText(sub).width + tempCtx.measureText(' ').width / 2);
        }
      }

      lines.push({
        text: lineText,
        y: i * lineHeight,
        width: lineW,
        charCount,
        density,
        fillRatio,
        spacePositions,
      });
    }
  }

  $effect(() => {
    text; fontSize; maxWidth;
    computeLayout();
  });

  onMount(() => {
    computeLayout();
  });

  function getHeatColor(value: number, min: number, max: number): string {
    const range = max - min || 1;
    const t = (value - min) / range;
    if (mode === 'density') {
      const h = t * 240;
      return `hsl(${h}, 70%, 45%)`;
    } else {
      const h = t * 160;
      return `hsl(${h}, 65%, 45%)`;
    }
  }
</script>

<div class="heatmap-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Width <span>{maxWidth}px</span></label>
      <input type="range" min="200" max="700" bind:value={maxWidth} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="12" max="26" bind:value={fontSize} />
    </div>
    <div class="ctrl">
      <label>Mode</label>
      <div class="toggle-group">
        <button
          class="toggle-btn"
          class:active={mode === 'density'}
          onclick={() => mode = 'density'}
        >Density</button>
        <button
          class="toggle-btn"
          class:active={mode === 'fill'}
          onclick={() => mode = 'fill'}
        >Fill</button>
      </div>
    </div>
  </div>

  <div class="heatmap-stats">
    <span class="stat-pill">Avg density: <strong>{avgDensity.toFixed(3)}</strong></span>
    <span class="stat-pill">Min: <strong>{minDensity.toFixed(3)}</strong></span>
    <span class="stat-pill">Max: <strong>{maxDensity.toFixed(3)}</strong></span>
    <span class="stat-pill accent">{riverCount} river{riverCount !== 1 ? 's' : ''} detected</span>
    <span class="stat-pill">{lines.length} lines</span>
  </div>

  <div class="heatmap-body">
    <div class="heatmap-text" style="max-width: {maxWidth}px;">
      {#each lines as line, i}
        {@const val = metricValues[i]}
        {@const color = getHeatColor(val, metricMin, metricMax)}
        <div
          class="heat-line"
          class:hovered={hoveredLine === i}
          style="
            font-size: {fontSize}px;
            line-height: {lineHeight}px;
            background: {color}22;
            border-left: 3px solid {color};
          "
          onmouseenter={() => hoveredLine = i}
          onmouseleave={() => hoveredLine = -1}
        >
          <span class="heat-line-text">{line.text}</span>
          {#if hoveredLine === i}
            <div class="heat-tooltip">
              <span>Chars: {line.charCount}</span>
              <span>Width: {line.width.toFixed(1)}px</span>
              <span>Density: {line.density.toFixed(4)}</span>
              <span>Fill: {(line.fillRatio * 100).toFixed(1)}%</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <div class="heatmap-chart">
      <div class="chart-title">{mode === 'density' ? 'Char Density' : 'Fill Ratio'} per Line</div>
      {#each lines as line, i}
        {@const val = metricValues[i]}
        {@const color = getHeatColor(val, metricMin, metricMax)}
        {@const barW = (val / metricMaxForBar) * 100}
        <div
          class="chart-bar-row"
          class:hovered={hoveredLine === i}
          onmouseenter={() => hoveredLine = i}
          onmouseleave={() => hoveredLine = -1}
        >
          <div class="chart-bar-label">{i + 1}</div>
          <div class="chart-bar-track">
            <div
              class="chart-bar-fill"
              style="width: {barW}%; background: {color};"
            ></div>
          </div>
          <div class="chart-bar-val">{mode === 'density' ? val.toFixed(3) : (val * 100).toFixed(0) + '%'}</div>
        </div>
      {/each}
    </div>
  </div>

  <div class="text-input-area">
    <label class="input-label">Text input</label>
    <textarea class="text-input" rows="3" bind:value={text}></textarea>
  </div>
</div>

<style>
  .heatmap-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 90px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .toggle-group { display: flex; gap: 2px; }
  .toggle-btn {
    padding: 4px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); font-size: 0.75rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .toggle-btn:hover { border-color: var(--accent); color: var(--accent); }
  .toggle-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }

  .heatmap-stats { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill strong { color: var(--text-primary); font-family: var(--font-mono); font-size: 0.72rem; }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .heatmap-body {
    display: flex; gap: var(--space-lg);
    background: var(--bg-demo); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: var(--space-lg);
    box-shadow: 0 12px 60px rgba(0,0,0,0.4);
    overflow: hidden;
  }

  .heatmap-text {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column;
  }

  .heat-line {
    position: relative; padding: 1px 6px; cursor: pointer;
    transition: all 0.15s ease;
    border-radius: 2px;
  }
  .heat-line.hovered {
    background: var(--accent-dim) !important;
    transform: translateX(4px);
  }
  .heat-line-text {
    color: var(--text-primary); white-space: pre;
  }

  .heat-tooltip {
    position: absolute; left: 100%; top: 50%; transform: translateY(-50%);
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 6px 10px;
    display: flex; flex-direction: column; gap: 2px;
    font-size: 0.7rem; color: var(--text-muted);
    white-space: nowrap; z-index: 10;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    margin-left: 8px;
    font-family: var(--font-mono);
  }

  .heatmap-chart {
    width: 220px; flex-shrink: 0;
    display: flex; flex-direction: column; gap: 3px;
  }
  .chart-title {
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 4px;
  }
  .chart-bar-row {
    display: flex; align-items: center; gap: 4px; cursor: pointer;
    padding: 1px 0; transition: opacity 0.15s;
  }
  .chart-bar-row.hovered { opacity: 1; }
  .chart-bar-label {
    font-size: 0.65rem; color: var(--text-muted); width: 18px; text-align: right;
    font-family: var(--font-mono);
  }
  .chart-bar-track {
    flex: 1; height: 14px; background: var(--bg-card); border-radius: 2px;
    overflow: hidden;
  }
  .chart-bar-fill {
    height: 100%; border-radius: 2px; transition: width 0.3s ease;
    min-width: 2px;
  }
  .chart-bar-val {
    font-size: 0.6rem; color: var(--text-muted); width: 40px;
    font-family: var(--font-mono);
  }

  .text-input-area { display: flex; flex-direction: column; gap: 4px; }
  .input-label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .text-input {
    width: 100%; padding: 8px 12px; border-radius: var(--radius-sm);
    border: 1px solid var(--border); background: var(--bg-card);
    color: var(--text-primary); font-size: 0.85rem; font-family: var(--font-body);
    resize: vertical; line-height: 1.5;
  }
  .text-input:focus { outline: none; border-color: var(--accent); }

  @media (max-width: 768px) {
    .heatmap-body { flex-direction: column; }
    .heatmap-chart { width: 100%; }
    .heat-tooltip { display: none; }
  }
</style>
