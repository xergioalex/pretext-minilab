<script lang="ts">
  import { prepareWithSegments, layoutNextLine, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import type { LayoutCursor } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const longText = `${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.long}`;

  let fontSize = $state(15);
  let lineHeight = $state(24);
  let wrapperWidth = $state(0);
  let containerWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 800);
  let canvasEl: HTMLDivElement;

  // Dragon segments
  const SEGMENT_COUNT = 40;
  const HEAD_RADIUS = 24;
  const TAIL_RADIUS = 3;
  const SEGMENT_SPACING = 8;

  interface Segment {
    x: number;
    y: number;
    radius: number;
  }

  let segments: Segment[] = $state([]);
  let mouseX = $state(400);
  let mouseY = $state(200);
  let lines: Array<{ text: string; x: number; y: number; displaced: boolean }> = $state([]);
  let animFrame = 0;
  let totalHeight = $state(0);
  let mounted = false;

  // Initialize segments in a line
  function initSegments() {
    segments = Array.from({ length: SEGMENT_COUNT }, (_, i) => {
      const t = i / (SEGMENT_COUNT - 1);
      const radius = HEAD_RADIUS * (1 - t * 0.85) + TAIL_RADIUS * t;
      return { x: 400 - i * SEGMENT_SPACING, y: 200, radius };
    });
  }

  function updateDragon() {
    if (segments.length === 0) return;

    // Head follows mouse with easing
    const head = segments[0];
    const dx = mouseX - head.x;
    const dy = mouseY - head.y;
    head.x += dx * 0.12;
    head.y += dy * 0.12;

    // Each segment follows the one before it
    for (let i = 1; i < segments.length; i++) {
      const prev = segments[i - 1];
      const curr = segments[i];
      const ddx = prev.x - curr.x;
      const ddy = prev.y - curr.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      const targetDist = SEGMENT_SPACING;

      if (dist > targetDist) {
        const ratio = targetDist / dist;
        curr.x = prev.x - ddx * ratio;
        curr.y = prev.y - ddy * ratio;
      }
    }

    segments = [...segments];
  }

  function computeFlow() {
    const font = buildFont(fontSize);
    const prepared = prepareWithSegments(longText, font);
    const pad = 10;
    const margin = 12;

    lines = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = 0;
    let safety = 0;

    const minHeight = typeof window !== 'undefined' ? window.innerHeight - 100 : 700;
    while (safety < 1200) {
      safety++;
      let availWidth = containerWidth - margin * 2;
      let xStart = margin;
      let displaced = false;

      // Check all segments for this line
      const lineMid = y + lineHeight / 2;

      // Find leftmost and rightmost blockage
      let blockLeft = containerWidth;
      let blockRight = 0;
      let hasBlock = false;

      for (const seg of segments) {
        const dy = lineMid - seg.y;
        const r = seg.radius + pad;
        if (Math.abs(dy) < r) {
          const dx = Math.sqrt(r * r - dy * dy);
          const segLeft = seg.x - dx;
          const segRight = seg.x + dx;
          if (segLeft < blockLeft) blockLeft = segLeft;
          if (segRight > blockRight) blockRight = segRight;
          hasBlock = true;
        }
      }

      if (hasBlock) {
        displaced = true;
        blockLeft = Math.max(0, blockLeft);
        blockRight = Math.min(containerWidth, blockRight);

        // Choose the wider side
        const leftSpace = blockLeft - margin;
        const rightSpace = containerWidth - blockRight - margin;

        if (leftSpace >= rightSpace && leftSpace > 30) {
          availWidth = leftSpace;
          xStart = margin;
        } else if (rightSpace > 30) {
          availWidth = rightSpace;
          xStart = blockRight;
        } else if (leftSpace > 10) {
          availWidth = leftSpace;
          xStart = margin;
        } else {
          y += lineHeight;
          continue;
        }
      }

      const line = layoutNextLine(prepared, cursor, Math.max(20, availWidth));
      if (!line) break;
      lines.push({ text: line.text, x: xStart, y, displaced });
      cursor = line.end;
      y += lineHeight;
    }

    totalHeight = Math.max(y, minHeight);
  }

  function tick() {
    updateDragon();
    computeFlow();
    animFrame = requestAnimationFrame(tick);
  }

  function onMouseMove(e: MouseEvent) {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }

  function onTouchMove(e: TouchEvent) {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
    e.preventDefault();
  }

  // Auto-animate when mouse is idle
  let idleTimer = 0;
  let autoAngle = 0;

  function autoMove() {
    autoAngle += 0.015;
    const cx = containerWidth / 2;
    const cy = 250;
    mouseX = cx + Math.sin(autoAngle) * (containerWidth * 0.3);
    mouseY = cy + Math.sin(autoAngle * 1.7) * 150;
  }

  function tickWithAuto() {
    idleTimer++;
    if (idleTimer > 120) { // 2 seconds idle
      autoMove();
    }
    updateDragon();
    computeFlow();
    animFrame = requestAnimationFrame(tickWithAuto);
  }

  function resetIdle() {
    idleTimer = 0;
  }

  onMount(() => {
    mounted = true;
    initSegments();
    computeFlow();
    tickWithAuto();
    return () => cancelAnimationFrame(animFrame);
  });
