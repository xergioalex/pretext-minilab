<script lang="ts">
  import { prepareWithSegments, layoutNextLine, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import type { LayoutCursor } from '../../lib/pretext';
  import { onMount, untrack } from 'svelte';

  let text = $state(`${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.editorial}`);
  let fontSize = $state(16);
  let wrapperWidth = $state(0);
  let containerWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 650);
  let lineHeight = $state(26);

  let obsX = $state(350);
  let obsY = $state(80);
  let obsWidth = $state(160);
  let obsHeight = $state(140);
  let obsShape = $state<'rect' | 'circle'>('circle');

  let lines: Array<{ text: string; x: number; y: number; width: number; displaced: boolean }> = $state([]);
  let dragging = $state(false);
  let dragOffset = $state({ x: 0, y: 0 });

  // Auto-orbit
  let orbitActive = $state(true);
  let orbitAngle = $state(0);
  let orbitFrame = 0;

  function getAvailableWidth(y: number, lh: number): { x: number; maxWidth: number } {
    const lineTop = y;
    const lineBottom = y + lh;
    const pad = 14;
    const obsTop = obsY - pad;
    const obsBottom = obsY + obsHeight + pad;

    if (lineBottom <= obsTop || lineTop >= obsBottom) {
      return { x: 0, maxWidth: containerWidth };
    }

    if (obsShape === 'circle') {
      const cx = obsX + obsWidth / 2;
      const cy = obsY + obsHeight / 2;
      const rx = obsWidth / 2 + pad;
      const ry = obsHeight / 2 + pad;
      const lineMid = (lineTop + lineBottom) / 2;
      const dy = (lineMid - cy) / ry;
      if (Math.abs(dy) >= 1) return { x: 0, maxWidth: containerWidth };
      const dx = rx * Math.sqrt(1 - dy * dy);
      const left = cx - dx;
      const right = cx + dx;
      if (left <= 60) return { x: Math.max(0, right), maxWidth: containerWidth - right };
      return { x: 0, maxWidth: Math.max(40, left) };
    }

    const obsLeft = obsX - pad;
    const obsRight = obsX + obsWidth + pad;
    if (obsLeft <= 60) return { x: obsRight, maxWidth: containerWidth - obsRight };
    return { x: 0, maxWidth: Math.max(40, obsLeft) };
  }

  function computeFlow() {
    const font = buildFont(fontSize);
    const prepared = prepareWithSegments(text, font);
    lines = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = 0;
    let safety = 0;

    while (safety < 500) {
      safety++;
      const { x, maxWidth } = getAvailableWidth(y, lineHeight);
      if (maxWidth < 20) { y += lineHeight; continue; }
      const line = layoutNextLine(prepared, cursor, maxWidth);
      if (!line) break;
      const displaced = maxWidth < containerWidth - 10;
      lines.push({ text: line.text, x, y, width: line.width, displaced });
      cursor = line.end;
      y += lineHeight;
    }
    lines = lines;
  }

  // Orbit animation - figure-8 path
  function startOrbit() {
    orbitActive = true;
    const centerX = containerWidth / 2 - obsWidth / 2;
    const centerY = 180;
    const radiusX = containerWidth * 0.28;
    const radiusY = 120;

    const tick = () => {
      if (!orbitActive) return;
      orbitAngle += 0.012;
      obsX = centerX + Math.sin(orbitAngle) * radiusX;
      obsY = centerY + Math.sin(orbitAngle * 2) * radiusY;
      orbitFrame = requestAnimationFrame(tick);
    };
    tick();
  }

  function stopOrbit() {
    orbitActive = false;
    cancelAnimationFrame(orbitFrame);
  }

  function startDrag(e: MouseEvent) {
    stopOrbit();
    dragging = true;
    const rect = (e.currentTarget as HTMLElement).closest('.flow-canvas')!.getBoundingClientRect();
    dragOffset = { x: e.clientX - rect.left - obsX, y: e.clientY - rect.top - obsY };
    e.preventDefault();
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragging) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    obsX = Math.max(0, Math.min(containerWidth - obsWidth, e.clientX - rect.left - dragOffset.x));
    obsY = Math.max(0, e.clientY - rect.top - dragOffset.y);
  }

  function onMouseUp() { dragging = false; }

  function startTouchDrag(e: TouchEvent) {
    stopOrbit();
    dragging = true;
    const touch = e.touches[0];
    const rect = (e.currentTarget as HTMLElement).closest('.flow-canvas')!.getBoundingClientRect();
    dragOffset = { x: touch.clientX - rect.left - obsX, y: touch.clientY - rect.top - obsY };
    e.preventDefault();
  }

  function onTouchMove(e: TouchEvent) {
    if (!dragging) return;
    const touch = e.touches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    obsX = Math.max(0, Math.min(containerWidth - obsWidth, touch.clientX - rect.left - dragOffset.x));
    obsY = Math.max(0, touch.clientY - rect.top - dragOffset.y);
    e.preventDefault();
  }

  onMount(() => { startOrbit(); });

  $effect(() => {
    const _t = text;
    const _fs = fontSize;
    const _cw = containerWidth;
    const _lh = lineHeight;
    const _ox = obsX;
    const _oy = obsY;
    const _ow = obsWidth;
    const _oh = obsHeight;
    const _os = obsShape;
    untrack(() => computeFlow());
  });

  onMount(() => { return () => stopOrbit(); });
