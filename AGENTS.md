# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Build Commands

```bash
npm install --legacy-peer-deps   # Install (--legacy-peer-deps required)
npm run dev                       # Dev server at localhost:4321
npm run build                     # Production build to ./dist/
npm run preview                   # Preview production build locally
npm run check                     # TypeScript type checking via astro check
npm run og-image                  # Regenerate OG image (public/og-image.png)
npm run og-image -- --demos 38   # Regenerate with updated demo count
```

The `--legacy-peer-deps` flag is needed due to peer dependency conflicts between Astro 5 and the Svelte integration.

## Project Overview

**Pretext Lab** is a public demo lab for the [@chenglou/pretext](https://github.com/chenglou/pretext) text layout library. It contains **38 interactive demos** organized across 4 categories (foundational, practical, advanced, spectacular), built with Astro + Svelte 5.

**Live site:** [pretext.xergioalex.com](https://pretext.xergioalex.com)

## Documentation

Comprehensive documentation lives in the `docs/` directory:

| Document | Path | Description |
|----------|------|-------------|
| **Docs Index** | `docs/README.md` | Entry point — links to all documentation, quick start, demo categories |
| **Architecture** | `docs/architecture.md` | Directory structure, design decisions, component patterns, theme system, fullscreen mode |
| **Technologies** | `docs/technologies.md` | Full tech stack (Astro, Svelte 5, Pretext, TypeScript), build pipeline, deployment, browser APIs |
| **Pretext Guide** | `docs/pretext-guide.md` | Deep dive into `@chenglou/pretext` — complete API reference, 6 usage patterns, performance benchmarks, Unicode support, limitations |
| **Demo Catalog** | `docs/demos/README.md` | Index of all 38 demos with API usage, difficulty, and rendering approach tables |
| **Individual Demos** | `docs/demos/*.md` | One file per demo — 8-section technical breakdown (overview, APIs, implementation, state, controls, rendering, insight, replication) |

When modifying demos or architecture, keep the relevant documentation in sync.

## Architecture

This is a **static Astro site** with **Svelte interactive islands** — static content-first shell (Astro) with client-only interactive demos (Svelte 5).

### Key architectural decisions

- **All Svelte islands use `client:only="svelte"`** (not `client:load`). Pretext requires browser Canvas API for font measurement, so SSR is impossible. Every demo page must use this directive.
- **Pretext imports are centralized** through `src/lib/pretext/index.ts`. All demos import from there, never directly from `@chenglou/pretext`.
- **Demo metadata lives in `src/lib/content/demos.ts`**. This array drives the homepage grid, shared demo switcher, and structured data (slug, title, APIs, category, difficulty). Add new demos here first.
- **Visual demo metadata lives in `src/lib/content/demoVisuals.ts`**. Keep icon and category-color mappings there so the homepage and demo switcher stay in sync.
- **Shared advanced demo helpers live in `src/lib/advanced-demos/`**. Reuse those helpers for fixtures, geometry, and flowing regions before duplicating code in a new flagship island.
- **Svelte import aliasing**: In demo pages, Svelte components are imported with an `Island` suffix (e.g., `MeasureHeightIsland`) to avoid naming conflicts with Astro's auto-generated page component declarations.

### Directory structure (key paths)

```
src/
├── components/          # Astro components (Nav, Footer)
├── islands/
│   └── demos/           # 38 Svelte island components (one per demo)
├── layouts/
│   ├── BaseLayout.astro # Root HTML shell (meta, fonts, theme init)
│   └── DemoLayout.astro # Demo wrapper (fullscreen, topbar, info modal, demo switcher)
├── lib/
│   ├── advanced-demos/  # Shared fixtures + region/flow helpers for advanced demos
│   ├── pretext/
│   │   └── index.ts     # Centralized Pretext re-exports + buildFont() + SAMPLE_TEXTS
│   └── content/
│       ├── demos.ts     # DemoMeta[] array — slug, title, category, apis, difficulty
│       └── demoVisuals.ts # Shared icons and category-color mappings
├── pages/
│   ├── index.astro      # Homepage with hero + demo grid
│   └── demos/           # 38 demo pages (one .astro per demo)
└── styles/
    └── global.css       # Design tokens, utilities, dark/light themes
```

### Adding a new demo

1. Add metadata to `src/lib/content/demos.ts`
2. Add an icon entry to `src/lib/content/demoVisuals.ts`
3. Create Svelte island at `src/islands/demos/MyDemo.svelte`
4. Create Astro page at `src/pages/demos/my-demo.astro`
5. The page imports DemoLayout + the Svelte island with `client:only="svelte"` (use `Island` suffix)
6. Reuse `src/lib/advanced-demos/` helpers if the demo shares region, fixture, or flow logic
7. Add documentation at `docs/demos/my-demo.md`

### Demo page structure

Each demo follows a fixed pattern:

**Astro page** (`src/pages/demos/*.astro`):
- Imports `DemoLayout` and the Svelte island
- Passes props: `slug`, `title`, `summary`, `context`, `apis`, `difficulty`, optional `snippet`
- Uses named slots: `slot="demo"` for the island, `slot="info"` for info cards
- Info cards always include: "What this demonstrates", "Relevant Pretext API", and a third contextual section

**Svelte island** (`src/islands/demos/*.svelte`):
- `<script lang="ts">` with Svelte 5 runes
- Imports from `'../../lib/pretext'`
- State managed with `$state()`, computed values with `$derived()`, side effects with `$effect()`
- Animation loops use `onMount` + `requestAnimationFrame`
- Controls use `class="controls-bar"` with `class="ctrl"` children
- Stats use `class="stat-pill"`

### Svelte island patterns

**Basic prepare/layout:**
```svelte
import { prepare, layout, buildFont } from '../../lib/pretext';
let text = $state('...');
let width = $state(400);
$effect(() => {
  const prepared = prepare(text, buildFont(fontSize));
  result = layout(prepared, width, lineHeight);
});
```

**Per-line variable width (layoutNextLine):**
```svelte
import { prepareWithSegments, layoutNextLine, buildFont } from '../../lib/pretext';
import type { LayoutCursor } from '../../lib/pretext';

const prepared = prepareWithSegments(text, buildFont(fontSize));
let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
let y = 0;
while (true) {
  const width = computeWidthAtY(y);  // shape, wave, obstacle, etc.
  const line = layoutNextLine(prepared, cursor, width);
  if (!line) break;
  lines.push({ text: line.text, x: computeXAtY(y), y, width: line.width });
  cursor = line.end;
  y += lineHeight;
}
```

**Character position extraction (for particle effects):**
```svelte
import { prepareWithSegments, layoutWithLines, buildFont } from '../../lib/pretext';
const prepared = prepareWithSegments(text, buildFont(fontSize));
const { lines } = layoutWithLines(prepared, width, lineHeight);
const chars = [];
for (let i = 0; i < lines.length; i++) {
  let x = 0;
  for (const char of lines[i].text) {
    const charWidth = ctx.measureText(char).width;
    chars.push({ char, homeX: x, homeY: i * lineHeight });
    x += charWidth;
  }
}
```

**Animation loop:**
```svelte
import { onMount } from 'svelte';
let animFrame = 0;
let running = $state(true);
function tick() {
  if (!running) return;
  // update state, recompute layout
  animFrame = requestAnimationFrame(tick);
}
onMount(() => { tick(); return () => cancelAnimationFrame(animFrame); });
```

## All 38 Demos

### Foundational (4)

| Slug | Title | APIs | Rendering |
|------|-------|------|-----------|
| `measure-height` | Basic Paragraph Measurement | `prepare`, `layout`, `profilePrepare` | DOM + metrics |
| `resize-relayout` | Resize Relayout Playground | `prepare`, `layout` | DOM |
| `shrink-wrap` | Tight Multiline Shrink-Wrap | `prepareWithSegments`, `layoutWithLines` | DOM + bars |
| `dom-vs-pretext` | DOM vs Pretext Architecture | `prepare`, `layout` | DOM + benchmark |

### Practical (8)

| Slug | Title | APIs | Rendering |
|------|-------|------|-----------|
| `masonry-cards` | Text-Aware Masonry Cards | `prepare`, `layout` | DOM |
| `chat-bubbles` | Chat & Feed Bubbles | `prepare`, `layout` | DOM |
| `canvas-layout` | Canvas Text Layout | `prepareWithSegments`, `layoutWithLines` | Canvas 2D |
| `i18n-stress` | Multilingual Stress Test | `prepare`, `layout`, `setLocale` | DOM |
| `streaming-text` | Streaming Text Prediction | `prepare`, `layout` | DOM |
| `subtitle-composer` | Subtitle Composer | `prepareWithSegments`, `layoutWithLines` | DOM |
| `incremental-layout-profiler` | Incremental Layout Profiler | `prepare`, `layout`, `profilePrepare` | DOM |
| `ocr-reconstruction` | OCR Reconstruction | `prepare`, `layout`, `layoutNextLine` | Hybrid |

### Advanced (11)

| Slug | Title | APIs | Rendering |
|------|-------|------|-----------|
| `flow-around-obstacle` | Flow Around Obstacle | `prepareWithSegments`, `layoutNextLine` | Hybrid |
| `rich-text-lines` | Rich Inline Segments | `prepareWithSegments`, `layoutWithLines` | DOM |
| `editorial-engine` | Editorial Engine | `prepareWithSegments`, `layoutNextLine` | Hybrid |
| `text-silhouette` | Text Silhouette Fill | `prepareWithSegments`, `layoutNextLine` | Hybrid + SVG |
| `multi-column` | Multi-Column Magazine | `prepareWithSegments`, `layoutNextLine` | DOM |
| `text-terrain` | Text Terrain Map | `prepare`, `layout`, `walkLineRanges` | Canvas 2D |
| `typographic-heatmap` | Typographic Heatmap | `prepareWithSegments`, `layoutWithLines` | DOM |
| `living-document` | Living Document System | `prepare`, `layout`, `layoutNextLine` | DOM |
| `pdf-reflow-engine` | PDF Reflow Engine | `prepare`, `layout`, `layoutNextLine` | Hybrid |
| `comic-speech-layout` | Comic Speech Layout | `prepareWithSegments`, `layoutWithLines` | Hybrid |
| `topology-morph` | Topology Morph | `prepareWithSegments`, `layoutNextLine` | Hybrid |

### Spectacular (15)

| Slug | Title | APIs | Rendering |
|------|-------|------|-----------|
| `dragon-chase` | Dragon Chase | `prepareWithSegments`, `layoutNextLine` | Hybrid |
| `wave-distortion` | Wave Distortion | `prepareWithSegments`, `layoutNextLine` | Hybrid + SVG |
| `text-breakout` | Text Breakout | `prepareWithSegments`, `layoutWithLines` | Canvas 2D |
| `gravity-letters` | Gravity Letters | `prepareWithSegments`, `layoutWithLines` | Canvas 2D |
| `text-vortex` | Text Vortex | `prepareWithSegments`, `layoutWithLines` | Canvas 2D |
| `text-waterfall` | Text Waterfall Cascade | `prepareWithSegments`, `layoutNextLine` | Hybrid |
| `text-hourglass` | Text Hourglass | `prepareWithSegments`, `layoutNextLine` | Hybrid + SVG |
| `audio-reactive` | Audio-Reactive Typography | `prepare`, `layout` | DOM + Web Audio |
| `voronoi-text` | Voronoi Text Cells | `prepareWithSegments`, `layoutNextLine` | Canvas 2D |
| `text-rain` | Text Rain | `prepareWithSegments`, `layoutWithLines` | Canvas 2D |
| `text-collision` | Text Collision World | `prepare`, `layout`, `layoutWithLines` | Canvas 2D |
| `text-earthquake` | Text Earthquake | `prepareWithSegments`, `layoutNextLine` | Hybrid + SVG |
| `text-fluid` | Text Fluid Field | `prepareWithSegments`, `layoutNextLine` | Hybrid |
| `text-origami` | Text Origami Panels | `prepareWithSegments`, `layoutNextLine` | Hybrid |
| `text-black-hole` | Text Black Hole | `prepareWithSegments`, `layoutNextLine` | Hybrid |

## Pretext API Surface (verified from @chenglou/pretext v0.0.3)

### Core Functions

| Function | Returns | Hot Path? | Description |
|----------|---------|-----------|-------------|
| `prepare(text, font)` | `PreparedText` | No | One-time text analysis + font measurement |
| `prepareWithSegments(text, font)` | `PreparedTextWithSegments` | No | Like `prepare` but exposes segment data |
| `layout(prepared, maxWidth, lineHeight)` | `{ height, lineCount }` | **Yes** | Pure arithmetic — ~0.0002ms per call |
| `layoutWithLines(prepared, maxWidth, lineHeight)` | `{ height, lineCount, lines[] }` | Yes | Returns line text + widths |
| `layoutNextLine(prepared, cursor, maxWidth)` | `LayoutLine \| null` | Yes | One line at a time, variable width per line |
| `walkLineRanges(prepared, maxWidth, onLine)` | `number` | Yes | Callback per line without materializing text |
| `profilePrepare(text, font)` | `PrepareProfile` | No | Timing breakdown of prepare phase |

### Utility Functions

| Function | Description |
|----------|-------------|
| `clearCache()` | Clears all internal measurement caches |
| `setLocale(locale?)` | Sets `Intl.Segmenter` locale for future `prepare()` calls |

### Key Types

- `PreparedText` — opaque handle from `prepare()`
- `PreparedTextWithSegments` — extends `PreparedText` with `segments: string[]`
- `LayoutResult` — `{ lineCount, height }`
- `LayoutLine` — `{ text, width, start: LayoutCursor, end: LayoutCursor }`
- `LayoutCursor` — `{ segmentIndex, graphemeIndex }` — position tracker for `layoutNextLine`
- `PrepareOptions` — `{ whiteSpace?: 'normal' | 'pre-wrap' }`

### Project Helpers (src/lib/pretext/index.ts)

- `buildFont(size, family?)` — constructs CSS font string, defaults to `'Inter, sans-serif'`
- `SAMPLE_TEXTS` — `{ short, medium, long, editorial }` pre-written sample texts
- `DEFAULT_FONT` — `'16px Inter, sans-serif'`

## Styling

- Design tokens (colors, spacing, radii, transitions) are CSS custom properties in `src/styles/global.css`
- Dark-first palette with accent `#7c6cf0` (light theme: `#5b4cdb`)
- Fonts: Inter (body), JetBrains Mono (code) — loaded from Google Fonts in BaseLayout
- Theme stored in localStorage, applied before render to prevent flash
- Component styles are scoped in both Astro and Svelte files
- Shared utility classes: `.container`, `.section`, `.card`, `.btn`, `.demo-area`, `.demo-controls`, `.stats-row`, `.stat`
- Demo controls: `.controls-bar`, `.ctrl`, `.play-btn`, `.stat-pill`

## Rendering Approaches Used

| Approach | Description | Used By |
|----------|-------------|---------|
| **DOM** | Text in HTML elements, Pretext provides dimensions | Masonry, Chat, Resize Relayout, Streaming, Heatmap, Multi-Column, Living Document, Subtitle Composer, Incremental Layout Profiler |
| **Canvas 2D** | Pretext provides line breaks, Canvas renders | Canvas Layout, Gravity Letters, Text Breakout, Text Vortex, Text Rain, Text Collision, Voronoi, Text Terrain |
| **Hybrid** | Positioned divs for text + SVG/Canvas for effects | Dragon Chase, Editorial Engine, Flow Around Obstacle, Wave Distortion, Text Silhouette, Waterfall, Hourglass, Earthquake, PDF Reflow Engine, OCR Reconstruction, Text Fluid, Text Origami, Topology Morph, Text Black Hole, Comic Speech Layout |
| **Web Audio** | Audio analysis drives layout parameters | Audio-Reactive Typography |

## Escaping Curly Braces in Astro

Astro interprets `{` in template text as expressions. When writing literal curly braces in HTML content (e.g., `{ height, lineCount }`), use HTML entities: `&#123;` and `&#125;`.

## OG Image Generation

The social sharing image (`public/og-image.png`, 1200×630) is generated from:
- `public/og-image.svg` — SVG template (background, text, API tags, footer)
- `public/logos/logo-dark.png` — project logo, composited on top

**Regenerate after**:
- Adding new demos (update the demo count in `og-image.svg` or use `--demos` flag)
- Changing the project logo
- Modifying the SVG template (colors, layout, text)

```bash
npm run og-image                  # Regenerate from current SVG + logo
npm run og-image -- --demos 38   # Also update demo count in SVG
```

Script: `scripts/generate-og-image.mjs` — uses `sharp` to render SVG and composite the logo.

## SEO

SEO is configured in `src/layouts/BaseLayout.astro`:
- **Meta tags**: title, description, keywords, robots, theme-color, author
- **Open Graph**: og:title, og:description, og:image, og:url, og:site_name, og:locale
- **Twitter Card**: summary_large_image with image
- **JSON-LD WebSite schema** on every page (author, sameAs, publisher)
- **JSON-LD SoftwareApplication** on homepage
- **JSON-LD LearningResource** on each demo page (via `DemoLayout.astro`)
- **Sitemap**: auto-generated by `@astrojs/sitemap` → `sitemap-index.xml`
- **robots.txt**: `public/robots.txt` with sitemap reference

## Deployment

GitHub Actions workflow at `.github/workflows/deploy.yml` auto-deploys to GitHub Pages on push to `main`. The site is served at `pretext.xergioalex.com` (configured via `public/CNAME`). Requires the repo's Pages settings to use "GitHub Actions" as the source.

## Browser APIs Used

| API | Used By | Purpose |
|-----|---------|---------|
| Canvas 2D | Pretext (internally) + 8 demos | Font measurement + direct rendering |
| `Intl.Segmenter` | Pretext (internally) | Unicode text segmentation |
| Web Audio API | Audio-Reactive demo | Real-time frequency analysis |
| `requestAnimationFrame` | 20+ animated demos | 60fps animation loops |
| `localStorage` | Theme system | Persist theme preference |
| `ResizeObserver` | Some demos | Responsive container sizing |
