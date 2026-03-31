<script lang="ts">
  import { prepareWithSegments, layoutWithLines, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const text = `${SAMPLE_TEXTS.short} ${SAMPLE_TEXTS.medium}`;

  let canvas: HTMLCanvasElement;
  let wrapperWidth = $state(0);
  let canvasWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 800);
  const canvasHeight = 550;
  let fontSize = $state(20);
  let speedMultiplier = $state(1);
  let animFrame = 0;
  let mouseY = $state(canvasHeight * 0.6);
  let mouseX = $state(0);
  let mouseInCanvas = $state(false);
  let cursorWidth = $derived(Math.min(600, canvasWidth * 0.85));

  interface Particle {
    char: string;
    homeX: number;
    homeY: number;
    x: number;
    y: number;
    vy: number;
    landed: boolean;
    opacity: number;
    width: number;
    delay: number; // initial delay before falling
  }

  let particles: Particle[] = $state([]);
  let landedCount = $state(0);
  let fallingCount = $state(0);

  function initParticles() {
    const font = buildFont(fontSize, 'Inter, sans-serif');
    const lh = Math.round(fontSize * 1.6);
    const margin = 40;
    const maxW = canvasWidth - margin * 2;
    const prepared = prepareWithSegments(text, font);
    const result = layoutWithLines(prepared, maxW, lh);

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.font = font;

    particles = [];

    for (let li = 0; li < result.lines.length; li++) {
      const line = result.lines[li];
      const homeY = margin + li * lh;
      let homeX = margin;

      for (const char of line.text) {
        const charW = tempCtx.measureText(char).width;
        particles.push({
          char,
          homeX,
          homeY,
          x: homeX + (Math.random() - 0.5) * 40,
          y: -20 - Math.random() * canvasHeight * 0.8, // start above canvas
          vy: 0.5 + Math.random() * 1.5,
          landed: false,
          opacity: 0.4 + Math.random() * 0.3,
          width: charW,
          delay: Math.random() * 120, // staggered start
        });
        homeX += charW;
      }
    }
  }

  function resetParticles() {
    for (const p of particles) {
      p.x = p.homeX + (Math.random() - 0.5) * 40;
      p.y = -20 - Math.random() * canvasHeight * 0.8;
      p.vy = 0.5 + Math.random() * 1.5;
      p.landed = false;
      p.opacity = 0.4 + Math.random() * 0.3;
      p.delay = Math.random() * 120;
    }
  }

  function tick() {
    // Update stats
    let landed = 0;
    let falling = 0;

    // Physics
    for (const p of particles) {
      if (p.delay > 0) {
        p.delay -= speedMultiplier;
        continue;
      }

      if (p.landed) landed++;
      else falling++;

      if (p.landed) {
        // Check if cursor has moved away
        const cursorLeft = mouseX - cursorWidth / 2;
        const cursorRight = mouseX + cursorWidth / 2;
        const aboveCursor = p.homeX >= cursorLeft && p.homeX <= cursorRight;

        if (!mouseInCanvas || !aboveCursor) {
          // Release — resume falling
          p.landed = false;
          p.vy = 0.5;
        } else {
          // Snap to home X, stay at mouseY
          p.x += (p.homeX - p.x) * 0.15;
          p.y += (mouseY - p.y) * 0.2;
          p.opacity += (1 - p.opacity) * 0.1;
        }
      } else {
        // Gravity
        p.vy += 0.15 * speedMultiplier;
        p.vy = Math.min(p.vy, 4 * speedMultiplier);
        p.y += p.vy;

        // Check landing on cursor
        if (mouseInCanvas) {
          const cursorLeft = mouseX - cursorWidth / 2;
          const cursorRight = mouseX + cursorWidth / 2;
          if (
            p.y >= mouseY - fontSize &&
            p.y <= mouseY + fontSize * 0.5 &&
            p.homeX >= cursorLeft &&
            p.homeX <= cursorRight
          ) {
            p.landed = true;
            p.y = mouseY;
            p.vy = 0;
          }
        }

        // Fall off bottom — reset to top
        if (p.y > canvasHeight + 30) {
          p.y = -20 - Math.random() * 100;
          p.x = p.homeX + (Math.random() - 0.5) * 40;
          p.vy = 0.5 + Math.random() * 1.5;
        }
      }
    }

    landedCount = landed;
    fallingCount = falling;

    render();
    animFrame = requestAnimationFrame(tick);
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

    if (canvasWidth !== currentCanvasWidth) {
      resizeCanvas();
    }

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    // Background
    ctx.fillStyle = isDark ? '#08080e' : '#f5f5fa';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw cursor shelf
    if (mouseInCanvas) {
      const cursorLeft = Math.max(0, mouseX - cursorWidth / 2);
      const cursorRight = Math.min(canvasWidth, mouseX + cursorWidth / 2);

      // Glow
      const grad = ctx.createLinearGradient(cursorLeft, mouseY, cursorRight, mouseY);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.2, isDark ? 'rgba(124, 108, 240, 0.15)' : 'rgba(124, 108, 240, 0.1)');
      grad.addColorStop(0.5, isDark ? 'rgba(124, 108, 240, 0.25)' : 'rgba(124, 108, 240, 0.15)');
      grad.addColorStop(0.8, isDark ? 'rgba(124, 108, 240, 0.15)' : 'rgba(124, 108, 240, 0.1)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(cursorLeft, mouseY - 2, cursorRight - cursorLeft, 4);

      // Line
      ctx.strokeStyle = isDark ? 'rgba(124, 108, 240, 0.6)' : 'rgba(124, 108, 240, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cursorLeft, mouseY);
      ctx.lineTo(cursorRight, mouseY);
      ctx.stroke();
    }

    // Draw particles
    const font = buildFont(fontSize, 'Inter, sans-serif');
    ctx.font = font;
    ctx.textBaseline = 'top';

    // Batch landed vs falling to minimize fillStyle changes
    const landedColor = isDark ? 'rgba(232, 232, 237, 0.9)' : 'rgba(26, 26, 46, 0.9)';
    const fallingColor = 'rgba(124, 108, 240, 0.6)';

    ctx.fillStyle = fallingColor;
    for (const p of particles) {
      if (p.delay > 0 || p.landed) continue;
      ctx.fillText(p.char, p.x, p.y);
    }

    ctx.fillStyle = landedColor;
    for (const p of particles) {
      if (p.delay > 0 || !p.landed) continue;
      ctx.fillText(p.char, p.x, p.y);
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    mouseInCanvas = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
  }

  function handleTouchEnd() {
    mouseInCanvas = false;
  }

  onMount(() => {
    initParticles();
    resizeCanvas();
    mouseX = canvasWidth / 2;
    tick();
    return () => cancelAnimationFrame(animFrame);
  });
</script>

<div class="rain-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="14" max="28" bind:value={fontSize} oninput={() => initParticles()} />
    </div>
    <div class="ctrl">
      <label>Speed <span>{speedMultiplier.toFixed(1)}x</span></label>
      <input type="range" min="0.3" max="3" step="0.1" bind:value={speedMultiplier} />
    </div>
    <button class="action-btn accent" onclick={resetParticles}>Reset</button>
  </div>

  <div class="rain-stats">
    <span class="stat-pill">{particles.length} characters</span>
    <span class="stat-pill accent">{landedCount} landed</span>
    <span class="stat-pill">{fallingCount} falling</span>
    <span class="stat-pill">Move mouse to catch letters</span>
  </div>

  <div class="canvas-wrap">
    <canvas
      bind:this={canvas}
      onmousemove={handleMouseMove}
      onmouseenter={() => mouseInCanvas = true}
      onmouseleave={() => mouseInCanvas = false}
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
      ontouchend={handleTouchEnd}
    ></canvas>
  </div>
</div>

<style>
  .rain-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 90px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .action-btn {
    padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-secondary); font-size: 0.78rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .action-btn.accent { border-color: var(--accent); color: var(--accent); }
  .action-btn.accent:hover { background: var(--accent); color: #fff; }

  .rain-stats { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .canvas-wrap {
    border: 1px solid var(--border); border-radius: var(--radius-lg);
    overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.2);
    cursor: none;
  }
  canvas { display: block; width: 100%; }
</style>