</script>

<div class="dragon-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="11" max="22" bind:value={fontSize} />
    </div>
    <div class="ctrl">
      <label>Width <span>{containerWidth}px</span></label>
      <input type="range" min="400" max="1000" bind:value={containerWidth} />
    </div>
    <div class="dragon-info">
      <span class="stat-pill">{SEGMENT_COUNT} segments</span>
      <span class="stat-pill accent">{lines.filter(l => l.displaced).length} lines displaced</span>
      <span class="stat-pill">Move your mouse over the text</span>
    </div>
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="dragon-canvas"
    bind:this={canvasEl}
    style="width: 100%; height: {totalHeight}px;"
    onmousemove={(e) => { resetIdle(); onMouseMove(e); }}
    ontouchmove={(e) => { resetIdle(); onTouchMove(e); }}
  >
    <!-- Dragon segments (rendered as circles with gradient) -->
    {#each segments as seg, i}
      {@const t = i / (SEGMENT_COUNT - 1)}
      {@const hue = 260 + t * 40}
      {@const opacity = 0.9 - t * 0.5}
      {@const glowSize = seg.radius * 3}

      <!-- Glow -->
      {#if i % 3 === 0}
        <div
          class="seg-glow"
          style="
            left: {seg.x - glowSize / 2}px;
            top: {seg.y - glowSize / 2}px;
            width: {glowSize}px;
            height: {glowSize}px;
            background: radial-gradient(circle, hsla({hue}, 70%, 60%, 0.12) 0%, transparent 70%);
          "
        ></div>
      {/if}

      <!-- Segment body -->
      <div
        class="dragon-seg"
        style="
          left: {seg.x - seg.radius}px;
          top: {seg.y - seg.radius}px;
          width: {seg.radius * 2}px;
          height: {seg.radius * 2}px;
          background: radial-gradient(circle at 35% 35%, hsla({hue}, 70%, 65%, {opacity}), hsla({hue}, 60%, 40%, {opacity * 0.5}));
          border: 1.5px solid hsla({hue}, 70%, 60%, {opacity * 0.6});
          box-shadow: 0 0 {seg.radius}px hsla({hue}, 70%, 60%, {opacity * 0.2});
        "
      >
        {#if i === 0}
          <div class="dragon-eyes">
            <div class="eye"></div>
            <div class="eye"></div>
          </div>
        {/if}
      </div>
    {/each}

    <!-- Text lines -->
    {#each lines as line}
      <div
        class="text-line"
        class:displaced={line.displaced}
        style="
          left: {line.x}px;
          top: {line.y}px;
          font-size: {fontSize}px;
          line-height: {lineHeight}px;
        "
      >{line.text}</div>
    {/each}
  </div>
</div>

<style>
  .dragon-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 100px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .dragon-info { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .dragon-canvas {
    position: relative;
    background: var(--bg-demo);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    cursor: none;
    user-select: none;
    box-shadow: 0 12px 60px rgba(0,0,0,0.15);
  }

  .seg-glow {
    position: absolute;
    pointer-events: none;
    filter: blur(8px);
  }

  .dragon-seg {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 2;
  }

  .dragon-eyes {
    position: absolute;
    top: 30%;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
  }

  .eye {
    width: 6px;
    height: 8px;
    background: var(--text-primary);
    border-radius: 50%;
    box-shadow: 0 0 6px var(--text-primary);
  }

  .text-line {
    position: absolute;
    white-space: nowrap;
    color: var(--text-primary);
    pointer-events: none;
    z-index: 1;
  }

  .text-line.displaced {
    color: var(--accent);
  }
</style>
