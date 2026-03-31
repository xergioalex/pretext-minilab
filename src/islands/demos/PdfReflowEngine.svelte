<script lang="ts">
  import { buildFont } from '../../lib/pretext';
  import { estimateBlockHeight, flowTextThroughRegions } from '../../lib/advanced-demos/layout';
  import { reflowArticleByline, reflowArticleParagraphs, reflowArticleTitle } from '../../lib/advanced-demos/fixtures';

  type PresetId = 'phone' | 'tablet' | 'spread' | 'poster';

  interface Preset {
    id: PresetId;
    label: string;
    width: number;
    height: number;
    columns: number;
    bodyFont: number;
    headlineFont: number;
  }

  const articleText = reflowArticleParagraphs.join('\n\n');
  const presets: Preset[] = [
    { id: 'phone', label: 'Phone', width: 360, height: 660, columns: 1, bodyFont: 15, headlineFont: 28 },
    { id: 'tablet', label: 'Tablet', width: 620, height: 680, columns: 2, bodyFont: 16, headlineFont: 32 },
    { id: 'spread', label: 'Spread', width: 920, height: 700, columns: 3, bodyFont: 16, headlineFont: 40 },
    { id: 'poster', label: 'Poster', width: 1040, height: 780, columns: 2, bodyFont: 18, headlineFont: 52 },
  ];

  let presetId = $state<PresetId>('spread');
  let emphasizeHeadline = $state(70);
  let reserveQuote = $state(true);
  let showRegions = $state(false);

  let lines = $state<Array<{ text: string; x: number; y: number; width: number; regionId: string }>>([]);
  let regionBoxes = $state<Array<{ id: string; x: number; y: number; width: number; height: number }>>([]);
  let metrics = $state<Array<{ id: PresetId; lineCount: number; consumed: number; columns: number }>>([]);

  function recompute() {
    metrics = presets.map((preset) => {
      const bodyWidth = Math.floor((preset.width - 60 - (preset.columns - 1) * 24) / preset.columns);
      const bodyFont = buildFont(preset.bodyFont, 'Georgia, Times New Roman, serif');
      const lineHeight = Math.round(preset.bodyFont * 1.65);
      const height = estimateBlockHeight(articleText, bodyFont, bodyWidth, lineHeight);
      return {
        id: preset.id,
        lineCount: Math.round(height / lineHeight),
        consumed: Math.round(height),
        columns: preset.columns,
      };
    });

    const preset = presets.find((entry) => entry.id === presetId)!;
    const margin = preset.id === 'phone' ? 24 : 30;
    const gap = 24;
    const titleFont = buildFont(preset.headlineFont, 'Georgia, Times New Roman, serif');
    const bodyFont = buildFont(preset.bodyFont, 'Georgia, Times New Roman, serif');
    const titleHeight = estimateBlockHeight(
      reflowArticleTitle,
      titleFont,
      preset.width - margin * 2,
      Math.round(preset.headlineFont * 1.08)
    );
    const bodyTop = margin + titleHeight + 72;
    const regionHeight = preset.height - bodyTop - margin;
    const bodyWidth = Math.floor((preset.width - margin * 2 - gap * (preset.columns - 1)) / preset.columns);

    regionBoxes = Array.from({ length: preset.columns }, (_, index) => {
      const x = margin + index * (bodyWidth + gap);
      return {
        id: `region-${index}`,
        x,
        y: bodyTop,
        width: bodyWidth,
        height: regionHeight,
      };
    });

    const flowed = flowTextThroughRegions(
      articleText,
      bodyFont,
      Math.round(preset.bodyFont * 1.65),
      regionBoxes.map((box, index) => ({
        id: box.id,
        x: box.x,
        y: box.y,
        height: box.height,
        widthAtY: (localY) => {
          if (reserveQuote && preset.id === 'spread' && index === 0 && localY > 92 && localY < 220) {
            return Math.max(120, box.width - 124);
          }
          return box.width;
        },
        xOffsetAtY: (localY) => {
          if (reserveQuote && preset.id === 'spread' && index === 0 && localY > 92 && localY < 220) {
            return 124;
          }
          return 0;
        },
      }))
    );

    lines = flowed.lines;
  }

  $effect(() => {
    presetId;
    emphasizeHeadline;
    reserveQuote;
    recompute();
  });
</script>

