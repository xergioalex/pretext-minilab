export interface StoryBlock {
  id: string;
  title: string;
  body: string;
  priority: number;
  kind: 'headline' | 'feature' | 'sidebar' | 'caption' | 'quote';
}

export interface SubtitleCue {
  id: string;
  start: number;
  end: number;
  speaker: string;
  emphasis: string[];
  text: string;
}

export interface OcrBlock {
  id: string;
  x: number;
  y: number;
  width: number;
  role: 'headline' | 'body' | 'caption' | 'note';
  text: string;
}

export const livingDocumentBlocks: StoryBlock[] = [
  {
    id: 'feature',
    title: 'Programmable layout changes the shape of products',
    body:
      'When text metrics become available before rendering, interfaces stop guessing. Cards can reserve exact space, editorial blocks can negotiate for attention, and intelligent systems can reorganize entire surfaces without querying the DOM after each change.',
    priority: 96,
    kind: 'feature',
  },
  {
    id: 'market',
    title: 'Signals from the reading surface',
    body:
      'A living document can react to urgency, density, and viewport changes. Headlines expand when the system boosts priority, while side notes collapse into compact summaries when bandwidth is scarce.',
    priority: 82,
    kind: 'headline',
  },
  {
    id: 'quote',
    title: 'Pull quote',
    body: 'Prepare once. Recompose anywhere. Typography becomes a planning tool, not just a rendering side effect.',
    priority: 78,
    kind: 'quote',
  },
  {
    id: 'sidebar',
    title: 'Why it matters',
    body:
      'Traditional responsive systems know container sizes but not text consequences. A layout engine that predicts text height turns every breakpoint into a solvable constraint system.',
    priority: 70,
    kind: 'sidebar',
  },
  {
    id: 'caption',
    title: 'Field note',
    body:
      'Editors rarely work with a single article. They juggle captions, alerts, quotes, and recirculation modules that all compete for finite space.',
    priority: 61,
    kind: 'caption',
  },
  {
    id: 'analysis',
    title: 'Adaptive hierarchy',
    body:
      'The same story package can be calm and roomy on desktop, compressed on tablet, and aggressively prioritized on mobile. The blocks are the same; only their measured composition changes.',
    priority: 88,
    kind: 'feature',
  },
];

export const reflowArticleTitle = 'The Interface That Knows Its Own Reading Cost';

export const reflowArticleByline = 'Sergio Florez · Experiments in programmable typography';

export const reflowArticleParagraphs = [
  'Every design system can describe spacing tokens, breakpoints, and components, but most cannot explain how much attention a given text block will consume before it is rendered. That missing capability forces teams to measure after the fact.',
  'A document reflow engine starts from a different premise: the cost of reading is part of layout. Once text is prepared, each width becomes a cheap query. Entire spreads can be tested and recomposed without DOM probes or brittle approximation layers.',
  'This is especially useful when the same story needs to exist as a phone article, a tablet feature, a poster teaser, and a magazine-like spread. Headline scale, body width, quote placement, and caption density all become explicit variables in a planning system.',
  'Pretext is not a renderer, but it is a reliable forecasting layer. That distinction matters. It allows the UI to decide where content should go before the browser performs the final painting pass.',
];

export const subtitleCues: SubtitleCue[] = [
  {
    id: 'cue-1',
    start: 0,
    end: 3.2,
    speaker: 'Narrator',
    emphasis: ['quietly', 'predictable'],
    text: 'The old layout pipeline is quietly expensive because every answer arrives only after the browser has already committed to a rendering path.',
  },
  {
    id: 'cue-2',
    start: 3.2,
    end: 6.8,
    speaker: 'Engineer',
    emphasis: ['prepare once', 'reuse'],
    text: 'With Pretext, you prepare once, reuse the shaped text, and query new widths as many times as the interface needs.',
  },
  {
    id: 'cue-3',
    start: 6.8,
    end: 10.4,
    speaker: 'Editor',
    emphasis: ['safe area', 'reading rhythm'],
    text: 'That means subtitle safe areas, speaker labels, and reading rhythm can all be solved before the frame is painted.',
  },
  {
    id: 'cue-4',
    start: 10.4,
    end: 14.8,
    speaker: 'Narrator',
    emphasis: ['real time', 'composed'],
    text: 'The result feels cinematic because every cue is measured, wrapped, and positioned like a composed object instead of a lucky DOM box.',
  },
];

export const topologyText =
  'A topology morph demo proves that layout is not tied to one container. The same prepared document can pass through columns, staircases, rings, and tapered corridors while preserving reading continuity. When the topology changes, the text does not need to be re-authored. It only needs a new path through space.';

export const ocrBlocks: OcrBlock[] = [
  {
    id: 'ocr-headline',
    x: 36,
    y: 28,
    width: 320,
    role: 'headline',
    text: 'Design systems need to understand reading cost before render',
  },
  {
    id: 'ocr-body-1',
    x: 34,
    y: 112,
    width: 220,
    role: 'body',
    text: 'OCR pipelines usually preserve rough boxes but lose editorial structure. Headlines, captions, and body text arrive as disconnected rectangles.',
  },
  {
    id: 'ocr-body-2',
    x: 286,
    y: 110,
    width: 228,
    role: 'body',
    text: 'A reconstruction layer can infer reading order, merge compatible body fragments, and preview what a cleaned document would feel like before exporting HTML.',
  },
  {
    id: 'ocr-caption',
    x: 72,
    y: 252,
    width: 180,
    role: 'caption',
    text: 'Figure 1. Raw capture with perspective distortion and noisy segmentation.',
  },
  {
    id: 'ocr-note',
    x: 320,
    y: 264,
    width: 160,
    role: 'note',
    text: 'Handwritten margin note: verify names and source dates.',
  },
];

export const comicDialogue = [
  'You can size the balloon before you draw it.',
  'Which means the panel composition stops guessing.',
  'And the emphasis words can punch harder without blowing up the rhythm.',
];

export const profilerParagraph =
  'A profiler demo should make invisible work visible. Text preparation is the expensive phase because it includes segmentation, shaping, and measurement. Relayout is cheap because the heavy lifting has already been done. The interface should show exactly when a width-only change stays on the hot path and when editing forces a real re-prepare.';
