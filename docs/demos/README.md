# Demo Catalog

This directory contains detailed technical documentation for all 28 interactive demos in Pretext Mini-Lab. Each demo showcases different capabilities of the `@chenglou/pretext` library.

---

## Demo Index

### Foundational

These demos teach the core Pretext concepts and APIs.

| Demo | APIs | Difficulty | Doc |
|------|------|------------|-----|
| [Basic Paragraph Measurement](./measure-height.md) | `prepare()`, `layout()` | Beginner | The fundamental prepare/layout workflow |
| [Resize Relayout Playground](./resize-relayout.md) | `prepare()`, `layout()` | Beginner | Batch relayout of 16 blocks at interactive speed |
| [Tight Multiline Shrink-Wrap](./shrink-wrap.md) | `prepareWithSegments()`, `layoutWithLines()` | Intermediate | Compute the tightest bounding box for wrapped text |
| [DOM vs Pretext Architecture](./dom-vs-pretext.md) | `prepare()`, `layout()` | Conceptual | Side-by-side comparison with benchmarks |

### Practical

Real-world UI patterns powered by Pretext.

| Demo | APIs | Difficulty | Doc |
|------|------|------------|-----|
| [Text-Aware Masonry Cards](./masonry-cards.md) | `prepare()`, `layout()` | Intermediate | Predict card heights for perfect packing |
| [Chat & Feed Bubbles](./chat-bubbles.md) | `prepare()`, `layout()`, `layoutWithLines()` | Intermediate | Instant bubble sizing for chat interfaces |
| [Canvas Text Layout](./canvas-layout.md) | `prepareWithSegments()`, `layoutWithLines()` | Intermediate | Line breaking for canvas rendering |
| [Multilingual Stress Test](./i18n-stress.md) | `prepare()`, `layout()`, `setLocale()` | Advanced | Unicode edge cases: CJK, Arabic, emoji, bidi |
| [Streaming Text Prediction](./streaming-text.md) | `prepare()`, `layout()` | Intermediate | LLM streaming simulation with height prediction |

### Advanced

Complex layout techniques using per-line control.

| Demo | APIs | Difficulty | Doc |
|------|------|------------|-----|
| [Flow Around Obstacle](./flow-around-obstacle.md) | `prepareWithSegments()`, `layoutNextLine()` | Advanced | Text flows around a draggable shape |
| [Rich Inline Segments](./rich-text-lines.md) | `prepareWithSegments()`, `layoutWithLines()` | Advanced | Mixed styles with segments mapping |
| [Editorial Engine](./editorial-engine.md) | `prepareWithSegments()`, `layoutNextLine()`, `layoutWithLines()` | Flagship | Editorial layout with floating orbs |
| [Text Silhouette Fill](./text-silhouette.md) | `prepareWithSegments()`, `layoutNextLine()` | Advanced | Text fills arbitrary shapes matching their boundaries |
| [Multi-Column Magazine](./multi-column.md) | `prepareWithSegments()`, `layoutNextLine()` | Advanced | Text flows across columns with pull quotes |
| [Text Terrain Map](./text-terrain.md) | `prepare()`, `layout()`, `walkLineRanges()` | Advanced | Topographic landscape of text height vs width |
| [Typographic Heatmap](./typographic-heatmap.md) | `prepareWithSegments()`, `layoutWithLines()` | Advanced | Line density visualization and river detection |

### Spectacular

Visual showcases that push Pretext to its limits.

