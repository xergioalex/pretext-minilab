<script lang="ts">
  import { prepareWithSegments, layoutNextLine, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import type { LayoutCursor } from '../../lib/pretext';
  import { onMount } from 'svelte';

  interface SeaLine {
    text: string;
    x: number;
    y: number;
    width: number;
    hue: number;
    foam: number;
    waveShift: number;
  }

  const regattaText = `Across the gulf the measured lines rose and fell like disciplined surf. ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.medium} ${SAMPLE_TEXTS.editorial} ${SAMPLE_TEXTS.long} ${SAMPLE_TEXTS.medium} The vessel did not float above the paragraph; it negotiated with it, cutting a wake through language as if typography itself had become tide, pressure, weather, and route.`;

  let wrapperWidth = $state(0);
  let fontSize = $state(15);
  let swell = $state(60);
  let wake = $state(76);
  let wind = $state(58);
  let showGuides = $state(false);
  let autoPilot = $state(true);

  let phase = 0;
  let frameHandle = 0;
  let boatX = $state(0);
  let boatY = $state(0);
  let boatTilt = $state(0);
  let seaLines: SeaLine[] = $state([]);
  let seaHeight = $state(520);

  const lineHeight = $derived(Math.round(fontSize * 1.62));
  const stageWidth = $derived(Math.max(320, Math.min(wrapperWidth || 920, 980)));

  function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
  function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

  function computeSea() {
    const width = stageWidth;
    const height = 480;
    const margin = 24;
    const usableWidth = width - margin * 2;
    const font = buildFont(fontSize, 'Georgia, Times New Roman, serif');
    const prepared = prepareWithSegments(regattaText, font);
    const result: SeaLine[] = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = 30;
    let safety = 0;

    while (safety < 600 && y < height) {
      safety++;
      const midY = y + lineHeight / 2;
      const yNorm = midY / height;

      // Ocean swell — gentle undulation of line positions
      const swellPrimary = Math.sin(yNorm * Math.PI * 4.2 + phase) * swell * 0.4;
      const swellSecondary = Math.cos(yNorm * Math.PI * 7.4 - phase * 0.68) * swell * 0.12;
      const currentShift = Math.sin(yNorm * Math.PI * 2.3 + phase * 0.42) * wind * 0.12;

      // Wake — subtle line displacement near the boat (NOT a void)
      const dy = midY - boatY;
      const wakeFactor = Math.exp(-((dy * dy) / (1800 + wake * 20)));
      const wakeDisplace = wakeFactor * wake * 0.15;

      // Lines fill the full width — wake only shifts them slightly
      let xStart = margin + Math.max(0, swellPrimary * 0.15 + currentShift * 0.3);
      let availableWidth = usableWidth - Math.abs(swellPrimary + swellSecondary) * 0.3 - Math.abs(currentShift) * 0.2;

      // Near the boat: gently compress width and shift x (not create a gap)
      const dxBoat = (boatX - (margin + usableWidth / 2)) / usableWidth;
      xStart += wakeDisplace * dxBoat * 0.8;
      availableWidth -= wakeDisplace * 0.5;

      xStart = clamp(xStart, margin - 4, margin + usableWidth * 0.15);
      availableWidth = clamp(availableWidth, usableWidth * 0.5, usableWidth);

      const line = layoutNextLine(prepared, cursor, availableWidth);
      if (!line) break;

      const foamIntensity = clamp(wakeFactor * (0.5 + Math.sin(yNorm * 16 + phase * 2.4) * 0.2), 0, 1);

      result.push({
        text: line.text,
        x: xStart,
        y,
        width: line.width,
        hue: lerp(196, 218, clamp(yNorm + wakeFactor * 0.05, 0, 1)),
        foam: foamIntensity,
        waveShift: swellPrimary + swellSecondary + currentShift,
      });

      cursor = line.end;
      y += lineHeight;
    }

    seaLines = result;
    seaHeight = Math.max(520, y + 40);
  }

  function tick() {
    if (!autoPilot) return;
    phase += 0.018 * (0.45 + wind / 85);

    const route = (Math.sin(phase * 0.62) + 1) / 2;
    boatX = lerp(stageWidth * 0.2, stageWidth * 0.8, route);
    boatY = 160 + Math.sin(phase * 1.14) * 60 + Math.cos(phase * 0.56) * 20;
    boatTilt = Math.sin(phase * 1.9) * 6 + (wind - 50) * 0.06;

    computeSea();
    frameHandle = requestAnimationFrame(tick);
  }

  onMount(() => {
    boatX = stageWidth * 0.35;
    boatY = 180;
    computeSea();
    frameHandle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameHandle);
  });

  $effect(() => {
    stageWidth; fontSize; swell; wake; wind;
    if (!autoPilot) computeSea();
  });
