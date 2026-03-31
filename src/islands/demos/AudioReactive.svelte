<script lang="ts">
  import { prepare, layout, buildFont, SAMPLE_TEXTS } from '../../lib/pretext';
  import { onMount } from 'svelte';

  const text = SAMPLE_TEXTS.medium;

  let fontSize = $state(16);
  let baseWidth = $state(500);
  let baseLineHeight = $state(26);
  let sensitivity = $state(1.0);
  let volume = $state(0.3);
  let audioSource = $state<'pulse' | 'noise' | 'chord'>('pulse');
  let reactMode = $state<'width' | 'height' | 'both'>('both');
  let playing = $state(false);

  let currentWidth = $state(500);
  let currentLineHeight = $state(26);
  let lineCount = $state(0);
  let totalHeight = $state(0);
  let bassLevel = $state(0);
  let midLevel = $state(0);
  let trebleLevel = $state(0);

  let wrapperWidth = $state(0);

  // Cache prepared text — only recompute when fontSize changes
  let preparedText = $derived(prepare(text, buildFont(fontSize)));

  // Audio state
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let gainNode: GainNode | null = null;
  let sourceNodes: OscillatorNode[] = [];
  let animFrame = 0;
  let freqData: Uint8Array;

  // Smoothed values
  let smoothBass = 0;
  let smoothTreble = 0;

  function createAudioSource() {
    if (!audioCtx || !gainNode) return;

    // Clean up previous
    sourceNodes.forEach(n => { try { n.stop(); } catch {} });
    sourceNodes = [];

    if (audioSource === 'pulse') {
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 80;
      // LFO for pulsing
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 2;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 40;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
      osc.connect(gainNode);
      osc.start();
      sourceNodes = [osc, lfo];
    } else if (audioSource === 'noise') {
      // White noise via buffer
      const bufferSize = audioCtx.sampleRate * 2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;
      noiseSource.connect(gainNode);
      noiseSource.start();
      // Store as any since we need to stop it
      (noiseSource as any)._isBuffer = true;
      sourceNodes = [noiseSource as any];
    } else if (audioSource === 'chord') {
      const freqs = [220, 277.18, 329.63, 440];
      freqs.forEach(f => {
        const osc = audioCtx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        const oscGain = audioCtx!.createGain();
        oscGain.gain.value = 0.25;
        osc.connect(oscGain);
        oscGain.connect(gainNode!);
        osc.start();
        sourceNodes.push(osc);
      });
    }
  }

  function startAudio() {
    if (!audioCtx) {
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      freqData = new Uint8Array(analyser.frequencyBinCount);

      gainNode = audioCtx.createGain();
      gainNode.gain.value = volume;
      gainNode.connect(analyser);
      analyser.connect(audioCtx.destination);
    }

    createAudioSource();
    playing = true;
    tick();
  }

  function stopAudio() {
    playing = false;
    cancelAnimationFrame(animFrame);
    sourceNodes.forEach(n => { try { n.stop(); } catch {} });
    sourceNodes = [];
    smoothBass = 0;
    smoothTreble = 0;
    bassLevel = 0;
    midLevel = 0;
    trebleLevel = 0;
    currentWidth = baseWidth;
    currentLineHeight = baseLineHeight;
    doLayout(baseWidth, baseLineHeight);
  }

  function doLayout(w: number, lh: number) {
    const clamped = Math.max(100, Math.min(w, wrapperWidth > 0 ? wrapperWidth : 900));
    const result = layout(preparedText, clamped, lh);
    lineCount = result.lineCount;
    totalHeight = result.height;
    currentWidth = clamped;
    currentLineHeight = lh;
  }

  function tick() {
    if (!playing || !analyser) return;

    analyser.getByteFrequencyData(freqData);
    const binCount = freqData.length;
    const third = Math.floor(binCount / 3);

    // Compute energy in bass, mid, treble
    let bass = 0, mid = 0, treble = 0;
    for (let i = 0; i < third; i++) bass += freqData[i];
    for (let i = third; i < third * 2; i++) mid += freqData[i];
    for (let i = third * 2; i < binCount; i++) treble += freqData[i];

    bass = bass / (third * 255);
    mid = mid / (third * 255);
    treble = treble / ((binCount - third * 2) * 255);

    // Exponential moving average
    const alpha = 0.15;
    smoothBass = smoothBass * (1 - alpha) + bass * alpha;
    smoothTreble = smoothTreble * (1 - alpha) + treble * alpha;

    bassLevel = smoothBass;
    midLevel = mid;
    trebleLevel = smoothTreble;

    const sensScale = sensitivity * 200;
    let w = baseWidth;
    let lh = baseLineHeight;

    if (reactMode === 'width' || reactMode === 'both') {
      w = baseWidth + smoothBass * sensScale;
    }
    if (reactMode === 'height' || reactMode === 'both') {
      lh = baseLineHeight + smoothTreble * sensScale * 0.5;
    }

    doLayout(w, Math.max(fontSize + 2, lh));
    animFrame = requestAnimationFrame(tick);
  }

  onMount(() => {
    doLayout(baseWidth, baseLineHeight);
    return () => {
      cancelAnimationFrame(animFrame);
      sourceNodes.forEach(n => { try { n.stop(); } catch {} });
      if (audioCtx) audioCtx.close();
    };
  });

  $effect(() => {
    if (gainNode) gainNode.gain.value = volume;
  });

  $effect(() => {
    audioSource;
    if (playing) {
      createAudioSource();
    }
  });

  $effect(() => {
    fontSize; baseWidth; baseLineHeight; sensitivity; reactMode;
    if (!playing) doLayout(baseWidth, baseLineHeight);
  });
