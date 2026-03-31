<script lang="ts">
  import { buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { clamp, flowTextThroughRegions, lerp } from '../../lib/advanced-demos/layout';
  import { onMount, untrack } from 'svelte';

  let wrapperWidth = $state(0);
  let gravity = $state(68);
  let ring = $state(42);
  let showRings = $state(true);
  let autoOrbit = $state(true);
  let singularityX = $state(0.5);
  let singularityY = $state(0.48);
  let frame = 0;

  let lines = $state<Array<{ text: string; x: number; y: number; width: number; hue: number }>>([]);

  const text = `${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.long}`;

  function recompute() {
    const width = Math.max(320, Math.min(wrapperWidth || 900, 980));
    const height = 440;
    const margin = 28;
    const usableWidth = width - margin * 2;
    const font = buildFont(15);
    const lineHeight = 24;

    const flowed = flowTextThroughRegions(text, font, lineHeight, [
      {
        id: 'black-hole',
        x: margin,
        y: 28,
        height,
        widthAtY: (localY) => {
          const yNorm = localY / height;
          const dy = yNorm - singularityY;
          const impact = Math.exp(-(dy * dy) / 0.02);
          return clamp(usableWidth - impact * gravity * 6.4, usableWidth * 0.28, usableWidth);
        },
        xOffsetAtY: (localY) => {
          const yNorm = localY / height;
          const dy = yNorm - singularityY;
          const lensing = Math.sin(dy * Math.PI * 3) * ring * 1.4;
          const drift = (singularityX - 0.5) * usableWidth * 0.55;
          return clamp(usableWidth * 0.16 + lensing + drift, -usableWidth * 0.1, usableWidth * 0.4);
        },
      },
    ]);

    lines = flowed.lines.map((line) => {
      const lineMid = (line.y - 28) / height;
      const dy = Math.abs(lineMid - singularityY);
      const hue = lerp(272, 214, clamp(1 - dy * 2.8, 0, 1));
      return { text: line.text, x: line.x, y: line.y, width: line.width, hue };
    });
  }

  function animate() {
    if (autoOrbit) {
      singularityX = 0.5 + Math.sin(frame * 0.006) * 0.12;
      singularityY = 0.48 + Math.cos(frame * 0.004) * 0.08;
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
    wrapperWidth; gravity; ring; showRings;
    untrack(() => recompute());
  });
</script>

<div class="hole-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Gravity <span>{gravity}</span></label>
      <input type="range" min="20" max="100" bind:value={gravity} />
    </div>
    <div class="ctrl">
      <label>Ring shear <span>{ring}</span></label>
      <input type="range" min="10" max="90" bind:value={ring} />
    </div>
    <button class="toggle-btn" class:on={showRings} onclick={() => (showRings = !showRings)}>Accretion rings</button>
    <button class="toggle-btn" class:on={autoOrbit} onclick={() => (autoOrbit = !autoOrbit)}>Auto orbit</button>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{lines.length} compressed lines</span>
    <span class="stat-pill">radial width field</span>
    <span class="stat-pill">lensing x-offsets</span>
  </div>

  <div class="hole-stage">
    {#if showRings}
      <div class="ring ring-a" style={`left:${singularityX * 100}%;top:${singularityY * 100}%;`}></div>
      <div class="ring ring-b" style={`left:${singularityX * 100}%;top:${singularityY * 100}%;`}></div>
      <div class="ring ring-c" style={`left:${singularityX * 100}%;top:${singularityY * 100}%;`}></div>
    {/if}

    <div class="singularity" style={`left:${singularityX * 100}%;top:${singularityY * 100}%;`}></div>

    {#each lines as line}
      <div class="hole-line" style={`left:${line.x}px;top:${line.y}px;--line-hue:${line.hue};`}>
        {line.text}
      </div>
    {/each}
  </div>
</div>

<style>
  .hole-demo { display: flex; flex-direction: column; gap: var(--space-md); }
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

  .hole-stage {
    position: relative; min-height: 490px; overflow: hidden; border-radius: var(--radius-lg);
    border: 1px solid var(--border); background:
      radial-gradient(circle at 50% 50%, rgba(124,108,240,0.14), transparent 18%),
      radial-gradient(circle at 50% 50%, rgba(62,207,142,0.08), transparent 34%),
      linear-gradient(180deg, #040507, #090b11 40%, #05060a);
  }

  :global([data-theme="light"]) .hole-stage {
    background:
      radial-gradient(circle at 50% 50%, rgba(124,108,240,0.1), transparent 18%),
      radial-gradient(circle at 50% 50%, rgba(62,207,142,0.06), transparent 34%),
      linear-gradient(180deg, #e8e6f0, #dddbe8 40%, #e0dee9);
  }
  :global([data-theme="light"]) .hole-line {
    text-shadow: 0 0 12px rgba(124,108,240,0.1);
  }
  :global([data-theme="light"]) .singularity {
    background: radial-gradient(circle, rgba(80,60,120,0.7), rgba(80,60,120,0.3) 60%, transparent 75%);
    box-shadow: 0 0 40px rgba(124,108,240,0.15);
  }
  :global([data-theme="light"]) .ring-a { border-color: rgba(124,108,240,0.25); }
  :global([data-theme="light"]) .ring-b { border-color: rgba(62,207,142,0.2); }
  :global([data-theme="light"]) .ring-c { border-color: rgba(0,0,0,0.1); }

  @media (max-width: 600px) {
    .ctrl { min-width: 70px; }
    .controls-bar { gap: var(--space-sm); }
  }

  .ring {
    position: absolute; border-radius: 50%; transform: translate(-50%, -50%);
    border: 1px solid rgba(124,108,240,0.18);
  }
  .ring-a { width: 180px; height: 64px; }
  .ring-b { width: 250px; height: 88px; border-color: rgba(62,207,142,0.15); }
  .ring-c { width: 320px; height: 110px; border-color: rgba(255,255,255,0.1); }
  .singularity {
    position: absolute; width: 34px; height: 34px; transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0,0,0,0.98), rgba(0,0,0,0.5) 60%, transparent 75%);
    box-shadow: 0 0 40px rgba(124,108,240,0.26);
  }
  .hole-line {
    position: absolute; white-space: nowrap; font-size: 15px; line-height: 24px;
    color: hsl(var(--line-hue) 92% 75%);
    text-shadow: 0 0 18px rgba(124,108,240,0.16);
  }
  :global([data-theme="light"]) .hole-line {
    color: hsl(var(--line-hue) 70% 35%);
  }
</style>
