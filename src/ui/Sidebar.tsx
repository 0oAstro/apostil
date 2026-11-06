import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import { toast } from "sonner";
import { noteToMarkdown } from "../export";
import { activeNote, createNote, deleteNote, openNote, useStore } from "../store";
import { color, ease, font } from "../theme.stylex";
import { PlusIcon, SearchIcon } from "./icons";
import { InkMark } from "./InkMark";
import { press } from "./primitives";

const styles = stylex.create({
  scrim: {
    position: "fixed",
    inset: 0,
    zIndex: 19,
    backgroundColor: color.page,
    opacity: 0.6,
    transitionProperty: "opacity",
    transitionDuration: "240ms",
    "@starting-style": { opacity: 0 },
  },
  panel: {
    position: "fixed",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    width: 272,
    display: "flex",
    flexDirection: "column",
    paddingTop: 56,
    paddingBottom: 12,
    paddingInline: 12,
    boxSizing: "border-box",
    backgroundColor: color.page,
    borderRightWidth: 1,
    borderRightStyle: "solid",
    borderRightColor: color.rule,
    fontFamily: font.sans,
    fontSize: 13,
    transitionProperty: "transform",
    transitionDuration: "260ms",
    transitionTimingFunction: ease.drawer,
    transform: "translateX(0)",
    "@starting-style": { transform: "translateX(-100%)" },
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    textAlign: "left",
    borderWidth: 0,
    borderRadius: 6,
    backgroundColor: { default: "transparent", ":hover": { default: "transparent", "@media (hover: hover)": color.markHover } },
    color: color.inkSoft,
    fontFamily: font.sans,
    fontSize: 13,
    paddingBlock: 6,
    paddingInline: 8,
    cursor: "pointer",
  },
  rowActive: { backgroundColor: color.markHover, color: color.ink },
  shortcut: { marginLeft: "auto", fontSize: 11, color: color.inkFaint },
  list: { flex: 1, overflowY: "auto", marginTop: 12, marginInline: -4, paddingInline: 4 },
  noteRow: { position: "relative", display: "flex", alignItems: "center" },
  noteTitle: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 },
  footer: { borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: color.rule, paddingTop: 8 },
  hold: {
    position: "absolute",
    right: 2,
    top: 3,
    overflow: "hidden",
    borderWidth: 0,
    borderRadius: 5,
    paddingBlock: 3,
    paddingInline: 7,
    fontFamily: font.sans,
    fontSize: 11,
    color: color.inkFaint,
    backgroundColor: color.sand,
    cursor: "pointer",
    opacity: { default: 0, ":focus-visible": 1 },
    transitionProperty: "opacity",
    transitionDuration: "120ms",
  },
  holdVisible: { opacity: 1 },
  holdFill: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.danger,
    color: "#fff",
    clipPath: { default: "inset(0 100% 0 0)", ":active": "inset(0 0 0 0)" },
    transitionProperty: "clip-path",
    transitionDuration: { default: "200ms", ":active": "900ms" },
    transitionTimingFunction: { default: ease.out, ":active": "linear" },
  },
});

function HoldToDelete({ noteId }: { noteId: string }) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return (
    <button
      type="button"
      aria-label="Hold to delete note"
      onPointerDown={() => {
        timer.current = setTimeout(() => deleteNote(noteId), 900);
      }}
      onPointerUp={() => clearTimeout(timer.current)}
      onPointerLeave={() => clearTimeout(timer.current)}
      {...stylex.props(styles.hold, styles.holdVisible)}
    >
      Delete
      <span aria-hidden="true" {...stylex.props(styles.holdFill)}>Delete</span>
    </button>
  );
}

const copyNote = async (includeReplies: boolean) => {
  const note = activeNote();
  if (!note) return;
  await navigator.clipboard.writeText(noteToMarkdown(note, includeReplies));
  toast.success("Copied this note.");
};

export function Sidebar() {
  const open = useStore((state) => state.sidebarOpen);
  const notes = useStore((state) => state.notes);
  const activeId = useStore((state) => state.activeId);
  const justMyWords = useStore((state) => state.justMyWords);
  if (!open) return null;

  const close = () => useStore.setState({ sidebarOpen: false });
  const sorted = Object.values(notes).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <>
      <div {...stylex.props(styles.scrim)} onPointerDown={close} />
      <aside {...stylex.props(styles.panel)} aria-label="Notes">
        <button type="button" onClick={() => useStore.setState({ dialog: "palette", sidebarOpen: false })} {...stylex.props(styles.row, press.base)}>
          <SearchIcon /> Find or start a note <span {...stylex.props(styles.shortcut)}>{/mac/i.test(navigator.platform) ? "⌘K" : "Ctrl K"}</span>
        </button>
        <button type="button" onClick={() => createNote()} {...stylex.props(styles.row, press.base)}>
          <PlusIcon /> New note
        </button>
        <div {...stylex.props(styles.list)}>
          {sorted.map((note) => (
            <div key={note.id} {...stylex.props(styles.noteRow)}>
              <button
                type="button"
                onClick={() => {
                  openNote(note.id);
                  close();
                }}
                {...stylex.props(styles.row, press.base, note.id === activeId && styles.rowActive)}
              >
                <InkMark size={7} />
                <span {...stylex.props(styles.noteTitle)}>{note.title || "Untitled"}</span>
              </button>
              {note.id === activeId && <HoldToDelete noteId={note.id} />}
            </div>
          ))}
        </div>
        <div {...stylex.props(styles.footer)}>
          <button type="button" onClick={() => void copyNote(!justMyWords)} {...stylex.props(styles.row, press.base)}>Copy this note</button>
          <button type="button" onClick={() => useStore.setState({ dialog: "export", sidebarOpen: false })} {...stylex.props(styles.row, press.base)}>Export or share</button>
          <button type="button" aria-pressed={justMyWords} onClick={() => useStore.setState({ justMyWords: !justMyWords })} {...stylex.props(styles.row, press.base, justMyWords && styles.rowActive)}>
            Just my words
          </button>
          <button type="button" onClick={() => useStore.setState({ dialog: "customize", customizeTab: "customize", sidebarOpen: false })} {...stylex.props(styles.row, press.base)}>Customize Apostil</button>
          <button type="button" onClick={() => useStore.setState({ dialog: "customize", customizeTab: "connection", sidebarOpen: false })} {...stylex.props(styles.row, press.base)}>Model and key</button>
        </div>
      </aside>
    </>
  );
}
