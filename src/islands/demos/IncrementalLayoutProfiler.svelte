<script lang="ts">
  import { buildFont, layout, prepare, profilePrepare, SAMPLE_TEXTS } from '../../lib/pretext';
  import type { PreparedText } from '../../lib/pretext';
  import { profilerParagraph } from '../../lib/advanced-demos/fixtures';

  type EventKind = 'width' | 'edit' | 'font';

  interface TraceEvent {
    id: number;
    kind: EventKind;
    label: string;
    prepareMs: number;
    layoutUs: number;
    invalidated: boolean;
  }

  let text = $state(`${SAMPLE_TEXTS.medium}\n\n${profilerParagraph}`);
  let fontSize = $state(16);
  let width = $state(460);
  let lineHeight = $state(26);
  let trace = $state<TraceEvent[]>([]);
  let prepared: PreparedText | null = $state(null);
  let totalHeight = $state(0);
  let lineCount = $state(0);
  let editCounter = 0;

  function runTrace(kind: EventKind) {
    const font = buildFont(fontSize);
    let prepareMs = 0;
    let invalidated = false;

    if (!prepared || kind !== 'width') {
      const profile = profilePrepare(text, font);
      prepareMs = profile.totalMs;
      prepared = prepare(text, font);
      invalidated = true;
    }

    const t0 = performance.now();
    for (let i = 0; i < 40; i++) {
      const result = layout(prepared!, width, lineHeight);
      if (i === 39) {
        totalHeight = result.height;
        lineCount = result.lineCount;
      }
    }
    const layoutUs = Math.round(((performance.now() - t0) / 40) * 1000);

    trace = [
      {
        id: trace.length + 1,
        kind,
        label: kind === 'width' ? `Width -> ${width}px` : kind === 'font' ? `Font -> ${fontSize}px` : `Edit #${++editCounter}`,
        prepareMs,
        layoutUs,
        invalidated,
      },
      ...trace,
    ].slice(0, 10);
  }

  function editText() {
    text = `${text} More pressure on the layout cache changes what can stay on the hot path.`;
    runTrace('edit');
  }

  function widthOnlyNudge(delta: number) {
    width = Math.max(220, Math.min(760, width + delta));
    runTrace('width');
  }

  function fontNudge(delta: number) {
    fontSize = Math.max(12, Math.min(24, fontSize + delta));
    lineHeight = Math.round(fontSize * 1.6);
    runTrace('font');
  }

  $effect(() => {
    text;
    fontSize;
    width;
    lineHeight;
    if (!prepared) runTrace('font');
  });
</script>

<div class="profiler-demo">
  <div class="controls-bar">
    <div class="ctrl flex">
      <label>Document</label>
      <textarea bind:value={text} rows="4" oninput={() => runTrace('edit')}></textarea>
    </div>
    <div class="ctrl">
      <label>Width <span>{width}px</span></label>
      <input type="range" min="220" max="760" bind:value={width} oninput={() => runTrace('width')} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="12" max="24" bind:value={fontSize} oninput={() => runTrace('font')} />
    </div>
  </div>

  <div class="button-row">
    <button class="action-btn" onclick={() => widthOnlyNudge(-48)}>Width only</button>
    <button class="action-btn" onclick={editText}>Simulate edit</button>
    <button class="action-btn" onclick={() => fontNudge(1)}>Font change</button>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{lineCount} lines</span>
    <span class="stat-pill">{totalHeight}px predicted height</span>
    <span class="stat-pill">trace depth {trace.length}</span>
  </div>

  <div class="profiler-grid">
    <section class="preview-card">
      <h3>Rendered preview</h3>
      <div class="preview-box" style={`width:${width}px;font-size:${fontSize}px;line-height:${lineHeight}px;`}>
        {text}
      </div>
    </section>

    <section class="timeline-card">
      <h3>Invalidation trace</h3>
      <div class="trace-list">
        {#each trace as item}
          <div class="trace-row">
            <div class="trace-head">
              <span class={`kind kind-${item.kind}`}>{item.kind}</span>
              <strong>{item.label}</strong>
              <span class:hot={!item.invalidated} class:cold={item.invalidated}>
                {item.invalidated ? 're-prepare' : 'hot path'}
              </span>
            </div>
            <div class="trace-metrics">
              <div class="metric-track">
                <span>prepare</span>
                <div class="bar bg-prepare" style={`width:${Math.min(100, item.prepareMs * 10)}%`}></div>
                <em>{item.prepareMs.toFixed(2)}ms</em>
              </div>
              <div class="metric-track">
                <span>layout</span>
                <div class="bar bg-layout" style={`width:${Math.min(100, item.layoutUs / 4)}%`}></div>
                <em>{item.layoutUs}μs</em>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  </div>
</div>

<style>
  .profiler-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 130px; }
  .ctrl.flex { flex: 1; min-width: 260px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }
  textarea {
    min-height: 110px; padding: 10px 12px; border-radius: var(--radius-md);
    border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);
    font: inherit; resize: vertical;
  }
  .button-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .action-btn {
    padding: 7px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-secondary); cursor: pointer;
    font-size: 0.76rem; font-weight: 600; font-family: var(--font-body);
  }
  .stats-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.74rem; color: var(--text-muted);
    padding: 4px 10px; border-radius: 999px; background: var(--bg-card);
    border: 1px solid var(--border);
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }
  .profiler-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: var(--space-md); }
  .preview-card, .timeline-card {
    border: 1px solid var(--border); border-radius: var(--radius-lg);
    background: var(--bg-secondary); padding: var(--space-lg);
  }
  .preview-card h3, .timeline-card h3 { margin-bottom: 12px; font-size: 0.95rem; }
  .preview-box {
    padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-primary);
  }
  .trace-list { display: flex; flex-direction: column; gap: 10px; }
  .trace-row {
    padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--border);
    background: var(--bg-card);
  }
  .trace-head {
    display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px;
    font-size: 0.8rem;
  }
  .kind {
    font-size: 0.63rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 3px 7px; border-radius: 999px;
  }
  .kind-width { background: rgba(62, 207, 142, 0.14); color: #3ecf8e; }
  .kind-edit { background: rgba(239, 68, 68, 0.14); color: #ef4444; }
  .kind-font { background: rgba(124, 108, 240, 0.18); color: var(--accent); }
  .hot, .cold {
    margin-left: auto; font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .hot { color: #3ecf8e; }
  .cold { color: #f5a623; }
  .trace-metrics { display: flex; flex-direction: column; gap: 8px; }
  .metric-track {
    display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: 8px;
    font-size: 0.72rem; color: var(--text-muted);
  }
  .bar { height: 8px; border-radius: 999px; }
  .bg-prepare { background: linear-gradient(90deg, #f5a623, #f59e0b); }
  .bg-layout { background: linear-gradient(90deg, #22d3ee, #0ea5e9); }

  @media (max-width: 900px) {
    .profiler-grid { grid-template-columns: 1fr; }
  }
</style>
