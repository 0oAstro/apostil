import { defineLanguageFacet, Language, LanguageSupport } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";
import { GFM, parser } from "@lezer/markdown";

const facet = defineLanguageFacet();

export const markdownSupport = new LanguageSupport(new Language(facet, parser.configure(GFM)));

export function continueList(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  if (!range.empty) return false;
  const line = state.doc.lineAt(range.head);
  const match = /^(\s*)([-*]|(\d+)\.)( +)(.*)$/.exec(line.text);
  if (!match) return false;

  const [, indent, marker, number, spaces, content] = match;
  if (!content) {
    view.dispatch({ changes: { from: line.from, to: line.to }, selection: { anchor: line.from } });
    return true;
  }
  const next = number ? `${Number(number) + 1}.` : marker;
  const insert = `\n${indent}${next}${spaces}`;
  view.dispatch({ changes: { from: range.head, insert }, selection: { anchor: range.head + insert.length }, userEvent: "input" });
  return true;
}
