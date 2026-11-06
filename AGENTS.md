# Apostil

Client-only notebook: React 19, StyleX, CodeMirror 6, zustand, Pretext, AI SDK. There is no server. See `docs/architecture.md`.

## Commands

- `pnpm dev`: dev server. The notebook is at `/write/`.
- `pnpm typecheck`, `pnpm test`, `pnpm e2e`: all three pass before a commit.
- `pnpm exec playwright install chromium`: first run of `pnpm e2e` only.

## Rules

- `Note.text` holds only the writer's words. Replies live in `Note.threads`.
- Model output renders through `src/ui/Prose.tsx` or `src/ui/Diagram.tsx`, never as HTML.
- A failed model call is reported. Nothing retries with another model or provider.
- Use `backgroundColor` in StyleX. The `background` shorthand does not apply.
- Margin text stays plain text at a px font size, so that Pretext's prediction holds. The end-to-end tests compare predicted and rendered heights.
- Code that loads a model or zod stays out of the first load. It enters through `import("./ai/run")`.
- No code comments, except tool directives and license headers. Reasoning goes in `docs/architecture.md`.
- A change is done when `README.md` and `docs/architecture.md` match it.
