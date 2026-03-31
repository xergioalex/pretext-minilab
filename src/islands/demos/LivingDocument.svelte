<script lang="ts">
  import { buildFont } from '../../lib/pretext';
  import { estimateBlockHeight, flowTextThroughRegions } from '../../lib/advanced-demos/layout';
  import { livingDocumentBlocks } from '../../lib/advanced-demos/fixtures';

  type SurfaceMode = 'desktop' | 'tablet' | 'mobile';

  interface CardLayout {
    id: string;
    title: string;
    body: string;
    priority: number;
    kind: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }

  let wrapperWidth = $state(0);
  let surface = $state<SurfaceMode>('desktop');
  let urgency = $state(45);
  let density = $state(55);
  let recirculationBias = $state(35);
  let showGuides = $state(false);

  let featureLines = $state<Array<{ text: string; x: number; y: number; width: number }>>([]);
  let cards = $state<CardLayout[]>([]);
  let boardHeight = $state(780);
  let featureHeight = $state(0);

  const surfaceWidths: Record<SurfaceMode, number> = {
    desktop: 1080,
    tablet: 820,
    mobile: 340,
  };

  function scoreBlock(index: number, basePriority: number, kind: string) {
    const urgencyBoost = kind === 'headline' || kind === 'feature' ? urgency * 0.5 : urgency * 0.18;
    const densityPenalty = kind === 'quote' || kind === 'caption' ? density * 0.12 : density * 0.04;
    const recircBoost = index % 2 === 0 ? recirculationBias * 0.25 : recirculationBias * 0.08;
    return Math.round(basePriority + urgencyBoost + recircBoost - densityPenalty);
  }

  function recompute() {
    const width = Math.min(wrapperWidth || surfaceWidths[surface], surfaceWidths[surface]);
    const boardWidth = Math.max(360, width);
    const gutter = surface === 'mobile' ? 14 : 18;
    const outer = surface === 'mobile' ? 18 : 24;
    const fontSize = surface === 'mobile' ? 15 : 16;
    const lineHeight = Math.round(fontSize * 1.6);
    const font = buildFont(fontSize);

    const ranked = livingDocumentBlocks
      .map((block, index) => ({
        ...block,
        score: scoreBlock(index, block.priority, block.kind),
      }))
      .sort((a, b) => b.score - a.score);

    const feature = ranked[0];
    const secondary = ranked.slice(1);
    const columnCount = surface === 'desktop' ? 2 : 1;
    const featureColumnWidth = Math.floor((boardWidth - outer * 2 - gutter * (columnCount - 1)) / columnCount);
    const featureRegions = Array.from({ length: columnCount }, (_, index) => ({
      id: `feature-${index}`,
      x: outer + index * (featureColumnWidth + gutter),
      y: 146,
      height: surface === 'mobile' ? 196 : 220,
      widthAtY: () => featureColumnWidth,
    }));

    const flowed = flowTextThroughRegions(feature.body, font, lineHeight, featureRegions);
    featureLines = flowed.lines.map((line) => ({
      text: line.text,
      x: line.x,
      y: line.y,
      width: line.width,
    }));
    featureHeight = 146 + featureRegions[0].height + 26;

    const cardColumns = surface === 'desktop' ? 3 : surface === 'tablet' ? 2 : 1;
    const cardWidth = Math.floor((boardWidth - outer * 2 - gutter * (cardColumns - 1)) / cardColumns);
    const columnHeights = new Array(cardColumns).fill(featureHeight + 18);

    cards = secondary.map((block, index) => {
      const heightBase = estimateBlockHeight(block.body, font, cardWidth - 28, lineHeight);
      const columnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      const height = Math.max(154, 96 + heightBase + (block.kind === 'quote' ? 20 : 0));
      const layout = {
        id: block.id,
        title: block.title,
        body: block.body,
        priority: block.score,
        kind: block.kind,
        x: outer + columnIndex * (cardWidth + gutter),
        y: columnHeights[columnIndex],
        width: cardWidth,
        height,
      };
      columnHeights[columnIndex] += height + gutter;
      return layout;
    });

    boardHeight = Math.max(...columnHeights, featureHeight + 280) + outer;
  }

  $effect(() => {
    wrapperWidth;
    surface;
    urgency;
    density;
    recirculationBias;
    recompute();
  });
</script>

