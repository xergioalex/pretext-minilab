<script lang="ts">
  import { prepareWithSegments, layoutNextLine, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import type { LayoutCursor } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const fullText = SAMPLE_TEXTS.long;

  let wrapperWidth = $state(0);
  let containerWidth = $state(700);
  let fontSize = $state(15);
  let lineHeight = $derived(fontSize * 1.6);
  let faultAngle = $state(10);
  let separation = $state(0);
  let targetSeparation = $state(0);
  let hasFault = $state(false);
  let faultX = $state(350);
  let faultY = $state(200);
  let shaking = $state(false);
  let shakeOffset = $state({ x: 0, y: 0 });
  let animFrame = 0;

  interface LineDef {
    text: string;
    x: number;
    y: number;
    side: 'left' | 'right' | 'full';
  }

  let leftLines: LineDef[] = $state([]);
  let rightLines: LineDef[] = $state([]);
  let fullLines: LineDef[] = $state([]);
  let totalHeight = $state(400);

  // Generate jagged fault path
  let faultPath = $derived.by(() => {
    if (!hasFault) return '';
    const angleRad = (faultAngle * Math.PI) / 180;
    const points: Array<{ x: number; y: number }> = [];
    const steps = 30;
    const h = totalHeight + 100;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const baseX = faultX + Math.tan(angleRad) * (t * h - faultY);
      const jitter = Math.sin(i * 127.1 + faultAngle * 43.7) * 8;
      points.push({ x: baseX + jitter, y: t * h });
    }
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  });

  function getFaultXAtY(y: number): number {
    const angleRad = (faultAngle * Math.PI) / 180;
    return faultX + Math.tan(angleRad) * (y - faultY);
  }

  function computeLayout() {
    const font = buildFont(fontSize);
    const prepared = prepareWithSegments(fullText, font);
    const margin = 16;

    if (!hasFault || separation < 2) {
      // Full layout
      fullLines = [];
      leftLines = [];
      rightLines = [];
      let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
      let y = 0;
      let safety = 0;
      while (safety < 500) {
        safety++;
        const availW = containerWidth - margin * 2;
        const line = layoutNextLine(prepared, cursor, Math.max(40, availW));
        if (!line) break;
        fullLines.push({ text: line.text, x: margin, y, side: 'full' });
        cursor = line.end;
        y += lineHeight;
      }
      totalHeight = Math.max(y + 40, 400);
      return;
    }

    // Split layout: left and right halves
    const halfSep = separation / 2;
    fullLines = [];

    // Layout left half
    leftLines = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = 0;
    let safety = 0;
    while (safety < 400) {
      safety++;
      const fx = getFaultXAtY(y + lineHeight / 2);
      const availW = Math.max(30, fx - halfSep - margin);
      const line = layoutNextLine(prepared, cursor, availW);
      if (!line) break;
      leftLines.push({ text: line.text, x: margin - halfSep, y, side: 'left' });
      cursor = line.end;
      y += lineHeight;
    }

    // Layout right half with remaining text
    rightLines = [];
    y = 0;
    safety = 0;
    while (safety < 400) {
      safety++;
      const fx = getFaultXAtY(y + lineHeight / 2);
      const availW = Math.max(30, containerWidth - margin - fx - halfSep);
      const line = layoutNextLine(prepared, cursor, availW);
      if (!line) break;
      rightLines.push({ text: line.text, x: fx + halfSep, y, side: 'right' });
      cursor = line.end;
      y += lineHeight;
    }

    const maxY = Math.max(
      leftLines.length > 0 ? leftLines[leftLines.length - 1].y + lineHeight : 0,
      rightLines.length > 0 ? rightLines[rightLines.length - 1].y + lineHeight : 0
    );
    totalHeight = Math.max(maxY + 40, 400);
  }

  function handleClick(e: MouseEvent) {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    faultX = e.clientX - rect.left;
    faultY = e.clientY - rect.top;
    hasFault = true;
    targetSeparation = 80;
  }

  function triggerAftershock() {
    shaking = true;
    targetSeparation = Math.min(targetSeparation + 30, 200);
    let frames = 0;
    const shakeLoop = () => {
      frames++;
      shakeOffset = {
        x: (Math.random() - 0.5) * Math.max(0, 12 - frames * 0.3),
        y: (Math.random() - 0.5) * Math.max(0, 12 - frames * 0.3),
      };
      if (frames < 40) {
        requestAnimationFrame(shakeLoop);
      } else {
        shakeOffset = { x: 0, y: 0 };
        shaking = false;
      }
    };
    shakeLoop();
  }

  function reset() {
    hasFault = false;
    targetSeparation = 0;
    separation = 0;
    shakeOffset = { x: 0, y: 0 };
    computeLayout();
  }

  function tick() {
    // Animate separation toward target
    if (Math.abs(separation - targetSeparation) > 0.5) {
      separation += (targetSeparation - separation) * 0.08;
      computeLayout();
    }
    animFrame = requestAnimationFrame(tick);
  }

  onMount(() => {
    computeLayout();
    tick();
    // Auto-trigger a fault on entry for immediate visual impact
    setTimeout(() => {
      faultX = containerWidth * 0.45;
      faultY = totalHeight * 0.3;
      hasFault = true;
      targetSeparation = 80;
      computeLayout();
    }, 600);
    return () => cancelAnimationFrame(animFrame);
  });

  $effect(() => {
    fontSize; containerWidth; faultAngle; faultX; faultY; hasFault;
    computeLayout();
  });
