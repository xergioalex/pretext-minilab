<script lang="ts">
  import { prepareWithSegments, layoutNextLine, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import type { LayoutCursor } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const longText = `${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.medium}`;

  let fontSize = $state(14);
  let shapeSize = $state(380);
  let shape = $state<'heart' | 'star' | 'circle' | 'diamond'>('heart');
  let lineHeight = $derived(Math.round(fontSize * 1.6));

  let lines: Array<{ text: string; x: number; y: number; color: string }> = $state([]);
  let lineCount = $state(0);

  /** Return the horizontal extent [left, right] of the shape at a given normalized y (0..1) */
  function shapeExtent(ny: number, s: typeof shape): [number, number] | null {
    if (ny < 0 || ny > 1) return null;
    const half = shapeSize / 2;
    const cx = shapeSize / 2;

    if (s === 'circle') {
      const dy = ny - 0.5;
      const r = 0.48;
      if (Math.abs(dy) >= r) return null;
      const dx = Math.sqrt(r * r - dy * dy);
      return [cx - dx * shapeSize, cx + dx * shapeSize];
    }

    if (s === 'diamond') {
      const cy = 0.5;
      const r = 0.46;
      const dy = Math.abs(ny - cy);
      if (dy >= r) return null;
      const dx = (r - dy) * shapeSize;
      return [cx - dx, cx + dx];
    }

    if (s === 'heart') {
      // Heart: top lobes (0..0.4), bottom point (0.4..1)
      if (ny < 0.05) return null;
      if (ny < 0.4) {
        // Two lobes
        const t = ny / 0.4; // 0..1
        const w = (0.35 + 0.15 * Math.sin(t * Math.PI)) * shapeSize;
        return [cx - w, cx + w];
      } else {
        // Taper to point
        const t = (ny - 0.4) / 0.6; // 0..1
        const w = 0.5 * (1 - t * t) * shapeSize;
        if (w < 10) return null;
        return [cx - w, cx + w];
      }
    }

    if (s === 'star') {
      // 5-pointed star approximation
      const angle = ny * Math.PI; // map y to angle
      const spikes = 5;
      const wave = Math.cos(spikes * angle * 2);
      const outerR = 0.46;
      const innerR = 0.2;
      const r = innerR + (outerR - innerR) * (0.5 + 0.5 * wave);
      const dy = Math.abs(ny - 0.5);
      if (dy > 0.48) return null;
      const w = r * shapeSize * (1 - dy * 0.4);
      if (w < 8) return null;
      return [cx - w, cx + w];
    }

    return null;
  }

  function svgShapePath(s: typeof shape): string {
    const sz = shapeSize;
    const cx = sz / 2;
    if (s === 'circle') {
      const r = sz * 0.48;
      return `M ${cx},${sz / 2 - r} A ${r},${r} 0 1,1 ${cx},${sz / 2 + r} A ${r},${r} 0 1,1 ${cx},${sz / 2 - r} Z`;
    }
    if (s === 'diamond') {
      const r = sz * 0.46;
      return `M ${cx},${sz / 2 - r} L ${cx + r},${sz / 2} L ${cx},${sz / 2 + r} L ${cx - r},${sz / 2} Z`;
    }
    if (s === 'heart') {
      // Approximate heart with cubic bezier
      const w = sz * 0.5;
      return `M ${cx},${sz * 0.2} C ${cx + w},${sz * -0.05} ${cx + w * 1.1},${sz * 0.4} ${cx},${sz * 0.92} C ${cx - w * 1.1},${sz * 0.4} ${cx - w},${sz * -0.05} ${cx},${sz * 0.2} Z`;
    }
    if (s === 'star') {
      // 5-pointed star
      const pts: string[] = [];
      const outerR = sz * 0.46;
      const innerR = sz * 0.2;
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 2) + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? outerR : innerR;
        pts.push(`${cx + r * Math.cos(a)},${sz / 2 - r * Math.sin(a)}`);
      }
      return `M ${pts.join(' L ')} Z`;
    }
    return '';
  }

  function computeLayout() {
    const font = buildFont(fontSize);
    const prepared = prepareWithSegments(longText, font);
    const result: typeof lines = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = 0;
    let safety = 0;

    while (safety < 800) {
      safety++;
      const ny = y / shapeSize;
      if (ny > 1) break;

      const extent = shapeExtent(ny + lineHeight / shapeSize * 0.5, shape);
      if (!extent) {
        y += lineHeight;
        continue;
      }

      const [left, right] = extent;
      const availWidth = right - left;
      if (availWidth < 20) { y += lineHeight; continue; }

      const line = layoutNextLine(prepared, cursor, availWidth);
      if (!line) break;

      // Gradient from accent to green based on progress
      const progress = ny;
      const r = Math.round(124 + (62 - 124) * progress);
      const g = Math.round(108 + (207 - 108) * progress);
      const b = Math.round(240 + (142 - 240) * progress);
      const color = `rgb(${r}, ${g}, ${b})`;

      // Center line within shape boundary
      const lineX = left + (availWidth - line.width) / 2;
      result.push({ text: line.text, x: lineX, y, color });
      cursor = line.end;
      y += lineHeight;
    }

    lines = result;
    lineCount = result.length;
  }

  onMount(() => { computeLayout(); });

  $effect(() => {
    fontSize; shapeSize; shape; lineHeight;
    computeLayout();
  });
