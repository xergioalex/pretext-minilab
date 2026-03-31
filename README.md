<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/logos/logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="./public/logos/logo-light.png">
    <img src="./public/logos/logo-light.png" alt="Pretext Lab" width="360">
  </picture>
</p>

# Pretext Lab

> **Programmable text layout, visualized.** An interactive demo lab exploring what becomes possible when text measurement is no longer coupled to the DOM.

**[Live site](https://pretext.xergioalex.com)** | Built by [Sergio Florez (XergioAleX)](https://xergioalex.com)

---

## What is this?

A collection of **39 interactive demos** that show what [@chenglou/pretext](https://github.com/chenglou/pretext) — a JavaScript library for programmable text layout — actually enables in practice.

Pretext separates text analysis from layout computation:

```
prepare(text, font)  →  one-time analysis (Unicode, word breaks, font metrics)
layout(prepared, width, lineHeight)  →  instant height & line count (pure arithmetic)
```

This seemingly simple split unlocks UI patterns that were previously impractical: text flowing around moving objects at 60fps, masonry grids that predict card heights before rendering, chat bubbles that size without DOM measurement, and canvas-based text with correct line breaking.

## Demos

| Demo | What it shows |
|------|--------------|
| **[Dragon Chase](https://pretext.xergioalex.com/demos/dragon-chase/)** | A chain of 40 glowing spheres chases your cursor. Text reflows around every orb at 60fps. The signature "wow" demo. |
| **[Wave Distortion](https://pretext.xergioalex.com/demos/wave-distortion/)** | A sine wave continuously warps line widths. Every line has a different width, updated every frame. Mesmerizing. |
| **[Editorial Engine](https://pretext.xergioalex.com/demos/editorial-engine/)** | Floating orbs bounce around an editorial layout. Text reflows dynamically with drop caps, multiple themes. |
| **[Flow Around Obstacle](https://pretext.xergioalex.com/demos/flow-around-obstacle/)** | Drag a shape (or watch it auto-orbit) while text parts around it in real time. |
| **[Masonry Cards](https://pretext.xergioalex.com/demos/masonry-cards/)** | Cards pack into a masonry grid using predicted text heights. Zero layout shift. Shuffle to see repacking. |
| **[Chat Bubbles](https://pretext.xergioalex.com/demos/chat-bubbles/)** | A realistic chat interface where every bubble is sized with Pretext. Resize the container, watch instant relayout. |
| **[Canvas Layout](https://pretext.xergioalex.com/demos/canvas-layout/)** | Pretext computes line breaks, Canvas 2D renders them. Three color modes: mono, rainbow, heat. |
| **[DOM vs Pretext](https://pretext.xergioalex.com/demos/dom-vs-pretext/)** | Side-by-side architecture comparison with live timing. See the speedup measured in your browser. |
| **[Measure Height](https://pretext.xergioalex.com/demos/measure-height/)** | The fundamental demo: prepare once, layout at any width. Live metric bars show timing. |
| **[Resize Relayout](https://pretext.xergioalex.com/demos/resize-relayout/)** | 16 text blocks relayout simultaneously as you drag a width slider. |
| **[Shrink-Wrap](https://pretext.xergioalex.com/demos/shrink-wrap/)** | Compute the tightest bounding box for multiline text. Per-line width visualization. |
| **[Rich Text Lines](https://pretext.xergioalex.com/demos/rich-text-lines/)** | Mixed inline styles (bold, code, badges) with Pretext-computed line breaks. |
| **[i18n Stress Test](https://pretext.xergioalex.com/demos/i18n-stress/)** | CJK, Arabic, emoji, bidi, long strings — 9 multilingual samples with line-level inspection. |

All demos start in **auto-play mode** so you can see them in action immediately.

## Architecture

The site itself makes an architectural point: **Pretext is exciting for interactive layout, but not everything should be runtime-heavy.**

- **[Astro](https://astro.build)** generates a static site — fast, linkable, SEO-friendly
- **[Svelte 5](https://svelte.dev)** powers the interactive demos as client-only islands
- The shell is pre-rendered HTML; only the demos hydrate on the client
- Dark/light theme with system detection and localStorage persistence

```
src/
  pages/index.astro              # Homepage — grid of all 39 demos
  pages/demos/*.astro             # Demo pages (static shell + Svelte island)
  islands/demos/*.svelte          # Interactive demo components (client-only)
  components/Nav.astro            # Navigation with theme toggle
  components/Footer.astro         # Footer with author links
  layouts/BaseLayout.astro        # Root layout with meta tags
  layouts/DemoLayout.astro        # Demo page wrapper
  lib/pretext/index.ts            # Centralized Pretext API wrapper
  lib/content/demos.ts            # Demo metadata registry
  styles/global.css               # Design system (CSS variables, dark/light)
```

## Getting started

```bash
# Requires Node.js >= 22
npm install --legacy-peer-deps
npm run dev          # Dev server at localhost:4321
npm run build        # Production build to ./dist/
npm run check        # TypeScript checking
npm run preview      # Preview production build
```

## Deploy

GitHub Actions workflow included. On every push to `main`:

1. Builds the static site
2. Deploys to GitHub Pages

**Setup:** Go to repo Settings > Pages > Source: **GitHub Actions**

Custom domain configured via `public/CNAME` → `pretext.xergioalex.com`

## Tech stack

| Layer | Technology |
|-------|-----------|
| Site framework | [Astro 6](https://astro.build) |
| Interactive islands | [Svelte 5](https://svelte.dev) (runes) |
| Text layout engine | [@chenglou/pretext](https://github.com/chenglou/pretext) v0.0.3 |
| Language | TypeScript |
| Styling | CSS custom properties, dark/light themes |
| Deployment | GitHub Pages via GitHub Actions |

## Author

**[Sergio Florez (XergioAleX)](https://xergioalex.com)** — CTO & Co-founder at [DailyBot](https://dailybot.com) (YC S21). Full Stack Developer and tech entrepreneur with 14+ years building digital products.

[Website](https://xergioalex.com) | [GitHub](https://github.com/xergioalex) | [LinkedIn](https://linkedin.com/in/xergioalex) | [X](https://x.com/XergioAleX)

## License

MIT
