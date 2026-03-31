<script lang="ts">
  import { prepareWithSegments, layoutWithLines, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const sourceText = `${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.medium}`;

  let canvas: HTMLCanvasElement;
  let wrapperWidth = $state(0);
  let canvasWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 900);
  const canvasHeight = 600;

  // Controls
  let gravity = $state(280);
  let pressure = $state(45);
  let viscosity = $state(0.9);
  let waveForce = $state(60);
  let particleCount = $state(2500);
  let animFrame = 0;
  let currentCanvasWidth = 0;
  let displayCount = $state(0);

  // Boat state
  let boatX = 0;
  let boatY = 0;
  let boatVx = 0;
  let boatVy = 0;
  let boatAngle = 0;
  let boatVAngle = 0;
  const boatWidth = 70;
  const boatHeight = 20;

  // SPH particle
  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    char: string;
    density: number;
  }

  let particles: Particle[] = [];
  let allChars: string[] = [];
  let phase = 0;

  // Spatial hash for neighbor search
  const CELL_SIZE = 20;
  const H = 18; // smoothing radius
  const H2 = H * H;
  const REST_DENSITY = 6;

  let grid: Map<number, number[]> = new Map();

  function hashCell(cx: number, cy: number): number {
    return cx * 10000 + cy;
  }

  function buildGrid() {
    grid.clear();
    for (let i = 0; i < particles.length; i++) {
      const cx = Math.floor(particles[i].x / CELL_SIZE);
      const cy = Math.floor(particles[i].y / CELL_SIZE);
      const key = hashCell(cx, cy);
      const arr = grid.get(key);
      if (arr) arr.push(i);
      else grid.set(key, [i]);
    }
  }

  function getNeighbors(i: number): number[] {
    const p = particles[i];
    const cx = Math.floor(p.x / CELL_SIZE);
    const cy = Math.floor(p.y / CELL_SIZE);
    const result: number[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const arr = grid.get(hashCell(cx + dx, cy + dy));
        if (arr) {
          for (const j of arr) {
            if (j !== i) result.push(j);
          }
        }
      }
    }
    return result;
  }

  function initParticles() {
    // Extract characters from pretext layout
    const font = buildFont(10, 'Inter, sans-serif');
    const prepared = prepareWithSegments(sourceText, font);
    const result = layoutWithLines(prepared, canvasWidth, 14);

    allChars = [];
    for (const line of result.lines) {
      for (const c of line.text) {
        if (c !== ' ') allChars.push(c);
      }
    }

    // Create particles in a block at the bottom — they will settle under gravity
    particles = [];
    const cols = Math.ceil(Math.sqrt(particleCount * 2.5));
    const spacing = 6;
    const startX = canvasWidth * 0.05;
    const startY = canvasHeight * 0.45;

    for (let i = 0; i < particleCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      particles.push({
        x: startX + col * spacing + (Math.random() - 0.5) * 2,
        y: startY + row * spacing + (Math.random() - 0.5) * 2,
        vx: 0,
        vy: 0,
        char: allChars[i % allChars.length],
        density: 0,
      });
    }

    displayCount = particles.length;
    boatX = canvasWidth * 0.5;
    boatY = canvasHeight * 0.35;
    boatVx = 0;
    boatVy = 0;
    boatAngle = 0;
  }

  function simulate(dt: number) {
    const n = particles.length;
    const pressureK = pressure * 0.8;
    const nearPressureK = pressure * 1.2;
    const grav = gravity;
    const visc = viscosity;

    // Build spatial hash
    buildGrid();

    // Compute densities
    for (let i = 0; i < n; i++) {
      let d = 0;
      const neighbors = getNeighbors(i);
      const pi = particles[i];
      for (const j of neighbors) {
        const pj = particles[j];
        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const r2 = dx * dx + dy * dy;
        if (r2 < H2) {
          const r = Math.sqrt(r2);
          const q = 1 - r / H;
          d += q * q;
        }
      }
      pi.density = d;
    }

    // Apply forces
    for (let i = 0; i < n; i++) {
      const pi = particles[i];

      // Gravity
      pi.vy += grav * dt;

      // Wave force — oscillating horizontal push at the surface
      const surfaceY = canvasHeight * 0.55;
      if (pi.y < surfaceY + 50) {
        const waveX = Math.sin(phase + pi.x * 0.008) * waveForce;
        const waveY = Math.cos(phase * 0.7 + pi.x * 0.012) * waveForce * 0.4;
        const surfaceFactor = Math.max(0, 1 - (surfaceY + 50 - pi.y) / 100);
        pi.vx += waveX * dt * surfaceFactor;
        pi.vy += waveY * dt * surfaceFactor;
      }

      // Pressure + viscosity from neighbors
      const neighbors = getNeighbors(i);
      for (const j of neighbors) {
        const pj = particles[j];
        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const r2 = dx * dx + dy * dy;
        if (r2 < H2 && r2 > 0.01) {
          const r = Math.sqrt(r2);
          const q = 1 - r / H;
          const nx = dx / r;
          const ny = dy / r;

          // Pressure force
          const pAvg = (pi.density + pj.density - REST_DENSITY * 2) * 0.5;
          const pForce = pressureK * pAvg * q + nearPressureK * q * q;
          pi.vx -= nx * pForce * dt;
          pi.vy -= ny * pForce * dt;

          // Viscosity
          const dvx = pj.vx - pi.vx;
          const dvy = pj.vy - pi.vy;
          pi.vx += dvx * visc * q * dt;
          pi.vy += dvy * visc * q * dt;
        }
      }

      // Boat repulsion — push particles away from hull
      const bDx = pi.x - boatX;
      const bDy = pi.y - boatY;
      const bDist = Math.sqrt(bDx * bDx + bDy * bDy);
      const boatRadius = 45;
      if (bDist < boatRadius && bDist > 0.1) {
        const overlap = boatRadius - bDist;
        const pushForce = overlap * 12;
        pi.vx += (bDx / bDist) * pushForce * dt;
        pi.vy += (bDy / bDist) * pushForce * dt;
      }
    }

    // Integrate positions + boundaries
    for (let i = 0; i < n; i++) {
      const p = particles[i];

      // Damping
      p.vx *= 0.998;
      p.vy *= 0.998;

      // Speed limit
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 300) { p.vx *= 300 / speed; p.vy *= 300 / speed; }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Walls
      const margin = 4;
      if (p.x < margin) { p.x = margin; p.vx *= -0.3; }
      if (p.x > canvasWidth - margin) { p.x = canvasWidth - margin; p.vx *= -0.3; }
      if (p.y > canvasHeight - margin) { p.y = canvasHeight - margin; p.vy *= -0.3; }
      if (p.y < margin) { p.y = margin; p.vy *= -0.1; }
    }

    // Boat physics — floats on particle surface
    // Find average particle Y near the boat (buoyancy)
    let nearCount = 0;
    let avgParticleY = canvasHeight;
    for (let i = 0; i < n; i++) {
      const dx = particles[i].x - boatX;
      if (Math.abs(dx) < boatWidth * 0.7) {
        if (particles[i].y < boatY + 30 && particles[i].y > boatY - 60) {
          avgParticleY += particles[i].y;
          nearCount++;
        }
      }
    }
    if (nearCount > 5) {
      avgParticleY = avgParticleY / (nearCount + 1);
      const targetY = avgParticleY - boatHeight;
      boatVy += (targetY - boatY) * 3 * dt;
    } else {
      boatVy += gravity * 0.3 * dt; // fall if no particles
    }

    // Boat auto-movement
    boatVx += Math.sin(phase * 0.3) * 15 * dt;
    boatVx *= 0.99;
    boatVy *= 0.95;
    boatX += boatVx * dt;
    boatY += boatVy * dt;

    // Boat boundaries
    if (boatX < 60) { boatX = 60; boatVx *= -0.5; }
    if (boatX > canvasWidth - 60) { boatX = canvasWidth - 60; boatVx *= -0.5; }

    // Boat angle from local slope of particle surface
    let leftY = 0, rightY = 0, lc = 0, rc = 0;
    for (let i = 0; i < n; i++) {
      const dx = particles[i].x - boatX;
      if (particles[i].y < boatY + 40 && particles[i].y > boatY - 40) {
        if (dx > 5 && dx < boatWidth) { rightY += particles[i].y; rc++; }
        if (dx < -5 && dx > -boatWidth) { leftY += particles[i].y; lc++; }
      }
    }
    if (lc > 2 && rc > 2) {
      const slope = ((rightY / rc) - (leftY / lc)) / boatWidth;
      const targetAngle = Math.atan(slope) * (180 / Math.PI);
      boatVAngle += (targetAngle - boatAngle) * 4 * dt;
    }
    boatVAngle *= 0.92;
    boatAngle += boatVAngle * dt;
    boatAngle = Math.max(-25, Math.min(25, boatAngle));

    phase += dt * 2.5;
  }

  function render() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (canvasWidth !== currentCanvasWidth) resizeCanvas();

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    // Background
    ctx.fillStyle = isDark ? '#060608' : '#f8f8fc';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw particles as characters
    const fontSize = 9;
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    for (const p of particles) {
      // Color based on velocity (splashing = brighter)
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const speedNorm = Math.min(1, speed / 120);

      if (isDark) {
        const lightness = 55 + speedNorm * 35;
        const alpha = 0.6 + speedNorm * 0.4;
        ctx.fillStyle = `hsla(0, 0%, ${lightness}%, ${alpha})`;
      } else {
        const lightness = 35 - speedNorm * 20;
        const alpha = 0.5 + speedNorm * 0.5;
        ctx.fillStyle = `hsla(0, 0%, ${lightness}%, ${alpha})`;
      }

      ctx.fillText(p.char, p.x, p.y);
    }

    // Draw boat
    ctx.save();
    ctx.translate(boatX, boatY);
    ctx.rotate(boatAngle * Math.PI / 180);

    // Hull
    ctx.beginPath();
    ctx.moveTo(-30, -2);
    ctx.quadraticCurveTo(-22, 14, -10, 14);
    ctx.lineTo(10, 14);
    ctx.quadraticCurveTo(22, 14, 30, -2);
    ctx.lineTo(22, 8);
    ctx.quadraticCurveTo(0, 16, -22, 8);
    ctx.closePath();

    if (isDark) {
      ctx.fillStyle = '#e8e4e0';
      ctx.strokeStyle = '#aaa';
    } else {
      ctx.fillStyle = '#2a2a3a';
      ctx.strokeStyle = '#555';
    }
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // Mast
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.lineTo(0, 0);
    ctx.strokeStyle = isDark ? '#ccc' : '#444';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Sail
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.quadraticCurveTo(18, -14, 14, -2);
    ctx.lineTo(0, -2);
    ctx.closePath();
    ctx.fillStyle = isDark ? '#f0e8d0' : '#fff8e0';
    ctx.fill();
    ctx.strokeStyle = isDark ? '#d8d0b8' : '#e0d8b8';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Small jib
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.quadraticCurveTo(-12, -10, -10, -2);
    ctx.lineTo(0, -2);
    ctx.closePath();
    ctx.fillStyle = isDark ? 'rgba(200, 220, 255, 0.7)' : 'rgba(180, 200, 240, 0.8)';
    ctx.fill();

    ctx.restore();
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

  function tick() {
    const dt = 1 / 60;
    // 2 substeps for stability
    simulate(dt * 0.5);
    simulate(dt * 0.5);
    render();
    animFrame = requestAnimationFrame(tick);
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
      <input type="range" min="50" max="500" bind:value={gravity} />
    </div>
    <div class="ctrl">
      <label>Pressure <span>{pressure}</span></label>
      <input type="range" min="10" max="100" bind:value={pressure} />
    </div>
    <div class="ctrl">
      <label>Waves <span>{waveForce}</span></label>
      <input type="range" min="0" max="150" bind:value={waveForce} />
    </div>
    <div class="ctrl">
      <label>Viscosity <span>{viscosity.toFixed(2)}</span></label>
      <input type="range" min="0.1" max="2" step="0.05" bind:value={viscosity} />
    </div>
    <button class="action-btn" onclick={() => { initParticles(); }}>Reset</button>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{displayCount} character particles</span>
    <span class="stat-pill">SPH fluid simulation</span>
    <span class="stat-pill">spatial hash neighbor search</span>
  </div>

  <div class="canvas-wrap">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .ocean-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 80px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .action-btn {
    padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid var(--accent);
    background: transparent; color: var(--accent); font-size: 0.78rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .action-btn:hover { background: var(--accent); color: #fff; }

  .stats-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .canvas-wrap {
    border: 1px solid var(--border); border-radius: var(--radius-lg);
    overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.25);
  }
  canvas { display: block; width: 100%; }

  @media (max-width: 600px) {
    .ctrl { min-width: 60px; }
    .controls-bar { gap: var(--space-sm); }
  }
</style>