</script>

<div class="silhouette-demo">
  <div class="controls-bar">
    <div class="shape-btns">
      <button class:active={shape === 'heart'} onclick={() => shape = 'heart'}>Heart</button>
      <button class:active={shape === 'star'} onclick={() => shape = 'star'}>Star</button>
      <button class:active={shape === 'circle'} onclick={() => shape = 'circle'}>Circle</button>
      <button class:active={shape === 'diamond'} onclick={() => shape = 'diamond'}>Diamond</button>
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="10" max="22" bind:value={fontSize} />
    </div>
    <div class="ctrl">
      <label>Size <span>{shapeSize}px</span></label>
      <input type="range" min="200" max="500" bind:value={shapeSize} />
    </div>
  </div>

  <div class="silhouette-stats">
    <span class="stat-pill">{lineCount} lines</span>
    <span class="stat-pill accent">{shape}</span>
    <span class="stat-pill">Using <code>layoutNextLine()</code></span>
  </div>

  <div class="silhouette-canvas" style="width: {shapeSize}px; height: {shapeSize}px;">
    <!-- SVG shape outline -->
    <svg class="shape-outline" viewBox="0 0 {shapeSize} {shapeSize}" width={shapeSize} height={shapeSize}>
      <path d={svgShapePath(shape)} fill="none" stroke="var(--accent)" stroke-width="1.5" opacity="0.25" />
    </svg>

    <!-- Text lines -->
    {#each lines as line}
      <div
        class="sil-line"
        style="
          left: {line.x}px;
          top: {line.y}px;
          font-size: {fontSize}px;
          line-height: {lineHeight}px;
          color: {line.color};
        "
      >{line.text}</div>
    {/each}
  </div>
</div>

<style>
  .silhouette-demo { display: flex; flex-direction: column; gap: var(--space-md); align-items: center; }

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

  .shape-btns { display: flex; gap: 4px; }
  .shape-btns button {
    padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-secondary); font-size: 0.78rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .shape-btns button.active {
    background: var(--accent); color: #fff; border-color: var(--accent);
  }

  .silhouette-stats {
    display: flex; flex-wrap: wrap; gap: 8px; width: 100%;
  }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }
  .stat-pill code { font-size: 0.72rem; color: var(--accent); background: none; padding: 0; }

  .silhouette-canvas {
    position: relative;
    background: var(--bg-demo);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    user-select: none;
    box-shadow: 0 12px 60px rgba(0,0,0,0.4);
    margin: 0 auto;
  }

  .shape-outline {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .sil-line {
    position: absolute;
    white-space: nowrap;
    pointer-events: none;
  }
</style>
