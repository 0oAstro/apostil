import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { EditorState, Prec } from "@codemirror/state";
import { drawSelection, EditorView, keymap } from "@codemirror/view";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { TEXT_SIZES } from "../domain/types";
import { editorBridge } from "../editor/bridge";
import { toggleWrap } from "../editor/format";
import { continueList, markdownSupport } from "../editor/language";
import { preview } from "../editor/preview";
import { editorHighlight, editorTheme } from "../editor/theme";
import { liveAnchors, setDisplay, setThreads, threadExtensions, threadField } from "../editor/threads";
import { IMAGE_SCHEME, saveImage } from "../images";
import { createReader } from "../reader";
import { setEditedText, useStore } from "../store";
import { slashKeys } from "./SlashMenu";
import { bumpLayout, Margins } from "./Margins";

const EDITOR_WIDTH = 660;
const MAX_MARGIN_WIDTH = 270;
const MIN_MARGIN_WIDTH = 150;
const MARGIN_GUTTER = 36;

const styles = stylex.create({
  wrap: { position: "relative", width: "100%" },
});

function describeSlash(view: EditorView) {
  const head = view.state.selection.main.head;
  const line = view.state.doc.lineAt(head);
  const before = line.text.slice(0, head - line.from);
  if (!view.state.selection.main.empty || !/^\/\w*$/.test(before)) return null;
  const coords = view.coordsAtPos(head);
  if (!coords) return null;
  return { from: line.from, to: head, query: before.slice(1).toLowerCase(), top: coords.bottom, left: coords.left };
}

function publishSelection(view: EditorView) {
  const range = view.state.selection.main;
  if (range.empty) {
    if (useStore.getState().selection) useStore.setState({ selection: null });
    return;
  }
  view.requestMeasure({
    key: "apostil-selection",
    read: (measured) => ({ start: measured.coordsAtPos(range.from, 1), end: measured.coordsAtPos(range.to, -1), bounds: measured.contentDOM.getBoundingClientRect() }),
    write: ({ start, end, bounds }) => {
      if (!start || !end) return;
      useStore.setState({
        selection: {
          from: range.from,
          to: range.to,
          text: view.state.sliceDoc(range.from, range.to),
          top: start.top,
          bottom: end.bottom,
          left: bounds.right,
        },
      });
    },
  });
}

export function Editor({ noteId }: { noteId: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<EditorView | null>(null);
  const [availableWidth, setAvailableWidth] = useState(window.innerWidth);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const note = useStore.getState().notes[noteId];
    if (!note) return;

    let dragging = false;
    let readerHandle: ReturnType<typeof createReader> | null = null;

    const created = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: note.text,
        extensions: [
          history(),
          drawSelection(),
          EditorView.lineWrapping,
          markdownSupport,
          editorHighlight,
          editorTheme,
          threadExtensions,
          preview,
          Prec.highest(slashKeys),
          keymap.of([
            { key: "Mod-b", run: (target) => (toggleWrap(target, "**"), true) },
            { key: "Mod-i", run: (target) => (toggleWrap(target, "*"), true) },
            { key: "Enter", run: continueList },
            ...historyKeymap,
            ...defaultKeymap,
            indentWithTab,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              setEditedText(noteId, update.state.doc.toString(), liveAnchors(update.state));
              readerHandle?.noteEdited();
            }
            if (update.docChanged || update.geometryChanged || update.heightChanged || update.viewportChanged) bumpLayout();
            if (update.selectionSet || update.docChanged) {
              if (!dragging) publishSelection(update.view);
              const slash = update.view.hasFocus ? describeSlash(update.view) : null;
              if (slash || useStore.getState().slash) useStore.setState({ slash });
            }
          }),
          EditorView.domEventHandlers({
            pointerdown: (event) => {
              dragging = true;
              const target = (event.target as HTMLElement).closest<HTMLElement>("[data-thread]");
              useStore.setState({ activeThreadId: target?.dataset.thread ?? null, selection: null });
            },
            pointerup: (_event, target) => {
              dragging = false;
              publishSelection(target);
            },
            paste: (event, target) => insertImages(event.clipboardData?.files, target),
            drop: (event, target) => insertImages(event.dataTransfer?.files, target),
          }),
        ],
      }),
    });

    created.dispatch({ effects: setThreads.of(note.threads) });
    readerHandle = createReader(created);
    editorBridge.view = created;
    setView(created);
    if (!note.text) created.focus();

    const stopThreads = useStore.subscribe((state, previous) => {
      const threads = state.notes[noteId]?.threads;
      if (threads && threads !== previous.notes[noteId]?.threads) {
        const known = created.state.field(threadField).items;
        const changed = known.length !== threads.length || known.some((item, index) => item.id !== threads[index]?.id || item.phase !== threads[index]?.phase);
        if (changed) created.dispatch({ effects: setThreads.of(threads) });
      }
      if (state.activeThreadId !== previous.activeThreadId || state.justMyWords !== previous.justMyWords || state.reading !== previous.reading) {
        created.dispatch({ effects: setDisplay.of({ active: state.activeThreadId, hidden: state.justMyWords, reading: state.reading }) });
      }
    });

    const { activeThreadId, justMyWords, reading } = useStore.getState();
    created.dispatch({ effects: setDisplay.of({ active: activeThreadId, hidden: justMyWords, reading }) });

    return () => {
      stopThreads();
      readerHandle?.destroy();
      if (editorBridge.view === created) editorBridge.view = null;
      created.destroy();
    };
  }, [noteId]);

  useEffect(() => {
    const onResize = () => setAvailableWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fontSize = useStore((state) => TEXT_SIZES[state.settings.textSize].body);
  useEffect(() => {
    view?.requestMeasure();
    bumpLayout();
  }, [fontSize, view]);

  const sideSpace = (availableWidth - EDITOR_WIDTH) / 2 - MARGIN_GUTTER - 16;
  const layoutPref = useStore((state) => state.settings.layout);
  const bothFit = sideSpace >= MIN_MARGIN_WIDTH;
  const rightOnlySpace = availableWidth - EDITOR_WIDTH - MARGIN_GUTTER - 24;
  const columnWidth = layoutPref === "both" && bothFit ? Math.min(sideSpace, MAX_MARGIN_WIDTH) : Math.min(Math.max(bothFit ? sideSpace : rightOnlySpace, 0), MAX_MARGIN_WIDTH);

  return (
    <div {...stylex.props(styles.wrap)} style={{ fontSize }}>
      <div ref={hostRef} data-editor-host />
      {view && <Margins view={view} noteId={noteId} columnWidth={columnWidth} canUseLeft={bothFit} narrow={columnWidth < MIN_MARGIN_WIDTH} />}
    </div>
  );
}

function insertImages(files: FileList | undefined, view: EditorView): boolean {
  const images = [...(files ?? [])].filter((file) => file.type.startsWith("image/"));
  if (images.length === 0) return false;
  void (async () => {
    for (const image of images) {
      const id = await saveImage(image);
      const position = view.state.selection.main.head;
      const line = view.state.doc.lineAt(position);
      const insert = `${line.length ? "\n" : ""}![](${IMAGE_SCHEME}${id})\n`;
      view.dispatch({ changes: { from: line.to, insert }, selection: { anchor: line.to + insert.length } });
    }
  })();
  return true;
}
