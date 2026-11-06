import type { Diagram } from "./diagram";

export type NoteMode = "reads-along" | "when-asked";
export type Side = "left" | "right";
export type ThreadKind = "margin" | "inline";

export type Message = {
  id: string;
  role: "writer" | "apostil";
  text: string;
  diagram?: Diagram;
};

export type Anchor = { from: number; to: number };

export type Thread = {
  id: string;
  kind: ThreadKind;
  side: Side;
  anchor: Anchor;
  quote: string;
  messages: Message[];
  phase: "streaming" | "idle" | "failed";
  error?: string;
};

export type Note = {
  id: string;
  title: string;
  text: string;
  instruction: string;
  voiceId: string;
  mode: NoteMode;
  threads: Thread[];
  chat: Message[];
  updatedAt: number;
};

export type Voice = { id: string; name: string; instruction: string };

export const BUILT_IN_VOICES: Voice[] = [
  {
    id: "apostil",
    name: "Apostil",
    instruction: "A curious, honest reader. Questions first. Explains when the writer is stuck.",
  },
  {
    id: "interviewer",
    name: "Interviewer",
    instruction:
      "A technical interviewer. Give only the hints an interviewer would give. Never reveal the answer unless the writer explicitly asks for it.",
  },
  {
    id: "antagonist",
    name: "Antagonist",
    instruction: "Disagree with the premise. Find the strongest objection and press on it.",
  },
  {
    id: "tutor",
    name: "Tutor",
    instruction: "A patient tutor. Catch misunderstandings early and draw things whenever a picture would help.",
  },
  {
    id: "listener",
    name: "Listener",
    instruction: "A warm friend reading a journal. Listen, ask what happened, and do not try to fix anything.",
  },
];

export type Layout = "both" | "right" | "marks";
export type Appearance = "system" | "light" | "dark";
export type TextSize = "small" | "default" | "large";
export type Pace = "regular" | "slow";
export type MarginVoice = "serif" | "sans";

export type Settings = {
  defaultMode: NoteMode;
  inkFromPointer: boolean;
  pace: Pace;
  layout: Layout;
  appearance: Appearance;
  textSize: TextSize;
  marginVoice: MarginVoice;
  inkColor: string;
  customVoices: Voice[];
};

export const DEFAULT_SETTINGS: Settings = {
  defaultMode: "reads-along",
  inkFromPointer: false,
  pace: "regular",
  layout: "both",
  appearance: "system",
  textSize: "default",
  marginVoice: "serif",
  inkColor: "#1f2322",
  customVoices: [],
};

export const INK_COLORS = ["#1f2322", "#3f5f8a", "#2f7a6a", "#b4532a", "#a8324a", "#6b4fa0", "#8a6d1f"];

export const TEXT_SIZES: Record<TextSize, { body: number; margin: number }> = {
  small: { body: 15, margin: 14 },
  default: { body: 16, margin: 15 },
  large: { body: 18, margin: 16 },
};

export const READ_DELAY_MS: Record<Pace, number> = { regular: 1400, slow: 4000 };
