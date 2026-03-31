<script lang="ts">
  import { prepare, layout, layoutWithLines, prepareWithSegments, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const BLOCK_TEXTS = [
    'Pretext makes layout instant.',
    'No DOM reflows needed.',
    'Measure once, layout anywhere.',
    'Pure arithmetic for text.',
    'Interactive UIs, redefined.',
    'Prepare, layout, done.',
    'Width in, height out.',
    'Typography as code.',
    'Zero layout shift.',
    'Predict before render.',
    'Text metrics on demand.',
    'Unicode-aware breaking.',
    'Canvas or DOM, your call.',
    'Shrink-wrap any block.',
    'Resize without reflow.',
    'One prepare, infinite layouts.',
    'Instant height prediction.',
    'Line breaks solved.',
    'Programmable typography.',
    'Layout as a function.',
  ];

  const COLORS = [
    '#7c6cf0', '#3ecf8e', '#f97316', '#ef4444', '#06b6d4',
    '#a855f7', '#eab308', '#ec4899', '#14b8a6', '#8b5cf6',
  ];

  let canvas: HTMLCanvasElement;
  let wrapperWidth = $state(0);
  let canvasWidth = $derived(wrapperWidth > 0 ? wrapperWidth : 800);
  const canvasHeight = 650;
  let fontSize = $state(13);
  let animFrame = 0;
  let totalCollisions = $state(0);

  interface Block {
    text: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    width: number;
    height: number;
    angle: number;
    va: number;
    color: string;
    lines: Array<{ text: string }>;
  }

  let blocks: Block[] = $state([]);
  let dragging: { block: Block; offsetX: number; offsetY: number; lastX: number; lastY: number } | null = $state(null);

  function createBlock(text: string, color: string, x: number, y: number): Block {
    const w = 100 + Math.random() * 150;
    const font = buildFont(fontSize);
    const prepared = prepareWithSegments(text, font);
    const lh = fontSize * 1.4;
    const result = layoutWithLines(prepared, w, lh);
    return {
      text,
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: 0,
      width: w,
      height: Math.max(result.height, lh),
      angle: 0,
      va: 0,
      color,
      lines: result.lines,
    };
  }

  function initBlocks() {
    blocks = [];
    totalCollisions = 0;
    const cols = 5;
    const colW = canvasWidth / cols;
    for (let i = 0; i < BLOCK_TEXTS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 10 + col * colW + Math.random() * 20;
      const y = 10 + row * 55 + Math.random() * 15;
      blocks.push(createBlock(BLOCK_TEXTS[i], COLORS[i % COLORS.length], x, y));
    }
    if (autoDropInterval) {
      clearInterval(autoDropInterval);
      autoDropInterval = setInterval(dropBlock, 2000);
    }
  }

  function relayoutBlock(block: Block) {
    const font = buildFont(fontSize);
    const prepared = prepareWithSegments(block.text, font);
    const lh = fontSize * 1.4;
    const result = layoutWithLines(prepared, block.width, lh);
    block.height = Math.max(result.height, lh);
    block.lines = result.lines;
  }

  function dropBlock() {
    if (blocks.length >= 40) return;
    const idx = blocks.length % BLOCK_TEXTS.length;
    const x = 100 + Math.random() * (canvasWidth - 300);
    const b = createBlock(BLOCK_TEXTS[idx], COLORS[idx % COLORS.length], x, -50);
    b.vy = 2 + Math.random() * 2;
    blocks.push(b);
  }

  function shakeAll() {
    for (const b of blocks) {
      b.vx += (Math.random() - 0.5) * 12;
      b.vy += (Math.random() - 0.5) * 8 - 4;
      b.va += (Math.random() - 0.5) * 0.1;
    }
  }

  function tick() {
    const groundY = canvasHeight - 10;
    const damping = 0.98;
    const gravity = 0.3;

    for (const b of blocks) {
      if (dragging && dragging.block === b) continue;

      b.vy += gravity;
      b.vx *= damping;
      b.vy *= damping;
      b.va *= 0.95;

      b.x += b.vx;
      b.y += b.vy;
      b.angle += b.va;

      // Ground
      if (b.y + b.height > groundY) {
        b.y = groundY - b.height;
        b.vy *= -0.4;
        b.va *= 0.5;
        if (Math.abs(b.vy) < 0.5) b.vy = 0;
      }

      // Walls
      if (b.x < 0) { b.x = 0; b.vx *= -0.5; }
      if (b.x + b.width > canvasWidth) { b.x = canvasWidth - b.width; b.vx *= -0.5; }

      // Ceiling
      if (b.y < 0) { b.y = 0; b.vy *= -0.3; }
    }

    // Block-block collisions (AABB)
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i];
        const b = blocks[j];
        if (dragging && (dragging.block === a || dragging.block === b)) continue;

        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

        if (overlapX > 0 && overlapY > 0) {
          totalCollisions++;
          if (overlapX < overlapY) {
            const push = overlapX / 2;
            if (a.x < b.x) { a.x -= push; b.x += push; } else { a.x += push; b.x -= push; }
            const tmpVx = a.vx;
            a.vx = b.vx * 0.7;
            b.vx = tmpVx * 0.7;
            a.va += (Math.random() - 0.5) * 0.03;
            b.va += (Math.random() - 0.5) * 0.03;
          } else {
            const push = overlapY / 2;
            if (a.y < b.y) { a.y -= push; b.y += push; } else { a.y += push; b.y -= push; }
            const tmpVy = a.vy;
            a.vy = b.vy * 0.7;
            b.vy = tmpVy * 0.7;
            a.va += (Math.random() - 0.5) * 0.03;
            b.va += (Math.random() - 0.5) * 0.03;
          }
        }
      }
    }

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

    ctx.fillStyle = isDark ? '#08080e' : '#f5f5fa';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Ground line
    ctx.strokeStyle = isDark ? '#333' : '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight - 10);
    ctx.lineTo(canvasWidth, canvasHeight - 10);
    ctx.stroke();

    const font = buildFont(fontSize, 'Inter, sans-serif');
    const lh = fontSize * 1.4;

    for (const b of blocks) {
      ctx.save();
      ctx.translate(b.x + b.width / 2, b.y + b.height / 2);
      ctx.rotate(b.angle);

      // Block background
      ctx.fillStyle = b.color + '18';
      ctx.strokeStyle = b.color + '80';
      ctx.lineWidth = 1.5;
      const rx = -b.width / 2;
      const ry = -b.height / 2;

      // Rounded rect
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(rx + r, ry);
      ctx.lineTo(rx + b.width - r, ry);
      ctx.quadraticCurveTo(rx + b.width, ry, rx + b.width, ry + r);
      ctx.lineTo(rx + b.width, ry + b.height - r);
      ctx.quadraticCurveTo(rx + b.width, ry + b.height, rx + b.width - r, ry + b.height);
      ctx.lineTo(rx + r, ry + b.height);
      ctx.quadraticCurveTo(rx, ry + b.height, rx, ry + b.height - r);
      ctx.lineTo(rx, ry + r);
      ctx.quadraticCurveTo(rx, ry, rx + r, ry);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = isDark ? '#e8e8ed' : '#1a1a2e';
      ctx.font = font;
      ctx.textBaseline = 'top';
      for (let li = 0; li < b.lines.length; li++) {
        ctx.fillText(b.lines[li].text, rx + 6, ry + 4 + li * lh);
      }

      ctx.restore();
    }
  }

  function getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onMouseDown(e: MouseEvent) {
    const pos = getCanvasPos(e);
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      if (pos.x >= b.x && pos.x <= b.x + b.width && pos.y >= b.y && pos.y <= b.y + b.height) {
        dragging = { block: b, offsetX: pos.x - b.x, offsetY: pos.y - b.y, lastX: pos.x, lastY: pos.y };
        b.vx = 0;
        b.vy = 0;
        b.va = 0;
        break;
      }
    }
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragging) return;
    const pos = getCanvasPos(e);
    dragging.block.x = pos.x - dragging.offsetX;
    dragging.block.y = pos.y - dragging.offsetY;
    dragging.block.vx = (pos.x - dragging.lastX) * 0.5;
    dragging.block.vy = (pos.y - dragging.lastY) * 0.5;
    dragging.lastX = pos.x;
    dragging.lastY = pos.y;
  }

  function onMouseUp() {
    dragging = null;
  }

  function onTouchStart(e: TouchEvent) {
    e.preventDefault();
    const pos = getCanvasPos(e.touches[0]);
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      if (pos.x >= b.x && pos.x <= b.x + b.width && pos.y >= b.y && pos.y <= b.y + b.height) {
        dragging = { block: b, offsetX: pos.x - b.x, offsetY: pos.y - b.y, lastX: pos.x, lastY: pos.y };
        b.vx = 0;
        b.vy = 0;
        b.va = 0;
        break;
      }
    }
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (!dragging) return;
    const pos = getCanvasPos(e.touches[0]);
    dragging.block.x = pos.x - dragging.offsetX;
    dragging.block.y = pos.y - dragging.offsetY;
    dragging.block.vx = (pos.x - dragging.lastX) * 0.5;
    dragging.block.vy = (pos.y - dragging.lastY) * 0.5;
    dragging.lastX = pos.x;
    dragging.lastY = pos.y;
  }

  function onTouchEnd() {
    dragging = null;
  }

  function blocksAtRest(): number {
    return blocks.filter(b => Math.abs(b.vx) < 0.1 && Math.abs(b.vy) < 0.1).length;
  }

  let autoDropInterval: ReturnType<typeof setInterval>;

  onMount(() => {
    initBlocks();
    resizeCanvas();
    tick();
    autoDropInterval = setInterval(dropBlock, 2000);
    return () => {
      cancelAnimationFrame(animFrame);
      clearInterval(autoDropInterval);
    };
  });

  $effect(() => {
    fontSize;
    if (blocks.length > 0) {
      for (const b of blocks) relayoutBlock(b);
    }
  });
