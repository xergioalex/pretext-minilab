<script lang="ts">
  import { prepare, layout, buildFont } from '../../lib/pretext';
  import { onMount } from 'svelte';

  let blockCount = $state(100);
  let width = $state(300);
  let hasRun = $state(false);
  let running = $state(false);

  const sampleText = 'Pretext separates the expensive analysis from cheap relayout. This means resize operations become pure arithmetic instead of DOM reflows.';

  let domTime = $state(0);
  let pretextPrepareTime = $state(0);
  let pretextLayoutTime = $state(0);

  let relayoutDomTime = $state(0);
  let relayoutPretextTime = $state(0);
  let relayoutRuns = $state(0);

  let speedup = $state(0);

  async function runFullComparison() {
    running = true;
    await new Promise(r => setTimeout(r, 50));

    const font = buildFont(16);
    const lh = 24;
    const widths = [150, 200, 250, 300, 350, 400, 450, 500, 550, 600];

    // Pretext: prepare
    const t0 = performance.now();
    const prepareds = [];
    for (let i = 0; i < blockCount; i++) prepareds.push(prepare(sampleText, font));
    pretextPrepareTime = performance.now() - t0;

    // Pretext: layout across widths
    const t1 = performance.now();
    for (const w of widths) {
      for (let i = 0; i < blockCount; i++) layout(prepareds[i], w, lh);
    }
    pretextLayoutTime = performance.now() - t1;
    relayoutPretextTime = pretextLayoutTime;

    // DOM: measure across widths
    const container = document.createElement('div');
    container.style.cssText = `position:absolute;visibility:hidden;left:-9999px;top:0;font:${font};line-height:${lh}px;`;
    document.body.appendChild(container);

    const t2 = performance.now();
    for (const w of widths) {
      container.style.width = w + 'px';
      for (let i = 0; i < blockCount; i++) {
        const div = document.createElement('div');
        div.textContent = sampleText;
        container.appendChild(div);
        const _h = div.offsetHeight;
        container.removeChild(div);
      }
    }
    relayoutDomTime = performance.now() - t2;
    domTime = relayoutDomTime;

    document.body.removeChild(container);
    relayoutRuns = widths.length;
    speedup = relayoutDomTime / (pretextPrepareTime + pretextLayoutTime);
    hasRun = true;
    running = false;
  }

  onMount(() => { runFullComparison(); });
</script>