</script>

<div class="earthquake-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Width <span>{containerWidth}px</span></label>
      <input type="range" min="500" max="900" bind:value={containerWidth} />
    </div>
    <div class="ctrl">
      <label>Fault angle <span>{faultAngle}&deg;</span></label>
      <input type="range" min="-45" max="45" bind:value={faultAngle} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="13" max="22" bind:value={fontSize} />
    </div>
    <div class="ctrl">
      <label>Separation <span>{Math.round(targetSeparation)}px</span></label>
      <input type="range" min="0" max="200" bind:value={targetSeparation} />
    </div>
    <div class="btn-group">
      <button class="action-btn accent" onclick={triggerAftershock} disabled={!hasFault}>Aftershock</button>
      <button class="action-btn reset" onclick={reset}>Reset</button>
    </div>
  </div>

  <div class="earthquake-stats">
    <span class="stat-pill">{leftLines.length} left lines</span>
    <span class="stat-pill">{rightLines.length} right lines</span>
    <span class="stat-pill accent">{faultAngle}&deg; fault</span>
    <span class="stat-pill">{Math.round(separation)}px separation</span>
    {#if !hasFault}
      <span class="stat-pill accent">Click text to crack</span>
    {/if}
  </div>

  <div
    class="earthquake-canvas"
    style="width: {containerWidth}px; height: {totalHeight}px; transform: translate({shakeOffset.x}px, {shakeOffset.y}px);"
    onclick={handleClick}
    role="button"
    tabindex="0"
  >
    {#if !hasFault}
      <!-- Full text -->
      {#each fullLines as line}
        <div
          class="text-line"
          style="left: {line.x}px; top: {line.y}px; font-size: {fontSize}px; line-height: {lineHeight}px;"
        >{line.text}</div>
      {/each}
    {:else}
      <!-- Left half -->
      {#each leftLines as line}
        <div
          class="text-line left-half"
          style="left: {line.x}px; top: {line.y}px; font-size: {fontSize}px; line-height: {lineHeight}px;"
        >{line.text}</div>
      {/each}

      <!-- Right half -->
      {#each rightLines as line}
        <div
          class="text-line right-half"
          style="left: {line.x}px; top: {line.y}px; font-size: {fontSize}px; line-height: {lineHeight}px;"
        >{line.text}</div>
      {/each}

      <!-- Fault line -->
      <svg class="fault-svg" viewBox="0 0 {containerWidth} {totalHeight}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="crackGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ef4444" stop-opacity="0.8" />
            <stop offset="50%" stop-color="#f97316" stop-opacity="0.6" />
            <stop offset="100%" stop-color="#ef4444" stop-opacity="0.8" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <!-- Glow -->
        <path d={faultPath} fill="none" stroke="url(#crackGlow)" stroke-width="6" opacity="0.4" filter="url(#glow)" />
        <!-- Crack -->
        <path d={faultPath} fill="none" stroke="#ef4444" stroke-width="2" opacity="0.8" />
        <!-- Rumble lines -->
        {#each Array(6) as _, i}
          {@const ry = (totalHeight / 7) * (i + 1)}
          {@const rx = getFaultXAtY(ry)}
          <line
            x1={rx - separation / 2 - 8} y1={ry - 2}
            x2={rx - separation / 2 - 2} y2={ry + 2}
            stroke="#f97316" stroke-width="1.5" opacity="0.5"
          />
          <line
            x1={rx + separation / 2 + 2} y1={ry - 2}
            x2={rx + separation / 2 + 8} y2={ry + 2}
            stroke="#f97316" stroke-width="1.5" opacity="0.5"
          />
        {/each}
      </svg>
    {/if}
  </div>
</div>

<style>
  .earthquake-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 90px; }
  .ctrl label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .btn-group { display: flex; flex-wrap: wrap; gap: 4px; }
  .action-btn {
    padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-secondary); font-size: 0.78rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .action-btn:hover { border-color: var(--accent); color: var(--accent); }
  .action-btn.accent { border-color: var(--accent); color: var(--accent); }
  .action-btn.accent:hover { background: var(--accent); color: #fff; }
  .action-btn.reset { border-color: var(--success); color: var(--success); }
  .action-btn.reset:hover { background: var(--success); color: #fff; }
  .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .earthquake-stats { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .earthquake-canvas {
    position: relative;
    background: var(--bg-demo);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    cursor: crosshair;
    user-select: none;
    box-shadow: 0 12px 60px rgba(0,0,0,0.4);
    transition: transform 0.05s ease;
    margin: 0 auto;
  }

  .text-line {
    position: absolute;
    white-space: nowrap;
    color: var(--text-primary);
    pointer-events: none;
  }

  .left-half {
    color: var(--text-primary);
  }

  .right-half {
    color: var(--text-primary);
  }

  .fault-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2;
  }
</style>