<div class="living-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="toggle-group">
      {#each (['desktop', 'tablet', 'mobile'] as const) as mode}
        <button class:on={surface === mode} onclick={() => (surface = mode)}>{mode}</button>
      {/each}
    </div>
    <div class="ctrl">
      <label>Urgency <span>{urgency}</span></label>
      <input type="range" min="0" max="100" bind:value={urgency} />
    </div>
    <div class="ctrl">
      <label>Density <span>{density}</span></label>
      <input type="range" min="0" max="100" bind:value={density} />
    </div>
    <div class="ctrl">
      <label>Recirculation bias <span>{recirculationBias}</span></label>
      <input type="range" min="0" max="100" bind:value={recirculationBias} />
    </div>
    <button class="toggle-btn" class:on={showGuides} onclick={() => (showGuides = !showGuides)}>Guides</button>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{cards.length + 1} active modules</span>
    <span class="stat-pill">{featureLines.length} feature lines</span>
    <span class="stat-pill">{surface} surface</span>
    <span class="stat-pill">priority-driven repack</span>
  </div>

  <div class="doc-board" style={`min-height:${boardHeight}px;`}>
    <div class="board-header">
      <span>LIVE DESK</span>
      <span>Surface: {surface}</span>
      <span>Predictive composition</span>
    </div>

    <section class="feature-card" style={`height:${featureHeight}px;`}>
      <div class="feature-top">
        <span class="eyebrow">Adaptive lead</span>
        <span class="badge">Priority maximized</span>
      </div>
      <h3>Programmable layout changes the shape of products</h3>
      <p class="feature-summary">
        The leading story claims the broadest measured surface, then the remaining modules negotiate
        for the leftover space according to urgency, density, and recirculation value.
      </p>

      {#if showGuides}
        {#each featureLines as line}
          <div class="guide" style={`left:${line.x}px;top:${line.y + 20}px;width:${line.width}px;`}></div>
        {/each}
      {/if}

      {#each featureLines as line}
        <div class="feature-line" style={`left:${line.x}px;top:${line.y}px;`}>
          {line.text}
        </div>
      {/each}
    </section>

    {#each cards as card}
      <article class={`module kind-${card.kind}`} style={`left:${card.x}px;top:${card.y}px;width:${card.width}px;height:${card.height}px;`}>
        <div class="module-head">
          <span>{card.kind}</span>
          <span class="module-score">{card.priority}</span>
        </div>
        <h4>{card.title}</h4>
        <p>{card.body}</p>
      </article>
    {/each}
  </div>
</div>

<style>
  .living-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 90px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }
  .toggle-group { display: flex; gap: 4px; }
  .toggle-group button, .toggle-btn {
    padding: 7px 11px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); cursor: pointer;
    font-size: 0.75rem; font-weight: 600; font-family: var(--font-body);
    text-transform: capitalize; transition: all var(--transition-fast);
  }
  .toggle-group button.on, .toggle-btn.on {
    background: var(--accent); color: #fff; border-color: var(--accent);
  }
  .stats-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.74rem; color: var(--text-muted);
    padding: 4px 10px; border-radius: 999px; background: var(--bg-card);
    border: 1px solid var(--border);
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .doc-board {
    position: relative; overflow: hidden; border-radius: var(--radius-lg);
    border: 1px solid var(--border); background:
      linear-gradient(180deg, rgba(124, 108, 240, 0.08), transparent 24%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.02), transparent 50%),
      var(--bg-secondary);
  }
  .board-header {
    display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    padding: 18px 24px 0; font-size: 0.66rem; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--text-muted); font-weight: 700;
  }
  .feature-card {
    position: relative; margin: 18px 24px 0; border-radius: var(--radius-lg);
    border: 1px solid var(--border-accent); background:
      linear-gradient(135deg, rgba(124, 108, 240, 0.16), rgba(124, 108, 240, 0.04)),
      var(--bg-card);
    overflow: hidden;
  }
  .feature-top {
    display: flex; justify-content: space-between; gap: 12px;
    padding: 20px 24px 0; align-items: center;
  }
  .eyebrow, .badge {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .eyebrow { color: var(--accent); }
  .badge {
    color: var(--text-secondary); border: 1px solid var(--border); padding: 3px 8px;
    border-radius: 999px; background: rgba(255, 255, 255, 0.03);
  }
  .feature-card h3 {
    padding: 10px 24px 0; font-size: clamp(1.2rem, 2vw, 1.7rem);
    line-height: 1.05; letter-spacing: -0.03em;
  }
  .feature-summary {
    padding: 10px 24px 0; max-width: 760px; font-size: 0.9rem;
    line-height: 1.55; color: var(--text-secondary);
  }
  .feature-line {
    position: absolute; font-size: 0.95rem; line-height: 26px;
    color: var(--text-primary); white-space: nowrap;
  }
  .guide {
    position: absolute; height: 1px; border-bottom: 1px dashed rgba(124, 108, 240, 0.45);
  }

  .module {
    position: absolute; padding: 16px; border-radius: var(--radius-md);
    border: 1px solid var(--border); background: var(--bg-card);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
  }
  .module-head {
    display: flex; justify-content: space-between; gap: 8px; margin-bottom: 10px;
    font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--text-muted); font-weight: 700;
  }
  .module-score {
    color: var(--accent); font-family: var(--font-mono);
  }
  .module h4 {
    font-size: 0.95rem; line-height: 1.2; margin-bottom: 8px;
  }
  .module p {
    font-size: 0.82rem; line-height: 1.55; color: var(--text-secondary);
  }
  .kind-quote {
    background: linear-gradient(135deg, rgba(62, 207, 142, 0.12), transparent 70%), var(--bg-card);
  }
  .kind-caption {
    background: linear-gradient(135deg, rgba(245, 166, 35, 0.12), transparent 70%), var(--bg-card);
  }

  @media (max-width: 720px) {
    .feature-top { flex-direction: column; align-items: flex-start; }
  }

  @media (max-width: 600px) {
    .ctrl { min-width: 70px; }
    .controls-bar { gap: var(--space-sm); }
  }
</style>
