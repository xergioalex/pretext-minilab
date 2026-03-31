# Streaming Text Prediction

## Overview

Streaming Text Prediction simulates LLM token streaming with a side-by-side comparison. The left panel shows text arriving without layout prediction -- the container height jumps abruptly as new tokens cause line breaks. The right panel shows text with prediction -- a ghost container pre-sized to the final layout smoothly accommodates incoming tokens. Pretext's instant measurement enables computing the final layout dimensions before all tokens have arrived.

This demo matters because it solves the "jumping content" problem that plagues streaming text UIs. When an LLM streams tokens into a container, each new token might cause a line break, shifting all content below. By predicting the final layout dimensions upfront (using Pretext on the full expected text), the container can be pre-sized, eliminating layout shift.

## Pretext APIs Used

| Function / Type | Purpose |
|---|---|
| `prepare(text, font)` | Prepares text for layout. Called on both partial text (as tokens arrive) and full text (for prediction). |
| `layout(prepared, maxWidth, lineHeight)` | Computes layout metrics (height, lineCount). Called on partial text for actual height and on full text for predicted height. |
| `buildFont(fontSize)` | Constructs the font descriptor for the given pixel size. |

## How It Works

### Step 1: Text Preparation

The full text is known in advance (simulating a pre-computed LLM response). On mount:

```
const font = buildFont(fontSize);
const fullPrepared = prepare(fullText, font);
const fullLayout = layout(fullPrepared, containerWidth, lineHeight);
const predictedHeight = fullLayout.height;
```

The predicted height is the target container size for the right panel.

### Step 2: Token Streaming Simulation

Tokens are released one at a time at a configurable speed:

```
let tokenIndex = 0;
const tokens = fullText.split(/(?<=\s)/); // split on word boundaries

function streamNextToken() {
  if (tokenIndex < tokens.length) {
    partialText += tokens[tokenIndex++];
  }
}
```

### Step 3: Dual Layout Computation

Each time a new token arrives, both panels are updated:

**Left panel (no prediction):**
```
const partialPrepared = prepare(partialText, font);
const partialLayout = layout(partialPrepared, containerWidth, lineHeight);
leftHeight = partialLayout.height; // jumps on line breaks
```

**Right panel (with prediction):**
```
// Same layout for text rendering
rightHeight = predictedHeight; // constant, pre-computed
// Text renders inside the pre-sized container
```

### Step 4: Visual Comparison

The left container's height changes abruptly when a new token causes a line break. The right container maintains the predicted height throughout, with text filling in smoothly.

### Step 5: Accuracy Tracking

As tokens stream, the prediction accuracy is tracked:

```
const accuracy = 1 - Math.abs(partialLayout.height - predictedHeight) / predictedHeight;
```

When all tokens have arrived, the actual height matches the predicted height exactly (100% accuracy).

## State Management

| Variable | Type | Description |
|---|---|---|
| `fontSize` | `$state(16)` | Font size in pixels (range 12-22). |
| `containerWidth` | `$state(400)` | Container width in pixels (range 250-700). |
| `streamSpeed` | `$state(100)` | Milliseconds between tokens (range 30-500). |
| `partialText` | `$state('')` | Text accumulated so far from streamed tokens. |
| `tokenIndex` | `$state(0)` | Current token position in the stream. |
| `predictedHeight` | derived | Height of the full text layout, computed once upfront. |
| `leftHeight` | derived | Current height of the left panel (no prediction). |
| `streaming` | `$state(false)` | Whether token streaming is active. |
| `prepared` | derived | Cached `PreparedText` for the current partial text. |
| `lineHeight` | derived | Computed as `fontSize * 1.6`. |

## Controls

| Control | Type | Range | Effect |
|---|---|---|---|
| Stream Speed | Slider | 30 - 500 ms | Time between token arrivals. Lower values simulate faster streaming. |
| Container Width | Slider | 250 - 700 px | Width of both comparison panels. Narrower widths amplify the jumping effect. |
| Font Size | Slider | 12 - 22 px | Changes text size; recomputes predicted height and restarts stream. |
| Start / Pause | Button | toggle | Starts or pauses the token stream. |
| Reset | Button | click | Clears partial text and restarts from the first token. |

## Visual Rendering

### Left Panel (Without Prediction)
The left panel has a container whose height matches the current partial text layout. A visible border animates when the height changes, and a red flash effect highlights each jump. The container background subtly shifts to emphasize instability.

### Right Panel (With Prediction)
The right panel has a container pre-sized to the predicted height. A ghost outline shows the predicted boundary. Text fills in smoothly with no height changes. The container background remains stable.

### Progress Bar
A horizontal progress bar below both panels shows how much of the full text has been streamed (tokenIndex / totalTokens).

### Accuracy Indicator
A percentage display shows the current prediction accuracy. It starts lower (when only a few tokens are present) and converges to 100% as the stream completes.

### Blinking Cursor
A blinking cursor at the end of the partial text in both panels indicates the streaming insertion point.

### Height Comparison
Below each panel, the current height is displayed numerically. The left panel value changes frequently; the right panel value remains constant.

## Key Technical Insight

The architectural lesson of Streaming Text Prediction is that **Pretext's instant measurement enables layout prediction for streaming UIs, solving the "jumping content" problem**. In real LLM applications, the full response is not known in advance, but partial predictions are possible:

- **Token probability**: the model's token probabilities can estimate likely continuation length
- **Historical averages**: average response length for a given prompt type provides a baseline
- **Progressive refinement**: as more tokens arrive, the prediction improves -- recompute predicted height periodically with the partial text + estimated remaining text

The key enabler is that Pretext can compute layout dimensions in microseconds. This means:
- Prediction can be recomputed every token without jank
- Multiple predictions (optimistic, pessimistic, median) can be computed simultaneously
- The prediction can be updated 60 times per second during streaming

Browser layout engines cannot do this. Computing text height in the DOM requires creating elements, triggering reflows, and reading layout results -- far too slow for per-token prediction in a streaming UI.

This pattern applies to:
- **Chat interfaces**: pre-size message bubbles before the full response arrives
- **Document editors**: predict layout impact of in-progress edits
- **Live transcription**: pre-allocate space for speech-to-text output
- **Code generation**: predict output size for streaming code completion

## How to Replicate

1. **Prepare full text upfront**: call `prepare(fullText, buildFont(fontSize))` and `layout(prepared, width, lineHeight)` to get the predicted height.

2. **Tokenize the text**: split the full text into tokens (words or subwords). Maintain a token index.

3. **Stream tokens on a timer**: use `setInterval` or `setTimeout` to release tokens at the configured speed. Accumulate partial text.

4. **Compute dual layouts**: for each new token, compute layout on the partial text. The left panel uses this height; the right panel uses the predicted height.

5. **Render side by side**: display both panels with their respective heights. Highlight height changes in the left panel.

6. **Track accuracy**: compute prediction accuracy as the ratio of partial-to-predicted height. Display as a percentage.

7. **Add visual feedback**: add a progress bar, blinking cursor, and height displays. Flash the left panel border on height jumps.

8. **Experiment with partial prediction**: instead of using the full text, try predicting with partial text + estimated remaining characters. Recompute the prediction every N tokens to simulate progressive refinement.
