import * as stylex from "@stylexjs/stylex";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { askChat } from "../actions";
import type { Message } from "../domain/types";
import { balancedWidth, sansFont } from "../layout/text";
import { useStore } from "../store";
import { color, ease, font } from "../theme.stylex";
import { CloseIcon, SendIcon } from "./icons";
import { InkMark } from "./InkMark";
import { Button } from "./primitives";
import { Prose } from "./Prose";

const SUGGESTIONS = ["What am I still misunderstanding?", "What have we figured out so far?", "What should I work on next?"];
const BUBBLE_MAX = 280;
const BUBBLE_PADDING = 24;

const styles = stylex.create({
  panel: {
    position: "fixed",
    top: 0,
    bottom: 0,
    right: 0,
    width: 400,
    maxWidth: "100vw",
    zIndex: 18,
    display: "flex",
    flexDirection: "column",
    backgroundColor: color.paper,
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    borderLeftColor: color.rule,
    fontFamily: font.sans,
    transitionProperty: "transform",
    transitionDuration: "280ms",
    transitionTimingFunction: ease.drawer,
    transform: "translateX(0)",
    "@starting-style": { transform: "translateX(100%)" },
  },
  head: { display: "flex", alignItems: "center", gap: 8, paddingBlock: 12, paddingInline: 16, fontSize: 13 },
  title: { fontWeight: 500 },
  noteName: { fontSize: 12, color: color.inkFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  spacer: { flex: 1 },
  list: { flex: 1, overflowY: "auto", paddingInline: 16, paddingBottom: 16, fontSize: 15 },
  intro: { fontFamily: font.serif, fontSize: 18, lineHeight: 1.35, marginBlock: 12 },
  chip: {
    display: "block",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.rule,
    borderRadius: 999,
    backgroundColor: { default: "transparent", ":hover": { default: "transparent", "@media (hover: hover)": color.markHover } },
    color: color.inkSoft,
    fontFamily: font.sans,
    fontSize: 12.5,
    paddingBlock: 5,
    paddingInline: 12,
    marginBottom: 6,
    cursor: "pointer",
    transitionProperty: "transform, background-color",
    transitionDuration: "140ms",
    transform: { default: null, ":active": "scale(0.97)" },
  },
  bubble: {
    marginLeft: "auto",
    marginBlock: 14,
    backgroundColor: color.sand,
    color: color.ink,
    borderRadius: 14,
    paddingBlock: 8,
    paddingInline: 12,
    boxSizing: "border-box",
    fontFamily: font.sans,
    fontSize: 13.5,
    lineHeight: "19px",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  },
  answer: { position: "relative", marginBottom: 8 },
  copy: { marginLeft: -8, fontSize: 12, color: color.inkFaint },
  thinking: { paddingBlock: 6 },
  form: { display: "flex", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: color.rule },
  input: {
    flex: 1,
    resize: "none",
    borderWidth: 0,
    outline: "none",
    backgroundColor: "transparent",
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 13.5,
    lineHeight: "20px",
    padding: 4,
    maxHeight: 120,
  },
  send: { backgroundColor: color.ink, color: color.page, width: 28, height: 28, padding: 0, justifyContent: "center", borderRadius: "50%" },
});

function WriterBubble({ message }: { message: Message }) {
  const width = Math.min(balancedWidth(message.text, sansFont(13.5), BUBBLE_MAX - BUBBLE_PADDING) + BUBBLE_PADDING + 1, BUBBLE_MAX);
  return <div {...stylex.props(styles.bubble)} style={{ width }}>{message.text}</div>;
}

export function ChatPanel() {
  const open = useStore((state) => state.chatOpen);
  const note = useStore((state) => state.notes[state.activeId]);
  const streaming = useStore((state) => state.chatStreaming);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const messageCount = note?.chat.length ?? 0;
  const lastLength = note?.chat[messageCount - 1]?.text.length ?? 0;

  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messageCount, lastLength]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") useStore.setState({ chatOpen: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !note) return null;

  const send = (text: string) => {
    if (!text.trim() || streaming) return;
    setDraft("");
    void askChat(text.trim());
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(draft);
    }
  };

  return (
    <aside {...stylex.props(styles.panel)} aria-label="Chat about this note">
      <div {...stylex.props(styles.head)}>
        <InkMark size={11} breathing={streaming} />
        <div>
          <div {...stylex.props(styles.title)}>Apostil</div>
          <div {...stylex.props(styles.noteName)}>On “{note.title || "Untitled"}”</div>
        </div>
        <span {...stylex.props(styles.spacer)} />
        <Button aria-label="Close chat" onClick={() => useStore.setState({ chatOpen: false })}><CloseIcon /></Button>
      </div>
      <div ref={listRef} {...stylex.props(styles.list)}>
        {messageCount === 0 && (
          <>
            <p {...stylex.props(styles.intro)}>I've read the whole note. Ask me anything about it.</p>
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => send(suggestion)} {...stylex.props(styles.chip)}>{suggestion}</button>
            ))}
          </>
        )}
        {note.chat.map((message, index) => {
          if (message.role === "writer") return <WriterBubble key={message.id} message={message} />;
          const isLast = index === messageCount - 1;
          if (!message.text) return <div key={message.id} {...stylex.props(styles.thinking)}><InkMark size={10} breathing /></div>;
          return (
            <div key={message.id} {...stylex.props(styles.answer)}>
              <Prose text={message.text} streaming={streaming && isLast} />
              {!(streaming && isLast) && (
                <Button
                  xstyle={styles.copy}
                  onClick={() => void navigator.clipboard.writeText(message.text).then(() => toast.success("Copied."))}
                >
                  Copy
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <div {...stylex.props(styles.form)}>
        <textarea aria-label="Ask about this note" rows={1} autoFocus placeholder="Ask about this note…" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} {...stylex.props(styles.input)} />
        <Button aria-label="Send" xstyle={styles.send} disabled={!draft.trim() || streaming} onClick={() => send(draft)}><SendIcon /></Button>
      </div>
    </aside>
  );
}
