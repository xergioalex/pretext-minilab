<script lang="ts">
  import { buildFont } from '../../lib/pretext';
  import { estimateBlockHeight, flowTextThroughRegions } from '../../lib/advanced-demos/layout';
  import { reflowArticleByline, reflowArticleParagraphs, reflowArticleTitle } from '../../lib/advanced-demos/fixtures';
  import { untrack } from 'svelte';

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
    { id: 'phone', label: 'Phone', width: 360, height: 700, columns: 1, bodyFont: 15, headlineFont: 28 },
    { id: 'tablet', label: 'Tablet', width: 620, height: 720, columns: 2, bodyFont: 16, headlineFont: 32 },
    { id: 'spread', label: 'Spread', width: 920, height: 740, columns: 3, bodyFont: 16, headlineFont: 40 },
    { id: 'poster', label: 'Poster', width: 1040, height: 820, columns: 2, bodyFont: 18, headlineFont: 52 },
  ];

  let wrapperWidth = $state(0);
  let presetId = $state<PresetId>('spread');
  let emphasizeHeadline = $state(70);
  let reserveQuote = $state(true);
  let showRegions = $state(false);

  let lines = $state<Array<{ text: string; x: number; y: number; width: number; regionId: string }>>([]);
  let regionBoxes = $state<Array<{ id: string; x: number; y: number; width: number; height: number }>>([]);
  let metrics = $state<Array<{ id: PresetId; lineCount: number; consumed: number; columns: number }>>([]);

  let computedTitleTop = $state(40);
  let computedTitleHeight = $state(80);
  let computedBylineTop = $state(130);
  let computedBodyTop = $state(180);
  let effectiveHeadlineFont = $state(40);
  let effectiveTitleLineHeight = $state(43);
  let quoteAbsTop = $state(280);
  let quoteAbsLeft = $state(30);
  let quoteBoxWidth = $state(120);
  let quoteBoxHeight = $state(160);

  function recompute() {
    const preset = presets.find((entry) => entry.id === presetId)!;
    const margin = preset.id === 'phone' ? 24 : 30;
    const gap = 24;

    const headlineScale = 0.7 + emphasizeHeadline * 0.006;
    effectiveHeadlineFont = Math.round(preset.headlineFont * headlineScale);
    effectiveTitleLineHeight = Math.round(effectiveHeadlineFont * 1.1);

    const titleFont = buildFont(effectiveHeadlineFont, 'Georgia, Times New Roman, serif');
    const bodyFont = buildFont(preset.bodyFont, 'Georgia, Times New Roman, serif');
    const bodyLineHeight = Math.round(preset.bodyFont * 1.65);

    const titleWidth = preset.width - margin * 2;
    computedTitleTop = 38;
    computedTitleHeight = estimateBlockHeight(reflowArticleTitle, titleFont, titleWidth, effectiveTitleLineHeight);

    computedBylineTop = computedTitleTop + computedTitleHeight + 10;
    const bylineHeight = 18;
    computedBodyTop = computedBylineTop + bylineHeight + 20;

    const regionHeight = Math.max(100, preset.height - computedBodyTop - margin);
    const bodyWidth = Math.floor((preset.width - margin * 2 - gap * (preset.columns - 1)) / preset.columns);

    const quoteLocalTop = 40;
    const quoteLocalBottom = 190;
    quoteBoxWidth = 120;
    quoteBoxHeight = quoteLocalBottom - quoteLocalTop;
    quoteAbsTop = computedBodyTop + quoteLocalTop;
    quoteAbsLeft = margin;

    regionBoxes = Array.from({ length: preset.columns }, (_, index) => {
      const x = margin + index * (bodyWidth + gap);
      return {
        id: `region-${index}`,
        x,
        y: computedBodyTop,
        width: bodyWidth,
        height: regionHeight,
      };
    });

    const exclusionTotalWidth = quoteBoxWidth + 16;

    const flowed = flowTextThroughRegions(
      articleText,
      bodyFont,
      bodyLineHeight,
      regionBoxes.map((box, index) => ({
        id: box.id,
        x: box.x,
        y: box.y,
        height: box.height,
        widthAtY: (localY) => {
          if (reserveQuote && preset.id === 'spread' && index === 0 && localY >= quoteLocalTop && localY < quoteLocalBottom) {
            return Math.max(80, box.width - exclusionTotalWidth);
          }
          return box.width;
        },
        xOffsetAtY: (localY) => {
          if (reserveQuote && preset.id === 'spread' && index === 0 && localY >= quoteLocalTop && localY < quoteLocalBottom) {
            return exclusionTotalWidth;
          }
          return 0;
        },
      }))
    );

    lines = flowed.lines;

    metrics = presets.map((p) => {
      const bw = Math.floor((p.width - (p.id === 'phone' ? 48 : 60) - gap * (p.columns - 1)) / p.columns);
      const bf = buildFont(p.bodyFont, 'Georgia, Times New Roman, serif');
      const blh = Math.round(p.bodyFont * 1.65);
      const height = estimateBlockHeight(articleText, bf, bw, blh);
      return {
        id: p.id,
        lineCount: Math.round(height / blh),
        consumed: Math.round(height),
        columns: p.columns,
      };
    });
  }

  $effect(() => {
    wrapperWidth;
    presetId;
    emphasizeHeadline;
    reserveQuote;
    untrack(() => recompute());
  });
