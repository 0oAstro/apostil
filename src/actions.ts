import { toast } from "sonner";
import { connectionIsComplete } from "./ai/providers";
import type { Reply } from "./ai/run";
import type { TaskRequest } from "./ai/tasks";
import type { Message, Thread } from "./domain/types";
import { locateQuote } from "./domain/note-text";
import { latestImages } from "./images";
import { activeNote, addThread, newId, patchLastMessage, patchThread, updateNote, useStore } from "./store";

const apostilMessage = (text: string, reply?: Reply): Message => ({
  id: newId(),
  role: "apostil",
  text,
  diagram: reply?.kind === "inline" ? reply.diagram : undefined,
});

function hasConnection(): boolean {
  const { connection } = useStore.getState();
  if (connectionIsComplete(connection)) return true;
  useStore.setState({ dialog: "connect" });
  return false;
}

const loadRunner = () => import("./ai/run");

type FocusTask = Extract<TaskRequest, { focus: string }>;

export async function runFocusTask(
  request: FocusTask,
  range: { from: number; to: number },
  options: { signal?: AbortSignal; onReplyStarted?: () => void } = {},
): Promise<void> {
  const note = activeNote();
  if (!note) return;
  const noteId = note.id;
  const { connection, settings } = useStore.getState();
  let thread: Thread | null = null;

  const startThread = (reply: Exclude<Reply, { kind: "silent" }>) => {
    const current = useStore.getState().notes[noteId];
    if (!current) return;
    const focusRange = locateQuote(current.text, request.focus, range.from) ?? range;
    const quoted = reply.kind === "margin" ? locateQuote(current.text, reply.quote, focusRange.from) : null;
    const anchor = quoted ?? focusRange;
    thread = {
      id: newId(),
      kind: reply.kind,
      side: reply.kind === "margin" ? reply.side : "right",
      anchor,
      quote: current.text.slice(anchor.from, anchor.to),
      messages: [apostilMessage(reply.text, reply)],
      phase: "streaming",
    };
    addThread(noteId, thread);
    options.onReplyStarted?.();
    if (request.task !== "read") useStore.setState({ activeThreadId: null });
  };

  try {
    const { runTask } = await loadRunner();
    await runTask({
      connection,
      request,
      note,
      customVoices: settings.customVoices,
      images: await latestImages(note.text),
      signal: options.signal,
      onReply: (reply) => {
        if (reply.kind === "silent") return;
        if (!reply.text && !(reply.kind === "inline" && reply.diagram)) return;
        if (!thread) {
          startThread(reply);
          return;
        }
        const diagram = reply.kind === "inline" ? reply.diagram : undefined;
        patchThread(noteId, thread.id, (current) => ({
          ...current,
          messages: patchLastMessage(current.messages, { text: reply.text, diagram }),
        }));
      },
    });
    const finished = thread as Thread | null;
    if (!finished) {
      if (request.task !== "read") throw new Error("The model finished without answering.");
      return;
    }
    const latest = useStore.getState().notes[noteId]?.threads.find((item) => item.id === finished.id);
    if (request.task === "visualize" && !latest?.messages.at(-1)?.diagram) {
      throw new Error("The model finished without drawing anything.");
    }
    patchThread(noteId, finished.id, (current) => ({ ...current, phase: "idle" }));
  } catch (error) {
    if (options.signal?.aborted) return;
    const message = error instanceof Error ? error.message : String(error);
    toast.error(message, { id: "model-error" });
    if (thread) {
      patchThread(noteId, (thread as Thread).id, (current) => ({ ...current, phase: "failed", error: message }));
    }
  }
}

export function runFromSelection(
  task: "gloss" | "visualize" | "ask",
  range: { from: number; to: number; text: string },
  question = "",
) {
  if (!hasConnection()) return;
  useStore.setState({ selection: null });
  const request: FocusTask =
    task === "ask" ? { task, focus: range.text, question } : { task, focus: range.text };
  void runFocusTask(request, range);
}

export async function replyInThread(threadId: string, text: string) {
  const note = activeNote();
  const thread = note?.threads.find((candidate) => candidate.id === threadId);
  if (!note || !thread || !hasConnection()) return;

  const writer: Message = { id: newId(), role: "writer", text };
  const withQuestion: Thread = { ...thread, messages: [...thread.messages, writer], phase: "streaming", error: undefined };
  patchThread(note.id, threadId, () => ({ ...withQuestion, messages: [...withQuestion.messages, apostilMessage("")] }));

  const { connection, settings } = useStore.getState();
  try {
    const { runTask } = await loadRunner();
    await runTask({
      connection,
      request: { task: "reply", thread: withQuestion },
      note,
      customVoices: settings.customVoices,
      images: await latestImages(note.text),
      onReply: (reply) => {
        if (reply.kind !== "inline") return;
        patchThread(note.id, threadId, (current) => ({
          ...current,
          messages: patchLastMessage(current.messages, { text: reply.text, diagram: reply.diagram }),
        }));
      },
    });
    patchThread(note.id, threadId, (current) => ({ ...current, phase: "idle" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toast.error(message, { id: "model-error" });
    patchThread(note.id, threadId, (current) => ({ ...current, phase: "failed", error: message }));
  }
}

export async function askChat(question: string) {
  const note = activeNote();
  if (!note || !hasConnection()) return;

  const writer: Message = { id: newId(), role: "writer", text: question };
  updateNote(note.id, (current) => ({ ...current, chat: [...current.chat, writer, apostilMessage("")] }));
  useStore.setState({ chatStreaming: true });

  const { connection, settings } = useStore.getState();
  try {
    const { runTask } = await loadRunner();
    await runTask({
      connection,
      request: { task: "chat", question },
      note,
      customVoices: settings.customVoices,
      images: await latestImages(note.text),
      onReply: (reply) => {
        if (reply.kind !== "inline") return;
        updateNote(note.id, (current) => ({ ...current, chat: patchLastMessage(current.chat, { text: reply.text }) }));
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toast.error(message, { id: "model-error" });
    updateNote(note.id, (current) => ({ ...current, chat: patchLastMessage(current.chat, { text: `Could not answer: ${message}` }) }));
  } finally {
    useStore.setState({ chatStreaming: false });
  }
}
