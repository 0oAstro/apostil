import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { color, font } from "../theme.stylex";

export const editorTheme = EditorView.theme({
  "&": { background: "transparent", color: color.ink },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { overflow: "visible", fontFamily: font.sans, lineHeight: "1.55" },
  ".cm-content": { padding: "0 0 40vh", caretColor: color.ink, whiteSpace: "pre-wrap" },
  ".cm-line": { padding: "0" },
  ".cm-cursor": { borderLeftColor: color.ink, borderLeftWidth: "1.5px" },
  ".cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    background: `${color.selection} !important`,
  },
  ".cm-h1": { fontSize: "1.5em", fontWeight: "600", letterSpacing: "-0.015em", lineHeight: "1.3", paddingTop: "0.7em" },
  ".cm-h2": { fontSize: "1.2em", fontWeight: "600", letterSpacing: "-0.01em", lineHeight: "1.35", paddingTop: "0.6em" },
  ".cm-h3": { fontWeight: "600", paddingTop: "0.4em" },
  ".cm-quote": { color: color.inkSoft, borderLeft: `2px solid ${color.rule}`, paddingLeft: "0.8em" },
  ".cm-code-block": { fontFamily: font.mono, fontSize: "0.88em", background: color.sand, padding: "0 0.7em" },
  ".cm-rule": { color: color.inkFaint },
  ".cm-list": { paddingLeft: "var(--list-indent)", textIndent: "calc(var(--list-indent) * -1)" },
  ".cm-note-image": { display: "block", maxWidth: "100%", borderRadius: "4px", margin: "8px 0" },
  ".cm-hint::before": {
    content: '"Write, talk to Apostil, or type / for commands"',
    color: color.inkFaint,
    position: "absolute",
    pointerEvents: "none",
  },
  ".cm-thread-mark": {
    textDecorationLine: "underline",
    textDecorationColor: color.mark,
    textDecorationThickness: "1px",
    textUnderlineOffset: "3px",
    cursor: "pointer",
    transition: "background-color 120ms ease",
    borderRadius: "2px",
  },
  ".cm-thread-active": { background: color.markHover, textDecorationColor: color.ink },
  ".cm-reading": { position: "relative" },
  ".cm-reading::after": {
    content: '""',
    position: "absolute",
    left: "-20px",
    top: "0.55em",
    width: "8px",
    height: "8px",
    borderRadius: "47% 53% 58% 42%",
    background: "var(--apostil-ink)",
    animation: "apostil-ink-pulse 1.1s cubic-bezier(0.77, 0, 0.175, 1) infinite alternate",
  },
});

const highlight = HighlightStyle.define([
  { tag: tags.strong, fontWeight: "600" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.monospace, fontFamily: font.mono, fontSize: "0.88em" },
  { tag: tags.link, textDecoration: "underline" },
  { tag: [tags.processingInstruction, tags.meta, tags.contentSeparator], color: color.inkFaint },
]);

export const editorHighlight = syntaxHighlighting(highlight);
