import type { EditorView } from "@codemirror/view";
import { runFocusTask } from "./actions";
import { connectionIsComplete } from "./ai/providers";
import { READ_DELAY_MS } from "./domain/types";
import { stepReader, type ReaderEvent, type ReaderState } from "./reader-machine";
import { activeNote, useStore } from "./store";

const MIN_FOCUS_LENGTH = 10;

export function createReader(view: EditorView) {
  let state: ReaderState = { tag: "idle" };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | null = null;
  const alreadyRead = new Set<string>();

  function send(event: ReaderEvent) {
    const step = stepReader(state, event);
    state = step.state;
    for (const effect of step.effects) {
      if (effect === "start-timer") {
        clearTimeout(timer);
        const delay = READ_DELAY_MS[useStore.getState().settings.pace];
        timer = setTimeout(() => send("pause-elapsed"), delay);
      } else if (effect === "abort-read") {
        controller?.abort();
        useStore.setState({ reading: null });
      } else {
        void startRead();
      }
    }
  }

  function findFocus(): { from: number; to: number; text: string } | null {
    const doc = view.state.doc;
    let line = doc.lineAt(view.state.selection.main.head);
    while (line.text.trim() === "" && line.number > 1) line = doc.line(line.number - 1);
    const text = line.text.trim();
    if (text.length < MIN_FOCUS_LENGTH || alreadyRead.has(text)) return null;
    return { from: line.from, to: line.to, text: line.text };
  }

  async function startRead() {
    const note = activeNote();
    const focus = findFocus();
    const { connection } = useStore.getState();
    if (!note || note.mode !== "reads-along" || !focus || !connectionIsComplete(connection)) {
      send("finished");
      return;
    }

    controller = new AbortController();
    const current = controller;
    useStore.setState({ reading: { from: focus.from, to: focus.to } });
    await runFocusTask({ task: "read", focus: focus.text }, focus, {
      signal: current.signal,
      onReplyStarted: () => send("reply-started"),
    });
    if (current.signal.aborted) return;
    alreadyRead.add(focus.text.trim());
    useStore.setState({ reading: null });
    send("finished");
  }

  return {
    noteEdited: () => send("edit"),
    destroy: () => {
      clearTimeout(timer);
      controller?.abort();
      useStore.setState({ reading: null });
    },
  };
}
