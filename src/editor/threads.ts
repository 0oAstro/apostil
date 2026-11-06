import { EditorState, StateEffect, StateField, type Extension, type Range, type Text } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Anchor, Thread } from "../domain/types";
import { InlineThread, estimateInlineHeight } from "../ui/InlineThread";
import { loadImage, IMAGE_SCHEME } from "../images";

type Item = { id: string; kind: Thread["kind"]; phase: Thread["phase"]; from: number; to: number };
type Display = { active: string | null; hidden: boolean; reading: { from: number; to: number } | null };
type FieldValue = { items: Item[]; display: Display; decorations: DecorationSet };

export const setThreads = StateEffect.define<Thread[]>();
export const setDisplay = StateEffect.define<Display>();

class InlineThreadWidget extends WidgetType {
  private root: Root | null = null;

  constructor(readonly threadId: string) {
    super();
  }

  override eq(other: InlineThreadWidget) {
    return other.threadId === this.threadId;
  }

  override toDOM() {
    const container = document.createElement("div");
    container.dataset.inlineThread = this.threadId;
    this.root = createRoot(container);
    this.root.render(createElement(InlineThread, { threadId: this.threadId }));
    return container;
  }

  override get estimatedHeight() {
    return estimateInlineHeight(this.threadId);
  }

  override ignoreEvent() {
    return true;
  }

  override destroy() {
    const root = this.root;
    setTimeout(() => root?.unmount());
  }
}

function buildDecorations(items: Item[], display: Display, doc: Text): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  if (display.reading) {
    const line = doc.lineAt(Math.min(display.reading.from, doc.length));
    ranges.push(Decoration.line({ class: "cm-reading" }).range(line.from));
  }
  if (!display.hidden) {
    for (const item of items) {
      if (item.kind === "margin" && item.from < item.to) {
        const classes = ["cm-thread-mark"];
        if (item.id === display.active) classes.push("cm-thread-active");
        if (item.phase === "streaming") classes.push("cm-thread-streaming");
        ranges.push(
          Decoration.mark({ class: classes.join(" "), attributes: { "data-thread": item.id } }).range(item.from, item.to),
        );
      }
      if (item.kind === "inline") {
        const end = doc.lineAt(Math.min(item.to, doc.length)).to;
        ranges.push(Decoration.widget({ widget: new InlineThreadWidget(item.id), block: true, side: 1 }).range(end));
      }
    }
  }
  return Decoration.set(ranges, true);
}

const toItem = (thread: Thread): Item => ({
  id: thread.id,
  kind: thread.kind,
  phase: thread.phase,
  from: thread.anchor.from,
  to: thread.anchor.to,
});

function sameThreads(items: Item[], threads: Thread[]) {
  if (items.length !== threads.length) return false;
  return items.every((item, index) => {
    const thread = threads[index];
    return thread && thread.id === item.id && thread.phase === item.phase;
  });
}

export const threadField = StateField.define<FieldValue>({
  create() {
    return {
      items: [],
      display: { active: null, hidden: false, reading: null },
      decorations: Decoration.none,
    };
  },
  update(value, transaction) {
    let { items, display } = value;
    let changed = false;

    if (transaction.docChanged) {
      items = items.map((item) => ({
        ...item,
        from: transaction.changes.mapPos(item.from, 1),
        to: transaction.changes.mapPos(item.to, -1),
      }));
      changed = true;
    }
    for (const effect of transaction.effects) {
      if (effect.is(setThreads) && !sameThreads(items, effect.value)) {
        const known = new Map(items.map((item) => [item.id, item]));
        items = effect.value.map((thread) => {
          const existing = known.get(thread.id);
          return existing ? { ...existing, phase: thread.phase } : toItem(thread);
        });
        changed = true;
      }
      if (effect.is(setDisplay)) {
        display = effect.value;
        changed = true;
      }
    }

    if (!changed) return value;
    return { items, display, decorations: buildDecorations(items, display, transaction.state.doc) };
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
});

export function liveAnchors(state: EditorState): Map<string, Anchor> {
  const anchors = new Map<string, Anchor>();
  for (const item of state.field(threadField).items) anchors.set(item.id, { from: item.from, to: item.to });
  return anchors;
}

class ImageWidget extends WidgetType {
  constructor(readonly imageId: string) {
    super();
  }
  override eq(other: ImageWidget) {
    return other.imageId === this.imageId;
  }
  override toDOM() {
    const image = document.createElement("img");
    image.className = "cm-note-image";
    image.alt = "";
    void loadImage(this.imageId).then((dataUrl) => {
      if (dataUrl) image.src = dataUrl;
    });
    return image;
  }
}

const IMAGE_LINE = new RegExp(`^!\\[[^\\]]*\\]\\(${IMAGE_SCHEME}([\\w-]+)\\)\\s*$`);

function buildImages(doc: Text): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  for (let number = 1; number <= doc.lines; number += 1) {
    const line = doc.line(number);
    const match = IMAGE_LINE.exec(line.text);
    if (match) {
      ranges.push(Decoration.replace({ widget: new ImageWidget(match[1]!), block: true }).range(line.from, line.to));
    }
  }
  return Decoration.set(ranges);
}

const imageField = StateField.define<DecorationSet>({
  create: (state) => buildImages(state.doc),
  update: (value, transaction) => (transaction.docChanged ? buildImages(transaction.state.doc) : value),
  provide: (field) => EditorView.decorations.from(field),
});

export const threadExtensions: Extension = [threadField, imageField];
