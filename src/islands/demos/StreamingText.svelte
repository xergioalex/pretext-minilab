<script lang="ts">
  import { prepare, layout, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const fullText = SAMPLE_TEXTS.long;
  const words = fullText.split(/\s+/);

  let wrapperWidth = $state(0);
  let containerWidth = $state(500);
  let fontSize = $state(15);
  let lineHeight = $derived(fontSize * 1.6);
  let speed = $state(15); // tokens per second
  let streaming = $state(false);
  let currentWordIndex = $state(0);
  let animFrame = 0;
  let lastTokenTime = 0;
  let showCursor = $state(true);
  let cursorBlink = 0;

  let currentText = $derived(words.slice(0, currentWordIndex).join(' '));
  let progress = $derived(currentWordIndex / words.length * 100);

  // Cache prepared full text — only recompute when fontSize changes
  let preparedFull = $derived(prepare(fullText, buildFont(fontSize)));

  // Current height (what's actually visible)
  let currentHeight = $derived.by(() => {
    if (currentWordIndex === 0) return 0;
    const prepared = prepare(currentText, buildFont(fontSize));
    return layout(prepared, containerWidth, lineHeight).height;
  });

  // Predicted final height (ghost container) — reuse cached preparedFull, only call layout()
  let predictedHeight = $derived.by(() => {
    return layout(preparedFull, containerWidth, lineHeight).height;
  });

  // "Without prediction" height — jumpy version is same as current
  let jumpyHeight = $derived(currentHeight);

  let accuracy = $derived.by(() => {
    if (predictedHeight === 0) return 0;
    if (currentWordIndex === 0) return 100;
    return Math.round((1 - Math.abs(predictedHeight - currentHeight) / predictedHeight) * 100);
  });

  function startStream() {
    if (streaming) return;
    currentWordIndex = 0;
    streaming = true;
    lastTokenTime = performance.now();
  }

  function resetStream() {
    streaming = false;
    currentWordIndex = 0;
  }

  function tick(now: number) {
    // Cursor blink
    cursorBlink++;
    if (cursorBlink % 30 === 0) showCursor = !showCursor;

    if (streaming) {
      const elapsed = now - lastTokenTime;
      const interval = 1000 / speed;
      if (elapsed >= interval) {
        const tokensToAdd = Math.floor(elapsed / interval);
        currentWordIndex = Math.min(currentWordIndex + tokensToAdd, words.length);
        lastTokenTime = now;
        if (currentWordIndex >= words.length) {
          streaming = false;
        }
      }
    }

    animFrame = requestAnimationFrame(tick);
  }

  onMount(() => {
    animFrame = requestAnimationFrame(tick);
    // Auto-start streaming on entry
    setTimeout(() => startStream(), 500);
    return () => cancelAnimationFrame(animFrame);
  });
</script>

<div class="streaming-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Width <span>{containerWidth}px</span></label>
      <input type="range" min="300" max="700" bind:value={containerWidth} />
    </div>
    <div class="ctrl">
      <label>Speed <span>{speed} tok/s</span></label>
      <input type="range" min="5" max="50" bind:value={speed} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="13" max="20" bind:value={fontSize} />
    </div>
    <div class="btn-group">
      <button class="action-btn accent" onclick={startStream} disabled={streaming}>Stream</button>
      <button class="action-btn reset" onclick={resetStream}>Reset</button>
    </div>
  </div>

  <div class="streaming-stats">
    <span class="stat-pill">{currentWordIndex}/{words.length} tokens</span>
    <span class="stat-pill">{Math.round(currentHeight)}px current</span>
    <span class="stat-pill accent">{Math.round(predictedHeight)}px predicted</span>
    <span class="stat-pill">{accuracy}% accuracy</span>
  </div>

  <!-- Progress bar -->
  <div class="progress-bar">
    <div class="progress-fill" style="width: {progress}%"></div>
  </div>

  <div class="comparison">
    <!-- Left: Without prediction -->
    <div class="panel">
      <div class="panel-label">Without prediction</div>
      <div class="panel-container" style="width: {containerWidth}px;">
        <div class="text-box jumpy" style="height: {jumpyHeight}px; font-size: {fontSize}px; line-height: {lineHeight}px;">
          <span>{currentText}</span>
          {#if streaming && showCursor}
            <span class="cursor">|</span>
          {/if}
        </div>
        <div class="height-label">{Math.round(jumpyHeight)}px</div>
      </div>
    </div>

    <!-- Right: With prediction -->
    <div class="panel">
      <div class="panel-label accent">With prediction</div>
      <div class="panel-container" style="width: {containerWidth}px;">
        <!-- Ghost container -->
        <div class="ghost-container" style="height: {predictedHeight}px;"></div>
        <!-- Actual text -->
        <div class="text-box smooth" style="min-height: {predictedHeight}px; font-size: {fontSize}px; line-height: {lineHeight}px;">
          <span>{currentText}</span>
          {#if streaming && showCursor}
            <span class="cursor">|</span>
          {/if}
        </div>
        <div class="height-label">{Math.round(predictedHeight)}px predicted</div>
      </div>
    </div>
  </div>
</div>

<style>
  .streaming-demo { display: flex; flex-direction: column; gap: var(--space-md); }
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

  .streaming-stats { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .progress-bar {
    height: 4px;
    background: var(--bg-card);
    border-radius: 2px;
    border: 1px solid var(--border);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.1s linear;
    border-radius: 2px;
  }

  .comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-lg);
    overflow-x: auto;
  }

  @media (max-width: 900px) {
    .comparison {
      grid-template-columns: 1fr;
    }
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    min-width: 0;
  }

  .panel-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .panel-label.accent {
    color: var(--accent);
  }

  .panel-container {
    position: relative;
    max-width: 100%;
  }

  .text-box {
    position: relative;
    background: var(--bg-demo);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    color: var(--text-primary);
    overflow: hidden;
    word-wrap: break-word;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  }

  .text-box.jumpy {
    transition: height 0.05s steps(1);
    border-color: var(--border);
  }

  .text-box.smooth {
    transition: min-height 0.3s ease;
    border-color: var(--accent);
    border-style: solid;
  }

  .ghost-container {
    position: absolute;
    inset: 0;
    border: 2px dashed var(--accent);
    border-radius: var(--radius-lg);
    opacity: 0.3;
    pointer-events: none;
    transition: height 0.3s ease;
    z-index: 0;
  }

  .cursor {
    color: var(--accent);
    font-weight: 700;
    animation: none;
  }

  .height-label {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
    text-align: right;
    margin-top: 4px;
  }
</style>
