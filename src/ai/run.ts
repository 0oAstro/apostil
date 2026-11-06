import { parsePartialJson, streamText, type ModelMessage } from "ai";
import type { Diagram } from "../domain/diagram";
import { readPartialDiagram } from "./diagram-schema";
import type { Message, Note, Side, Voice } from "../domain/types";
import { explainProviderError, PROVIDERS, type Connection } from "./providers";
import { buildPrompt, buildSystemPrompt, findVoice, TASKS, type TaskRequest } from "./tasks";

export type Reply =
  | { kind: "silent" }
  | { kind: "margin"; quote: string; side: Side; text: string }
  | { kind: "inline"; text: string; diagram?: Diagram };

export type ImageInput = { dataUrl: string };

export function readToolInput(toolName: string, input: unknown, complete: boolean): Reply | null {
  if (typeof input !== "object" || input === null) return null;
  const fields = input as Record<string, unknown>;
  const text = typeof fields.text === "string" ? fields.text : "";

  switch (toolName) {
    case "stay_silent":
      return { kind: "silent" };
    case "margin_note":
      return {
        kind: "margin",
        quote: typeof fields.quote === "string" ? fields.quote : "",
        side: fields.side === "left" ? "left" : "right",
        text,
      };
    case "inline_reply":
    case "draw":
    case "respond": {
      const diagram = readPartialDiagram(fields.diagram, complete) ?? undefined;
      return { kind: "inline", text, diagram };
    }
    default:
      return null;
  }
}

function buildMessages(request: TaskRequest, note: Note, images: ImageInput[]): ModelMessage[] {
  const prompt = buildPrompt(request, note);
  const history: ModelMessage[] = [];
  if (request.task === "chat") {
    for (const message of note.chat as Message[]) {
      if (message.text) {
        history.push({ role: message.role === "writer" ? "user" : "assistant", content: message.text });
      }
    }
  }
  const content = [
    { type: "text" as const, text: prompt },
    ...images.map((image) => ({ type: "image" as const, image: image.dataUrl })),
  ];
  return [...history, { role: "user", content }];
}

export type RunOptions = {
  connection: Connection;
  request: TaskRequest;
  note: Note;
  customVoices: Voice[];
  images?: ImageInput[];
  signal?: AbortSignal;
  onReply: (reply: Reply) => void;
};

export async function runTask(options: RunOptions): Promise<void> {
  const { connection, request, note, customVoices, images = [], signal, onReply } = options;
  const model = await PROVIDERS[connection.provider].load(connection);
  const definition = TASKS[request.task];
  const voice = findVoice(note.voiceId, customVoices);

  const result = streamText({
    model,
    system: buildSystemPrompt(request.task, note, voice),
    messages: buildMessages(request, note, images),
    tools: definition.tools,
    toolChoice: definition.tools ? "required" : undefined,
    maxOutputTokens: 4000,
    maxRetries: 1,
    abortSignal: signal,
    onError: () => {},
  });

  let toolName = "";
  let toolJson = "";
  let text = "";

  for await (const part of result.fullStream) {
    switch (part.type) {
      case "tool-input-start":
        toolName = part.toolName;
        toolJson = "";
        break;
      case "tool-input-delta": {
        toolJson += part.delta;
        const { value } = await parsePartialJson(toolJson);
        const reply = readToolInput(toolName, value, false);
        if (reply) onReply(reply);
        break;
      }
      case "tool-call": {
        const reply = readToolInput(part.toolName, part.input, true);
        if (reply) onReply(reply);
        break;
      }
      case "text-delta":
        if (!definition.tools) {
          text += part.text;
          onReply({ kind: "inline", text });
        }
        break;
      case "error":
        throw new Error(explainProviderError(part.error));
      default:
        break;
    }
  }
}

export async function testConnection(connection: Connection): Promise<void> {
  const model = await PROVIDERS[connection.provider].load(connection);
  const result = streamText({
    model,
    prompt: "Reply with the word ok.",
    maxOutputTokens: 16,
    maxRetries: 0,
    onError: () => {},
  });
  for await (const part of result.fullStream) {
    if (part.type === "error") throw new Error(explainProviderError(part.error));
  }
}
