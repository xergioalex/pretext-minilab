<script lang="ts">
  import { prepareWithSegments, layoutWithLines, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const sourceText = `${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.medium}`;

  let canvas: HTMLCanvasElement;
  let wrapperWidth = $state(0);
  let canvasWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 900);
  const canvasHeight = 600;

  let gravity = $state(300);
  let pressure = $state(55);
  let viscosity = $state(0.85);
  let waveForce = $state(70);
  let mouseRepel = $state(true);
  let animFrame = 0;
  let currentCanvasWidth = 0;
  let displayCount = $state(0);
  let mouseX = -1000;
  let mouseY = -1000;

  interface Particle {
    x: number;
    y: number;
    px: number; // previous x (for verlet)
    py: number; // previous y
    char: string;
    density: number;
  }

  let particles: Particle[] = [];
  let allChars: string[] = [];
  let phase = 0;
  const PARTICLE_COUNT = 2000;

  // SPH constants
  const H = 14;
  const H2 = H * H;
  const REST_DENSITY = 8;

  // Spatial grid
  const CELL = 15;
  let grid: Map<number, number[]> = new Map();

  function cellKey(x: number, y: number): number {
    return (x | 0) * 73856093 ^ (y | 0) * 19349663;
  }

  function buildGrid() {
    grid.clear();
    for (let i = 0; i < particles.length; i++) {
      const cx = Math.floor(particles[i].x / CELL);
      const cy = Math.floor(particles[i].y / CELL);
      const k = cellKey(cx, cy);
      const arr = grid.get(k);
      if (arr) arr.push(i); else grid.set(k, [i]);
    }
  }

  function initParticles() {
    const font = buildFont(10, 'Inter, sans-serif');
    const prepared = prepareWithSegments(sourceText, font);
    const result = layoutWithLines(prepared, canvasWidth, 14);
    allChars = [];
    for (const line of result.lines) {
      for (const c of line.text) { if (c !== ' ') allChars.push(c); }
    }

    // Fill a block across the full width, in the bottom 40%
    particles = [];
    const margin = 8;
    const w = canvasWidth - margin * 2;
    const cols = Math.ceil(Math.sqrt(PARTICLE_COUNT * 2));
    const spacing = Math.min(w / cols, 8);
    const actualCols = Math.floor(w / spacing);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const col = i % actualCols;
      const row = Math.floor(i / actualCols);
      const x = margin + col * spacing + spacing * 0.5 + (Math.random() - 0.5) * 2;
      const y = canvasHeight - margin - row * spacing - spacing * 0.5 + (Math.random() - 0.5) * 2;
      particles.push({
        x, y, px: x, py: y,
        char: allChars[i % allChars.length],
        density: 0,
      });
    }
    displayCount = particles.length;
  }

  function simulate() {
    const n = particles.length;
    const dt = 1 / 60;

    buildGrid();

    // Compute density
    for (let i = 0; i < n; i++) {
      let d = 0;
      const pi = particles[i];
      const cx = Math.floor(pi.x / CELL);
      const cy = Math.floor(pi.y / CELL);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const arr = grid.get(cellKey(cx + dx, cy + dy));
          if (!arr) continue;
          for (const j of arr) {
            if (j === i) continue;
            const pj = particles[j];
            const ddx = pj.x - pi.x;
            const ddy = pj.y - pi.y;
            const r2 = ddx * ddx + ddy * ddy;
            if (r2 < H2) {
              const q = 1 - Math.sqrt(r2) / H;
              d += q * q;
            }
          }
        }
      }
      pi.density = d;
    }

    // Apply forces via position-based approach
    for (let i = 0; i < n; i++) {
      const pi = particles[i];

      // Gravity (applied as velocity via verlet)
      pi.y += gravity * dt * dt;

      // Wave forces at surface
      const surfaceThreshold = canvasHeight * 0.6;
      if (pi.y < surfaceThreshold) {
        const factor = 1 - (pi.y / surfaceThreshold);
        pi.x += Math.sin(phase + pi.x * 0.01) * waveForce * factor * dt * dt;
        pi.y += Math.cos(phase * 0.7 + pi.x * 0.015) * waveForce * 0.3 * factor * dt * dt;
      }

      // Mouse repulsion
      if (mouseRepel && mouseX > 0) {
        const ddx = pi.x - mouseX;
        const ddy = pi.y - mouseY;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist < 80 && dist > 0.1) {
          const force = (80 - dist) * 0.4;
          pi.x += (ddx / dist) * force * dt;
          pi.y += (ddy / dist) * force * dt;
        }
      }

      // Pressure + viscosity from neighbors
      const cx = Math.floor(pi.x / CELL);
      const cy = Math.floor(pi.y / CELL);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const arr = grid.get(cellKey(cx + dx, cy + dy));
          if (!arr) continue;
          for (const j of arr) {
            if (j <= i) continue;
            const pj = particles[j];
            const ddx = pj.x - pi.x;
            const ddy = pj.y - pi.y;
            const r2 = ddx * ddx + ddy * ddy;
            if (r2 < H2 && r2 > 0.001) {
              const r = Math.sqrt(r2);
              const q = 1 - r / H;
              const nx = ddx / r;
              const ny = ddy / r;

              // Pressure: push apart based on density
              const avgDensity = (pi.density + pj.density) * 0.5;
              const pForce = (avgDensity - REST_DENSITY) * pressure * 0.01 * q + pressure * 0.02 * q * q;
              const pushX = nx * pForce;
              const pushY = ny * pForce;
              pi.x -= pushX;
              pi.y -= pushY;
              pj.x += pushX;
              pj.y += pushY;

              // Viscosity: average velocities
              const vix = pi.x - pi.px;
              const viy = pi.y - pi.py;
              const vjx = pj.x - pj.px;
              const vjy = pj.y - pj.py;
              const dvx = vjx - vix;
              const dvy = vjy - viy;
              const viscFactor = viscosity * q * 0.5;
              pi.x += dvx * viscFactor;
              pi.y += dvy * viscFactor;
              pj.x -= dvx * viscFactor;
              pj.y -= dvy * viscFactor;
            }
          }
        }
      }
    }

    // Integrate (verlet) + boundaries
    for (let i = 0; i < n; i++) {
      const p = particles[i];
      const vx = (p.x - p.px) * 0.998;
      const vy = (p.y - p.py) * 0.998;

      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy;

      // Walls
      const m = 3;
      if (p.x < m) { p.x = m; p.px = p.x + vx * 0.3; }
      if (p.x > canvasWidth - m) { p.x = canvasWidth - m; p.px = p.x + vx * 0.3; }
      if (p.y > canvasHeight - m) { p.y = canvasHeight - m; p.py = p.y + vy * 0.2; }
      if (p.y < m) { p.y = m; p.py = p.y; }
    }

    phase += dt * 2.5;
  }

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
    ctx.fillStyle = isDark ? '#060608' : '#f8f8fc';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.font = '9px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    for (const p of particles) {
      const vx = p.x - p.px;
      const vy = p.y - p.py;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const sn = Math.min(1, speed / 8);

      if (isDark) {
        const l = 50 + sn * 45;
        ctx.fillStyle = `hsl(0, 0%, ${l}%)`;
      } else {
        const l = 40 - sn * 25;
        ctx.fillStyle = `hsl(0, 0%, ${l}%)`;
      }
      ctx.fillText(p.char, p.x, p.y);
    }

    // Mouse indicator
    if (mouseRepel && mouseX > 0) {
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 80, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function tick() {
    simulate();
    render();
    animFrame = requestAnimationFrame(tick);
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    mouseX = e.touches[0].clientX - rect.left;
    mouseY = e.touches[0].clientY - rect.top;
  }

  onMount(() => {
    initParticles();
    resizeCanvas();
    tick();
    return () => cancelAnimationFrame(animFrame);
  });
</script>

<div class="ocean-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Gravity <span>{gravity}</span></label>
      <input type="range" min="50" max="600" bind:value={gravity} />
    </div>
    <div class="ctrl">
      <label>Pressure <span>{pressure}</span></label>
      <input type="range" min="10" max="120" bind:value={pressure} />
    </div>
    <div class="ctrl">
      <label>Waves <span>{waveForce}</span></label>
      <input type="range" min="0" max="200" bind:value={waveForce} />
    </div>
    <div class="ctrl">
      <label>Viscosity <span>{viscosity.toFixed(2)}</span></label>
      <input type="range" min="0.1" max="2" step="0.05" bind:value={viscosity} />
    </div>
    <button class="toggle-btn" class:on={mouseRepel} onclick={() => mouseRepel = !mouseRepel}>
      {mouseRepel ? 'Mouse repel on' : 'Mouse repel off'}
    </button>
    <button class="action-btn" onclick={() => initParticles()}>Reset</button>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{displayCount} character particles</span>
    <span class="stat-pill">SPH fluid simulation</span>
    <span class="stat-pill">move mouse to push the fluid</span>
  </div>

  <div class="canvas-wrap">
    <canvas
      bind:this={canvas}
      onmousemove={handleMouseMove}
      onmouseleave={() => { mouseX = -1000; mouseY = -1000; }}
      ontouchmove={handleTouchMove}
      ontouchend={() => { mouseX = -1000; mouseY = -1000; }}
    ></canvas>
  </div>
</div>

<style>
  .ocean-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 80px; }
  .ctrl label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }
  .toggle-btn { padding: 7px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg-card); color: var(--text-muted); font-size: 0.76rem; font-weight: 600; font-family: var(--font-body); cursor: pointer; }
  .toggle-btn.on { background: var(--accent); border-color: var(--accent); color: #fff; }
  .action-btn { padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid var(--accent); background: transparent; color: var(--accent); font-size: 0.78rem; font-weight: 600; cursor: pointer; font-family: var(--font-body); }
  .action-btn:hover { background: var(--accent); color: #fff; }
  .stats-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill { font-size: 0.75rem; color: var(--text-muted); padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 9999px; }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }
  .canvas-wrap { border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.25); }
  canvas { display: block; width: 100%; }
  @media (max-width: 600px) { .ctrl { min-width: 60px; } .controls-bar { gap: var(--space-sm); } }
</style>