</script>

<div class="collision-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="11" max="16" bind:value={fontSize} />
    </div>
    <div class="btn-group">
      <button class="action-btn accent" onclick={dropBlock}>Drop block</button>
      <button class="action-btn accent" onclick={shakeAll}>Shake</button>
      <button class="action-btn reset" onclick={initBlocks}>Reset</button>
    </div>
  </div>

  <div class="collision-stats">
    <span class="stat-pill">{blocks.length} blocks</span>
    <span class="stat-pill accent">{totalCollisions} collisions</span>
    <span class="stat-pill">{blocksAtRest()} at rest</span>
    <span class="stat-pill">Drag blocks to throw</span>
  </div>

  <div class="canvas-wrap">
    <canvas
      bind:this={canvas}
      onmousedown={onMouseDown}
      onmousemove={onMouseMove}
      onmouseup={onMouseUp}
      onmouseleave={onMouseUp}
      ontouchstart={onTouchStart}
      ontouchmove={onTouchMove}
      ontouchend={onTouchEnd}
    ></canvas>
  </div>
</div>

<style>
  .collision-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 80px; }
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

  .collision-stats { display: flex; flex-wrap: wrap; gap: 8px; }
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
  canvas { display: block; width: 100%; cursor: grab; }
  canvas:active { cursor: grabbing; }
</style>
