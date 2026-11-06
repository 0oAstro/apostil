import { keymap, type EditorView } from "@codemirror/view";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";
import { runFromSelection } from "../actions";
import { editorBridge } from "../editor/bridge";
import { setLinePrefix } from "../editor/format";
import { useStore, type SlashInfo } from "../store";
import { menuStyles } from "./SelectionMenu";
import { press } from "./primitives";

type Command = { id: string; label: string; hint: string; run: (view: EditorView, slash: SlashInfo) => void };

function clearSlash(view: EditorView, slash: SlashInfo) {
  view.dispatch({ changes: { from: slash.from, to: slash.to } });
}

function currentLineFocus(view: EditorView) {
  let line = view.state.doc.lineAt(view.state.selection.main.head);
  while (line.text.trim() === "" && line.number > 1) line = view.state.doc.line(line.number - 1);
  return { from: line.from, to: line.to, text: line.text };
}

const prefixCommand = (id: string, label: string, prefix: string): Command => ({
  id,
  label,
  hint: prefix.trim(),
  run: (view, slash) => {
    clearSlash(view, slash);
    setLinePrefix(view, prefix);
  },
});

const COMMANDS: Command[] = [
  {
    id: "gloss",
    label: "Gloss the last line",
    hint: "Surprise me",
    run: (view, slash) => {
      clearSlash(view, slash);
      runFromSelection("gloss", currentLineFocus(view));
    },
  },
  {
    id: "visualize",
    label: "Draw the last line",
    hint: "See it drawn",
    run: (view, slash) => {
      clearSlash(view, slash);
      runFromSelection("visualize", currentLineFocus(view));
    },
  },
  {
    id: "chat",
    label: "Talk about this note",
    hint: "Side chat",
    run: (view, slash) => {
      clearSlash(view, slash);
      useStore.setState({ chatOpen: true });
    },
  },
  prefixCommand("heading", "Heading", "# "),
  prefixCommand("subheading", "Subheading", "## "),
  prefixCommand("bullets", "Bullet list", "- "),
  prefixCommand("numbers", "Numbered list", "1. "),
  prefixCommand("quote", "Quote", "> "),
];

export function matchingCommands(query: string): Command[] {
  return COMMANDS.filter((command) => command.id.startsWith(query) || command.label.toLowerCase().includes(query));
}

let selectedIndex = 0;
let notifySelected: ((index: number) => void) | null = null;

function moveSelection(delta: number, count: number) {
  selectedIndex = (selectedIndex + delta + count) % count;
  notifySelected?.(selectedIndex);
}

function runSelected(view: EditorView, slash: SlashInfo) {
  const command = matchingCommands(slash.query)[selectedIndex];
  useStore.setState({ slash: null });
  command?.run(view, slash);
}

const whenOpen = (handler: (slash: SlashInfo, view: EditorView, count: number) => void) => (view: EditorView) => {
  const { slash } = useStore.getState();
  if (!slash) return false;
  const count = matchingCommands(slash.query).length;
  if (count === 0) return false;
  handler(slash, view, count);
  return true;
};

export const slashKeys = keymap.of([
  { key: "ArrowDown", run: whenOpen((_slash, _view, count) => moveSelection(1, count)) },
  { key: "ArrowUp", run: whenOpen((_slash, _view, count) => moveSelection(-1, count)) },
  { key: "Enter", run: whenOpen((slash, view) => runSelected(view, slash)) },
  { key: "Tab", run: whenOpen((slash, view) => runSelected(view, slash)) },
  { key: "Escape", run: whenOpen(() => useStore.setState({ slash: null })) },
]);

export function SlashMenu() {
  const slash = useStore((state) => state.slash);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    notifySelected = setSelected;
    return () => {
      notifySelected = null;
    };
  }, []);

  useEffect(() => {
    selectedIndex = 0;
    setSelected(0);
  }, [slash?.query]);

  if (!slash) return null;
  const commands = matchingCommands(slash.query);
  if (commands.length === 0) return null;

  return (
    <div role="listbox" aria-label="Commands" style={{ top: slash.top + 6, left: slash.left, width: 250 }} {...stylex.props(menuStyles.menu)}>
      {commands.map((command, index) => (
        <button
          key={command.id}
          type="button"
          role="option"
          aria-selected={index === selected}
          onPointerDown={(event) => {
            event.preventDefault();
            selectedIndex = index;
            if (editorBridge.view) runSelected(editorBridge.view, slash);
          }}
          {...stylex.props(menuStyles.action, press.base, index === selected && menuStyles.actionSelected)}
        >
          {command.label} <span {...stylex.props(menuStyles.hint)}>{command.hint}</span>
        </button>
      ))}
    </div>
  );
}