</script>

<div class="audio-demo" bind:clientWidth={wrapperWidth}>
  <div class="controls-bar">
    <div class="ctrl">
      <label>Source</label>
      <div class="toggle-group">
        {#each (['pulse', 'noise', 'chord'] as const) as src}
          <button class:on={audioSource === src} onclick={() => audioSource = src}>{src}</button>
        {/each}
      </div>
    </div>
    <div class="ctrl">
      <label>Mode</label>
      <div class="toggle-group">
        {#each (['width', 'height', 'both'] as const) as mode}
          <button class:on={reactMode === mode} onclick={() => reactMode = mode}>{mode}</button>
        {/each}
      </div>
    </div>
    <div class="ctrl">
      <label>Volume <span>{Math.round(volume * 100)}%</span></label>
      <input type="range" min="0" max="1" step="0.05" bind:value={volume} />
    </div>
    <div class="ctrl">
      <label>Sensitivity <span>{sensitivity.toFixed(1)}x</span></label>
      <input type="range" min="0.1" max="3" step="0.1" bind:value={sensitivity} />
    </div>
    <div class="ctrl">
      <label>Base Width <span>{baseWidth}px</span></label>
      <input type="range" min="200" max="700" bind:value={baseWidth} />
    </div>
    <button
      class="play-btn"
      class:active={playing}
      onclick={() => playing ? stopAudio() : startAudio()}
    >
      {playing ? '⏹ Stop' : '▶ Play'}
    </button>
  </div>

  <div class="wave-stats">
    <span class="stat-pill">Width: <strong>{Math.round(currentWidth)}px</strong></span>
    <span class="stat-pill">LH: <strong>{Math.round(currentLineHeight)}px</strong></span>
    <span class="stat-pill">{lineCount} lines</span>
    <span class="stat-pill accent">Height: {totalHeight}px</span>
  </div>

  <!-- Frequency visualizer -->
  <div class="freq-viz">
    <div class="freq-bar bass" style="height: {Math.round(bassLevel * 100)}%;">
      <span>Bass</span>
    </div>
    <div class="freq-bar mid" style="height: {Math.round(midLevel * 100)}%;">
      <span>Mid</span>
    </div>
    <div class="freq-bar treble" style="height: {Math.round(trebleLevel * 100)}%;">
      <span>Treble</span>
    </div>
  </div>

  <!-- Text display -->
  <div class="text-display" style="max-width: {Math.round(currentWidth)}px;">
    <p style="font-size: {fontSize}px; line-height: {Math.round(currentLineHeight)}px;">
      {text}
    </p>
  </div>
</div>

<style>
  .audio-demo { display: flex; flex-direction: column; gap: var(--space-md); }

  .controls-bar {
    display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: end;
  }
  .ctrl { display: flex; flex-direction: column; gap: 4px; min-width: 90px; }
  .ctrl label {
    font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-muted);
  }
  .ctrl label span { color: var(--accent); font-family: var(--font-mono); }

  .toggle-group { display: flex; gap: 3px; }
  .toggle-group button {
    padding: 5px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--bg-card); color: var(--text-muted); font-size: 0.72rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    text-transform: capitalize; transition: all var(--transition-fast);
  }
  .toggle-group button.on {
    background: var(--accent); color: #fff; border-color: var(--accent);
  }

  .play-btn {
    padding: 6px 16px; border-radius: var(--radius-sm); border: 1px solid var(--accent);
    background: transparent; color: var(--accent); font-size: 0.78rem;
    font-weight: 600; cursor: pointer; font-family: var(--font-body);
    transition: all var(--transition-fast);
  }
  .play-btn:hover, .play-btn.active { background: var(--accent); color: #fff; }

  .wave-stats {
    display: flex; flex-wrap: wrap; gap: 8px;
  }
  .stat-pill {
    font-size: 0.75rem; color: var(--text-muted);
    padding: 3px 10px; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 9999px;
  }
  .stat-pill.accent { color: var(--accent); border-color: var(--border-accent); }
  .stat-pill strong { color: var(--text-primary); font-family: var(--font-mono); font-size: 0.72rem; }

  .freq-viz {
    display: flex; gap: var(--space-sm); align-items: flex-end;
    height: 60px; padding: var(--space-sm);
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }
  .freq-bar {
    flex: 1; min-height: 4px; border-radius: var(--radius-sm);
    display: flex; align-items: flex-end; justify-content: center;
    transition: height 0.08s ease-out; position: relative;
  }
  .freq-bar span {
    font-size: 0.6rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.05em; color: rgba(255,255,255,0.8);
    position: absolute; bottom: -14px; font-family: var(--font-mono);
  }
  .freq-bar.bass { background: #7c6cf0; }
  .freq-bar.mid { background: #f5a623; }
  .freq-bar.treble { background: #3ecf8e; }

  .text-display {
    background: var(--bg-demo);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    overflow: hidden;
    box-shadow: 0 12px 60px rgba(0,0,0,0.4);
    transition: max-width 0.08s ease-out;
  }
  .text-display p {
    color: var(--text-primary);
    margin: 0;
    word-wrap: break-word;
    transition: line-height 0.08s ease-out;
  }
</style>
