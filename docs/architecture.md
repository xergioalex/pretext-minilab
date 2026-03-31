# Architecture

This document explains the project architecture, directory structure, design decisions, and patterns used throughout Pretext Lab.

---

## Overview

Pretext Lab is a **static Astro site** with **Svelte interactive islands**. The architecture is intentional: a static, content-first shell (Astro) with client-only interactive demos (Svelte 5). This separation provides fast initial page loads, SEO-friendly content, and rich interactivity where needed.

```
┌─────────────────────────────────────────────────┐
│                  Astro (Static)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Layouts   │  │  Pages   │  │  Components  │  │
│  │ (Base,    │  │ (index,  │  │  (Nav,       │  │
│  │  Demo)    │  │  demos/) │  │   Footer)    │  │
│  └──────────┘  └────┬─────┘  └──────────────┘  │
│                     │                            │
│              ┌──────▼──────┐                     │
│              │   Svelte 5   │                     │
│              │   Islands    │                     │
│              │ (client:only)│                     │
│              └──────┬──────┘                     │
│                     │                            │
│              ┌──────▼──────┐                     │
│              │   Pretext    │                     │
│              │   Library    │                     │
│              │  (Canvas API)│                     │
│              └─────────────┘                     │
└─────────────────────────────────────────────────┘
```

---

## Directory Structure

```
pretext-minilab/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions CI/CD → GitHub Pages
├── .vscode/
│   ├── extensions.json             # Recommended VS Code extensions
│   └── launch.json                 # Debug configuration
├── public/
│   ├── CNAME                       # Custom domain: pretext.xergioalex.com
│   ├── favicon.ico
│   ├── favicon.png
│   └── logos/                      # Dark/light logos + isologo
├── src/
│   ├── components/
│   │   ├── Nav.astro               # Sticky nav with dropdown, theme toggle, mobile menu
│   │   └── Footer.astro            # Site footer with author/project links
│   ├── islands/
│   │   └── demos/
│   │       ├── AudioReactive.svelte
│   │       ├── CanvasLayout.svelte
│   │       ├── ChatBubbles.svelte
│   │       ├── ComicSpeechLayout.svelte
│   │       ├── DomVsPretext.svelte
│   │       ├── DragonChase.svelte
│   │       ├── EditorialEngine.svelte
│   │       ├── FlowAroundObstacle.svelte
│   │       ├── GravityLetters.svelte
│   │       ├── I18nStress.svelte
│   │       ├── IncrementalLayoutProfiler.svelte
│   │       ├── LivingDocument.svelte
│   │       ├── MasonryCards.svelte
│   │       ├── MeasureHeight.svelte
│   │       ├── MultiColumn.svelte
│   │       ├── OcrReconstruction.svelte
│   │       ├── PdfReflowEngine.svelte
│   │       ├── ResizeRelayout.svelte
│   │       ├── RichTextLines.svelte
│   │       ├── ShrinkWrap.svelte
│   │       ├── StreamingText.svelte
│   │       ├── SubtitleComposer.svelte
│   │       ├── TextBlackHole.svelte
│   │       ├── TextBreakout.svelte
│   │       ├── TextCollision.svelte
│   │       ├── TextEarthquake.svelte
│   │       ├── TextFluid.svelte
│   │       ├── TextHourglass.svelte
│   │       ├── TextOrigami.svelte
│   │       ├── TextRain.svelte
│   │       ├── TextSilhouette.svelte
│   │       ├── TextTerrain.svelte
│   │       ├── TopologyMorph.svelte
│   │       ├── TextVortex.svelte
│   │       ├── TextWaterfall.svelte
│   │       ├── TypographicHeatmap.svelte
│   │       ├── VoronoiText.svelte
│   │       └── WaveDistortion.svelte
│   ├── layouts/
│   │   ├── BaseLayout.astro        # Root HTML shell with meta tags, fonts, theme init
│   │   └── DemoLayout.astro        # Demo wrapper with fullscreen mode, metadata display
│   ├── lib/
│   │   ├── advanced-demos/
│   │   │   ├── fixtures.ts         # Shared content fixtures for advanced demos
│   │   │   └── layout.ts           # Shared region/flow helpers for new demo waves
│   │   ├── pretext/
│   │   │   └── index.ts            # Centralized Pretext re-exports + helpers
│   │   └── content/
│   │       └── demos.ts            # Demo metadata array (single source of truth)
│   ├── pages/
│   │   ├── index.astro             # Homepage with hero section + demo grid
│   │   └── demos/
│   │       └── [39 demo pages].astro
│   └── styles/
│       └── global.css              # Design tokens, utilities, dark/light themes
├── CLAUDE.md                       # AI agent guidance
├── README.md                       # Project README
├── package.json
├── astro.config.mjs                # Astro config (site URL, Svelte integration)
├── tsconfig.json                   # TypeScript strict config
└── svelte.config.js                # Svelte preprocessor config
```

