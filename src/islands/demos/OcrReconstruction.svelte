<script lang="ts">
  import { buildFont } from '../../lib/pretext';
  import { flowTextThroughRegions } from '../../lib/advanced-demos/layout';
  import { ocrBlocks } from '../../lib/advanced-demos/fixtures';

  let reconstruction = $state<'split' | 'clean'>('split');
  let showOrder = $state(true);
  let density = $state(62);

  const headline = ocrBlocks.find((block) => block.role === 'headline')!;
  const caption = ocrBlocks.find((block) => block.role === 'caption')!;
  const note = ocrBlocks.find((block) => block.role === 'note')!;
  const bodyText = ocrBlocks
    .filter((block) => block.role === 'body')
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((block) => block.text)
    .join(' ');

  let lines = $state<Array<{ text: string; x: number; y: number; regionId: string }>>([]);

  function recompute() {
    const bodyWidth = reconstruction === 'clean' ? 270 : 220;
    const lineHeight = 24;
    const font = buildFont(15);
    const flowed = flowTextThroughRegions(bodyText, font, lineHeight, [
      {
        id: 'col-0',
        x: 390,
        y: 148,
        height: 210,
        widthAtY: () => bodyWidth,
      },
      {
        id: 'col-1',
        x: 390 + bodyWidth + 26,
        y: 148,
        height: 210,
        widthAtY: () => bodyWidth,
      },
    ]);
    lines = flowed.lines.map((line) => ({
      text: line.text,
      x: line.x,
      y: line.y,
      regionId: line.regionId,
    }));
  }

  $effect(() => {
    reconstruction;
    showOrder;
    density;
    recompute();
  });
</script>

<div class="ocr-demo">
  <div class="controls-bar">
    <div class="toggle-group">
      {#each (['split', 'clean'] as const) as mode}
        <button class:on={reconstruction === mode} onclick={() => (reconstruction = mode)}>{mode}</button>
      {/each}
    </div>
    <div class="ctrl">
      <label>Density <span>{density}%</span></label>
      <input type="range" min="30" max="90" bind:value={density} />
    </div>
    <button class="toggle-btn" class:on={showOrder} onclick={() => (showOrder = !showOrder)}>Reading order</button>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{ocrBlocks.length} OCR fragments</span>
    <span class="stat-pill">{lines.length} reconstructed lines</span>
    <span class="stat-pill">from raw boxes to article flow</span>
  </div>

  <div class="ocr-stage">
    <section class="raw-column">
      <h3>Raw OCR capture</h3>
      <div class="raw-sheet">
        {#each ocrBlocks as block, index}
          <div
            class={`raw-box role-${block.role}`}
            style={`left:${block.x * 0.58}px;top:${block.y * 0.72}px;width:${block.width * 0.58}px;`}
          >
            {#if showOrder}
              <span class="order-chip">{index + 1}</span>
            {/if}
            {block.text}
          </div>
        {/each}
      </div>
    </section>

    <section class="clean-column">
      <h3>Reconstructed document</h3>
      <div class="clean-sheet">
        <div class="clean-headline">{headline.text}</div>
        <div class="clean-caption">{caption.text}</div>
        <div class="clean-note">{note.text}</div>

        {#each lines as line}
          <div class="clean-line" style={`left:${line.x - 390 + 24}px;top:${line.y - 148 + 136}px;`}>
            {line.text}
          </div>
        {/each}
      </div>
    </section>
  </div>
</div>

<style>
  .ocr-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .toggle-group { display: flex; gap: 4px; }
  .toggle-group button, .toggle-btn {
    padding: 7px 11px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); cursor: pointer;
    font-size: 0.74rem; font-weight: 600; font-family: var(--font-body); text-transform: capitalize;
  }
  .toggle-group button.on, .toggle-btn.on { background: var(--accent); color: #fff; border-color: var(--accent); }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }
  .stats-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.74rem; color: var(--text-muted);
    padding: 4px 10px; border-radius: 999px; background: var(--bg-card);
    border: 1px solid var(--border);
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }
  .ocr-stage { display: grid; grid-template-columns: 1fr 1.2fr; gap: var(--space-md); }
  .raw-column, .clean-column {
    border: 1px solid var(--border); border-radius: var(--radius-lg);
    background: var(--bg-secondary); padding: var(--space-lg);
  }
  .raw-column h3, .clean-column h3 { margin-bottom: 12px; font-size: 0.95rem; }
  .raw-sheet, .clean-sheet {
    position: relative; min-height: 420px; border-radius: var(--radius-md);
    border: 1px solid var(--border); background: var(--bg-card); overflow: hidden;
  }
  .raw-box {
    position: absolute; padding: 10px 12px; font-size: 0.75rem; line-height: 1.45;
    border-radius: 10px; border: 1px dashed rgba(255,255,255,0.18); color: var(--text-secondary);
  }
  .role-headline { background: rgba(124,108,240,0.14); color: var(--text-primary); }
  .role-body { background: rgba(255,255,255,0.03); }
  .role-caption { background: rgba(62,207,142,0.12); }
  .role-note { background: rgba(245,166,35,0.12); }
  .order-chip {
    position: absolute; top: -9px; left: -9px; width: 22px; height: 22px; border-radius: 50%;
    display: grid; place-items: center; background: var(--accent); color: #fff; font-size: 0.68rem; font-weight: 700;
  }
  .clean-sheet { background: #f7f3eb; color: #181513; }
  .clean-headline {
    position: absolute; left: 24px; top: 24px; right: 24px;
    font-size: 1.5rem; line-height: 1.05; font-weight: 800; letter-spacing: -0.03em;
  }
  .clean-caption {
    position: absolute; left: 24px; top: 84px; width: 210px;
    font-size: 0.76rem; line-height: 1.45; color: #5f5b54;
  }
  .clean-note {
    position: absolute; right: 24px; top: 84px; width: 160px;
    font-size: 0.76rem; line-height: 1.45; color: #7a4d0f;
  }
  .clean-line {
    position: absolute; white-space: nowrap;
    font-size: 15px; line-height: 24px; color: #191612;
    font-family: Georgia, 'Times New Roman', serif;
  }

  @media (max-width: 900px) {
    .ocr-stage { grid-template-columns: 1fr; }
  }
</style>
