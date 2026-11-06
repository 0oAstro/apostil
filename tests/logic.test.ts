import { describe, expect, it } from "vitest";
import { readPartialDiagram } from "../src/ai/diagram-schema";
import { connectionIsComplete, EMPTY_CONNECTION, explainProviderError } from "../src/ai/providers";
import { readToolInput } from "../src/ai/run";
import { croppedView, type Diagram } from "../src/domain/diagram";
import { safeHref } from "../src/domain/markdown";
import { locateQuote, searchNotes } from "../src/domain/note-text";
import type { Note, Thread } from "../src/domain/types";
import { noteToMarkdown } from "../src/export";
import { placeMarginItems } from "../src/layout/margin";
import { stepReader, type ReaderState } from "../src/reader-machine";

const note = (fields: Partial<Note>): Note => ({
  id: "n",
  title: "",
  text: "",
  instruction: "",
  voiceId: "apostil",
  mode: "reads-along",
  threads: [],
  chat: [],
  updatedAt: 0,
  ...fields,
});

const thread = (fields: Partial<Thread>): Thread => ({
  id: "t",
  kind: "margin",
  side: "right",
  anchor: { from: 0, to: 0 },
  quote: "",
  messages: [],
  phase: "idle",
  ...fields,
});

describe("reader", () => {
  const reading: ReaderState = { tag: "reading", speaking: false, editedSince: false };

  it("waits for a pause before it reads", () => {
    const waiting = stepReader({ tag: "idle" }, "edit");
    expect(waiting.effects).toEqual(["start-timer"]);
    expect(stepReader(waiting.state, "pause-elapsed").effects).toEqual(["start-read"]);
  });

  it("drops a read when the writer types before the model has spoken", () => {
    const step = stepReader(reading, "edit");
    expect(step.state.tag).toBe("waiting");
    expect(step.effects).toEqual(["abort-read", "start-timer"]);
  });

  it("lets a reply finish once it has started, then reads again", () => {
    const speaking = stepReader(reading, "reply-started").state;
    const edited = stepReader(speaking, "edit");
    expect(edited.effects).toEqual([]);
    const finished = stepReader(edited.state, "finished");
    expect(finished.state.tag).toBe("waiting");
    expect(finished.effects).toEqual(["start-timer"]);
  });

  it("goes idle when a read finishes with no new writing", () => {
    expect(stepReader(reading, "finished").state.tag).toBe("idle");
  });
});

describe("margin placement", () => {
  it("keeps notes on their anchors when they fit", () => {
    const placed = placeMarginItems([{ id: "a", anchorY: 0, height: 40 }, { id: "b", anchorY: 100, height: 40 }], null);
    expect(placed.map((item) => item.y)).toEqual([0, 100]);
  });

  it("pushes overlapping notes down without changing input order", () => {
    const placed = placeMarginItems([{ id: "b", anchorY: 10, height: 40 }, { id: "a", anchorY: 0, height: 100 }], null);
    expect(placed.find((item) => item.id === "a")?.y).toBe(0);
    expect(placed.find((item) => item.id === "b")?.y).toBe(114);
  });

  it("holds the active note on its anchor and moves its neighbours away", () => {
    const placed = placeMarginItems(
      [{ id: "a", anchorY: 0, height: 100 }, { id: "b", anchorY: 50, height: 100 }, { id: "c", anchorY: 60, height: 20 }],
      "b",
    );
    const y = (id: string) => placed.find((item) => item.id === id)?.y;
    expect(y("b")).toBe(50);
    expect(y("a")).toBe(50 - 14 - 100);
    expect(y("c")).toBe(50 + 100 + 14);
  });
});

