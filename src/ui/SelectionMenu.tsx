import * as stylex from "@stylexjs/stylex";
import { useEffect, useState, type ReactNode } from "react";
import { runFromSelection } from "../actions";
import { editorBridge } from "../editor/bridge";
import { setLinePrefix, toggleWrap } from "../editor/format";
import { useStore } from "../store";
import { color, ease, font } from "../theme.stylex";
import { press } from "./primitives";

const MENU_WIDTH = 216;

export const menuStyles = stylex.create({
  menu: {
    position: "fixed",
    zIndex: 30,
    backgroundColor: color.paper,
    color: color.ink,
    borderRadius: 10,
    boxShadow: "0 10px 34px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.05)",
    padding: 6,
    fontFamily: font.sans,
    fontSize: 13,
    transformOrigin: "top left",
    transitionProperty: "opacity, transform",
    transitionDuration: "125ms",
    transitionTimingFunction: ease.out,
    opacity: 1,
    transform: "scale(1)",
    "@starting-style": { opacity: 0, transform: "scale(0.97)" },
  },
  row: { display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1, paddingBottom: 4, marginBottom: 4, borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: color.rule },
  format: {
    height: 24,
    borderWidth: 0,
    borderRadius: 5,
    backgroundColor: { default: "transparent", ":hover": { default: "transparent", "@media (hover: hover)": color.markHover } },
    color: color.inkSoft,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: font.sans,
    padding: 0,
  },
  action: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    width: "100%",
    borderWidth: 0,
    borderRadius: 6,
    backgroundColor: { default: "transparent", ":hover": { default: "transparent", "@media (hover: hover)": color.markHover } },
    color: color.ink,
    fontFamily: font.serif,
    fontSize: 15,
    textAlign: "left",
    paddingBlock: 5,
    paddingInline: 8,
    cursor: "pointer",
  },
  actionSelected: { backgroundColor: color.markHover },
  hint: { fontFamily: font.sans, fontSize: 11, color: color.inkFaint },
  ask: {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "transparent",
    borderWidth: 0,
    outline: "none",
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 13,
    padding: 6,
  },
});

const FORMATS: { label: ReactNode; title: string; run: () => void }[] = [
  { label: <b>B</b>, title: "Bold", run: () => editorBridge.view && toggleWrap(editorBridge.view, "**") },
  { label: <i>I</i>, title: "Italic", run: () => editorBridge.view && toggleWrap(editorBridge.view, "*") },
  { label: <s>S</s>, title: "Strikethrough", run: () => editorBridge.view && toggleWrap(editorBridge.view, "~~") },
  { label: "<>", title: "Code", run: () => editorBridge.view && toggleWrap(editorBridge.view, "`") },
  { label: "H1", title: "Heading", run: () => editorBridge.view && setLinePrefix(editorBridge.view, "# ") },
  { label: "H2", title: "Subheading", run: () => editorBridge.view && setLinePrefix(editorBridge.view, "## ") },
  { label: "•", title: "Bullet list", run: () => editorBridge.view && setLinePrefix(editorBridge.view, "- ") },
  { label: "1.", title: "Numbered list", run: () => editorBridge.view && setLinePrefix(editorBridge.view, "1. ") },
];

export function SelectionMenu() {
  const selection = useStore((state) => state.selection);
  const justMyWords = useStore((state) => state.justMyWords);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    setAsking(false);
    setQuestion("");
  }, [selection?.from, selection?.to]);

  if (!selection || justMyWords) return null;

  const fitsBeside = window.innerWidth - selection.left - 16 >= MENU_WIDTH + 12;
  const position = fitsBeside
    ? { top: selection.top, left: selection.left + 12 }
    : { top: selection.bottom + 8, left: Math.max(window.innerWidth - MENU_WIDTH - 16, 16) };

  return (
    <div
      role="toolbar"
      aria-label="Selection"
      style={{ ...position, width: MENU_WIDTH }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).tagName !== "INPUT") event.preventDefault();
      }}
      {...stylex.props(menuStyles.menu)}
    >
      {asking ? (
        <input
          aria-label="Ask Apostil"
          autoFocus
          placeholder="Ask about this…"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && question.trim()) runFromSelection("ask", selection, question.trim());
            if (event.key === "Escape") setAsking(false);
          }}
          {...stylex.props(menuStyles.ask)}
        />
      ) : (
        <>
          <div {...stylex.props(menuStyles.row)}>
            {FORMATS.map((format) => (
              <button key={format.title} type="button" title={format.title} aria-label={format.title} onClick={format.run} {...stylex.props(menuStyles.format, press.base)}>
                {format.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => runFromSelection("gloss", selection)} {...stylex.props(menuStyles.action, press.base)}>
            Gloss this <span {...stylex.props(menuStyles.hint)}>Surprise me</span>
          </button>
          <button type="button" onClick={() => setAsking(true)} {...stylex.props(menuStyles.action, press.base)}>
            Ask Apostil <span {...stylex.props(menuStyles.hint)}>Your question</span>
          </button>
          <button type="button" onClick={() => runFromSelection("visualize", selection)} {...stylex.props(menuStyles.action, press.base)}>
            Visualize <span {...stylex.props(menuStyles.hint)}>See it drawn</span>
          </button>
        </>
      )}
    </div>
  );
}
