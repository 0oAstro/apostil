import * as stylex from "@stylexjs/stylex";
import { BUILT_IN_VOICES, type NoteMode } from "../domain/types";
import { updateNote, useStore } from "../store";
import { color, font } from "../theme.stylex";
import { ChatIcon, PenIcon, ShareIcon } from "./icons";
import { InkMark } from "./InkMark";
import { Button, Menu } from "./primitives";

const MODES: Record<NoteMode, { label: string; description: string }> = {
  "reads-along": { label: "Reads along", description: "Reads as you write and speaks up when something is worth it." },
  "when-asked": { label: "When you ask", description: "Stays quiet until you select words or open the chat." },
};

const styles = stylex.create({
  bar: { display: "flex", alignItems: "center", gap: 2, marginLeft: -8, flexWrap: "wrap" },
  item: {
    display: "block",
    width: "100%",
    textAlign: "left",
    borderWidth: 0,
    color: "inherit",
    fontFamily: font.sans,
    padding: 8,
    borderRadius: 6,
    cursor: "pointer",
    outline: "none",
    fontSize: 13,
    backgroundColor: {
      default: "transparent",
      ":focus": color.markHover,
      ":hover": { default: "transparent", "@media (hover: hover)": color.markHover },
    },
  },
  itemLabel: { fontWeight: 500 },
  itemHint: { color: color.inkFaint, fontSize: 12, marginTop: 1, lineHeight: 1.35 },
  dot: { width: 6, height: 6, borderRadius: "50%", backgroundColor: color.inkFaint },
  dotLive: { backgroundColor: "#c9963b" },
  tell: { display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 },
  tellLabel: { fontFamily: font.sans, fontSize: 12, color: color.inkFaint, flexShrink: 0 },
  tellInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 0,
    outline: "none",
    backgroundColor: "transparent",
    color: color.ink,
    fontFamily: font.serif,
    fontSize: 15,
    padding: 0,
  },
});

export function Header({ noteId }: { noteId: string }) {
  const note = useStore((state) => state.notes[noteId]);
  const customVoices = useStore((state) => state.settings.customVoices);
  const reading = useStore((state) => state.reading !== null);
  const tellOpen = useStore((state) => state.tellOpen);
  if (!note) return null;

  const voices = [...BUILT_IN_VOICES, ...customVoices];
  const voice = voices.find((candidate) => candidate.id === note.voiceId) ?? BUILT_IN_VOICES[0]!;
  const showTell = tellOpen || note.instruction !== "";

  return (
    <div>
      <div {...stylex.props(styles.bar)} role="toolbar" aria-label="Note">
        <Menu label={<><InkMark size={11} breathing={reading} /> {voice.name}</>}>
          {voices.map((candidate) => (
            <button type="button" role="menuitem"
              key={candidate.id}
              onClick={() => updateNote(noteId, (current) => ({ ...current, voiceId: candidate.id }))}
              {...stylex.props(styles.item)}
            >
              <div {...stylex.props(styles.itemLabel)}>{candidate.name}</div>
              <div {...stylex.props(styles.itemHint)}>{candidate.instruction}</div>
            </button>
          ))}
        </Menu>
        <Button onClick={() => useStore.setState({ tellOpen: !tellOpen })}>
          <PenIcon /> Tell Apostil
        </Button>
        <Menu label={<><span {...stylex.props(styles.dot, note.mode === "reads-along" && styles.dotLive)} /> {MODES[note.mode].label}</>}>
          {(Object.keys(MODES) as NoteMode[]).map((mode) => (
            <button type="button" role="menuitem" key={mode} onClick={() => updateNote(noteId, (current) => ({ ...current, mode }))} {...stylex.props(styles.item)}>
              <div {...stylex.props(styles.itemLabel)}>{MODES[mode].label}</div>
              <div {...stylex.props(styles.itemHint)}>{MODES[mode].description}</div>
            </button>
          ))}
        </Menu>
        <Button onClick={() => useStore.setState({ dialog: "export" })}>
          <ShareIcon /> Share
        </Button>
        <Button onClick={() => useStore.setState({ chatOpen: true })}>
          <ChatIcon /> Chat
        </Button>
      </div>
      {showTell && (
        <label {...stylex.props(styles.tell)}>
          <span {...stylex.props(styles.tellLabel)}>Tell Apostil</span>
          <input
            autoFocus={tellOpen && note.instruction === ""}
            value={note.instruction}
            placeholder="How should it behave in this note?"
            onChange={(event) => updateNote(noteId, (current) => ({ ...current, instruction: event.target.value }))}
            onBlur={() => useStore.setState({ tellOpen: false })}
            {...stylex.props(styles.tellInput)}
          />
        </label>
      )}
    </div>
  );
}
