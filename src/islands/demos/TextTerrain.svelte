<script lang="ts">
  import { prepare, layout, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { onMount, untrack } from 'svelte';

  let text = $state(SAMPLE_TEXTS.medium);
  let fontSize = $state(16);
  let lineHeight = $state(24);
  let minWidth = $state(100);
  let maxWidth = $state(600);
  let sampleCount = $state(150);

  let wrapperWidth = $state(0);
  let canvas: HTMLCanvasElement;
  let previewEl: HTMLDivElement;

  type DataPoint = { width: number; height: number; lineCount: number };
  let dataPoints: DataPoint[] = $state([]);
  let hoveredPoint: DataPoint | null = $state(null);
  let mouseX = $state(-1);
  let mouseY = $state(-1);

  let minHeight = $state(0);
  let maxHeight = $state(0);
  let lineCountRange = $state('');

  function computeTerrain() {
    const font = buildFont(fontSize);
    const prepared = prepare(text, font);
    const points: DataPoint[] = [];

    for (let i = 0; i < sampleCount; i++) {
      const w = minWidth + (i / (sampleCount - 1)) * (maxWidth - minWidth);
      const result = layout(prepared, w, lineHeight);
      points.push({ width: Math.round(w), height: result.height, lineCount: result.lineCount });
    }

    dataPoints = points;

    if (points.length > 0) {
      minHeight = Math.min(...points.map(p => p.height));
      maxHeight = Math.max(...points.map(p => p.height));
      const lcs = points.map(p => p.lineCount);
      lineCountRange = `${Math.min(...lcs)} - ${Math.max(...lcs)}`;
    }
  }

  let lastCW = 0;
  let lastCH = 0;

  function resizeCanvas(cw: number, ch: number) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    lastCW = cw;
    lastCH = ch;
  }

  function render() {
    if (!canvas || dataPoints.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pad = { top: 30, right: 30, bottom: 40, left: 60 };
    const cw = (wrapperWidth > 0 ? wrapperWidth : 700);
    const ch = 350;

    if (cw !== lastCW || ch !== lastCH) {
      resizeCanvas(cw, ch);
    }

    const plotW = cw - pad.left - pad.right;
    const plotH = ch - pad.top - pad.bottom;

    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-demo').trim() || '#08080e';
    const textMuted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#5c5c6e';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);

    const hMin = minHeight;
    const hMax = maxHeight;
    const hRange = hMax - hMin || 1;

    function xPos(w: number): number {
      return pad.left + ((w - minWidth) / (maxWidth - minWidth)) * plotW;
    }
    function yPos(h: number): number {
      return pad.top + plotH - ((h - hMin) / hRange) * plotH;
    }

    // Grid lines
    ctx.strokeStyle = textMuted + '22';
    ctx.lineWidth = 1;
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const h = hMin + (i / ySteps) * hRange;
      const y = yPos(h);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
      // Label
      ctx.fillStyle = textMuted;
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(h)}px`, pad.left - 8, y + 3);
    }

    // X-axis labels
    const xSteps = 5;
    ctx.textAlign = 'center';
    for (let i = 0; i <= xSteps; i++) {
      const w = minWidth + (i / xSteps) * (maxWidth - minWidth);
      const x = xPos(w);
      ctx.fillStyle = textMuted;
      ctx.fillText(`${Math.round(w)}`, x, ch - pad.bottom + 18);
    }

    // Axis labels
    ctx.fillStyle = '#7c6cf0';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Container Width (px)', pad.left + plotW / 2, ch - 4);
    ctx.save();
    ctx.translate(12, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Text Height (px)', 0, 0);
    ctx.restore();

    // Filled area gradient
    const gradient = ctx.createLinearGradient(pad.left, 0, pad.left + plotW, 0);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');   // red (narrow/many lines)
    gradient.addColorStop(0.5, 'rgba(124, 108, 240, 0.3)'); // purple
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.15)');   // blue (wide/few lines)

    ctx.beginPath();
    ctx.moveTo(xPos(dataPoints[0].width), yPos(hMin));
    for (const p of dataPoints) {
      ctx.lineTo(xPos(p.width), yPos(p.height));
    }
    ctx.lineTo(xPos(dataPoints[dataPoints.length - 1].width), yPos(hMin));
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Main line
    const lineGrad = ctx.createLinearGradient(pad.left, 0, pad.left + plotW, 0);
    lineGrad.addColorStop(0, '#ef4444');
    lineGrad.addColorStop(0.5, '#7c6cf0');
    lineGrad.addColorStop(1, '#3b82f6');

    ctx.beginPath();
    for (let i = 0; i < dataPoints.length; i++) {
      const p = dataPoints[i];
      const x = xPos(p.width);
      const y = yPos(p.height);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Mark cliffs (where lineCount changes)
    for (let i = 1; i < dataPoints.length; i++) {
      if (dataPoints[i].lineCount !== dataPoints[i - 1].lineCount) {
        const p = dataPoints[i];
        const x = xPos(p.width);
        const y = yPos(p.height);

        // Vertical dashed line at cliff
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#3ecf8e66';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, pad.top);
        ctx.lineTo(x, pad.top + plotH);
        ctx.stroke();
        ctx.restore();

        // Dot at cliff
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#3ecf8e';
        ctx.fill();

        // Line count label
        ctx.fillStyle = '#3ecf8e';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${p.lineCount}L`, x, pad.top - 6);
      }
    }

    // Hover crosshair
    if (hoveredPoint && mouseX >= pad.left && mouseX <= pad.left + plotW) {
      const hx = xPos(hoveredPoint.width);
      const hy = yPos(hoveredPoint.height);

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#ffffff44';
      ctx.lineWidth = 1;
      // Vertical
      ctx.beginPath();
      ctx.moveTo(hx, pad.top);
      ctx.lineTo(hx, pad.top + plotH);
      ctx.stroke();
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(pad.left, hy);
      ctx.lineTo(pad.left + plotW, hy);
      ctx.stroke();
      ctx.restore();

      // Info tooltip
      ctx.fillStyle = '#7c6cf0';
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.fill();

      const label = `w:${hoveredPoint.width}px  h:${hoveredPoint.height}px  ${hoveredPoint.lineCount} lines`;
      ctx.font = '11px JetBrains Mono, monospace';
      const tw = ctx.measureText(label).width;
      const tx = Math.min(hx + 10, cw - tw - 20);
      const ty = Math.max(hy - 14, pad.top + 14);
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(tx - 4, ty - 12, tw + 8, 16);
      ctx.fillStyle = '#e8e8ed';
      ctx.fillText(label, tx, ty);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!canvas || dataPoints.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    const cw = (wrapperWidth > 0 ? wrapperWidth : 700);
    const pad = { left: 60, right: 30 };
    const plotW = cw - pad.left - pad.right;

    const ratio = (mouseX - pad.left) / plotW;
    if (ratio >= 0 && ratio <= 1) {
      const idx = Math.round(ratio * (dataPoints.length - 1));
      hoveredPoint = dataPoints[Math.max(0, Math.min(idx, dataPoints.length - 1))];
    } else {
      hoveredPoint = null;
    }
    untrack(() => render());
  }

  function handleMouseLeave() {
    hoveredPoint = null;
    mouseX = -1;
    untrack(() => render());
  }

  onMount(() => {
    computeTerrain();
    render();
  });

  $effect(() => {
    text; fontSize; lineHeight; minWidth; maxWidth; sampleCount; wrapperWidth;
    untrack(() => {
      computeTerrain();
      render();
    });
  });
