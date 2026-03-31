<script lang="ts">
  import { buildFont, layoutWithLines, prepareWithSegments } from '../../lib/pretext';
  import { subtitleCues } from '../../lib/advanced-demos/fixtures';
  import { onMount } from 'svelte';

  let currentTime = $state(0);
  let playing = $state(false);
  let safeWidth = $state(78);
  let bottomOffset = $state(12);
  let emphasizeSpeaker = $state(true);
  let frameHandle = 0;

  let activeCue = $derived(
    subtitleCues.find((cue) => currentTime >= cue.start && currentTime < cue.end) || subtitleCues[subtitleCues.length - 1]
  );

  let cueLines = $derived.by(() => {
    if (!activeCue) return [];
    const maxWidth = 960 * (safeWidth / 100) - 140;
    const font = buildFont(34, 'Inter, sans-serif');
    const prepared = prepareWithSegments(activeCue.text, font);
    return layoutWithLines(prepared, maxWidth, 42).lines.slice(0, 2);
  });

  let readingSpeed = $derived(activeCue ? Math.round(activeCue.text.length / Math.max(1, activeCue.end - activeCue.start)) : 0);

  function togglePlayback() {
    playing = !playing;
  }

  function renderLine(line: string, emphasis: string[]) {
    let html = line;
    for (const word of emphasis) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
    }
    return html;
  }

  function tick() {
    if (!playing) return;
    currentTime += 0.016;
    if (currentTime > subtitleCues[subtitleCues.length - 1].end) {
      currentTime = 0;
    }
    frameHandle = requestAnimationFrame(tick);
  }

  onMount(() => () => cancelAnimationFrame(frameHandle));

  $effect(() => {
    if (playing) {
      cancelAnimationFrame(frameHandle);
      frameHandle = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(frameHandle);
    }
  });
</script>

<div class="subtitle-demo">
  <div class="controls-bar">
    <button class="play-btn" class:active={playing} onclick={togglePlayback}>
      {playing ? 'Pause playback' : 'Play sequence'}
    </button>
    <div class="ctrl wide">
      <label>Timeline <span>{currentTime.toFixed(1)}s</span></label>
      <input type="range" min="0" max={subtitleCues[subtitleCues.length - 1].end} step="0.1" bind:value={currentTime} />
    </div>
    <div class="ctrl">
      <label>Safe width <span>{safeWidth}%</span></label>
      <input type="range" min="55" max="92" bind:value={safeWidth} />
    </div>
    <div class="ctrl">
      <label>Bottom offset <span>{bottomOffset}%</span></label>
      <input type="range" min="6" max="22" bind:value={bottomOffset} />
    </div>
    <button class="toggle-btn" class:on={emphasizeSpeaker} onclick={() => (emphasizeSpeaker = !emphasizeSpeaker)}>Speaker chip</button>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{activeCue.speaker}</span>
    <span class="stat-pill">{cueLines.length} subtitle lines</span>
    <span class="stat-pill">{readingSpeed} chars/sec</span>
    <span class="stat-pill">{activeCue.end - activeCue.start}s cue duration</span>
  </div>

  <div class="video-stage">
    <div class="shot-meta">
      <span>SCENE 04</span>
      <span>Subtitle compositor</span>
      <span>Safe area aware</span>
    </div>

    <div
      class="safe-zone"
      style={`left:${(100 - safeWidth) / 2}%;width:${safeWidth}%;bottom:${bottomOffset}%;`}
    >
      {#if emphasizeSpeaker}
        <div class="speaker-chip">{activeCue.speaker}</div>
      {/if}
      <div class="subtitle-block">
        {#each cueLines as line}
          <div class="subtitle-line">
            {@html renderLine(line.text, activeCue.emphasis)}
          </div>
        {/each}
      </div>
    </div>

    <div class="scanline scanline-top"></div>
    <div class="scanline scanline-bottom"></div>
  </div>
</div>

<style>
  .subtitle-demo { display: flex; flex-direction: column; gap: var(--space-md); }
  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 120px; }
  .ctrl.wide { min-width: 220px; flex: 1; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }
  .play-btn, .toggle-btn {
    padding: 8px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); cursor: pointer;
    font-size: 0.76rem; font-weight: 600; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .play-btn.active, .toggle-btn.on {
    background: var(--accent); color: #fff; border-color: var(--accent);
  }
  .stats-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.74rem; color: var(--text-muted);
    padding: 4px 10px; border-radius: 999px; background: var(--bg-card);
    border: 1px solid var(--border);
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .video-stage {
    position: relative; aspect-ratio: 16 / 9; overflow: hidden;
    border-radius: var(--radius-lg); border: 1px solid var(--border);
    background:
      radial-gradient(circle at 20% 30%, rgba(124, 108, 240, 0.18), transparent 26%),
      radial-gradient(circle at 78% 22%, rgba(62, 207, 142, 0.12), transparent 20%),
      linear-gradient(180deg, #090a0e 0%, #0d1018 45%, #07080c 100%);
  }
  .shot-meta {
    display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    padding: 18px 22px; font-size: 0.68rem; letter-spacing: 0.12em;
    color: #9ba0b2; text-transform: uppercase; font-weight: 700;
  }
  .safe-zone {
    position: absolute; min-height: 120px; border: 1px dashed rgba(255,255,255,0.18);
    border-radius: 18px; padding: 18px 22px; display: flex; flex-direction: column; gap: 10px;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.45));
  }
  .speaker-chip {
    align-self: center; padding: 4px 10px; border-radius: 999px;
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #0d0f16; background: #f8f4e8;
  }
  .subtitle-block {
    display: flex; flex-direction: column; gap: 3px; align-items: center;
  }
  .subtitle-line {
    text-align: center; color: #fff; font-size: clamp(1.1rem, 2.6vw, 2.1rem);
    font-weight: 700; line-height: 1.15; text-shadow: 0 3px 18px rgba(0,0,0,0.6);
  }
  .subtitle-line :global(mark) {
    background: rgba(124, 108, 240, 0.26); color: #fff; padding: 0 0.18em; border-radius: 0.3em;
  }
  .scanline {
    position: absolute; left: 0; right: 0; height: 1px; background: rgba(255,255,255,0.08);
  }
  .scanline-top { top: 74px; }
  .scanline-bottom { bottom: 108px; }

  @media (max-width: 720px) {
    .safe-zone { min-height: 100px; }
  }
</style>
