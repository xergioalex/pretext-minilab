<script lang="ts">
  import { prepareWithSegments, layoutNextLine, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import type { LayoutCursor } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const topText = `${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial}`;
  const bottomText = `${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.long}`;

  let fontSize = $state(14);
  let hourglassHeight = $state(550);
  let neckWidth = $state(100);
  let lineHeight = $derived(Math.round(fontSize * 1.6));
  let wrapperWidth = $state(0);
  let maxWidth = $derived(Math.min(wrapperWidth > 0 ? wrapperWidth - 32 : 600, 700));

  let timerActive = $state(false);
  let timerProgress = $state(0);
  let animFrame = 0;
  let timerStartTime = 0;
  const timerDuration = 10000; // 10 seconds

  type LineDef = { text: string; x: number; y: number; width: number };
  type LineDefWithAlpha = LineDef & { alpha: number };
  let baseTopLines: LineDef[] = $state([]);
  let baseBottomLines: LineDef[] = $state([]);
  let totalTopLines = $state(0);
  let totalBottomLines = $state(0);

  // Derived lines with alpha based on timerProgress — no re-layout needed
  let topLines: LineDefWithAlpha[] = $derived.by(() => {
    return baseTopLines.map((line, i) => {
      const fadedChars = timerActive ? Math.floor(timerProgress * baseTopLines.length * 2) : 0;
      const alpha = timerActive && i < fadedChars ? Math.max(0.1, 1 - timerProgress * 1.5) : 1;
      return { ...line, alpha };
    });
  });

  let bottomLines: LineDefWithAlpha[] = $derived.by(() => {
    return baseBottomLines.map((line, i) => {
      const revealedLines = timerActive ? Math.floor(timerProgress * baseBottomLines.length * 2) : baseBottomLines.length;
      const alpha = timerActive && i >= revealedLines ? 0.1 : 1;
      return { ...line, alpha };
    });
  });

  function getWidthAtY(y: number, height: number, maxW: number, minW: number): number {
    const midY = height / 2;
    const halfRange = (maxW - minW) / 2;
    // Distance from center normalized to [0,1]
    const dist = Math.abs(y - midY) / midY;
    return minW + dist * (maxW - minW);
  }

  function computeLayout() {
    const font = buildFont(fontSize);
    const halfHeight = hourglassHeight / 2;
    const margin = 8;

    // Top half: inverted triangle (wide at top, narrow at middle)
    const preparedTop = prepareWithSegments(topText, font);
    let cursorTop: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let newTopLines: LineDef[] = [];
    let y = 0;
    let safety = 0;

    while (y + lineHeight <= halfHeight && safety < 400) {
      safety++;
      const w = getWidthAtY(y, hourglassHeight, maxWidth, neckWidth);
      const availW = Math.max(40, w - margin * 2);
      const line = layoutNextLine(preparedTop, cursorTop, availW);
      if (!line) break;
      const xOffset = (maxWidth - availW) / 2;
      newTopLines.push({ text: line.text, x: xOffset, y, width: availW });
      cursorTop = line.end;
      y += lineHeight;
    }

    // Bottom half: triangle (narrow at middle, wide at bottom)
    const preparedBottom = prepareWithSegments(bottomText, font);
    let cursorBottom: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let newBottomLines: LineDef[] = [];
    y = halfHeight;
    safety = 0;

    while (y + lineHeight <= hourglassHeight && safety < 400) {
      safety++;
      const w = getWidthAtY(y, hourglassHeight, maxWidth, neckWidth);
      const availW = Math.max(40, w - margin * 2);
      const line = layoutNextLine(preparedBottom, cursorBottom, availW);
      if (!line) break;
      const xOffset = (maxWidth - availW) / 2;
      newBottomLines.push({ text: line.text, x: xOffset, y, width: availW });
      cursorBottom = line.end;
      y += lineHeight;
    }

    baseTopLines = newTopLines;
    baseBottomLines = newBottomLines;
    totalTopLines = newTopLines.length;
    totalBottomLines = newBottomLines.length;
  }

  function generateOutlinePath(): string {
    const points: string[] = [];
    const steps = 60;
    const margin = 4;

    // Left side top to bottom
    for (let i = 0; i <= steps; i++) {
      const y = (i / steps) * hourglassHeight;
      const w = getWidthAtY(y, hourglassHeight, maxWidth, neckWidth);
      const x = (maxWidth - w) / 2 + margin;
      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }
    // Right side bottom to top
    for (let i = steps; i >= 0; i--) {
      const y = (i / steps) * hourglassHeight;
      const w = getWidthAtY(y, hourglassHeight, maxWidth, neckWidth);
      const x = (maxWidth + w) / 2 - margin;
      points.push(`L ${x} ${y}`);
    }
    points.push('Z');
    return points.join(' ');
  }

  function tick() {
    if (!timerActive) return;
    const elapsed = Date.now() - timerStartTime;
    timerProgress = Math.min(1, elapsed / timerDuration);
    // Only update timerProgress — alpha is derived reactively, no re-layout needed
    if (timerProgress >= 1) {
      timerActive = false;
      return;
    }
    animFrame = requestAnimationFrame(tick);
  }

  function toggleTimer() {
    if (timerActive) {
      timerActive = false;
      cancelAnimationFrame(animFrame);
      timerProgress = 0;
      computeLayout();
    } else {
      timerActive = true;
      timerProgress = 0;
      timerStartTime = Date.now();
      tick();
    }
  }

  onMount(() => {
    computeLayout();
    return () => cancelAnimationFrame(animFrame);
  });

  $effect(() => {
    fontSize; hourglassHeight; neckWidth; maxWidth;
    if (!timerActive) computeLayout();
  });

  let outlinePath = $derived(generateOutlinePath());
</script>

<div class="hourglass-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="11" max="18" bind:value={fontSize} />
    </div>
    <div class="ctrl">
      <label>Height <span>{hourglassHeight}px</span></label>
      <input type="range" min="400" max="700" bind:value={hourglassHeight} />
    </div>
    <div class="ctrl">
      <label>Neck <span>{neckWidth}px</span></label>
      <input type="range" min="60" max="200" bind:value={neckWidth} />
    </div>
    <button
      class="play-btn"
      class:active={timerActive}
      onclick={toggleTimer}
    >
      {timerActive ? '⏹ Stop' : '⏳ Start Timer'}
    </button>
  </div>

  {#if timerActive}
    <div class="progress-bar-wrapper">
      <div class="progress-bar" style="width: {timerProgress * 100}%"></div>
      <span class="progress-label">{Math.round(timerProgress * 100)}%</span>
    </div>
  {/if}

  <div class="wave-stats">
    <span class="stat-pill">{totalTopLines} top lines</span>
    <span class="stat-pill">{totalBottomLines} bottom lines</span>
    <span class="stat-pill accent">Neck: {neckWidth}px</span>
  </div>

  <div class="hourglass-canvas" style="width: {maxWidth}px; height: {hourglassHeight}px;">
    <!-- SVG outline -->
    <svg class="outline-svg" viewBox="0 0 {maxWidth} {hourglassHeight}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="hgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#7c6cf0" stop-opacity="0.3" />
          <stop offset="50%" stop-color="#3ecf8e" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#7c6cf0" stop-opacity="0.3" />
        </linearGradient>
      </defs>
      <path d={outlinePath} fill="none" stroke="url(#hgGrad)" stroke-width="2" />
      <!-- Center line -->
      <line x1="0" y1={hourglassHeight / 2} x2={maxWidth} y2={hourglassHeight / 2}
        stroke="var(--accent)" stroke-width="1" stroke-dasharray="4 4" opacity="0.3" />
    </svg>

    <!-- Top half lines -->
    {#each topLines as line}
      <div
        class="hg-line"
        style="
          left: {line.x}px;
          top: {line.y}px;
          font-size: {fontSize}px;
          line-height: {lineHeight}px;
          opacity: {line.alpha};
        "
      >{line.text}</div>
    {/each}

    <!-- Bottom half lines -->
    {#each bottomLines as line}
      <div
        class="hg-line"
        style="
          left: {line.x}px;
          top: {line.y}px;
          font-size: {fontSize}px;
          line-height: {lineHeight}px;
          opacity: {line.alpha};
        "
      >{line.text}</div>
    {/each}
  </div>
</div>

<style>
  .hourglass-demo { display: flex; flex-direction: column; gap: var(--space-md); align-items: center; }

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

  .progress-bar-wrapper {
    width: 100%; height: 20px; background: var(--bg-card);
    border: 1px solid var(--border); border-radius: var(--radius-sm);
    position: relative; overflow: hidden;
  }
  .progress-bar {
    height: 100%; background: linear-gradient(90deg, var(--accent), #3ecf8e);
    transition: width 0.1s linear; border-radius: var(--radius-sm);
  }
  .progress-label {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    font-size: 0.7rem; font-weight: 600; color: var(--text-primary);
    font-family: var(--font-mono);
  }

  .wave-stats {
    display: flex; flex-wrap: wrap; gap: 8px; width: 100%;
  }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .hourglass-canvas {
    position: relative;
    background: var(--bg-demo);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    user-select: none;
    box-shadow: 0 12px 60px rgba(0,0,0,0.4);
    margin: 0 auto;
  }

  .outline-svg {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    pointer-events: none;
  }

  .hg-line {
    position: absolute;
    white-space: nowrap;
    color: var(--text-primary);
    pointer-events: none;
    transition: opacity 0.3s ease;
  }
</style>