| Demo | APIs | Difficulty | Doc |
|------|------|------------|-----|
| [Dragon Chase](./dragon-chase.md) | `prepareWithSegments()`, `layoutNextLine()` | Spectacular | 40-segment dragon with real-time text reflow |
| [Wave Distortion](./wave-distortion.md) | `prepareWithSegments()`, `layoutNextLine()` | Spectacular | Sine wave warps line widths continuously |
| [Text Breakout](./text-breakout.md) | `prepareWithSegments()`, `layoutWithLines()` | Game | Classic Breakout with word bricks |
| [Gravity Letters](./gravity-letters.md) | `prepareWithSegments()`, `layoutWithLines()` | Spectacular | Physics-based letter animation |
| [Text Vortex](./text-vortex.md) | `prepareWithSegments()`, `layoutWithLines()` | Spectacular | Spinning character vortex with reassembly |
| [Text Waterfall Cascade](./text-waterfall.md) | `prepareWithSegments()`, `layoutNextLine()` | Spectacular | Text cascades down shelves of decreasing width |
| [Text Hourglass](./text-hourglass.md) | `prepareWithSegments()`, `layoutNextLine()` | Spectacular | Hourglass-shaped text with timer animation |
| [Audio-Reactive Typography](./audio-reactive.md) | `prepare()`, `layout()` | Spectacular | Web Audio drives text layout in real time |
| [Voronoi Text Cells](./voronoi-text.md) | `prepareWithSegments()`, `layoutNextLine()` | Spectacular | Drag seed points, text reflows in Voronoi cells |
| [Text Rain](./text-rain.md) | `prepareWithSegments()`, `layoutWithLines()` | Spectacular | Letters fall like rain and accumulate into text |
| [Text Collision World](./text-collision.md) | `prepare()`, `layout()` | Spectacular | Physics rigid bodies made of text blocks |
| [Text Earthquake](./text-earthquake.md) | `prepareWithSegments()`, `layoutNextLine()` | Spectacular | Fault line splits paragraph into reflow halves |

---

## Common Patterns Across Demos

### State Management

All demos use Svelte 5 runes:

```svelte
let text = $state('Hello world');
let width = $state(400);
let result = $state({ height: 0, lineCount: 0 });

$effect(() => {
  const prepared = prepare(text, buildFont(fontSize));
  result = layout(prepared, width, lineHeight);
});
```

### Rendering Approaches

| Approach | Demos | Description |
|----------|-------|-------------|
| **DOM-based** | Chat Bubbles, Masonry Cards, Resize Relayout, Rich Text, i18n, Streaming Text, Typographic Heatmap | Text displayed in HTML elements; Pretext provides dimensions |
| **Canvas-based** | Canvas Layout, Gravity Letters, Text Breakout, Text Vortex, Text Rain, Text Collision, Voronoi Text, Text Terrain | Pretext provides line breaks; Canvas handles rendering |
| **Hybrid** | Dragon Chase, Editorial Engine, Flow Around Obstacle, Wave Distortion, Text Silhouette, Text Waterfall, Text Hourglass, Text Earthquake, Multi-Column | Text as positioned divs; obstacles/effects as divs or Canvas |
| **Web Audio** | Audio-Reactive | Sound-driven layout parameters |
| **Visualization** | DOM vs Pretext, Shrink-Wrap, Measure Height | SVG, bars, and metrics showing layout data |

### Animation Loop Pattern

Animated demos use `requestAnimationFrame`:

```svelte
let frameHandle;

function animate() {
  // Update physics / wave / positions
  // Recompute Pretext layout
  // Render
  frameHandle = requestAnimationFrame(animate);
}

$effect(() => {
  animate();
  return () => cancelAnimationFrame(frameHandle);
});
```

### Controls Pattern

Most demos include:

- Range sliders for width, font size, line height
- Toggle buttons for features
- Auto-play/animate buttons
- Stats display showing line count, height, timing

---

## How to Read Demo Documentation

Each demo document follows this structure:

1. **Overview** — what the demo does and why it matters
2. **Pretext APIs Used** — which functions and types are involved
3. **How It Works** — step-by-step explanation of the implementation
4. **State Management** — all reactive state variables
5. **Controls** — user-facing controls and their effects
6. **Visual Rendering** — how the output is drawn
7. **Key Technical Insight** — the architectural lesson
8. **How to Replicate** — steps to build something similar
