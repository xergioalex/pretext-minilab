<script lang="ts">
  import { buildFont, layoutWithLines, prepareWithSegments } from '../../lib/pretext';
  import { comicDialogue } from '../../lib/advanced-demos/fixtures';

  interface Bubble {
    text: string;
    lines: Array<{ text: string; width: number }>;
    width: number;
    height: number;
    x: number;
    y: number;
    speakerX: number;
    speakerY: number;
  }

  let dramatic = $state(52);
  let showTails = $state(true);
  let panelTightness = $state(68);
  let bubbles = $state<Bubble[]>([]);

  function recompute() {
    const maxWidths = [240, 220, 210].map((base) => base - panelTightness * 0.7);
    const fontSize = Math.round(18 + dramatic * 0.05);
    const font = buildFont(fontSize, 'Inter, sans-serif');
    const lineHeight = Math.round(fontSize * 1.28);
    const anchors = [
      { x: 130, y: 290 },
      { x: 420, y: 272 },
      { x: 700, y: 292 },
    ];

    bubbles = comicDialogue.map((text, index) => {
      const prepared = prepareWithSegments(text, font);
      const result = layoutWithLines(prepared, maxWidths[index], lineHeight);
      const widest = Math.max(...result.lines.map((line) => line.width));
      return {
        text,
        lines: result.lines.map((line) => ({ text: line.text, width: line.width })),
        width: widest + 44,
        height: result.lines.length * lineHeight + 34,
        x: anchors[index].x - (widest + 44) / 2,
        y: 56 + index * 12,
        speakerX: anchors[index].x,
        speakerY: anchors[index].y,
      };
    });
  }

  $effect(() => {
    dramatic;
    showTails;
    panelTightness;
    recompute();
  });
</script>

<div class="comic-demo">
  <div class="controls-bar">
    <div class="ctrl">
      <label>Dramatic emphasis <span>{dramatic}%</span></label>
      <input type="range" min="0" max="100" bind:value={dramatic} />
    </div>
    <div class="ctrl">
      <label>Panel tightness <span>{panelTightness}%</span></label>
      <input type="range" min="20" max="90" bind:value={panelTightness} />
    </div>
    <button class="toggle-btn" class:on={showTails} onclick={() => (showTails = !showTails)}>Bubble tails</button>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{bubbles.length} balloons</span>
    <span class="stat-pill">panel-aware wrapping</span>
    <span class="stat-pill">measured before drawing</span>
  </div>

  <div class="comic-stage">
    {#each [0, 1, 2] as index}
      <div class="panel" style={`left:${index * 33.333}%;`}>
        <div class="character char-a"></div>
        <div class="character char-b"></div>
      </div>
    {/each}

    {#each bubbles as bubble, index}
      <div class="bubble" style={`left:${bubble.x}px;top:${bubble.y}px;width:${bubble.width}px;height:${bubble.height}px;`}>
        {#each bubble.lines as line, lineIndex}
          <div class="bubble-line" style={`top:${18 + lineIndex * 27}px;`}>
            {line.text}
          </div>
        {/each}
      </div>

      {#if showTails}
        <svg class="tail" style={`left:${bubble.x + bubble.width / 2 - 24}px;top:${bubble.y + bubble.height - 2}px;`} width="48" height="110" viewBox="0 0 48 110">
          <path d={`M24 0 C 30 34, ${bubble.speakerX > bubble.x + bubble.width / 2 ? 36 : 12} 62, 24 94`} />
        </svg>
      {/if}
    {/each}
  </div>
</div>

<style>
  .comic-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 150px; }
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

  .comic-stage {
    position: relative; min-height: 390px; overflow: hidden; border-radius: var(--radius-lg);
    border: 1px solid var(--border); background: #f5efe6;
  }
  .panel {
    position: absolute; top: 0; bottom: 0; width: 33.333%;
    border-right: 2px solid rgba(27, 24, 31, 0.08);
    background: linear-gradient(180deg, rgba(255,255,255,0.28), transparent 60%);
  }
  .character {
    position: absolute; bottom: 34px; width: 56px; height: 120px; border-radius: 28px;
    background: linear-gradient(180deg, #7c6cf0, #5b4cd4); filter: drop-shadow(0 8px 10px rgba(0,0,0,0.14));
  }
  .char-a { left: 90px; }
  .char-b { right: 78px; background: linear-gradient(180deg, #f5a623, #ef7a1a); }
  .bubble {
    position: absolute; border-radius: 999px; border: 3px solid #18151b;
    background: #fff; box-shadow: 0 12px 24px rgba(0,0,0,0.1);
  }
  .bubble-line {
    position: absolute; left: 22px; right: 22px; text-align: center;
    font-size: 18px; line-height: 24px; font-weight: 700; color: #161319;
  }
  .tail {
    position: absolute; overflow: visible;
  }
  .tail path {
    fill: none; stroke: #18151b; stroke-width: 3; stroke-linecap: round;
  }
</style>