</script>

<div class="flow-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Width <span>{containerWidth}px</span></label>
      <input type="range" min="350" max="850" bind:value={containerWidth} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="12" max="26" bind:value={fontSize} />
    </div>
    <div class="shape-btns">
      <button class:active={obsShape === 'circle'} onclick={() => obsShape = 'circle'}>Ellipse</button>
      <button class:active={obsShape === 'rect'} onclick={() => obsShape = 'rect'}>Rect</button>
    </div>
    <button
      class="orbit-btn"
      class:active={orbitActive}
      onclick={() => orbitActive ? stopOrbit() : startOrbit()}
    >
      {orbitActive ? '⏸ Pause orbit' : '▶ Auto-orbit'}
    </button>
  </div>

  <div class="flow-stats">
    <span class="stat-pill">{lines.length} lines</span>
    <span class="stat-pill accent">{lines.filter(l => l.displaced).length} displaced</span>
    <span class="stat-pill">Using <code>layoutNextLine()</code> per line</span>
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="flow-canvas"
    style="width: 100%; min-height: {Math.max(lines.length * lineHeight + 40, obsY + obsHeight + 60)}px;"
    onmousemove={onMouseMove}
    onmouseup={onMouseUp}
    onmouseleave={onMouseUp}
    ontouchmove={onTouchMove}
    ontouchend={onMouseUp}
  >
    <!-- Background glow -->
    <div
      class="obs-glow"
      class:circle={obsShape === 'circle'}
      style="left:{obsX - 40}px; top:{obsY - 40}px; width:{obsWidth + 80}px; height:{obsHeight + 80}px;"
    ></div>

    <!-- Obstacle -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="obstacle"
      class:circle={obsShape === 'circle'}
      style="left:{obsX}px; top:{obsY}px; width:{obsWidth}px; height:{obsHeight}px;"
      onmousedown={startDrag}
      ontouchstart={startTouchDrag}
    >
      <div class="obs-inner">
        {#if orbitActive}
          <div class="obs-pulse"></div>
        {/if}
        <span class="obs-icon">{orbitActive ? '🌀' : '↕️'}</span>
        <span class="obs-text">{orbitActive ? 'Orbiting' : 'Drag me'}</span>
      </div>
    </div>

    <!-- Text lines -->
    {#each lines as line, i}
      <div
        class="flow-line"
        class:displaced={line.displaced}
        style="
          left: {line.x}px;
          top: {line.y}px;
          font-size: {fontSize}px;
          line-height: {lineHeight}px;
          --line-opacity: {line.displaced ? '1' : '0.75'};
        "
      >{line.text}</div>
    {/each}
  </div>
</div>

<style>
  .flow-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 100px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .shape-btns { display: flex; gap: 4px; }
  .shape-btns button, .orbit-btn {
    padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-secondary); font-size: 0.78rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .shape-btns button.active, .orbit-btn.active {
    background: var(--accent); color: #fff; border-color: var(--accent);
  }

  .flow-stats {
    display: flex; flex-wrap: wrap; gap: 8px;
  }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }
  .stat-pill code { font-size: 0.72rem; color: var(--accent); background: none; padding: 0; }

  .flow-canvas {
    position: relative;
    background: var(--bg-demo);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    max-width: 100%;
    cursor: default;
    user-select: none;
    padding: 8px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.3);
  }

  .obs-glow {
    position: absolute;
    background: radial-gradient(ellipse, rgba(124, 108, 240, 0.15) 0%, transparent 70%);
    pointer-events: none;
    border-radius: var(--radius-lg);
    filter: blur(12px);
  }
  .obs-glow.circle { border-radius: 50%; }

  .obstacle {
    position: absolute;
    background: linear-gradient(135deg, rgba(124, 108, 240, 0.25), rgba(168, 85, 247, 0.2));
    border: 2px solid var(--accent);
    border-radius: var(--radius-lg);
    cursor: grab;
    display: flex; align-items: center; justify-content: center;
    z-index: 2;
    backdrop-filter: blur(12px);
    transition: box-shadow 0.15s;
    overflow: hidden;
  }
  .obstacle:hover { box-shadow: 0 0 50px rgba(124, 108, 240, 0.3); }
  .obstacle:active { cursor: grabbing; }
  .obstacle.circle { border-radius: 50%; }

  .obs-inner {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    pointer-events: none; position: relative; z-index: 1;
  }
  .obs-icon { font-size: 1.6rem; }
  .obs-text {
    font-size: 0.65rem; font-weight: 700; color: var(--accent);
    text-transform: uppercase; letter-spacing: 0.12em;
  }

  .obs-pulse {
    position: absolute;
    inset: -20px;
    border: 2px solid var(--accent);
    border-radius: 50%;
    animation: pulse 2s ease-out infinite;
    pointer-events: none;
  }

  @keyframes pulse {
    0% { transform: scale(0.5); opacity: 0.8; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  .flow-line {
    position: absolute;
    white-space: nowrap;
    color: var(--text-primary);
    pointer-events: none;
    opacity: var(--line-opacity);
    transition: opacity 0.15s;
  }

  .flow-line.displaced {
    color: var(--accent);
  }
</style>
