<script lang="ts">
  import { buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { clamp, flowTextThroughRegions, lerp } from '../../lib/advanced-demos/layout';

  let wrapperWidth = $state(0);
  let folds = $state(58);
  let panels = $state(4);
  let showCreases = $state(true);

  let panelLayout = $state<Array<{ id: string; x: number; y: number; width: number; height: number; angle: number }>>([]);
  let lines = $state<Array<{ text: string; x: number; y: number; regionId: string }>>([]);

  const text = `${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.long}`;

  function recompute() {
    const width = Math.max(320, Math.min(wrapperWidth || 980, 1020));
    const panelGap = 12;
    const margin = 28;
    const height = 440;
    const panelWidth = Math.floor((width - margin * 2 - panelGap * (panels - 1)) / panels);
    const lineHeight = 24;
    const font = buildFont(15, 'Georgia, Times New Roman, serif');

    panelLayout = Array.from({ length: panels }, (_, index) => ({
      id: `panel-${index}`,
      x: margin + index * (panelWidth + panelGap),
      y: 30,
      width: panelWidth,
      height,
      angle: lerp(-55, 55, panels === 1 ? 0.5 : index / (panels - 1)) * (folds / 100),
    }));

    const flowed = flowTextThroughRegions(
      text,
      font,
      lineHeight,
      panelLayout.map((panel) => ({
        id: panel.id,
        x: panel.x + 14,
        y: panel.y + 64,
        height: panel.height - 90,
        widthAtY: () => clamp(panel.width - 28 - Math.abs(panel.angle) * 2.2, 80, panel.width - 28),
      }))
    );

    lines = flowed.lines.map((line) => ({
      text: line.text,
      x: line.x,
      y: line.y,
      regionId: line.regionId,
    }));
  }

  $effect(() => {
    wrapperWidth;
    folds;
    panels;
    recompute();
  });
</script>

<div class="origami-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Fold depth <span>{folds}%</span></label>
      <input type="range" min="0" max="90" bind:value={folds} />
    </div>
    <div class="ctrl">
      <label>Panels <span>{panels}</span></label>
      <input type="range" min="3" max="6" step="1" bind:value={panels} />
    </div>
    <button class="toggle-btn" class:on={showCreases} onclick={() => (showCreases = !showCreases)}>Creases</button>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{panels} paper panels</span>
    <span class="stat-pill">{lines.length} flowed lines</span>
    <span class="stat-pill">continuous cursor across folds</span>
  </div>

  <div class="origami-stage">
    {#each panelLayout as panel}
      <section
        class="paper-panel"
        style={`left:${panel.x}px;top:${panel.y}px;width:${panel.width}px;height:${panel.height}px;transform:perspective(900px) rotateY(${panel.angle}deg);`}
      >
        <div class="panel-head">panel {panel.id.split('-')[1]}</div>
        {#if showCreases}
          <div class="crease"></div>
        {/if}

        {#each lines.filter((line) => line.regionId === panel.id) as line}
          <div class="panel-line" style={`left:${line.x - panel.x}px;top:${line.y - panel.y}px;`}>
            {line.text}
          </div>
        {/each}
      </section>
    {/each}
  </div>
</div>

<style>
  .origami-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }
  .toggle-btn {
    padding: 7px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); cursor: pointer;
    font-size: 0.75rem; font-weight: 600; font-family: var(--font-body);
  }
  .toggle-btn.on { background: var(--accent); color: #fff; border-color: var(--accent); }
  .stats-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.74rem; color: var(--text-muted);
    padding: 4px 10px; border-radius: 999px; background: var(--bg-card);
    border: 1px solid var(--border);
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .origami-stage {
    position: relative; min-height: 510px; overflow: hidden; border-radius: var(--radius-lg);
    border: 1px solid var(--border); background:
      radial-gradient(circle at top, rgba(124,108,240,0.16), transparent 24%),
      linear-gradient(180deg, #12141c, #0c0f16 42%, #0a0d12);
  }
  .paper-panel {
    position: absolute; overflow: hidden; transform-style: preserve-3d;
    border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);
    background:
      linear-gradient(135deg, rgba(255,255,255,0.88), rgba(236,233,250,0.9)),
      #f9f8ff;
    box-shadow: 0 20px 42px rgba(0,0,0,0.2);
  }
  .panel-head {
    position: absolute; top: 18px; left: 18px; font-size: 0.66rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.12em; color: #6b657e;
  }
  .crease {
    position: absolute; top: 0; bottom: 0; left: 50%; width: 1px;
    background: linear-gradient(180deg, rgba(124,108,240,0.1), rgba(124,108,240,0.4), rgba(124,108,240,0.1));
  }
  :global([data-theme="light"]) .origami-stage {
    background:
      radial-gradient(circle at top, rgba(124,108,240,0.1), transparent 24%),
      linear-gradient(180deg, #e8e6f0, #dddbe8 42%, #d8d6e2);
  }
  :global([data-theme="light"]) .paper-panel {
    border-color: rgba(0,0,0,0.08);
    box-shadow: 0 20px 42px rgba(0,0,0,0.1);
  }

  .panel-line {
    position: absolute; white-space: nowrap;
    font-size: 15px; line-height: 24px; color: #1b1a1f;
    font-family: Georgia, 'Times New Roman', serif;
  }

  @media (max-width: 600px) {
    .ctrl { min-width: 70px; }
    .controls-bar { gap: var(--space-sm); }
  }
</style>
