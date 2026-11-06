import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

export function toggleWrap(view: EditorView, marker: string) {
  view.dispatch(
    view.state.changeByRange((range) => {
      const size = marker.length;
      const before = view.state.sliceDoc(range.from - size, range.from);
      const after = view.state.sliceDoc(range.to, range.to + size);
      if (before === marker && after === marker) {
        return {
          changes: [
            { from: range.from - size, to: range.from },
            { from: range.to, to: range.to + size },
          ],
          range: EditorSelection.range(range.from - size, range.to - size),
        };
      }
      return {
        changes: [
          { from: range.from, insert: marker },
          { from: range.to, insert: marker },
        ],
        range: EditorSelection.range(range.from + size, range.to + size),
      };
    }),
  );
  view.focus();
}

export function setLinePrefix(view: EditorView, prefix: string) {
  const changes = [];
  const seen = new Set<number>();
  for (const range of view.state.selection.ranges) {
    let position = range.from;
    while (position <= range.to) {
      const line = view.state.doc.lineAt(position);
      if (!seen.has(line.number)) {
        seen.add(line.number);
        const existing = /^(#{1,3} |[-*] |\d+\. |> )/.exec(line.text)?.[0] ?? "";
        const insert = existing === prefix ? "" : prefix;
        changes.push({ from: line.from, to: line.from + existing.length, insert });
      }
      position = line.to + 1;
    }
  }
  const changeSet = view.state.changes(changes);
  view.dispatch({ changes: changeSet, selection: view.state.selection.map(changeSet, 1) });
  view.focus();
}