---

## Key Architectural Decisions

### 1. `client:only="svelte"` for All Islands

Every Svelte island uses `client:only="svelte"` instead of `client:load`. This is mandatory, not optional. Pretext requires the browser's Canvas API for font measurement (`measureText()`), which doesn't exist during server-side rendering. Using `client:load` would cause SSR failures.

```astro
<!-- Correct — skips SSR entirely -->
<MeasureHeightIsland client:only="svelte" />

<!-- Wrong — would fail because Canvas is unavailable during SSR -->
<MeasureHeightIsland client:load />
```

### 2. Centralized Pretext Imports

All demos import Pretext through `src/lib/pretext/index.ts`, never directly from `@chenglou/pretext`. This provides:

- **Single update point** when the library API changes
- **Helper functions** like `buildFont()` and `SAMPLE_TEXTS` shared across demos
- **Consistent type imports** for all demos

```typescript
// All demos do this:
import { prepare, layout, buildFont } from '../../lib/pretext';

// Never this:
import { prepare, layout } from '@chenglou/pretext';
```

### 3. Demo Metadata as Single Source of Truth

`src/lib/content/demos.ts` contains a `DemoMeta[]` array that drives:

- The homepage demo grid
- The shared demo switcher and homepage discovery surfaces
- Demo page metadata (title, summary, APIs, difficulty, category)

```typescript
export interface DemoMeta {
  slug: string;         // URL slug, e.g., 'measure-height'
  title: string;        // Display title
  summary: string;      // One-line description
  category: 'foundational' | 'practical' | 'advanced' | 'spectacular';
  featured: boolean;    // Show on homepage
  flagship: boolean;    // Highlight as flagship demo
  apis: string[];       // Pretext APIs used, e.g., ['prepare()', 'layout()']
  difficulty: string;   // Beginner, Intermediate, Advanced, Spectacular, etc.
}
```

### 4. Island Import Suffix Convention

In demo Astro pages, Svelte components are imported with an `Island` suffix to avoid naming conflicts with Astro's auto-generated page component declarations:

```astro
---
import MeasureHeightIsland from '../../islands/demos/MeasureHeight.svelte';
---
<MeasureHeightIsland client:only="svelte" />
```

### 5. Base Path Handling

The site is configured for GitHub Pages deployment. All internal links use `import.meta.env.BASE_URL`:

```astro
<a href={`${import.meta.env.BASE_URL}demos/measure-height/`}>Demo Link</a>
```

---

## Component Architecture

### Layout Hierarchy

```
BaseLayout.astro
├── <html> with theme attribute
├── <head> (meta, fonts, theme script)
├── Nav.astro (sticky nav)
├── <main>
│   └── [page content via <slot />]
└── Footer.astro

DemoLayout.astro (extends BaseLayout)
├── Fullscreen wrapper (default: fullscreen on)
├── Top bar (visible in fullscreen only)
├── Demo stage (holds the Svelte island via <slot />)
└── Demo details (metadata, hidden in fullscreen)
```

### Demo Page Pattern

Every demo follows a three-layer structure:

**Layer 1: Astro Page** (`src/pages/demos/*.astro`)
- Imports `DemoLayout` and the Svelte island
- Passes metadata props to `DemoLayout`
- Adds static info cards below the interactive demo
- Info cards always include: "What this demonstrates", "Relevant Pretext API", and a contextual third section

```astro
---
import DemoLayout from '../../layouts/DemoLayout.astro';
import MeasureHeightIsland from '../../islands/demos/MeasureHeight.svelte';
---
<DemoLayout title="Basic Paragraph Measurement" summary="..." apis={['prepare()', 'layout()']} difficulty="Beginner" context="...">
  <MeasureHeightIsland client:only="svelte" />

  <div class="demo-info">
    <div class="info-card">
      <h3>What this demonstrates</h3>
      <!-- ... -->
    </div>
  </div>
</DemoLayout>
```

**Layer 2: Svelte Island** (`src/islands/demos/*.svelte`)
- All state management using Svelte 5 runes (`$state`, `$effect`)
- Computes layout reactively when inputs change
- Renders controls and visualization
- Self-contained — each island manages its own lifecycle