</script>

<div class="regatta-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Wind <span>{wind}</span></label>
      <input type="range" min="10" max="100" bind:value={wind} />
    </div>
    <div class="ctrl">
      <label>Swell <span>{swell}px</span></label>
      <input type="range" min="20" max="150" bind:value={swell} />
    </div>
    <div class="ctrl">
      <label>Wake <span>{wake}</span></label>
      <input type="range" min="20" max="120" bind:value={wake} />
    </div>
    <div class="ctrl">
      <label>Font <span>{fontSize}px</span></label>
      <input type="range" min="12" max="19" bind:value={fontSize} />
    </div>
    <button class="toggle-btn" class:on={autoPilot} onclick={() => { autoPilot = !autoPilot; if (autoPilot) tick(); else cancelAnimationFrame(frameHandle); }}>
      {autoPilot ? 'Autopilot on' : 'Autopilot off'}
    </button>
    <button class="toggle-btn" class:on={showGuides} onclick={() => (showGuides = !showGuides)}>
      {showGuides ? 'Guides on' : 'Guides off'}
    </button>
  </div>

  <div class="stats-row">
    <span class="stat-pill accent">{seaLines.length} water lines</span>
    <span class="stat-pill">boat sails on text</span>
    <span class="stat-pill">swell + wake + current</span>
  </div>

  <div class="regatta-stage" style={`height:${seaHeight}px;`}>
    <!-- Sky / horizon -->
    <div class="horizon"></div>
    <div class="sun-glow"></div>

    <!-- Text as water — fills the whole container -->
    {#each seaLines as line, index}
      {#if showGuides}
        <div
          class="line-guide"
          style={`left:${line.x}px;top:${line.y + lineHeight * 0.72}px;width:${line.width}px;opacity:${0.12 + line.foam * 0.18};`}
        ></div>
      {/if}

      {#if line.foam > 0.15 && index % 2 === 0}
        <div
          class="foam-line"
          style={`left:${line.x}px;top:${line.y + lineHeight * 0.84}px;width:${line.width}px;opacity:${line.foam * 0.6};`}
        ></div>
      {/if}

      <div
        class="water-line"
        style={`left:${line.x}px;top:${line.y}px;font-size:${fontSize}px;line-height:${lineHeight}px;color:hsl(${line.hue} 78% ${lerp(60, 78, line.foam)}%);transform:translateX(${line.waveShift * 0.04}px);`}
      >
        {line.text}
      </div>
    {/each}

    <!-- Boat ON TOP of the text water -->
    <div
      class="boat"
      style={`left:${boatX}px;top:${boatY}px;transform:translate(-50%, -50%) rotate(${boatTilt}deg);`}
    >
      <svg width="120" height="88" viewBox="0 0 120 88" aria-label="Sailboat navigating the text sea">
        <defs>
          <linearGradient id="sailGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fff8dd" />
            <stop offset="100%" stop-color="#f1d8a2" />
          </linearGradient>
          <linearGradient id="hullPaint" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#2a3145" />
            <stop offset="100%" stop-color="#111723" />
          </linearGradient>
        </defs>
        <!-- Water reflection under hull -->
        <ellipse cx="60" cy="74" rx="38" ry="8" fill="rgba(103, 213, 255, 0.25)" />
        <!-- Mast -->
        <path d="M57 12 L57 62" stroke="#d6d9e8" stroke-width="2.5" stroke-linecap="round" />
        <!-- Main sail -->
        <path d="M57 14 L84 52 L57 52 Z" fill="url(#sailGlow)" stroke="#f4e7bc" stroke-width="1" />
        <!-- Jib sail -->
        <path d="M55 24 L36 56 L55 56 Z" fill="#b7d6ff" fill-opacity="0.88" stroke="#d7ebff" stroke-width="1" />
        <!-- Hull -->
        <path d="M22 62 C38 67, 82 67, 98 62 L90 76 C76 80, 46 80, 30 76 Z" fill="url(#hullPaint)" stroke="#4c5a7d" stroke-width="1.5" />
        <!-- Portholes -->
        <circle cx="50" cy="68" r="2" fill="#82d9ff" />
        <circle cx="64" cy="68" r="2" fill="#82d9ff" />
      </svg>
    </div>

    <!-- Wake trail behind boat -->
    <div
      class="wake-ribbon"
      style={`left:${boatX - 140}px;top:${boatY + 10}px;width:${120 + wake * 0.8}px;opacity:${0.12 + wake * 0.003};transform:rotate(${boatTilt * 0.3}deg);`}
    ></div>
  </div>
</div>

<style>
  .regatta-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end; }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 90px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .toggle-btn {
    padding: 7px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); font-size: 0.76rem;
    font-weight: 600; font-family: var(--font-body); cursor: pointer;
    transition: all var(--transition-fast);
  }
  .toggle-btn.on { background: var(--accent); border-color: var(--accent); color: #fff; }

  .stats-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }

  .regatta-stage {
    position: relative; overflow: hidden; border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background:
      radial-gradient(circle at 50% 8%, rgba(255, 230, 164, 0.18), transparent 16%),
      linear-gradient(180deg, #0f1f39 0%, #10284d 20%, #0c3d69 45%, #0a3358 65%, #081b2d 100%);
    box-shadow: 0 14px 60px rgba(0, 0, 0, 0.35);
  }

  :global([data-theme="light"]) .regatta-stage {
    background:
      radial-gradient(circle at 50% 8%, rgba(255, 200, 100, 0.2), transparent 16%),
      linear-gradient(180deg, #c8ddf0 0%, #a8c8e8 20%, #88b8dc 45%, #78a8cc 65%, #6898b8 100%);
    box-shadow: 0 14px 60px rgba(0, 0, 0, 0.12);
  }

  .horizon {
    position: absolute; left: 0; right: 0; top: 80px; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 225, 173, 0.5), transparent);
  }

  .sun-glow {
    position: absolute; top: 14px; left: 50%; width: 200px; height: 100px;
    transform: translateX(-50%);
    background: radial-gradient(ellipse, rgba(255, 224, 153, 0.3), transparent 70%);
    pointer-events: none;
  }

  .line-guide {
    position: absolute; height: 1px;
    border-bottom: 1px dashed rgba(176, 236, 255, 0.45);
    pointer-events: none;
  }

  .foam-line {
    position: absolute; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(227, 248, 255, 0.8), transparent);
    filter: blur(0.4px); pointer-events: none;
  }

  .water-line {
    position: absolute; white-space: nowrap;
    font-family: Georgia, 'Times New Roman', serif;
    text-shadow: 0 0 12px rgba(92, 212, 255, 0.12);
    pointer-events: none;
  }

  :global([data-theme="light"]) .water-line {
    text-shadow: 0 0 8px rgba(30, 100, 160, 0.1);
  }

  /* Boat renders ON TOP of text */
  .boat {
    position: absolute; z-index: 10;
    pointer-events: none;
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4));
  }

  .wake-ribbon {
    position: absolute; z-index: 5; height: 24px; border-radius: 999px;
    background: linear-gradient(90deg, rgba(188, 240, 255, 0.25), rgba(188, 240, 255, 0.05), transparent);
    filter: blur(4px); pointer-events: none;
  }

  @media (max-width: 600px) {
    .ctrl { min-width: 70px; }
    .controls-bar { gap: var(--space-sm); }
  }
</style>
