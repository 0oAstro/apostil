import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { diagramSchema } from "./diagram-schema";
import type { Note, Thread } from "../domain/types";
import { BUILT_IN_VOICES, type Voice } from "../domain/types";

const diagramHelp = `Draw on a canvas 480 wide. Coordinates are absolute. Start drawing near y=20 and set height to just past your lowest shape.
Each stage adds shapes on top of the earlier stages, so the writer can step through. A process gets 3 to 5 stages. A static picture gets 1.
Draw anything: grids, force diagrams, molecules, timelines, system boxes.
Rules for clean drawings:
- One text shape per label. Never put several labels in one string.
- Compute positions from a shared grid. Keep labels from touching each other or the lines.
- For angled lines, compute endpoints with trigonometry so that perpendicular and parallel arrows are exact.
- Center labels with anchor "middle". Set maxWidth on any label longer than a few words.
- Mark what a stage changed with a filled rect behind it, or an arrow.
Example of one cell in a grid, with its value and an arrow into it:
{"type":"rect","x":150,"y":20,"width":60,"height":60},{"type":"text","x":180,"y":50,"text":"2","anchor":"middle","size":16},{"type":"line","x1":118,"y1":50,"x2":146,"y2":50,"arrow":true}`;

const margin_note = tool({
  description: "Write a short thought in the page margin beside a phrase in the note.",
  inputSchema: z.object({
    quote: z.string().describe("The exact phrase from the note this is about. Copy it character for character."),
    side: z.enum(["left", "right"]).describe("Which margin. Vary it so notes do not pile up."),
    text: z.string().describe("Plain sentences with no markdown. One to three sentences."),
  }),
});

const inline_reply = tool({
  description: "Write directly under the writer's latest line. Use when an explanation or a drawing is needed.",
  inputSchema: z.object({
    text: z.string().describe("Markdown. Keep it short."),
    diagram: diagramSchema.optional().describe(diagramHelp),
  }),
});

const draw = tool({
  description: "Draw the selected idea under the writer's line.",
  inputSchema: z.object({
    text: z.string().describe("One sentence introducing the drawing."),
    diagram: diagramSchema.describe(diagramHelp),
  }),
});

const stay_silent = tool({
  description: "Say nothing. Use this most of the time: when the writer is mid-thought, or you have nothing worth interrupting for.",
  inputSchema: z.object({}),
});

const respond = tool({
  description: "Answer in this conversation.",
  inputSchema: z.object({
    text: z.string().describe("Your answer. Keep it short."),
    diagram: diagramSchema.optional().describe(diagramHelp),
  }),
});

export type TaskRequest =
  | { task: "read"; focus: string }
  | { task: "gloss"; focus: string }
  | { task: "ask"; focus: string; question: string }
  | { task: "visualize"; focus: string }
  | { task: "reply"; thread: Thread }
  | { task: "chat"; question: string };

export type TaskName = TaskRequest["task"];

export const TASKS: Record<TaskName, { tools?: ToolSet; brief: string }> = {
  read: {
    tools: { stay_silent, margin_note, inline_reply },
    brief:
      "The writer just paused after writing the focus text. Decide whether to speak. Stay silent unless you have something specific: a mistake, an unexamined assumption, a question that moves them forward, or an explanation or drawing they asked for. If they say they are stuck or ask for help, use inline_reply. Otherwise prefer margin_note.",
  },
  gloss: {
    tools: { margin_note, inline_reply },
    brief:
      "The writer selected the focus text and asked you to respond without saying how. Do whatever serves them best given what they are doing in this note.",
  },
  ask: {
    tools: { margin_note },
    brief: "The writer selected the focus text and asked you a direct question. Answer it in the margin.",
  },
  visualize: {
    tools: { draw },
    brief: "The writer selected the focus text and asked to see it drawn. Draw what makes it click.",
  },
  reply: {
    tools: { respond },
    brief: "The writer replied to you in a thread. Continue that conversation.",
  },
  chat: {
    brief:
      "The writer opened the side chat about this whole note. Answer about the note as a whole, using markdown when it helps. Point at their own words.",
  },
};

const PRINCIPLES = `You are Apostil, a reader who writes in the margins of someone's notebook.

You think with the writer, never for them. Their thoughts go first. Your job is to make them think more, not less.
- Prefer a question that exposes the gap over an explanation that closes it.
- Do not write their work, finish their ideas, or summarize them back.
- Be specific to their exact words. Generic advice is worse than silence.
- Be brief. A margin holds one thought.
- Sound like a sharp person, not an assistant. No praise, no preamble, no offers of further help.
The writer's instructions for this note outrank everything above except brevity.`;

export function findVoice(id: string, customVoices: Voice[]): Voice {
  const voices = [...BUILT_IN_VOICES, ...customVoices];
  return voices.find((voice) => voice.id === id) ?? BUILT_IN_VOICES[0]!;
}

export function buildSystemPrompt(task: TaskName, note: Note, voice: Voice): string {
  const parts = [PRINCIPLES, `Your voice in this note: ${voice.instruction}`];
  if (note.instruction.trim()) parts.push(`The writer told you, for this note: ${note.instruction.trim()}`);
  parts.push(TASKS[task].brief);
  return parts.join("\n\n");
}

function describeThreads(note: Note): string {
  const lines: string[] = [];
  for (const thread of note.threads) {
    const first = thread.messages.find((message) => message.role === "apostil");
    if (first) lines.push(`- On "${thread.quote}": ${first.text}`);
  }
  return lines.length ? `\n\nWhat you already said (do not repeat it):\n${lines.join("\n")}` : "";
}

export function buildPrompt(request: TaskRequest, note: Note): string {
  const context = `Note title: ${note.title || "Untitled"}\n\n<note>\n${note.text}\n</note>${describeThreads(note)}`;
  switch (request.task) {
    case "read":
    case "gloss":
    case "visualize":
      return `${context}\n\nFocus text:\n${request.focus}`;
    case "ask":
      return `${context}\n\nFocus text:\n${request.focus}\n\nQuestion: ${request.question}`;
    case "reply": {
      const transcript = request.thread.messages
        .map((message) => `${message.role === "writer" ? "Writer" : "You"}: ${message.text}`)
        .join("\n");
      return `${context}\n\nThis thread is about: "${request.thread.quote}"\n\n${transcript}`;
    }
    case "chat":
      return `${context}\n\nConversation so far is above in the messages. Latest question: ${request.question}`;
  }
}