**Layer 3: Pretext Computation** (inside the island)
- `prepare()` or `prepareWithSegments()` runs when text/font changes
- `layout()`, `layoutWithLines()`, or `layoutNextLine()` runs on every dimension change
- Results drive the visual rendering

### Svelte 5 Runes Pattern

All islands use Svelte 5's reactive primitives:

```svelte
<script>
  import { prepare, layout, buildFont } from '../../lib/pretext';

  let text = $state('Hello world');
  let width = $state(400);
  let fontSize = $state(16);
  let result = $state({ height: 0, lineCount: 0 });

  $effect(() => {
    const prepared = prepare(text, buildFont(fontSize));
    result = layout(prepared, width, fontSize * 1.5);
  });
</script>
```

---

## Fullscreen Mode

`DemoLayout.astro` implements a fullscreen mode that:

- **Defaults to on** when entering any demo page
- Hides the nav bar, footer, and demo detail sections
- Shows a compact top bar with back link, title, and exit button
- Provides a floating toggle button (top-right corner)
- Responds to Escape key to exit fullscreen
- Allows the demo to use the full viewport

This design choice prioritizes the interactive experience — users see the demo first, and can exit fullscreen to read details.

---

## Design System

### CSS Custom Properties

All design tokens live in `src/styles/global.css`:

| Category | Examples |
|----------|---------|
| **Colors** | `--accent: #7c6cf0`, `--bg-primary`, `--text-primary`, `--border` |
| **Typography** | `--font-body: 'Inter'`, `--font-mono: 'JetBrains Mono'` |
| **Spacing** | `--space-xs` (0.25rem) through `--space-4xl` (6rem) |
| **Radii** | `--radius-sm` (6px) through `--radius-xl` (24px) |
| **Transitions** | `--transition-fast` (150ms), `--transition-base` (250ms) |

### Theme System

- **Dark-first palette** — dark theme is the default
- Theme is determined by: localStorage > system preference > dark fallback
- Applied before first render to prevent flash (inline `<script>` in `<head>`)
- Toggled via buttons in the nav (both desktop and mobile)
- Light theme overrides dark variables under `[data-theme="light"]`

### Utility Classes

Global utility classes are available in all components:

- Layout: `.container`, `.section`
- Cards: `.card`, `.card-link`
- Buttons: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-sm`
- Demo-specific: `.demo-area`, `.demo-controls`, `.demo-output`, `.demo-info`
- Stats: `.stats-row`, `.stat`
- Forms: styled `input[type="range"]`, `textarea`, `.control-group`

### Responsive Breakpoints

- **768px**: Navigation switches to hamburger menu, grid reduces to 2 columns
- **600px**: Grid reduces to 1 column, padding adjusts

---

## Navigation

`Nav.astro` provides:

- **Logo** with link to homepage
- **Demos trigger** opening the shared searchable demo switcher
- **Theme toggle** (sun/moon icons)
- **GitHub link** to the repository
- **Mobile hamburger menu** with all links and theme toggle
- Sticky positioning with backdrop blur

---

## Adding a New Demo

1. **Add metadata** to `src/lib/content/demos.ts`:
   ```typescript
   {
     slug: 'my-new-demo',
     title: 'My New Demo',
     summary: 'Description of what it does.',
     category: 'practical',
     featured: true,
     flagship: false,
     apis: ['prepare()', 'layout()'],
     difficulty: 'Intermediate',
   }
   ```

2. **Create the Svelte island** at `src/islands/demos/MyNewDemo.svelte`

3. **Create the Astro page** at `src/pages/demos/my-new-demo.astro`:
   ```astro
   ---
   import DemoLayout from '../../layouts/DemoLayout.astro';
   import MyNewDemoIsland from '../../islands/demos/MyNewDemo.svelte';
   ---
   <DemoLayout title="My New Demo" summary="..." apis={['prepare()', 'layout()']} difficulty="Intermediate" context="...">
     <MyNewDemoIsland client:only="svelte" />
     <div class="demo-info"><!-- info cards --></div>
   </DemoLayout>
   ```

4. **Add the slug** to the Nav demos array in `src/components/Nav.astro`

---

## Deployment Pipeline

```
Push to main → GitHub Actions → Astro Build → GitHub Pages
```

The workflow at `.github/workflows/deploy.yml`:
1. Checks out the repository
2. Sets up Node.js
3. Installs dependencies with `--legacy-peer-deps`
4. Runs `astro build`
5. Deploys the `dist/` folder to GitHub Pages

The site is served at `pretext.xergioalex.com` (configured via `CNAME` file in `public/`).
