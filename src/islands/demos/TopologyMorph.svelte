<script lang="ts">
  import { buildFont } from '../../lib/pretext';
  import { clamp, flowTextThroughRegions, lerp } from '../../lib/advanced-demos/layout';
  import { topologyText } from '../../lib/advanced-demos/fixtures';
  import { onMount } from 'svelte';

  type TopologyId = 'columns' | 'stair' | 'canyon' | 'ribbon';

  const topologies: TopologyId[] = ['columns', 'stair', 'canyon', 'ribbon'];

  let wrapperWidth = $state(0);
  let fromTopology = $state<TopologyId>('columns');
  let toTopology = $state<TopologyId>('ribbon');
  let progress = $state(0.35);
  let autoplay = $state(true);
  let showGuides = $state(true);
  let frame = 0;
  let lines = $state<Array<{ text: string; x: number; y: number; width: number }>>([]);

  function topologyGeometry(kind: TopologyId, yNorm: number, usableWidth: number) {
    switch (kind) {
      case 'columns':
        return { xOffset: yNorm < 0.5 ? 0 : usableWidth * 0.32, width: usableWidth * 0.62 };
      case 'stair':
        return {
          xOffset: usableWidth * 0.06 + Math.floor(yNorm * 5) * usableWidth * 0.075,
          width: usableWidth * (0.86 - Math.floor(yNorm * 5) * 0.08),
        };
      case 'canyon':
        return {
          xOffset: usableWidth * (0.08 + Math.sin(yNorm * Math.PI) * 0.12),
          width: usableWidth * (0.82 - Math.sin(yNorm * Math.PI) * 0.28),
        };
      case 'ribbon':
        return {
          xOffset: usableWidth * (0.14 + Math.sin(yNorm * Math.PI * 2) * 0.16),
          width: usableWidth * (0.56 + Math.cos(yNorm * Math.PI * 2) * 0.16),
        };
    }
  }

  function recompute() {
    const width = Math.max(540, Math.min(wrapperWidth || 880, 940));
    const height = 420;
    const margin = 32;
    const usableWidth = width - margin * 2;
    const font = buildFont(15);
    const lineHeight = 24;

    const flowed = flowTextThroughRegions(topologyText, font, lineHeight, [
      {
        id: 'morph',
        x: margin,
        y: 26,
        height,
        widthAtY: (localY) => {
          const yNorm = localY / height;
          const from = topologyGeometry(fromTopology, yNorm, usableWidth);
          const to = topologyGeometry(toTopology, yNorm, usableWidth);
          return clamp(lerp(from.width, to.width, progress), usableWidth * 0.26, usableWidth);
        },
        xOffsetAtY: (localY) => {
          const yNorm = localY / height;
          const from = topologyGeometry(fromTopology, yNorm, usableWidth);
          const to = topologyGeometry(toTopology, yNorm, usableWidth);
          return lerp(from.xOffset, to.xOffset, progress);
        },
      },
    ]);

    lines = flowed.lines.map((line) => ({
      text: line.text,
      x: line.x,
      y: line.y,
      width: line.width,
    }));
  }

  function animate() {
    if (autoplay) {
      progress += 0.004;
      if (progress >= 1) {
        progress = 0;
        fromTopology = toTopology;
        toTopology = topologies[(topologies.indexOf(toTopology) + 1) % topologies.length];
      }
      recompute();
    }
    frame = requestAnimationFrame(animate);
  }

  onMount(() => {
    recompute();
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    wrapperWidth;
    fromTopology;
    toTopology;
    progress;
    autoplay;
    showGuides;
    recompute();
  });
</script>

<div class="morph-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="toggle-group">
      {#each topologies as option}
        <button class:on={fromTopology === option} onclick={() => (fromTopology = option)}>{option}</button>
      {/each}
    </div>
    <div class="toggle-group">
      {#each topologies as option}
        <button class:on={toTopology === option} onclick={() => (toTopology = option)}>{option}</button>
      {/each}
    </div>
    <div class="ctrl">
      <label>Morph <span>{Math.round(progress * 100)}%</span></label>
      <input type="range" min="0" max="1" step="0.01" bind:value={progress} />
    </div>
    <button class="toggle-btn" class:on={autoplay} onclick={() => (autoplay = !autoplay)}>Autoplay</button>
    <button class="toggle-btn" class:on={showGuides} onclick={() => (showGuides = !showGuides)}>Guides</button>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{fromTopology}</span>
    <span class="stat-pill">to {toTopology}</span>
    <span class="stat-pill">{lines.length} lines</span>
  </div>

  <div class="morph-stage">
    {#if showGuides}
      {#each lines as line}
        <div class="guide" style={`left:${line.x}px;top:${line.y + 12}px;width:${line.width}px;`}></div>
      {/each}
    {/if}

    {#each lines as line}
      <div class="morph-line" style={`left:${line.x}px;top:${line.y}px;`}>
        {line.text}
      </div>
    {/each}
  </div>
</div>

<style>
  .morph-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .toggle-group { display: flex; gap: 4px; flex-wrap: wrap; }
  .toggle-group button, .toggle-btn {
    padding: 7px 11px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); cursor: pointer;
    font-size: 0.74rem; font-weight: 600; font-family: var(--font-body);
    text-transform: capitalize;
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
  .morph-stage {
    position: relative; min-height: 470px; overflow: hidden; border-radius: var(--radius-lg);
    border: 1px solid var(--border); background:
      linear-gradient(180deg, rgba(124,108,240,0.1), transparent 16%),
      radial-gradient(circle at 30% 20%, rgba(124,108,240,0.14), transparent 24%),
      var(--bg-secondary);
  }
  .guide {
    position: absolute; height: 1px; border-bottom: 1px dashed rgba(124,108,240,0.36);
  }
  .morph-line {
    position: absolute; white-space: nowrap;
    font-size: 15px; line-height: 24px; color: var(--text-primary);
  }
</style>
