import type { EditorView } from "@codemirror/view";

export const editorBridge: { view: EditorView | null; layoutVersion: number } = { view: null, layoutVersion: 0 };
