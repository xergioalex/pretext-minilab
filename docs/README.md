# Pretext Mini-Lab Documentation

Welcome to the comprehensive documentation for **Pretext Mini-Lab** — an interactive demo lab that showcases the capabilities of the [@chenglou/pretext](https://github.com/chenglou/pretext) text layout library through 16 interactive demos built with Astro and Svelte.

**Live site:** [pretext.xergioalex.com](https://pretext.xergioalex.com)

---

## Table of Contents

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | Project architecture, directory structure, design decisions, and component patterns |
| [Technologies](./technologies.md) | Technology stack, dependencies, build tools, and deployment pipeline |
| [Pretext Guide](./pretext-guide.md) | Deep dive into the `@chenglou/pretext` library — API reference, usage patterns, performance, and design philosophy |
| [Demos](./demos/README.md) | Detailed technical breakdown of all 16 interactive demos |

---

## Quick Links

### Getting Started

```bash
git clone https://github.com/xergioalex/pretext-minilab.git
cd pretext-minilab
npm install --legacy-peer-deps
npm run dev
```

The dev server starts at `http://localhost:4321`.

### Build & Deploy

```bash
npm run build      # Production build → ./dist/
npm run preview    # Preview production build locally
npm run check      # TypeScript type checking
```

Deployment is automated via GitHub Actions on push to `main`.

### Demo Categories

| Category | Demos | Focus |
|----------|-------|-------|
| **Foundational** | Measure Height, Resize Relayout, Shrink-Wrap, DOM vs Pretext | Core API concepts and performance basics |
| **Practical** | Masonry Cards, Chat Bubbles, Canvas Layout, i18n Stress Test | Real-world UI patterns powered by Pretext |
| **Advanced** | Flow Around Obstacle, Rich Inline Segments, Editorial Engine | Complex layout techniques and per-line control |
| **Spectacular** | Dragon Chase, Wave Distortion, Text Breakout, Gravity Letters, Text Vortex | Visual showcases pushing Pretext to its limits |

---

## Who Is This For?

- **Frontend developers** who want to understand programmable text layout
- **UI engineers** looking for alternatives to DOM-based text measurement
- **Game developers** interested in text as a game mechanic
- **Typography enthusiasts** exploring what's possible beyond CSS
- **Contributors** who want to add new demos or improve existing ones
