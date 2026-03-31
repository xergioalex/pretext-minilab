# Audio-Reactive Typography

## Overview

Audio-Reactive Typography uses the Web Audio API to drive text layout in real time. Built-in audio sources (pulse, noise, chord) generate frequency data that modulates layout parameters: bass frequencies control container width, treble frequencies control line height. The text continuously reflows at 60fps, pulsing and breathing in response to the audio signal.

This demo matters because it proves Pretext's layout computation is fast enough for real-time audio-driven applications. Each animation frame requires a full `prepare + layout` cycle on the hot path, and Pretext completes this in sub-millisecond time, leaving ample frame budget for audio processing and rendering.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepare(text, font)` | Prepares text for layout. Called every frame on the hot path since width and line height change continuously. |
| `layout(prepared, maxWidth, lineHeight)` | Computes layout metrics (height, lineCount) at the audio-modulated width and line height. Called every frame. |
| `buildFont(fontSize)` | Constructs the font descriptor for the given pixel size. |

## How It Works

### Step 1: Audio Source Setup

The Web Audio API creates an `AudioContext` with an `AnalyserNode`. Built-in sources are implemented as oscillator configurations:

- **Pulse**: a low-frequency square wave oscillator (60-120 Hz)
- **Noise**: a buffer source filled with random samples
- **Chord**: three sine oscillators at harmonically related frequencies

The analyser provides `frequencyBinCount` bins of frequency data via `getByteFrequencyData()`.

### Step 2: Frequency Band Extraction

Each frame, frequency data is split into bands:

```
const data = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(data);

const bass = average(data.slice(0, data.length / 4)) / 255;
const treble = average(data.slice(data.length / 2)) / 255;
```

Bass and treble values are normalized to 0-1 range.

### Step 3: Smooth Transitions

Raw frequency values are noisy. An exponential moving average smooths transitions:

```
smoothBass = smoothBass * 0.85 + bass * 0.15;
smoothTreble = smoothTreble * 0.85 + treble * 0.15;
```

The smoothing factor (0.85) controls responsiveness vs. smoothness.

### Step 4: Layout Modulation

Smoothed audio values modulate layout parameters:

```
const width = baseWidth + smoothBass * sensitivity * widthRange;
const lineHeight = baseLineHeight + smoothTreble * sensitivity * lineHeightRange;

const prepared = prepare(text, buildFont(fontSize));
const result = layout(prepared, width, lineHeight);
```

### Step 5: Animation Loop

A `requestAnimationFrame` loop drives the cycle: read frequency data, smooth values, compute layout, render. The loop runs at display refresh rate (typically 60fps).

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(16)` | Font size in pixels (range 12-24). |
| `baseWidth` | `$state(400)` | Base container width before audio modulation (range 300-700). |
| `sensitivity` | `$state(1)` | Audio sensitivity multiplier (range 0.2-3). |
| `volume` | `$state(0.5)` | Audio output volume (range 0-1). |
| `source` | `$state('pulse')` | Active audio source: pulse, noise, or chord. |
| `mode` | `$state('width')` | Modulation target mode: width, lineHeight, or both. |
| `playing` | `$state(false)` | Whether audio is active. |
| `smoothBass` | internal | Smoothed bass frequency value (0-1). |
| `smoothTreble` | internal | Smoothed treble frequency value (0-1). |
| `layoutResult` | derived | Current layout metrics (height, lineCount). |

## Controls

| Control | Type | Range | Effect |
|---|---|---|---|
| Volume | Slider | 0 - 1 | Controls audio output level. |
| Sensitivity | Slider | 0.2 - 3x | Controls how much audio affects layout. Higher values create more dramatic modulation. |
| Source | Toggle | pulse / noise / chord | Switches the built-in audio generator. |
| Mode | Toggle | width / lineHeight / both | Selects which layout parameter the audio modulates. |
| Font Size | Slider | 12 - 24 px | Changes text size. |
| Play / Stop | Button | toggle | Starts or stops audio playback and layout animation. |

## Visual Rendering

### Frequency Visualizer
A row of vertical bars above the text displays the frequency spectrum in real time. Bar heights correspond to frequency bin amplitudes. Bar colors transition from purple (bass) to green (treble) using HSL interpolation.

### Text Container
The text container width and line height visually pulse with the audio. A subtle border around the container shows the current dimensions. Width and line height values are displayed numerically below the container.

### Audio Meters
Small meters next to the sensitivity slider show the current smoothed bass and treble values, providing feedback on how the audio signal maps to layout parameters.

### Text
The text itself reflows continuously. During loud passages, the container expands and line height increases, creating an open, airy layout. During quiet passages, the container contracts and lines tighten.

## Key Technical Insight

The architectural lesson of Audio-Reactive Typography is that **sub-millisecond layout makes real-time audio-driven relayout trivial**. At 60fps, each frame has a 16.6ms budget. Audio processing (FFT, smoothing) takes roughly 1ms. Pretext's `prepare + layout` cycle takes under 0.5ms for typical text lengths. That leaves over 15ms for rendering -- more than enough.

This means Pretext can participate in real-time multimedia applications:
- **Music visualizers** where text reflows to the beat
- **Voice-reactive UIs** where spoken volume controls layout density
- **Game HUDs** where text dimensions respond to game state at frame rate
- **Live performance tools** where text is a visual instrument

The key enabler is that Pretext's layout is a pure function with no retained state, no DOM interaction, and no garbage collection pressure. It can be called thousands of times per second without jank.

## How to Replicate

1. **Set up Web Audio**: create an `AudioContext`, connect an oscillator or buffer source to an `AnalyserNode`, and connect the analyser to the destination (speakers).

2. **Read frequency data each frame**: call `analyser.getByteFrequencyData()` inside `requestAnimationFrame`. Split the frequency array into bass and treble bands.

3. **Smooth the values**: apply an exponential moving average to prevent jittery layout. A factor of 0.85 (85% old value + 15% new value) works well.

4. **Map audio to layout parameters**: multiply smoothed band values by a sensitivity factor and add to base width/lineHeight values.

5. **Run Pretext layout**: call `prepare(text, buildFont(fontSize))` and `layout(prepared, modulatedWidth, modulatedLineHeight)` each frame.

6. **Render the text**: update the text container's width and line height. Display the layout metrics (height, lineCount) for visual feedback.

7. **Add a frequency visualizer**: draw bars from the raw frequency data for visual context. Color them by frequency band.

8. **Add controls**: expose volume, sensitivity, source selection, and mode toggle. Connect font size and base width sliders to the layout computation.