<div class="reflow-demo">
  <div class="controls-bar">
    <div class="toggle-group">
      {#each presets as preset}
        <button class:on={presetId === preset.id} onclick={() => (presetId = preset.id)}>{preset.label}</button>
      {/each}
    </div>
    <div class="ctrl">
      <label>Headline emphasis <span>{emphasizeHeadline}%</span></label>
      <input type="range" min="10" max="100" bind:value={emphasizeHeadline} />
    </div>
    <button class="toggle-btn" class:on={reserveQuote} onclick={() => (reserveQuote = !reserveQuote)}>Quote reserve</button>
    <button class="toggle-btn" class:on={showRegions} onclick={() => (showRegions = !showRegions)}>Regions</button>
  </div>

  <div class="stats-row">
    {#each metrics as metric}
      <button class="metric-card" class:active={presetId === metric.id} onclick={() => (presetId = metric.id)}>
        <strong>{metric.id}</strong>
        <span>{metric.columns} cols</span>
        <span>{metric.lineCount} lines</span>
      </button>
    {/each}
  </div>

  {#each presets.filter((entry) => entry.id === presetId) as preset}
    <div class="page-frame" style={`width:${preset.width}px;height:${preset.height}px;`}>
      <div class="frame-meta">
        <span>Reflow preset: {preset.label}</span>
        <span>{preset.columns} columns</span>
        <span>{reserveQuote ? 'quote reserved' : 'max body density'}</span>
      </div>

      <h2
        class="frame-title"
        style={`font-size:${Math.round(preset.headlineFont + (emphasizeHeadline - 50) * 0.12)}px;`}
      >
        {reflowArticleTitle}
      </h2>
      <p class="frame-byline">{reflowArticleByline}</p>

      {#if reserveQuote && preset.id === 'spread'}
        <aside class="pull-quote">
          “A reflow engine is not a renderer. It is a planning surface for typography.”
        </aside>
      {/if}

      {#if showRegions}
        {#each regionBoxes as region}
          <div
            class="region-box"
            style={`left:${region.x}px;top:${region.y}px;width:${region.width}px;height:${region.height}px;`}
          ></div>
        {/each}
      {/if}

      {#each lines as line}
        <div class="page-line" style={`left:${line.x}px;top:${line.y}px;`}>
          {line.text}
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .reflow-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }
  .toggle-group { display: flex; gap: 4px; flex-wrap: wrap; }
  .toggle-group button, .toggle-btn {
    padding: 7px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); cursor: pointer;
    font-size: 0.75rem; font-weight: 600; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .toggle-group button.on, .toggle-btn.on {
    background: var(--accent); color: #fff; border-color: var(--accent);
  }
  .stats-row { display: flex; flex-wrap: wrap; gap: 10px; }
  .metric-card {
    display: flex; flex-direction: column; gap: 2px; text-align: left;
    min-width: 96px; padding: 10px 12px; border-radius: var(--radius-md);
    border: 1px solid var(--border); background: var(--bg-card); color: var(--text-secondary);
    cursor: pointer; font-family: var(--font-body);
  }
  .metric-card strong { text-transform: capitalize; color: var(--text-primary); }
  .metric-card span { font-size: 0.72rem; }
  .metric-card.active { border-color: var(--accent); background: var(--accent-dim); }

  .page-frame {
    position: relative; overflow: hidden; max-width: 100%;
    border-radius: var(--radius-lg); border: 1px solid var(--border);
    background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent 20%), #faf7f2;
    color: #161515;
    box-shadow: 0 18px 48px rgba(0,0,0,0.16);
  }
  .frame-meta {
    display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    padding: 18px 30px 0; font-size: 0.64rem; letter-spacing: 0.12em;
    text-transform: uppercase; color: #6c645c; font-weight: 700;
  }
  .frame-title {
    position: absolute; left: 30px; top: 40px; right: 30px;
    margin: 0; font-family: Georgia, 'Times New Roman', serif;
    line-height: 0.94; letter-spacing: -0.04em;
  }
  .frame-byline {
    position: absolute; left: 30px; top: 122px; font-size: 0.82rem; color: #6c645c;
  }
  .pull-quote {
    position: absolute; left: 30px; top: 236px; width: 100px; padding: 14px;
    font-size: 1rem; line-height: 1.25; font-weight: 600; color: #5b4cd4;
    border-left: 3px solid #7c6cf0; background: rgba(124, 108, 240, 0.08);
  }
  .page-line {
    position: absolute; white-space: nowrap;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 16px; line-height: 26px; color: #181512;
  }
  .region-box {
    position: absolute; border: 1px dashed rgba(124, 108, 240, 0.4);
    border-radius: 10px; pointer-events: none;
  }
</style>
