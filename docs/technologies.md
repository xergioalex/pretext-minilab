# Technologies

This document covers the complete technology stack, dependencies, build tools, and deployment pipeline used in Pretext Lab.

---

## Core Stack

| Technology | Version | Role |
|-----------|---------|------|
| **Astro** | 6.1.2 | Static site generator — renders HTML pages at build time |
| **Svelte** | 5.55.1 | Interactive islands — client-side UI components with runes reactivity |
| **@chenglou/pretext** | 0.0.3 | Text layout engine — DOM-free text measurement and line breaking |
| **TypeScript** | 5.9.3 | Type safety across all source files |
| **Node.js** | >=22.12.0 | Runtime requirement |

---

## Astro

[Astro](https://astro.build/) is a content-focused web framework that generates static HTML at build time and only ships JavaScript where interactivity is needed (the "Islands Architecture").

### Why Astro?

- **Static-first**: Demo pages have static content (descriptions, API references, info cards) that doesn't need JavaScript
- **Island architecture**: Only the interactive Svelte components ship JS to the browser
- **Zero JS by default**: Pages without islands have zero JavaScript overhead
- **Built-in routing**: File-based routing (`src/pages/`) generates URLs automatically
- **Framework agnostic**: Could integrate React, Vue, or other frameworks alongside Svelte if needed

### Configuration

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://pretext.xergioalex.com',
  integrations: [svelte()],
  output: 'static',
});
```

- `output: 'static'` — generates a fully static site (no server required)
- `site` — used for canonical URLs and OG meta tags
- `integrations: [svelte()]` — enables `.svelte` files as island components

### Key Concepts Used

- **Layouts** (`BaseLayout.astro`, `DemoLayout.astro`) — shared HTML structure
- **Pages** (`src/pages/`) — file-based routing
- **Components** (`Nav.astro`, `Footer.astro`) — reusable Astro components
- **`client:only="svelte"`** — island hydration directive that skips SSR entirely
- **`import.meta.env.BASE_URL`** — framework-provided base path for links

---

## Svelte 5

[Svelte](https://svelte.dev/) is a compiler-based UI framework. Version 5 introduced "runes" — a new reactivity system based on explicit signals.

### Why Svelte 5?

- **Compiler-based**: Produces minimal, efficient JavaScript with no runtime framework overhead
- **Runes reactivity**: `$state`, `$effect`, `$derived` provide fine-grained reactivity
- **Small bundle size**: Each island ships only the code it needs
- **Excellent DX**: Single-file components with scoped styles
- **Performance**: Ideal for 60fps animations (Dragon Chase, Wave Distortion, etc.)

### Runes Used in This Project

```svelte
<script>
  // $state — reactive variable declaration
  let width = $state(400);
  let fontSize = $state(16);

  // $effect — runs when dependencies change
  $effect(() => {
    const prepared = prepare(text, buildFont(fontSize));
    result = layout(prepared, width, lineHeight);
  });
</script>
```

| Rune | Purpose | Used In |
|------|---------|---------|
| `$state()` | Declare reactive state | All islands |
| `$effect()` | Side effects on state change | All islands |

### Configuration

```javascript
// svelte.config.js
import { vitePreprocess } from '@astrojs/svelte';

export default {
  preprocess: vitePreprocess(),
};
```

The `vitePreprocess` enables TypeScript and other preprocessors in Svelte files.

---

## @chenglou/pretext

The core library that powers all 39 demos. See the dedicated [Pretext Guide](./pretext-guide.md) for a complete deep dive. The most advanced demos also share helper modules in `src/lib/advanced-demos/` for region geometry, fixtures, and multi-region flow.

### Key Facts

- **Author**: chenglou (Cheng Lou)
- **Version**: 0.0.3
- **License**: MIT
- **Size**: Lightweight, ESM-only
- **Dependencies**: None (uses browser's `Intl.Segmenter` and Canvas API)

### Architecture in One Paragraph

Pretext separates text layout into two phases: **prepare** (expensive, one-time Unicode analysis and font measurement via Canvas) and **layout** (cheap, pure arithmetic). This means you can change the container width and get updated line counts and heights in microseconds instead of milliseconds, without touching the DOM.

---

## TypeScript

TypeScript is used across all source files with Astro's strict configuration:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

Key benefits:
- Type-safe Pretext API usage (all types are re-exported from `src/lib/pretext/index.ts`)
- Type-safe component props (Astro `Props` interface, Svelte prop types)
- Catch errors at build time with `npm run check` (runs `astro check`)

---

## CSS & Styling

### Approach

- **No CSS framework** — vanilla CSS with custom properties (design tokens)
- **Scoped styles** — both Astro and Svelte scope styles to their components
- **Global utilities** — shared classes in `src/styles/global.css`

### Fonts

Loaded from Google Fonts via `<link>` in `BaseLayout.astro`:

| Font | Weight | Usage |
|------|--------|-------|
| **Inter** | 400, 500, 600, 700, 800 | Body text, UI elements |
| **JetBrains Mono** | 400, 500, 600 | Code blocks, monospace content |

### Theme System

Dark-first design with CSS custom properties:

```css
:root {
  --accent: #7c6cf0;
  --font-body: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  /* ... spacing, radii, transitions */
}

