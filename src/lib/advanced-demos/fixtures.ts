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
    id: 'cue-1', start: 0, end: 2.0, speaker: 'Narrator',
    emphasis: ['quietly', 'expensive'],
    text: 'The old layout pipeline is quietly expensive — every answer arrives only after the browser has already committed.',
  },
  {
    id: 'cue-2', start: 2.0, end: 4.0, speaker: 'Engineer',
    emphasis: ['prepare once', 'reuse'],
    text: 'With Pretext you prepare once, reuse the shaped text, and query new widths as many times as needed.',
  },
  {
    id: 'cue-3', start: 4.0, end: 5.8, speaker: 'Editor',
    emphasis: ['safe area', 'rhythm'],
    text: 'Subtitle safe areas, speaker labels, and reading rhythm — all solved before the frame is painted.',
  },
  {
    id: 'cue-4', start: 5.8, end: 7.6, speaker: 'Narrator',
    emphasis: ['cinematic', 'composed'],
    text: 'The result feels cinematic because every cue is measured, wrapped, and positioned like a composed object.',
  },
  {
    id: 'cue-5', start: 7.6, end: 9.2, speaker: 'Director',
    emphasis: ['microseconds', 'frame budget'],
    text: 'Layout in microseconds means subtitles never blow the frame budget — even during fast dialogue scenes.',
  },
  {
    id: 'cue-6', start: 9.2, end: 10.8, speaker: 'Engineer',
    emphasis: ['Unicode', 'scripts'],
    text: 'Unicode segmentation handles CJK, Arabic, Thai, and emoji automatically. No special casing required.',
  },
  {
    id: 'cue-7', start: 10.8, end: 12.4, speaker: 'Editor',
    emphasis: ['two lines', 'readability'],
    text: 'Professional subtitles cap at two lines. Pretext makes it trivial to predict when a cue needs splitting.',
  },
  {
    id: 'cue-8', start: 12.4, end: 14.0, speaker: 'Narrator',
    emphasis: ['responsive', 'reflow'],
    text: 'Resize the player window and every cue instantly reflows — no flicker, no reparse, no layout shift.',
  },
  {
    id: 'cue-9', start: 14.0, end: 15.6, speaker: 'Director',
    emphasis: ['emphasis', 'styling'],
    text: 'Emphasis marks, italic spans, and speaker chips are composited after line breaking — clean separation of concerns.',
  },
  {
    id: 'cue-10', start: 15.6, end: 17.2, speaker: 'Engineer',
    emphasis: ['streaming', 'live'],
    text: 'For live captioning, each incoming word triggers a cheap relayout. The container height is always predictable.',
  },
  {
    id: 'cue-11', start: 17.2, end: 18.8, speaker: 'Narrator',
    emphasis: ['typography', 'invisible'],
    text: 'The best typography is invisible. Good subtitles disappear into the story — the viewer reads without noticing the craft.',
  },
  {
    id: 'cue-12', start: 18.8, end: 20.4, speaker: 'Editor',
    emphasis: ['prepare', 'arithmetic'],
    text: 'Prepare is the expensive step. After that, every layout call is pure arithmetic — the secret to smooth playback.',
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