describe("streaming diagrams", () => {
  const shapes = [
    { type: "rect", x: 0, y: 0, width: 10, height: 10 },
    { type: "path", d: "M 60 290 L 4" },
  ];

  it("holds back the newest shape while it may still be cut off", () => {
    const partial = readPartialDiagram({ title: "T", stages: [{ caption: "c", shapes }] }, false);
    expect(partial?.stages[0]?.shapes).toHaveLength(1);
  });

  it("shows every shape once the tool call is complete", () => {
    const whole = readPartialDiagram({ title: "T", height: 100, stages: [{ caption: "c", shapes }] }, true);
    expect(whole?.stages[0]?.shapes).toHaveLength(2);
  });

  it("drops path data that is not path syntax", () => {
    const hostile = [{ type: "path", d: "M0 0\"/><script>alert(1)</script>" }];
    const whole = readPartialDiagram({ title: "T", stages: [{ caption: "c", shapes: hostile }] }, true);
    expect(whole?.stages[0]?.shapes).toHaveLength(0);
  });

  it("reads a diagram the model sent as a JSON string", () => {
    const text = JSON.stringify({ title: "T", height: 100, stages: [{ caption: "c", shapes }] });
    expect(readPartialDiagram(text, true)?.stages[0]?.shapes).toHaveLength(2);
    expect(readPartialDiagram(text.slice(0, 20), false)).toBeNull();
  });

  it("waits for a title", () => {
    expect(readPartialDiagram({ stages: [] }, false)).toBeNull();
  });

  it("crops blank space the model left around the drawing", () => {
    const diagram: Diagram = { title: "T", height: 500, stages: [{ caption: "", shapes: [{ type: "rect", x: 0, y: 200, width: 10, height: 50 }] }] };
    expect(croppedView(diagram)).toEqual({ top: 190, height: 70 });
  });
});

describe("model replies", () => {
  it("reads each tool as a reply the app understands", () => {
    expect(readToolInput("stay_silent", {}, true)).toEqual({ kind: "silent" });
    expect(readToolInput("margin_note", { quote: "q", side: "left", text: "t" }, true)).toEqual({ kind: "margin", quote: "q", side: "left", text: "t" });
    expect(readToolInput("respond", { text: "t" }, true)).toEqual({ kind: "inline", text: "t", diagram: undefined });
  });

  it("ignores a tool it does not know", () => {
    expect(readToolInput("delete_everything", {}, true)).toBeNull();
  });

  it("names the likely cause when the browser blocks a request", () => {
    expect(explainProviderError(new TypeError("Failed to fetch"))).toContain("CORS");
    expect(explainProviderError(new Error("Invalid API key"))).toBe("Invalid API key");
  });
});

describe("connections", () => {
  it("requires a key for hosted providers", () => {
    expect(connectionIsComplete(EMPTY_CONNECTION)).toBe(false);
    expect(connectionIsComplete({ ...EMPTY_CONNECTION, apiKey: "k" })).toBe(true);
  });

  it("requires an endpoint and no key for a custom endpoint", () => {
    const custom = { ...EMPTY_CONNECTION, provider: "openai-compatible" as const, model: "llama" };
    expect(connectionIsComplete(custom)).toBe(false);
    expect(connectionIsComplete({ ...custom, endpoint: "http://localhost:11434/v1" })).toBe(true);
  });
});

describe("note text", () => {
  it("finds the occurrence of a quote nearest the writer", () => {
    expect(locateQuote("cat dog cat", "cat", 7)).toEqual({ from: 8, to: 11 });
    expect(locateQuote("cat dog", "fish", 0)).toBeNull();
  });

  it("ranks title matches above text matches", () => {
    const inText = note({ id: "text", text: "about dynamic programming", updatedAt: 2 });
    const inTitle = note({ id: "title", title: "Dynamic Programming", updatedAt: 1 });
    expect(searchNotes([inText, inTitle], "dynamic").map((item) => item.id)).toEqual(["title", "text"]);
  });

  it("only allows web and mail links", () => {
    expect(safeHref("https://example.com")).toBe("https://example.com");
    expect(safeHref("javascript:alert(1)")).toBeUndefined();
    expect(safeHref(" JaVaScRiPt:alert(1)")).toBeUndefined();
  });
});

describe("export", () => {
  const withThread = note({
    title: "Plan",
    text: "First line\nSecond line",
    threads: [thread({ anchor: { from: 0, to: 5 }, messages: [{ id: "m", role: "apostil", text: "Why?" }] })],
  });

  it("exports only the writer's words when replies are excluded", () => {
    expect(noteToMarkdown(withThread, false)).toBe("# Plan\n\nFirst line\nSecond line\n");
  });

  it("places a reply after the line it belongs to", () => {
    expect(noteToMarkdown(withThread, true)).toBe("# Plan\n\nFirst line\n\n> **Apostil:** Why?\n\nSecond line\n");
  });
});