[data-theme="dark"] {
  --bg-primary: #0a0a0f;
  --text-primary: #e8e8ed;
  /* ... */
}

[data-theme="light"] {
  --bg-primary: #f5f5fa;
  --text-primary: #111122;
  --accent: #5b4cdb;
  /* ... */
}
```

Theme is applied before first render via an inline script to prevent flash of incorrect theme.

---

## Build & Development

### Commands

| Command | Description |
|---------|-------------|
| `npm install --legacy-peer-deps` | Install dependencies (flag needed for Astro 5 + Svelte peer conflicts) |
| `npm run dev` | Start dev server at localhost:4321 with HMR |
| `npm run build` | Production build to `./dist/` |
| `npm run preview` | Preview production build locally |
| `npm run check` | TypeScript type checking via `astro check` |

### Why `--legacy-peer-deps`?

There are peer dependency conflicts between Astro 5 and the `@astrojs/svelte` integration. The `--legacy-peer-deps` flag tells npm to use the legacy peer dependency resolution algorithm, which is more permissive.

### Build Output

`npm run build` produces a static site in `./dist/`:
- HTML files for each page
- Hashed JS/CSS bundles for each Svelte island
- Static assets (favicons, CNAME)

---

## Deployment

### GitHub Actions

The CI/CD pipeline is defined in `.github/workflows/deploy.yml`:

```
Push to main
    │
    ▼
GitHub Actions triggers
    │
    ▼
Setup Node.js (>=22.12.0)
    │
    ▼
npm install --legacy-peer-deps
    │
    ▼
astro build
    │
    ▼
Deploy dist/ to GitHub Pages
    │
    ▼
Live at pretext.xergioalex.com
```

### Custom Domain

- **Domain**: `pretext.xergioalex.com`
- **Configuration**: `public/CNAME` file contains the domain
- **DNS**: CNAME record pointing to GitHub Pages
- **HTTPS**: Provided by GitHub Pages

### Requirements

- GitHub Pages must be configured to use "GitHub Actions" as the source (not "Deploy from a branch")
- The repository must have Pages enabled in Settings

---

## Development Tools

### VS Code Extensions (Recommended)

Defined in `.vscode/extensions.json`:
- Astro language support
- Svelte language support
- TypeScript support

### Browser APIs Used

| API | Used By | Purpose |
|-----|---------|---------|
| `Canvas 2D` | Pretext (internally) | Font measurement via `measureText()` |
| `Canvas 2D` | CanvasLayout, GravityLetters, TextBreakout, TextVortex | Direct canvas rendering |
| `Intl.Segmenter` | Pretext (internally) | Unicode text segmentation (CJK, Thai, etc.) |
| `localStorage` | Theme system | Persist theme preference |
| `requestAnimationFrame` | Animated demos | 60fps animation loops |
| `ResizeObserver` | Some demos | Responsive container sizing |
| `matchMedia` | Theme system | Detect system color scheme preference |

---

## Dependency Graph

```
pretext-lab
├── astro (6.1.2)            ← Static site framework
│   └── vite                  ← Bundler (used internally by Astro)
├── @astrojs/svelte (8.0.4)  ← Svelte integration for Astro
├── svelte (5.55.1)          ← UI framework for interactive islands
├── @chenglou/pretext (0.0.3)← Text layout engine (zero dependencies)
├── @astrojs/check (0.9.8)   ← TypeScript checking for Astro
└── typescript (5.9.3)        ← Type system
```

All dependencies are **dev/build-time only** — the production site ships only compiled HTML, CSS, and minimal JavaScript for the interactive islands.
