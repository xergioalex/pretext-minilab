<script lang="ts">
  import { prepareWithSegments, layoutNextLine, buildFont } from '../../lib/pretext';
  import type { LayoutCursor } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const cellTexts = [
    'Typography is the art and technique of arranging type to make written language legible and appealing. Good letterforms respect the reader.',
    'Good design is as little design as possible. Less, but better, because it concentrates on the essential aspects. Every detail must be justified.',
    'The details are not the details. They make the design. Every pixel matters in the craft of visual communication and typographic precision.',
    'White space is to be regarded as an active element, not a passive background. It shapes meaning, hierarchy, and the rhythm of reading.',
    'Type is a beautiful group of letters, not a group of beautiful letters. Harmony comes from the whole composition working together.',
    'Simplicity is the ultimate sophistication. Clear typography speaks louder than decorative excess. Restraint reveals intent.',
  ];

  const seedColors = [
    '#7c6cf0', '#3ecf8e', '#f06c9b', '#f0a03c', '#6cb4f0', '#c06cf0'
  ];

  let canvas: HTMLCanvasElement;
  let wrapperWidth = $state(0);
  let canvasWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 800);
  const canvasHeight = 550;
  let fontSize = $state(12);
  let animating = $state(true);
  let animFrame = 0;
  let time = 0;

  interface Seed {
    x: number;
    y: number;
    baseX: number;
    baseY: number;
    text: string;
    color: string;
    dragging: boolean;
  }

  let seeds: Seed[] = $state([]);
  let totalLines = $state(0);
  let dragIndex = $state(-1);

  function initSeeds() {
    const cols = 3;
    const rows = 2;
    const cellW = canvasWidth / cols;
    const cellH = canvasHeight / rows;
    seeds = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= cellTexts.length) break;
        seeds.push({
          x: cellW * c + cellW / 2,
          y: cellH * r + cellH / 2,
          baseX: cellW * c + cellW / 2,
          baseY: cellH * r + cellH / 2,
          text: cellTexts[idx],
          color: seedColors[idx],
          dragging: false,
        });
      }
    }
  }

  // Find which seed owns pixel (x,y)
  function nearestSeed(x: number, y: number): number {
    let minDist = Infinity;
    let closest = 0;
    for (let s = 0; s < seeds.length; s++) {
      const dx = x - seeds[s].x;
      const dy = y - seeds[s].y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        closest = s;
      }
    }
    return closest;
  }

  // Find cell left/right bounds for a seed at a given y
  function getCellBoundsForSeed(seedIdx: number, y: number): { left: number; right: number } | null {
    const step = 8;
    let left = canvasWidth;
    let right = 0;
    let found = false;

    for (let x = 0; x < canvasWidth; x += step) {
      if (nearestSeed(x, y) === seedIdx) {
        if (x < left) left = x;
        if (x + step > right) right = x + step;
        found = true;
      }
    }

    return found ? { left, right: Math.min(right, canvasWidth) } : null;
  }

  let currentCanvasWidth = 0;

  function resizeCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    currentCanvasWidth = canvasWidth;
  }

  function render() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvasWidth !== currentCanvasWidth) resizeCanvas();

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    // Background
    ctx.fillStyle = isDark ? '#08080e' : '#f5f5fa';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw Voronoi cell tints (coarse grid)
    const cellStep = 12;
    for (let y = 0; y < canvasHeight; y += cellStep) {
      for (let x = 0; x < canvasWidth; x += cellStep) {
        const c = nearestSeed(x, y);
        ctx.fillStyle = seeds[c].color + '12';
        ctx.fillRect(x, y, cellStep, cellStep);
      }
    }

    // Draw cell boundaries (medium grid)
    const boundaryStep = 4;
    const boundaryColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)';
    ctx.fillStyle = boundaryColor;
    for (let y = 0; y < canvasHeight; y += boundaryStep) {
      for (let x = 0; x < canvasWidth; x += boundaryStep) {
        let minDist2 = Infinity;
        let secondDist2 = Infinity;
        for (let s = 0; s < seeds.length; s++) {
          const dx = x - seeds[s].x;
          const dy = y - seeds[s].y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < minDist2) {
            secondDist2 = minDist2;
            minDist2 = dist2;
          } else if (dist2 < secondDist2) {
            secondDist2 = dist2;
          }
        }
        const diff = secondDist2 - minDist2;
        if (diff * diff < 36 * minDist2) {
          ctx.fillRect(x, y, boundaryStep, boundaryStep);
        }
      }
    }

    // Layout text per cell
    const font = buildFont(fontSize, 'Inter, sans-serif');
    const lh = Math.round(fontSize * 1.5);
    ctx.font = font;
    ctx.textBaseline = 'top';

    let lineTotal = 0;

    for (let si = 0; si < seeds.length; si++) {
      const seed = seeds[si];
      const prepared = prepareWithSegments(seed.text, font);
      let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };

      // Start text near the seed's vertical position, offset up
      const startY = Math.max(10, seed.y - 60);
      let y = startY;
      let safety = 0;

      while (y < canvasHeight - 10 && safety < 40) {
        safety++;

        const bounds = getCellBoundsForSeed(si, y);
        if (!bounds || bounds.right - bounds.left < fontSize * 2) {
          y += lh;
          continue;
        }

        const availWidth = bounds.right - bounds.left - 12;
        if (availWidth < fontSize) {
          y += lh;
          continue;
        }

        const line = layoutNextLine(prepared, cursor, availWidth);
        if (!line) break;

        ctx.fillStyle = isDark ? '#e0e0e8' : '#1a1a2e';
        ctx.fillText(line.text, bounds.left + 6, y);

        cursor = line.end;
        lineTotal++;
        y += lh;
      }
    }

    totalLines = lineTotal;

    // Draw seed points (on top)
    for (const seed of seeds) {
      // Glow
      ctx.beginPath();
      ctx.arc(seed.x, seed.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = seed.color + '30';
      ctx.fill();
      // Point
      ctx.beginPath();
      ctx.arc(seed.x, seed.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = seed.color;
      ctx.fill();
      ctx.strokeStyle = isDark ? '#fff' : '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function tick() {
    if (animating) {
      time += 0.016;
      for (let i = 0; i < seeds.length; i++) {
        const seed = seeds[i];
        if (!seed.dragging) {
          const orbitRadius = 60;
          const speed = 1.6;
          seed.x = seed.baseX + Math.cos(time * speed + i * 1.05) * orbitRadius;
          seed.y = seed.baseY + Math.sin(time * speed * 0.8 + i * 1.4) * orbitRadius * 0.5;
          // Clamp to canvas
          seed.x = Math.max(20, Math.min(canvasWidth - 20, seed.x));
          seed.y = Math.max(20, Math.min(canvasHeight - 20, seed.y));
        }
      }
    }
    render();
    animFrame = requestAnimationFrame(tick);
  }

  function handleMouseDown(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (let i = 0; i < seeds.length; i++) {
      const dx = mx - seeds[i].x;
      const dy = my - seeds[i].y;
      if (dx * dx + dy * dy < 400) {
        dragIndex = i;
        seeds[i].dragging = true;
        return;
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (dragIndex < 0) return;
    const rect = canvas.getBoundingClientRect();
    seeds[dragIndex].x = Math.max(20, Math.min(canvasWidth - 20, e.clientX - rect.left));
    seeds[dragIndex].y = Math.max(20, Math.min(canvasHeight - 20, e.clientY - rect.top));
    seeds[dragIndex].baseX = seeds[dragIndex].x;
    seeds[dragIndex].baseY = seeds[dragIndex].y;
  }

  function handleMouseUp() {
    if (dragIndex >= 0) {
      seeds[dragIndex].dragging = false;
      dragIndex = -1;
    }
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const mx = touch.clientX - rect.left;
    const my = touch.clientY - rect.top;
    for (let i = 0; i < seeds.length; i++) {
      const dx = mx - seeds[i].x;
      const dy = my - seeds[i].y;
      if (dx * dx + dy * dy < 400) {
        dragIndex = i;
        seeds[i].dragging = true;
        return;
      }
    }
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (dragIndex < 0) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    seeds[dragIndex].x = Math.max(20, Math.min(canvasWidth - 20, touch.clientX - rect.left));
    seeds[dragIndex].y = Math.max(20, Math.min(canvasHeight - 20, touch.clientY - rect.top));
    seeds[dragIndex].baseX = seeds[dragIndex].x;
    seeds[dragIndex].baseY = seeds[dragIndex].y;
  }

  function handleTouchEnd() {
    handleMouseUp();
  }

  onMount(() => {
    initSeeds();
    resizeCanvas();
    tick();
    return () => cancelAnimationFrame(animFrame);
  });
</script>

<div class="voronoi-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="10" max="16" bind:value={fontSize} />
    </div>
    <button
      class="play-btn"
      class:active={animating}
      onclick={() => { animating = !animating; }}
    >
      {animating ? 'Stop orbit' : 'Start orbit'}
    </button>
  </div>

  <div class="voronoi-stats">
    <span class="stat-pill">{seeds.length} cells</span>
    <span class="stat-pill accent">{totalLines} total lines</span>
    <span class="stat-pill">Drag seed points to reshape</span>
    <span class="stat-pill">Powered by <code>layoutNextLine()</code></span>
  </div>

  <div class="canvas-wrap">
    <canvas
      bind:this={canvas}
      onmousedown={handleMouseDown}
      onmousemove={handleMouseMove}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseUp}
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
      ontouchend={handleTouchEnd}
    ></canvas>
  </div>
</div>

<style>
  .voronoi-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
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

  .voronoi-stats { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }
  .stat-pill code { font-size: 0.72rem; color: var(--accent); background: none; padding: 0; }

  .canvas-wrap {
    border: 1px solid var(--border); border-radius: var(--radius-lg);
    overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.2);
    cursor: grab;
  }
  .canvas-wrap:active { cursor: grabbing; }
  canvas { display: block; width: 100%; }
</style>
