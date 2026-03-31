<script lang="ts">
  import { prepareWithSegments, layoutWithLines, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const text = `${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.long}`;

  let canvas: HTMLCanvasElement;
  let wrapperWidth = $state(0);
  let canvasWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 800);
  const canvasHeight = 560;
  let waveStrength = $state(50);
  let waveSpeed = $state(1.2);
  let wind = $state(40);
  let fontSize = $state(14);
  let animFrame = 0;
  let phase = 0;
  let currentCanvasWidth = 0;

  interface Letter {
    char: string;
    x: number;
    y: number;
    targetY: number;
    vy: number;
    width: number;
    baseX: number;
    hue: number;
  }

  let letters: Letter[] = [];
  let boatX = 0;
  let boatY = 0;
  let boatTilt = 0;
  let letterCount = $state(0);

  function initLetters() {
    const font = buildFont(fontSize, 'Inter, sans-serif');
    const lh = Math.round(fontSize * 1.4);
    const prepared = prepareWithSegments(text, font);
    const result = layoutWithLines(prepared, canvasWidth - 40, lh);

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.font = font;

    letters = [];
    // Fill the ENTIRE ocean zone densely with letters — no gaps
    // Create a grid of letters that covers from wave surface to canvas bottom
    const allChars: string[] = [];
    for (const line of result.lines) {
      for (const char of line.text) {
        if (char !== ' ') allChars.push(char);
      }
    }

    const cols = Math.floor(canvasWidth / (fontSize * 0.7));
    const rows = Math.floor((canvasHeight * 0.65) / (fontSize * 0.9));
    let charIdx = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const char = allChars[charIdx % allChars.length];
        charIdx++;
        const charW = tempCtx.measureText(char).width;
        const baseX = col * (fontSize * 0.7) + (row % 2) * (fontSize * 0.35); // stagger rows
        const baseY = canvasHeight * 0.36 + row * (fontSize * 0.9);

        letters.push({
          char,
          x: baseX + (Math.random() - 0.5) * 3,
          y: baseY + (Math.random() - 0.5) * 4,
          targetY: baseY,
          vy: 0,
          width: charW,
          baseX,
          hue: 190 + Math.random() * 35,
        });
      }
    }
    letterCount = letters.length;
    boatX = canvasWidth * 0.3;
  }

  function getWaveSurface(x: number): number {
    // Multi-frequency wave at position x
    const xNorm = x / canvasWidth;
    const w1 = Math.sin(xNorm * Math.PI * 3 + phase) * waveStrength * 0.7;
    const w2 = Math.sin(xNorm * Math.PI * 5.5 - phase * 0.7) * waveStrength * 0.3;
    const w3 = Math.cos(xNorm * Math.PI * 8 + phase * 1.3) * waveStrength * 0.15;
    const windPush = Math.sin(xNorm * Math.PI * 2 + phase * 0.3) * wind * 0.2;
    return canvasHeight * 0.38 + w1 + w2 + w3 + windPush;
  }

  function tick() {
    phase += 0.02 * waveSpeed;

    // Update letter positions — each row follows the wave surface offset
    for (const l of letters) {
      const surface = getWaveSurface(l.x);
      // Target: stay at the same depth below the wave surface
      const rowDepth = l.targetY - canvasHeight * 0.36; // how deep this row is
      const newTarget = surface + rowDepth;
      l.vy += (newTarget - l.y) * 0.08;
      l.vy *= 0.85;
      l.y += l.vy;

      // Gentle sway
      l.x += Math.sin(phase * 0.8 + l.baseX * 0.008) * wind * 0.004;

      // Wrap horizontally
      if (l.x < -fontSize) l.x += canvasWidth + fontSize;
      if (l.x > canvasWidth + fontSize) l.x -= canvasWidth + fontSize;
    }

    // Boat follows wave surface
    boatX += wind * 0.015;
    if (boatX > canvasWidth + 60) boatX = -60;
    const surfaceAtBoat = getWaveSurface(boatX);
    boatY += (surfaceAtBoat - fontSize * 2 - boatY) * 0.12; // smooth follow
    const slopeLeft = getWaveSurface(boatX - 20);
    const slopeRight = getWaveSurface(boatX + 20);
    const targetTilt = Math.atan2(slopeRight - slopeLeft, 40) * (180 / Math.PI);
    boatTilt += (targetTilt - boatTilt) * 0.1;

    render();
    animFrame = requestAnimationFrame(tick);
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

    // Clean background — no ocean gradient, letters ARE the ocean
    ctx.fillStyle = isDark ? '#0a0a12' : '#f0f2f8';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw all letters — THEY are the ocean, no background needed
    const font = buildFont(fontSize, 'Inter, sans-serif');
    ctx.font = font;
    ctx.textBaseline = 'top';

    for (const l of letters) {
      const surface = getWaveSurface(l.x);
      const depth = l.y - surface;

      // Surface letters (row 0-2) are brightest — they define the wave edge
      // Deeper letters get progressively darker/more transparent
      const depthNorm = Math.max(0, depth) / (canvasHeight * 0.6);
      const surfaceProximity = Math.max(0, 1 - Math.abs(depth) / (fontSize * 3));

      if (isDark) {
        // Dark mode: bright blues at surface, dark blues at depth
        const lightness = 75 - depthNorm * 40;
        const saturation = 80 - depthNorm * 20;
        const alpha = depth < -fontSize ? 0 : Math.max(0.25, 1 - depthNorm * 0.7);
        ctx.fillStyle = `hsla(${l.hue}, ${saturation}%, ${lightness}%, ${alpha})`;
      } else {
        // Light mode: vivid blues at surface, muted at depth
        const lightness = 30 + depthNorm * 15;
        const saturation = 75 - depthNorm * 20;
        const alpha = depth < -fontSize ? 0 : Math.max(0.3, 1 - depthNorm * 0.6);
        ctx.fillStyle = `hsla(${l.hue}, ${saturation}%, ${lightness}%, ${alpha})`;
      }

      // Don't draw letters above the wave surface (they're "air")
      if (depth < -fontSize * 0.5) continue;

      ctx.fillText(l.char, l.x, l.y);
    }

    // Draw boat ON TOP
    ctx.save();
    ctx.translate(boatX, boatY);
    ctx.rotate(boatTilt * Math.PI / 180);

    // Hull shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 30, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hull
    ctx.beginPath();
    ctx.moveTo(-28, 4);
    ctx.quadraticCurveTo(-20, 18, -12, 18);
    ctx.lineTo(12, 18);
    ctx.quadraticCurveTo(20, 18, 28, 4);
    ctx.lineTo(22, 12);
    ctx.quadraticCurveTo(0, 20, -22, 12);
    ctx.closePath();
    const hullGrad = ctx.createLinearGradient(-28, 0, 28, 18);
    hullGrad.addColorStop(0, '#2a3652');
    hullGrad.addColorStop(1, '#1a2238');
    ctx.fillStyle = hullGrad;
    ctx.fill();
    ctx.strokeStyle = '#4a5a80';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Mast
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(0, 6);
    ctx.strokeStyle = '#c8c8d8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Main sail
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.quadraticCurveTo(22 + wind * 0.1, -12, 18, 2);
    ctx.lineTo(0, 2);
    ctx.closePath();
    const sailGrad = ctx.createLinearGradient(0, -40, 18, 2);
    sailGrad.addColorStop(0, '#fff8e0');
    sailGrad.addColorStop(1, '#f0d898');
    ctx.fillStyle = sailGrad;
    ctx.fill();
    ctx.strokeStyle = '#e8d8a0';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Jib
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.quadraticCurveTo(-14 - wind * 0.06, -8, -12, 2);
    ctx.lineTo(0, 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(180, 210, 255, 0.85)';
    ctx.fill();

    // Portholes
    ctx.fillStyle = '#70c8ff';
    ctx.beginPath(); ctx.arc(-6, 10, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, 10, 1.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    // Wake trail behind boat
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = isDark ? '#88d4ff' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 80; i++) {
      const wx = boatX - i * 2 - 30;
      const wy = getWaveSurface(wx) + Math.sin(i * 0.3 + phase * 3) * (2 + i * 0.08);
      if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
    }
    ctx.stroke();
    ctx.restore();
  }

  onMount(() => {
    initLetters();
    resizeCanvas();
    boatX = canvasWidth * 0.3;
    boatY = canvasHeight * 0.32;
    tick();
    return () => cancelAnimationFrame(animFrame);
  });
</script>

<div class="regatta-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Waves <span>{waveStrength}</span></label>
      <input type="range" min="10" max="100" bind:value={waveStrength} />
    </div>
    <div class="ctrl">
      <label>Speed <span>{waveSpeed.toFixed(1)}x</span></label>
      <input type="range" min="0.3" max="3" step="0.1" bind:value={waveSpeed} />
    </div>
    <div class="ctrl">
      <label>Wind <span>{wind}</span></label>
      <input type="range" min="5" max="80" bind:value={wind} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="10" max="20" bind:value={fontSize} oninput={() => initLetters()} />
    </div>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{letterCount} ocean letters</span>
    <span class="stat-pill">wave physics + boat dynamics</span>
    <span class="stat-pill">wind drives sail + current</span>
  </div>

  <div class="canvas-wrap">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>

<style>
  .regatta-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 80px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .stats-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .canvas-wrap {
    border: 1px solid var(--border); border-radius: var(--radius-lg);
    overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.2);
  }
  canvas { display: block; width: 100%; }

  @media (max-width: 600px) {
    .ctrl { min-width: 60px; }
    .controls-bar { gap: var(--space-sm); }
  }
</style>
