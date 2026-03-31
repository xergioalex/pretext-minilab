# Chat & Feed Bubbles

**Slug:** `chat-bubbles`
**Category:** Practical
**Difficulty:** Intermediate
**Source:** `src/islands/demos/ChatBubbles.svelte`
**Page:** `src/pages/demos/chat-bubbles.astro`

---

## Overview

This demo implements a functional chat interface where every message bubble is sized by Pretext before it appears in the DOM. The bubble's maximum width is a fraction (75%) of the container width, and Pretext computes the exact wrapped height and line count at that constraint. The result is a chat UI that handles width changes, font size changes, and new messages without any layout measurement or reflow.

The demo includes a pre-loaded conversation, an auto-play mode that adds messages at intervals, and a text input for sending custom messages — all with instant, predictable sizing.

---

## Pretext APIs Used

| API | Purpose |
|-----|---------|
| `prepare(text, font)` | Prepares each message's text for layout computation |
| `layout(prepared, maxWidth, lineHeight)` | Computes the bubble's wrapped height and line count at the constrained bubble width |
| `buildFont(fontSize)` | Constructs the font descriptor from the current font size |

---

## How It Works

### 1. Message Sizing

Each message is sized through a `computeMsg()` function:

1. Build the font with `buildFont(fontSize)`.
2. Compute the maximum bubble width: `containerWidth * 0.75 - 28` (the 28px accounts for horizontal padding inside the bubble).
3. Call `prepare(text, font)` to create a `PreparedText` object.
4. Call `layout(prepared, bubbleMax, lineHeight)` where `lineHeight = fontSize * 1.5`.
5. Store the result: `height = result.height + 24` (adding vertical padding), plus `lineCount`, timestamp, sender, and a unique ID.

### 2. Pre-loaded Conversation

10 messages are loaded on initialization — a scripted conversation about the Pretext library that alternates between "user" and "other" senders. Each message runs through `computeMsg()` to get its dimensions.

### 3. Relayout on Parameter Change

When the container width changes, all existing messages are re-measured via `relayoutAll()`. This re-runs `prepare()` + `layout()` for every message at the new bubble width. When the font size changes, the entire message list is re-initialized from the original conversation texts.

### 4. Auto-play Simulation

The auto-play mode uses `setInterval` at 1200ms to add pre-written messages about Pretext capabilities, alternating senders. Each new message is sized with `computeMsg()` before insertion.

### 5. Scroll Management

After each new message (whether from auto-play or user input), the chat container scrolls to the bottom after a 50ms delay using `el.scrollTop = el.scrollHeight`.

---

## State Management

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `wrapperWidth` | `number` | `0` | Actual width of the outer wrapper (via `bind:clientWidth`) |
| `containerWidth` | `number` | `480` | Chat window maximum width |
| `fontSize` | `number` | `14` | Font size for message text |
| `newMessageText` | `string` | `''` | Current text in the input field |
| `messages` | `Message[]` | `[]` | Array of all messages with computed dimensions |
| `nextId` | `number` | `0` | Auto-incrementing message ID counter |
| `autoPlaying` | `boolean` | `false` | Whether auto-play simulation is active |
| `autoIdx` | `number` | `0` | Current index in the auto-play message rotation |

The `Message` interface contains: `id`, `text`, `sender` (`'user' | 'other'`), `height`, `lineCount`, and `time` (formatted as `HH:MM`).

---

## Controls

| Control | Type | Range | Effect |
|---------|------|-------|--------|
| Container width | Range slider | 250px to wrapper width (max 600px) | Adjusts the chat window's maximum width; all bubbles resize |
| Font size | Range slider | 11-20px | Changes message text size; re-initializes all messages |
| Simulate messages | Toggle button | — | Starts/stops auto-play mode (adds a message every 1.2s) |
| Text input | Text field | — | Type a custom message |
| Send button | Icon button | — | Sends the typed message as a "user" bubble |

The text input also supports Enter key to send (Shift+Enter is not intercepted, though it does not create a newline in a single-line input).

---

## Visual Rendering

### Chat Window Structure

The chat window is composed of three sections:

1. **Header** — Contains an avatar circle ("P"), the name "Pretext Dev", a status indicator ("Typing..." when auto-play is active, "Online" otherwise), and a message count badge.

2. **Message area** — A scrollable container (max-height 480px) with all message rows. Messages scroll vertically with `overflow-y: auto`.

3. **Input bar** — A text input with a round send button featuring an SVG arrow icon.

### Bubble Styling

- **User messages** (outgoing): Accent purple background (`var(--accent)`), white text, rounded corners with a flattened bottom-right radius (6px vs 18px) for the chat tail effect. Aligned to the right.
- **Other messages** (incoming): Card background with border, standard text color, flattened bottom-left radius. Preceded by a small avatar circle. Aligned to the left.
- **Max width**: 75% of container width, matching the measurement constraint.

### Bubble Metadata

Below each bubble, a small info line displays:
- Timestamp in `HH:MM` format
- Line count and computed height (e.g., "2L . 56px") in monospace accent text

### Animation

New messages animate in with a CSS `@keyframes` animation:
- **From:** `opacity: 0`, `translateY(8px)`
- **To:** `opacity: 1`, `translateY(0)`
- **Duration:** 0.25s with ease timing

---

## Key Technical Insight

Chat applications face a fundamental sizing challenge: bubble height depends on text wrapping, which depends on container width, which can change at any time (window resize, responsive layout, user preference). Traditional approaches require rendering the text into a hidden element, measuring it, then applying the height — or accepting layout shift as bubbles pop into their final size.

Pretext solves this by making bubble sizing a pure computation. `prepare()` once, then `layout()` at any width returns the exact height instantly. This enables:

- **Instant resize**: When the container width changes, all bubbles can be re-measured in a single synchronous pass without touching the DOM.
- **Virtualization**: In a real chat app with thousands of messages, you can compute scroll positions for off-screen messages without rendering them.
- **Predictive scroll**: Know the exact scroll position for "jump to message" features before any rendering occurs.

This is the same fundamental problem that iMessage, WhatsApp, Slack, and every other chat application must solve at scale.

---

## How to Replicate

1. **Define the message model** — Each message needs: text, sender, and computed fields (height, lineCount). Add a unique ID for Svelte keyed `{#each}` blocks.

2. **Create a sizing function** — Write a `computeMsg(text, sender)` function that calls `prepare()` + `layout()` with the current font size and bubble width constraint. Return the full message object with computed dimensions.

3. **Set the bubble width constraint** — Chat bubbles typically max out at 70-80% of the container width. Subtract padding from this value before passing to `layout()`.

4. **Handle container resize** — Watch the container width in a `$effect` block. When it changes, re-run `layout()` for every message at the new bubble width. The prepared text can be re-prepared (it is cheap), but in a production app you would cache `PreparedText` objects.

5. **Implement auto-scroll** — After adding a new message to the array, use `setTimeout` to scroll the message container to the bottom on the next tick.

6. **Style sender alignment** — User messages align right with `justify-content: flex-end`, other messages align left. Use different background colors and border-radius variations for the chat tail effect.

7. **Add auto-play** — Use `setInterval` to periodically call the sizing function with pre-written messages, alternating senders. Store the interval handle for cleanup.
