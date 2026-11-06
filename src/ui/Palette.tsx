import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";
import { searchNotes } from "../domain/note-text";
import { createNote, openNote, useStore } from "../store";
import { color, font } from "../theme.stylex";

const styles = stylex.create({
  scrim: { position: "fixed", inset: 0, zIndex: 50, backgroundColor: color.scrim, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "16vh" },
  panel: {
    width: 520,
    maxWidth: "calc(100vw - 32px)",
    backgroundColor: color.paper,
    color: color.ink,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
    fontFamily: font.sans,
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: color.rule,
    outline: "none",
    backgroundColor: "transparent",
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 15,
    paddingBlock: 14,
    paddingInline: 16,
  },
  list: { maxHeight: 320, overflowY: "auto", padding: 6 },
  item: {
    display: "block",
    width: "100%",
    textAlign: "left",
    borderWidth: 0,
    borderRadius: 6,
    backgroundColor: "transparent",
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 13.5,
    paddingBlock: 8,
    paddingInline: 10,
    cursor: "pointer",
  },
  selected: { backgroundColor: color.markHover },
});

type Result = { key: string; label: string; run: () => void };

export function Palette() {
  const open = useStore((state) => state.dialog === "palette");
  const notes = useStore((state) => state.notes);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [query, open]);

  if (!open) return null;

  const close = () => {
    setQuery("");
    useStore.setState({ dialog: null });
  };

  const results: Result[] = searchNotes(Object.values(notes), query).map((note) => ({
    key: note.id,
    label: note.title || "Untitled",
    run: () => openNote(note.id),
  }));
  const title = query.trim();
  if (title) results.push({ key: "create", label: `Start “${title}”`, run: () => createNote(title) });

  const choose = (result: Result | undefined) => {
    result?.run();
    close();
  };

  return (
    <div {...stylex.props(styles.scrim)} onPointerDown={close}>
      <div role="dialog" aria-label="Find or start a note" {...stylex.props(styles.panel)} onPointerDown={(event) => event.stopPropagation()}>
        <input
          autoFocus
          aria-label="Find or start a note"
          placeholder="Find or start a note…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
            if (event.key === "Enter") choose(results[selected]);
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const delta = event.key === "ArrowDown" ? 1 : -1;
              setSelected((selected + delta + results.length) % results.length);
            }
          }}
          {...stylex.props(styles.input)}
        />
        <div {...stylex.props(styles.list)}>
          {results.map((result, index) => (
            <button key={result.key} type="button" onPointerEnter={() => setSelected(index)} onClick={() => choose(result)} {...stylex.props(styles.item, index === selected && styles.selected)}>
              {result.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
