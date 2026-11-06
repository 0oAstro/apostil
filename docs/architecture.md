# Architecture

Apostil is a client-only React app with two entry points. `index.html` is the landing page and `write/index.html` is the notebook. The notebook's model code loads on the first model call, so writing never waits for it.

## Data model

`src/domain/types.ts` defines the model.

A `Note` holds `text`, which is Markdown written by the writer and nobody else. A `Thread` holds what Apostil said about a place in that text, and an `Anchor` is that place as a character range. Replies never enter `text`. Just-my-words, exports without replies, and the model's view of the note follow from this split.

A thread's `kind` is `margin` or `inline`. Its `phase` is `streaming`, `idle` or `failed`.

## Editor

`src/ui/Editor.tsx` creates one CodeMirror 6 view per open note.

| File | Responsibility |
| --- | --- |
| `src/editor/threads.ts` | A state field holds each thread's live anchor and maps it through every edit and undo. It also builds the underline marks and the block widgets for inline threads and images. |
| `src/editor/preview.ts` | Hides Markdown syntax on every line the cursor is not on. The document stays plain Markdown. |
| `src/editor/language.ts` | Markdown parsing through `@lezer/markdown` directly. `@codemirror/lang-markdown` would add the HTML, JavaScript and CSS parsers. |

During editing, CodeMirror owns anchor offsets and writes them to the store on each change. The store owns everything else about a thread.

## Reader

`src/reader-machine.ts` is a pure state machine for one proactive read, with the states `idle`, `waiting` and `reading`. Typing cancels a read while the model is still deciding. A reply that has started writing is not cut off. `src/reader.ts` connects the machine to timers and the model.

A thread appears only when the model starts writing, so a silent read leaves no trace.

## Model calls

`src/ai/tasks.ts` has one row per way the model is invoked: `read`, `gloss`, `ask`, `visualize`, `reply` and `chat`. A row names the tools the model may call and how it should approach the task. Tool calls are required on every task except `chat`, so the model chooses to stay silent by calling `stay_silent`.

`src/ai/providers.ts` has one row per provider, each loaded on demand. `src/ai/run.ts` converts the AI SDK's stream into `Reply` values that the rest of the app understands. To add a provider, add a row to `PROVIDERS`.

No code retries with a different model or provider. Failures reach the writer as a toast and, when a thread exists, as its `failed` phase. A task the writer asked for fails when the model finishes with no answer, and **Visualize** fails when the model finishes with no drawing.

## Pretext

Pretext predicts text layout without reading the DOM.

| Use | Location | Reason |
| --- | --- | --- |
| Margin stacking | `src/ui/Margins.tsx`, `src/layout/margin.ts` | A streaming note moves its neighbours with arithmetic and no forced layout. Anchor positions come from CodeMirror's measure cycle. |
| Balanced margin notes and chat bubbles | `balancedWidth` in `src/layout/text.ts` | Finds the narrowest width that keeps the line count, so a note has no orphan word. |
| Inline thread height | `estimatedHeight` in `src/editor/threads.ts` | CodeMirror's scroll calculations are correct before the widget mounts. |
| Diagram labels | `wrapLines` in `src/ui/Diagram.tsx` | SVG text does not wrap. |
| Landing page | `src/landing/FlowText.tsx` | Each line gets its own width, so text flows around the draggable ink at frame rate. |

Pretext measures with canvas, so `fontsReady` in `src/layout/text.ts` clears its cache after the web fonts load. Margin text is plain text at a px font size, because the prediction holds only for that subset. The end-to-end tests compare predicted and rendered heights.

## Diagrams

A diagram is JSON: a title, a height, and stages that each add shapes. `src/domain/diagram.ts` defines the types, and `src/ai/diagram-schema.ts` holds the zod schema that the tool definitions and streaming reader use. The schema is separate so that zod stays out of the first load.

While a diagram streams, `readPartialDiagram` holds back the newest shape, because its values may still be cut off. It also accepts a diagram sent as a JSON string, which then appears only when complete. `croppedView` trims blank space the model leaves around the drawing.

## Interface

StyleX styles every component. `src/theme.stylex.ts` holds the color and font variables and the easing curves, and `src/themes.ts` holds the dark theme. CodeMirror's own theme in `src/editor/theme.ts` reads the same variables. StyleX longhands are required: the `background` shorthand does not apply, so components use `backgroundColor`.

Dialogs and menus use the browser's `<dialog>` and `popover`, in `src/ui/primitives.tsx`. Motion follows these rules:

- Keyboard-driven actions have no animation. This covers the palette and notes moving while typing.
- Entrances use `@starting-style` with a strong ease-out, and stay under 300ms.
- Reduced-motion mode removes movement and keeps opacity and color changes.

Model output renders through `src/ui/Prose.tsx`, which turns `marked` tokens into React elements. `remend` closes half-written Markdown during streaming.

## Tests

`tests/logic.test.ts` covers pure logic. `e2e/app.spec.ts` runs the production build in Chromium with the Content Security Policy active. It scripts provider responses at the network layer, so it needs no credentials.
