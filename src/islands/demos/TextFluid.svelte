<script lang="ts">
  import { buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { clamp, flowTextThroughRegions, lerp, mapRange } from '../../lib/advanced-demos/layout';
  import { onMount } from 'svelte';

  interface Vortex {
    x: number;
    y: number;
    radius: number;
    strength: number;
    drift: number;
  }

  const fluidText = `${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.editorial}`;

  let wrapperWidth = $state(0);
  let energy = $state(52);
  let showField = $state(true);
  let pinCursor = $state(false);
  let pointer = $state({ x: 0.5, y: 0.45 });
  let vortices = $state<Vortex[]>([
    { x: 0.26, y: 0.22, radius: 0.2, strength: 0.9, drift: 0.2 },
    { x: 0.74, y: 0.62, radius: 0.24, strength: -0.75, drift: 0.45 },
  ]);

  let lines = $state<Array<{ text: string; x: number; y: number; width: number; intensity: number }>>([]);
  let frame = 0;

  function fieldAt(xNorm: number, yNorm: number) {
    let vx = 0;
    let vy = 0;
    for (const vortex of vortices) {
      const dx = xNorm - vortex.x;
      const dy = yNorm - vortex.y;
      const dist = Math.max(0.04, Math.hypot(dx, dy));
      if (dist < vortex.radius) {
        const pull = (1 - dist / vortex.radius) * vortex.strength;
        vx += (-dy / dist) * pull;
        vy += (dx / dist) * pull;
      }
    }

    const px = pointer.x - xNorm;
    const py = pointer.y - yNorm;
    const mouseDist = Math.max(0.08, Math.hypot(px, py));
    vx += (px / mouseDist) * 0.32;
    vy += (py / mouseDist) * 0.18;

    return { vx, vy, magnitude: Math.hypot(vx, vy) };
  }

  function recompute() {
    const width = Math.max(480, Math.min(wrapperWidth || 880, 940));
    const height = 430;
    const lineHeight = 24;
    const font = buildFont(15);
    const usableWidth = width - 72;
    const margin = 36;

    const regions = [
      {
        id: 'fluid',
        x: margin,
        y: 30,
        height,
        widthAtY: (localY: number) => {
          const yNorm = localY / height;
          const { magnitude } = fieldAt(0.5, yNorm);
          return clamp(usableWidth - magnitude * energy * 140, usableWidth * 0.45, usableWidth);
        },
        xOffsetAtY: (localY: number) => {
          const yNorm = localY / height;
          const field = fieldAt(0.5, yNorm);
          return clamp(field.vx * energy * 48, -usableWidth * 0.22, usableWidth * 0.22) + usableWidth * 0.12;
        },
      },
    ];

    const flowed = flowTextThroughRegions(fluidText, font, lineHeight, regions);
    lines = flowed.lines.map((line) => {
      const yNorm = (line.y - 30) / height;
      const { magnitude } = fieldAt(0.5, yNorm);
      return {
        text: line.text,
        x: line.x,
        y: line.y,
        width: line.width,
        intensity: magnitude,
      };
    });
  }

  function handlePointerMove(event: PointerEvent) {
    if (pinCursor) return;
    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    pointer = {
      x: clamp((event.clientX - rect.left) / rect.width, 0.08, 0.92),
      y: clamp((event.clientY - rect.top) / rect.height, 0.08, 0.92),
    };
    recompute();
  }

  function animate() {
    vortices = vortices.map((vortex, index) => ({
      ...vortex,
      x: 0.5 + Math.sin(frame * 0.008 + vortex.drift + index) * 0.24,
      y: 0.5 + Math.cos(frame * 0.006 + vortex.drift) * 0.2,
    }));
    frame = requestAnimationFrame(animate);
    recompute();
  }

  onMount(() => {
    recompute();
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    wrapperWidth;
    energy;
    showField;
    pinCursor;
    recompute();
  });
</script>

<div class="fluid-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Field energy <span>{energy}</span></label>
      <input type="range" min="20" max="90" bind:value={energy} />
    </div>
    <button class="toggle-btn" class:on={showField} onclick={() => (showField = !showField)}>Field overlay</button>
    <button class="toggle-btn" class:on={pinCursor} onclick={() => (pinCursor = !pinCursor)}>Pin cursor attractor</button>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{lines.length} fluid lines</span>
    <span class="stat-pill">{vortices.length} vortices</span>
    <span class="stat-pill">cursor-coupled field</span>
  </div>

  <div class="fluid-stage" onpointermove={handlePointerMove}>
    {#if showField}
      {#each Array.from({ length: 7 }) as _, row}
        {#each Array.from({ length: 12 }) as _, col}
          {@const sample = fieldAt((col + 0.5) / 12, (row + 0.5) / 7)}
          <div
            class="field-node"
            style={`left:${(col + 0.5) * (100 / 12)}%;top:${(row + 0.5) * (100 / 7)}%;transform:rotate(${Math.atan2(sample.vy, sample.vx) * 57.2958}deg);opacity:${mapRange(sample.magnitude, 0, 1.2, 0.25, 0.9)};`}
          ></div>
        {/each}
      {/each}
    {/if}

    <div class="pointer-marker" style={`left:${pointer.x * 100}%;top:${pointer.y * 100}%;`}></div>

    {#each vortices as vortex}
      <div
        class="vortex"
        style={`left:${vortex.x * 100}%;top:${vortex.y * 100}%;width:${vortex.radius * 420}px;height:${vortex.radius * 420}px;`}
      ></div>
    {/each}

    {#each lines as line}
      <div
        class="fluid-line"
        style={`left:${line.x}px;top:${line.y}px;color:hsl(${lerp(198, 282, clamp(line.intensity, 0, 1))} 85% 76%);`}
      >
        {line.text}
      </div>
    {/each}
  </div>
</div>

<style>
  .fluid-demo { display: flex; flex-direction: column; gap: var(--space-md); }
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

  .fluid-stage {
    position: relative; min-height: 470px; overflow: hidden; border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    background:
      radial-gradient(circle at 25% 25%, rgba(62, 207, 142, 0.12), transparent 24%),
      radial-gradient(circle at 74% 64%, rgba(124, 108, 240, 0.16), transparent 28%),
      linear-gradient(180deg, #070b12, #090d16 40%, #06080e);
  }
  .field-node {
    position: absolute; width: 22px; height: 2px; margin-left: -11px; margin-top: -1px;
    background: linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.8));
    transform-origin: center;
  }
  .pointer-marker {
    position: absolute; width: 14px; height: 14px; margin-left: -7px; margin-top: -7px;
    border-radius: 50%; background: #fff; box-shadow: 0 0 20px rgba(255,255,255,0.4);
  }
  .vortex {
    position: absolute; margin-left: calc(-1 * var(--size, 40px) / 2); margin-top: calc(-1 * var(--size, 40px) / 2);
    transform: translate(-50%, -50%);
    border-radius: 50%; border: 1px solid rgba(124, 108, 240, 0.22);
    background: radial-gradient(circle, rgba(124, 108, 240, 0.1), transparent 65%);
  }
  .fluid-line {
    position: absolute; white-space: nowrap; font-size: 15px; line-height: 24px;
    text-shadow: 0 0 18px rgba(124, 108, 240, 0.14);
  }
</style>