</script>

<div class="terrain-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl" style="flex: 1; min-width: 180px;">
      <label>Text</label>
      <textarea bind:value={text} rows="2"></textarea>
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="12" max="28" bind:value={fontSize} />
    </div>
    <div class="ctrl">
      <label>Line Height <span>{lineHeight}px</span></label>
      <input type="range" min="16" max="40" bind:value={lineHeight} />
    </div>
    <div class="ctrl">
      <label>Min Width <span>{minWidth}px</span></label>
      <input type="range" min="50" max="200" bind:value={minWidth} />
    </div>
    <div class="ctrl">
      <label>Max Width <span>{maxWidth}px</span></label>
      <input type="range" min="300" max="800" bind:value={maxWidth} />
    </div>
    <div class="ctrl">
      <label>Samples <span>{sampleCount}</span></label>
      <input type="range" min="50" max="300" bind:value={sampleCount} />
    </div>
  </div>

  <div class="wave-stats">
    <span class="stat-pill">Min height: <strong>{minHeight}px</strong></span>
    <span class="stat-pill">Max height: <strong>{maxHeight}px</strong></span>
    <span class="stat-pill accent">Lines: {lineCountRange}</span>
    <span class="stat-pill">{sampleCount} samples</span>
  </div>

  <div class="canvas-wrapper">
    <canvas
      bind:this={canvas}
      onmousemove={handleMouseMove}
      onmouseleave={handleMouseLeave}
    ></canvas>
  </div>

  <!-- Text preview at hovered width -->
  {#if hoveredPoint}
    <div class="preview-section">
      <div class="preview-header">
        <span>Preview at <strong>{hoveredPoint.width}px</strong></span>
        <span class="stat-pill">{hoveredPoint.lineCount} lines</span>
        <span class="stat-pill">{hoveredPoint.height}px tall</span>
      </div>
      <div
        class="text-preview"
        bind:this={previewEl}
        style="width: {hoveredPoint.width}px; font-size: {fontSize}px; line-height: {lineHeight}px;"
      >
        {text}
      </div>
    </div>
  {/if}
</div>

<style>
  .terrain-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 100px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .wave-stats {
    display: flex; flex-wrap: wrap; gap: 8px;
  }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }
  .stat-pill strong { color: var(--text-primary); font-family: var(--font-mono); font-size: 0.72rem; }

  .canvas-wrapper {
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    max-width: 100%;
    background: var(--bg-demo);
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  }
  canvas { display: block; cursor: crosshair; }

  .preview-section {
    display: flex; flex-direction: column; gap: var(--space-sm);
  }
  .preview-header {
    display: flex; align-items: center; gap: var(--space-sm);
    font-size: 0.78rem; color: var(--text-secondary);
  }
  .preview-header strong { color: var(--accent); font-family: var(--font-mono); }
  .text-preview {
    background: var(--bg-demo);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    color: var(--text-primary);
    word-wrap: break-word;
    max-height: 200px;
    overflow-y: auto;
    box-shadow: 0 2px 12px rgba(0,0,0,0.2);
  }
</style>
