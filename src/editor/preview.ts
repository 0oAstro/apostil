import { syntaxTree } from "@codemirror/language";
import { type Range } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view";

const HIDDEN = Decoration.replace({});
const LINE_CLASS: Record<string, string> = {
  ATXHeading1: "cm-h1",
  ATXHeading2: "cm-h2",
  ATXHeading3: "cm-h3",
  Blockquote: "cm-quote",
  FencedCode: "cm-code-block",
  HorizontalRule: "cm-rule",
};

function buildPreview(view: EditorView): DecorationSet {
  const { state } = view;
  const ranges: Range<Decoration>[] = [];
  const cursorLines = new Set<number>();
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number;
    const last = state.doc.lineAt(range.to).number;
    for (let number = first; number <= last; number += 1) cursorLines.add(number);
  }

  const hideOffCursor = (from: number, to: number) => {
    if (!cursorLines.has(state.doc.lineAt(from).number)) ranges.push(HIDDEN.range(from, to));
  };

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter(node) {
        const lineClass = LINE_CLASS[node.name];
        if (lineClass) {
          const lastLine = state.doc.lineAt(node.to).number;
          for (let number = state.doc.lineAt(node.from).number; number <= lastLine; number += 1) {
            ranges.push(Decoration.line({ class: lineClass }).range(state.doc.line(number).from));
          }
        }
        switch (node.name) {
          case "HeaderMark": {
            const after = state.sliceDoc(node.to, node.to + 1) === " " ? node.to + 1 : node.to;
            hideOffCursor(node.from, after);
            break;
          }
          case "EmphasisMark":
          case "CodeMark":
          case "StrikethroughMark":
            if (node.node.parent?.name !== "FencedCode") hideOffCursor(node.from, node.to);
            break;
          case "QuoteMark": {
            const after = state.sliceDoc(node.to, node.to + 1) === " " ? node.to + 1 : node.to;
            hideOffCursor(node.from, after);
            break;
          }
          case "ListMark": {
            const line = state.doc.lineAt(node.from);
            const indent = node.from - line.from;
            ranges.push(
              Decoration.line({
                class: "cm-list",
                attributes: { style: `--list-indent:${indent + node.to - node.from + 1}ch` },
              }).range(line.from),
            );
            break;
          }
          default:
            break;
        }
      },
    });
  }

  const head = state.doc.lineAt(state.selection.main.head);
  if (view.hasFocus && head.length === 0 && state.selection.main.empty) {
    ranges.push(Decoration.line({ class: "cm-hint" }).range(head.from));
  }
  return Decoration.set(ranges, true);
}

export const preview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildPreview(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged) {
        this.decorations = buildPreview(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