</script>

<div class="reflow-demo" bind:clientWidth={wrapperWidth}>
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
    {@const clampedWidth = wrapperWidth > 0 ? Math.min(preset.width, wrapperWidth - 32) : preset.width}
    {@const scale = clampedWidth < preset.width ? clampedWidth / preset.width : 1}
    <div class="page-wrapper" style={`width:${clampedWidth}px;height:${preset.height * scale}px;`}>
      <div class="page-frame" style={`width:${preset.width}px;height:${preset.height}px;transform:scale(${scale});transform-origin:top left;`}>
        <div class="frame-meta">
          <span>Reflow preset: {preset.label}</span>
          <span>{preset.columns} column{preset.columns > 1 ? 's' : ''}</span>
          <span>{reserveQuote && preset.id === 'spread' ? 'quote reserved' : 'max body density'}</span>
        </div>

        <h2
          class="frame-title"
          style={`font-size:${effectiveHeadlineFont}px;line-height:${effectiveTitleLineHeight}px;top:${computedTitleTop}px;left:${preset.id === 'phone' ? 24 : 30}px;right:${preset.id === 'phone' ? 24 : 30}px;`}
        >
          {reflowArticleTitle}
        </h2>
        <p class="frame-byline" style={`top:${computedBylineTop}px;left:${preset.id === 'phone' ? 24 : 30}px;`}>
          {reflowArticleByline}
        </p>

        {#if reserveQuote && preset.id === 'spread'}
          <aside
            class="pull-quote"
            style={`left:${quoteAbsLeft}px;top:${quoteAbsTop}px;width:${quoteBoxWidth - 28}px;max-height:${quoteBoxHeight}px;`}
          >
            "A reflow engine is not a renderer. It is a planning surface for typography."
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
          <div
            class="page-line"
            style={`left:${line.x}px;top:${line.y}px;font-size:${preset.bodyFont}px;line-height:${Math.round(preset.bodyFont * 1.65)}px;`}
          >
            {line.text}
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .reflow-demo { display: flex; flex-direction: column; gap: var(--space-md); width: 100%; min-width: 0; }
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

  .page-wrapper {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-lg);
    box-shadow: 0 18px 48px rgba(0,0,0,0.16);
  }

  .page-frame {
    position: relative; overflow: hidden;
    border-radius: var(--radius-lg); border: 1px solid var(--border);
    background: linear-gradient(180deg, rgba(255,255,255,0.04), transparent 20%), #faf7f2;
    color: #161515;
  }
  .frame-meta {
    display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    padding: 14px 30px 0; font-size: 0.64rem; letter-spacing: 0.12em;
    text-transform: uppercase; color: #6c645c; font-weight: 700;
  }
  .frame-title {
    position: absolute; margin: 0;
    font-family: Georgia, 'Times New Roman', serif;
    letter-spacing: -0.04em; color: #161515;
  }
  .frame-byline {
    position: absolute; font-size: 0.82rem; color: #6c645c; margin: 0;
  }
  .pull-quote {
    position: absolute; padding: 14px;
    font-size: 0.88rem; line-height: 1.3; font-weight: 600; color: #5b4cd4;
    border-left: 3px solid #7c6cf0; background: rgba(124, 108, 240, 0.06);
    border-radius: 0 6px 6px 0;
    overflow: hidden;
  }
  .page-line {
    position: absolute; white-space: nowrap;
    font-family: Georgia, 'Times New Roman', serif;
    color: #181512;
  }
  .region-box {
    position: absolute; border: 1px dashed rgba(124, 108, 240, 0.4);
    border-radius: 10px; pointer-events: none;
  }

  @media (max-width: 600px) {
    .ctrl { min-width: 70px; }
    .controls-bar { gap: var(--space-sm); }
    .toggle-group button { padding: 5px 8px; font-size: 0.68rem; }
  }
</style>
