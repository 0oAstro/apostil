import { del, entries, set } from "idb-keyval";
import { create } from "zustand";
import { EMPTY_CONNECTION, type Connection } from "./ai/providers";
import { DEFAULT_SETTINGS, type Anchor, type Message, type Note, type Settings, type Thread } from "./domain/types";
import { createWelcomeNote } from "./welcome";

export type Dialog = "export" | "customize" | "palette" | "connect" | null;
export type CustomizeTab = "customize" | "voices" | "connection" | "about";

export type SelectionInfo = { from: number; to: number; text: string; top: number; left: number; bottom: number };
export type SlashInfo = { from: number; to: number; query: string; top: number; left: number };

type State = {
  loaded: boolean;
  notes: Record<string, Note>;
  activeId: string;
  settings: Settings;
  connection: Connection;

  sidebarOpen: boolean;
  chatOpen: boolean;
  tellOpen: boolean;
  justMyWords: boolean;
  dialog: Dialog;
  customizeTab: CustomizeTab;
  activeThreadId: string | null;
  reading: { from: number; to: number } | null;
  selection: SelectionInfo | null;
  slash: SlashInfo | null;
  chatStreaming: boolean;
  printIncludesReplies: boolean;
};

export const newId = () => crypto.randomUUID();

const SETTINGS_KEY = "apostil.settings";
const CONNECTION_KEY = "apostil.connection";

function readStored<T extends object>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<T>) } : fallback;
}

export const useStore = create<State>(() => ({
  loaded: false,
  notes: {},
  activeId: "",
  settings: readStored(SETTINGS_KEY, DEFAULT_SETTINGS),
  connection: readStored(CONNECTION_KEY, EMPTY_CONNECTION),
  sidebarOpen: false,
  chatOpen: false,
  tellOpen: false,
  justMyWords: false,
  dialog: null,
  customizeTab: "customize",
  activeThreadId: null,
  reading: null,
  selection: null,
  slash: null,
  chatStreaming: false,
  printIncludesReplies: true,
}));

const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>();

function saveSoon(note: Note) {
  const pending = pendingSaves.get(note.id);
  if (pending) clearTimeout(pending);
  pendingSaves.set(
    note.id,
    setTimeout(() => {
      pendingSaves.delete(note.id);
      void set(`note:${note.id}`, useStore.getState().notes[note.id] ?? note);
    }, 250),
  );
}

export function activeNote(): Note | undefined {
  const state = useStore.getState();
  return state.notes[state.activeId];
}

export function updateNote(id: string, change: (note: Note) => Note) {
  const note = useStore.getState().notes[id];
  if (!note) return;
  const next = change(note);
  useStore.setState((state) => ({ notes: { ...state.notes, [id]: next } }));
  saveSoon(next);
}

export function createNote(title = ""): Note {
  const { settings } = useStore.getState();
  const note: Note = {
    id: newId(),
    title,
    text: "",
    instruction: "",
    voiceId: "apostil",
    mode: settings.defaultMode,
    threads: [],
    chat: [],
    updatedAt: Date.now(),
  };
  useStore.setState((state) => ({
    notes: { ...state.notes, [note.id]: note },
    activeId: note.id,
    activeThreadId: null,
    sidebarOpen: false,
    selection: null,
    slash: null,
  }));
  saveSoon(note);
  rememberActive(note.id);
  return note;
}

function rememberActive(id: string) {
  localStorage.setItem("apostil.activeNote", id);
}

export function openNote(id: string) {
  useStore.setState({ activeId: id, activeThreadId: null, selection: null, slash: null, chatOpen: false, reading: null });
  rememberActive(id);
}

export function deleteNote(id: string) {
  const state = useStore.getState();
  const notes = { ...state.notes };
  delete notes[id];
  useStore.setState({ notes });
  void del(`note:${id}`);
  if (state.activeId === id) {
    const next = Object.values(notes).sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (next) openNote(next.id);
    else createNote();
  }
}

export function setEditedText(id: string, text: string, anchors: Map<string, Anchor>) {
  updateNote(id, (note) => ({
    ...note,
    text,
    updatedAt: Date.now(),
    threads: note.threads.map((thread) => {
      const anchor = anchors.get(thread.id);
      return anchor ? { ...thread, anchor } : thread;
    }),
  }));
}

export function addThread(noteId: string, thread: Thread) {
  updateNote(noteId, (note) => ({ ...note, threads: [...note.threads, thread] }));
}

export function patchThread(noteId: string, threadId: string, change: (thread: Thread) => Thread) {
  updateNote(noteId, (note) => ({
    ...note,
    threads: note.threads.map((thread) => (thread.id === threadId ? change(thread) : thread)),
  }));
}

export function removeThread(noteId: string, threadId: string) {
  updateNote(noteId, (note) => ({ ...note, threads: note.threads.filter((thread) => thread.id !== threadId) }));
  if (useStore.getState().activeThreadId === threadId) useStore.setState({ activeThreadId: null });
}

export function patchLastMessage(messages: Message[], change: Partial<Message>): Message[] {
  const last = messages[messages.length - 1];
  if (!last) return messages;
  return [...messages.slice(0, -1), { ...last, ...change }];
}

export function updateSettings(change: Partial<Settings>) {
  const settings = { ...useStore.getState().settings, ...change };
  useStore.setState({ settings });
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function saveConnection(connection: Connection) {
  useStore.setState({ connection });
  localStorage.setItem(CONNECTION_KEY, JSON.stringify(connection));
}

export async function hydrate() {
  const stored = await entries<string, Note>();
  const notes: Record<string, Note> = {};
  for (const [key, note] of stored) {
    if (!key.startsWith("note:")) continue;
    notes[note.id] = {
      ...note,
      threads: note.threads.map((thread) =>
        thread.phase === "streaming" ? { ...thread, phase: "idle" as const } : thread,
      ),
    };
  }

  if (Object.keys(notes).length === 0) {
    const welcome = createWelcomeNote();
    notes[welcome.id] = welcome;
    void set(`note:${welcome.id}`, welcome);
  }

  const remembered = localStorage.getItem("apostil.activeNote");
  const newest = Object.values(notes).sort((a, b) => b.updatedAt - a.updatedAt)[0]!;
  const activeId = remembered && notes[remembered] ? remembered : newest.id;
  useStore.setState({ notes, activeId, loaded: true });
}