<div class="dvp-demo">
  <div class="controls-bar">
    <div class="ctrl">
      <label>Text blocks <span>{blockCount}</span></label>
      <input type="range" min="10" max="500" step="10" bind:value={blockCount} />
    </div>
    <button
      class="run-btn"
      class:running
      onclick={runFullComparison}
      disabled={running}
    >
      {running ? 'Running...' : hasRun ? 'Run again' : 'Run comparison'}
    </button>
  </div>

  <!-- Architecture side by side -->
  <div class="arch-grid">
    <div class="arch-card dom-card">
      <h3>DOM Approach</h3>
      <div class="arch-steps">
        <div class="step bad">Create hidden element</div>
        <div class="step-arrow">↓</div>
        <div class="step bad">Set text + width</div>
        <div class="step-arrow">↓</div>
        <div class="step danger">Append to DOM → reflow</div>
        <div class="step-arrow">↓</div>
        <div class="step danger">Read offsetHeight → reflow</div>
        <div class="step-arrow">↓</div>
        <div class="step bad">Remove element</div>
        <div class="step-arrow">↓</div>
        <div class="step danger">Repeat for EVERY resize</div>
      </div>
      {#if hasRun}
        <div class="timing-result">
          <span class="timing-big dom-color">{relayoutDomTime.toFixed(1)}ms</span>
          <span class="timing-detail">{blockCount} blocks x {relayoutRuns} widths</span>
        </div>
      {/if}
    </div>

    <div class="arch-vs">
      {#if hasRun}
        <div class="speedup">{speedup.toFixed(0)}x</div>
        <div class="speedup-label">faster</div>
      {:else}
        <div class="vs-text">vs</div>
      {/if}
    </div>

    <div class="arch-card pretext-card">
      <h3>Pretext Approach</h3>
      <div class="arch-steps">
        <div class="step prepare">prepare(text, font) — once</div>
        <div class="step-arrow">↓</div>
        <div class="step fast">layout(prepared, width, lh)</div>
        <div class="step-arrow">↓</div>
        <div class="step fast">Pure arithmetic — no DOM</div>
        <div class="step-arrow">↓</div>
        <div class="step fast">Instant at any width</div>
      </div>
      {#if hasRun}
        <div class="timing-result">
          <span class="timing-small">Prepare: {pretextPrepareTime.toFixed(2)}ms</span>
          <span class="timing-big pretext-color">{pretextLayoutTime.toFixed(2)}ms</span>
          <span class="timing-detail">layout hot path</span>
        </div>
      {/if}
    </div>
  </div>

  {#if hasRun}
    <!-- Visual bar comparison -->
    <div class="bar-comparison">
      <div class="bar-row">
        <span class="bar-label">DOM</span>
        <div class="bar-track">
          <div class="bar dom-bar" style="width: {Math.min(100, (relayoutDomTime / Math.max(relayoutDomTime, 1)) * 100)}%">
            <span>{relayoutDomTime.toFixed(1)}ms</span>
          </div>
        </div>
      </div>
      <div class="bar-row">
        <span class="bar-label">Pretext</span>
        <div class="bar-track">
          <div class="bar pretext-bar" style="width: {Math.max(2, Math.min(100, (pretextLayoutTime / Math.max(relayoutDomTime, 1)) * 100))}%">
            <span>{pretextLayoutTime.toFixed(2)}ms</span>
          </div>
        </div>
      </div>
      <p class="disclaimer">
        Local approximate measurements — not a rigorous benchmark. The architectural advantage (prepare once, relayout cheaply) is the key insight.
      </p>
    </div>
  {/if}
</div>

<style>
  .dvp-demo { display: flex; flex-direction: column; gap: var(--space-xl); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .run-btn {
    padding: 8px 24px; border-radius: var(--radius-md);
    border: 2px solid var(--accent); background: var(--accent);
    color: #fff; font-size: 0.88rem; font-weight: 700;
    cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .run-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px var(--accent-dim); }
  .run-btn.running { opacity: 0.6; cursor: wait; }
  .run-btn:disabled { opacity: 0.5; }

  .arch-grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: var(--space-lg);
    align-items: start;
  }

  @media (max-width: 768px) {
    .arch-grid { grid-template-columns: 1fr; }
  }

  .arch-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
  }

  .arch-card h3 {
    font-size: 0.95rem; margin-bottom: var(--space-lg); text-align: center;
  }

  .pretext-card { border-color: var(--border-accent); }

  .arch-steps {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
  }

  .step {
    width: 100%; text-align: center;
    padding: 8px 12px; border-radius: var(--radius-sm);
    font-size: 0.8rem; border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-secondary);
  }
  .step.bad { border-color: #ef444444; color: #fca5a5; }
  .step.danger { border-color: #ef4444; color: #ef4444; background: #ef44440d; font-weight: 600; }
  .step.prepare { border-color: var(--accent); color: var(--accent); }
  .step.fast { border-color: #3ecf8e66; color: #3ecf8e; background: #3ecf8e0d; }

  :global([data-theme="light"]) .step.bad { color: #b91c1c; border-color: #fca5a5; }
  :global([data-theme="light"]) .step.danger { color: #991b1b; border-color: #ef4444; background: #fef2f2; }
  :global([data-theme="light"]) .step.prepare { color: #5b4cd4; border-color: #7c6cf0; }
  :global([data-theme="light"]) .step.fast { color: #047857; border-color: #6ee7b7; background: #ecfdf5; }

  .step-arrow { font-size: 0.7rem; color: var(--text-muted); }

  .arch-vs {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: var(--space-xl) 0;
  }
  .vs-text { font-size: 1.5rem; font-weight: 700; color: var(--text-muted); }
  .speedup {
    font-family: var(--font-mono); font-size: 2.5rem; font-weight: 800;
    color: var(--success); line-height: 1;
  }
  .speedup-label { font-size: 0.8rem; color: var(--success); font-weight: 600; }
  :global([data-theme="light"]) .speedup { color: #059669; }
  :global([data-theme="light"]) .speedup-label { color: #059669; }

  .timing-result {
    margin-top: var(--space-lg); text-align: center;
    display: flex; flex-direction: column; gap: 2px; align-items: center;
  }
  .timing-big {
    font-family: var(--font-mono); font-size: 1.6rem; font-weight: 800;
  }
  .timing-small {
    font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);
  }
  .dom-color { color: #ef4444; }
  .pretext-color { color: #3ecf8e; }
  :global([data-theme="light"]) .dom-color { color: #dc2626; }
  :global([data-theme="light"]) .pretext-color { color: #059669; }
  .timing-detail { font-size: 0.7rem; color: var(--text-muted); }

  .bar-comparison {
    background: var(--bg-secondary); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: var(--space-xl);
  }

  .bar-row {
    display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md);
  }
  .bar-label {
    font-size: 0.8rem; font-weight: 700; width: 60px; color: var(--text-secondary);
  }
  .bar-track { flex: 1; height: 36px; background: var(--bg-card); border-radius: var(--radius-sm); overflow: hidden; }
  .bar {
    height: 100%; display: flex; align-items: center; padding: 0 12px;
    font-family: var(--font-mono); font-size: 0.8rem; font-weight: 700;
    min-width: fit-content; border-radius: var(--radius-sm);
    transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    animation: barGrow 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes barGrow {
    from { width: 0 !important; }
  }
  .dom-bar {
    background: linear-gradient(90deg, #ef4444, #dc2626);
    color: #fff;
  }
  .pretext-bar {
    background: linear-gradient(90deg, #3ecf8e, #10b981);
    color: #fff;
  }
  .disclaimer {
    font-size: 0.75rem; color: var(--text-muted); font-style: italic;
    margin-top: var(--space-sm);
  }
</style>
