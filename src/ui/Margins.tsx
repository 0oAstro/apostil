import * as stylex from "@stylexjs/stylex";
import type { EditorView } from "@codemirror/view";
import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { TEXT_SIZES, type Side, type Thread } from "../domain/types";
import { placeMarginItems, type MarginItem } from "../layout/margin";
import { balancedWidth, fontsReady, measureHeight, sansFont, serifFont, type TextStyle } from "../layout/text";
import { removeThread, useStore } from "../store";
import { color, ease, font } from "../theme.stylex";
import { diagramHeight, DiagramView } from "./Diagram";
import { ThreadReply } from "./ThreadReply";
import { Button } from "./primitives";

export const useLayoutTick = create<{ tick: number }>(() => ({ tick: 0 }));
export const bumpLayout = () => useLayoutTick.setState((state) => ({ tick: state.tick + 1 }));

const MESSAGE_GAP = 8;
const META_HEIGHT = 20;
const ACTIVE_FOOTER = 64;
const SHEET_PADDING = 16;

const styles = stylex.create({
  column: { position: "absolute", top: 0, bottom: 0 },
  columnLeft: { right: "calc(100% + 36px)" },
  columnRight: { left: "calc(100% + 36px)" },
  sheet: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "55vh",
    overflowY: "auto",
    zIndex: 16,
    boxSizing: "border-box",
    padding: SHEET_PADDING,
    backgroundColor: color.paper,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: color.rule,
    transitionProperty: "transform",
    transitionDuration: "260ms",
    transitionTimingFunction: ease.drawer,
    transform: "translateY(0)",
    "@starting-style": { transform: "translateY(100%)" },
  },
  sheetInner: { position: "relative" },
  item: {
    position: "absolute",
    top: 0,
    willChange: "transform",
    opacity: 1,
    filter: "blur(0)",
    transitionProperty: "opacity, filter",
    transitionDuration: "260ms",
    transitionTimingFunction: "ease",
    "@starting-style": { opacity: 0, filter: "blur(2px)" },
    cursor: "pointer",
  },
  settling: {
    transitionProperty: "opacity, filter, transform",
    transitionDuration: "220ms",
    transitionTimingFunction: ease.out,
  },
  left: { right: 0, textAlign: "right" },
  right: { left: 0, textAlign: "left" },
  dim: { opacity: 0.32 },
  active: { cursor: "default" },
  message: { whiteSpace: "pre-wrap", overflowWrap: "break-word", color: color.ink },
  writerMessage: { color: color.inkSoft },
  meta: { height: META_HEIGHT, fontFamily: font.sans, fontSize: 11.5, lineHeight: `${META_HEIGHT}px`, color: color.inkFaint },
  failed: { color: color.danger },
  footer: { height: ACTIVE_FOOTER, paddingTop: 6, boxSizing: "border-box" },
  actions: { display: "flex", gap: 2, marginInline: -8, marginTop: 2 },
  actionsLeft: { justifyContent: "flex-end" },
});

type Geometry = { width: number; style: TextStyle };

function threadHeight(thread: Thread, geometry: Geometry, active: boolean): { height: number; width: number } {
  const { width, style } = geometry;
  const first = thread.messages[0];
  const multiple = thread.messages.length > 1;
  const failed = thread.phase === "failed";

  if (!active) {
    const usedWidth = first && !multiple && !first.diagram && thread.phase === "idle" ? balancedWidth(first.text, style.font, width) : width;
    let height = first ? measureHeight(first.text, style, usedWidth) : 0;
    if (first?.diagram) height += diagramHeight(first.diagram, width);
    if (multiple || failed) height += META_HEIGHT;
    return { height, width: usedWidth };
  }

  let height = ACTIVE_FOOTER;
  for (const message of thread.messages) {
    const messageStyle = message.role === "writer" ? { font: sansFont(13), lineHeight: 19 } : style;
    height += measureHeight(message.text, messageStyle, width) + MESSAGE_GAP;
    if (message.diagram) height += diagramHeight(message.diagram, width);
  }
  return { height, width };
}

function MarginNote({ thread, y, height, width, side, style, isActive, dimmed, settling, noteId }: {
  thread: Thread;
  y: number;
  height: number;
  width: number;
  side: Side;
  style: TextStyle;
  isActive: boolean;
  dimmed: boolean;
  settling: boolean;
  noteId: string;
}) {
  const shown = isActive ? thread.messages : thread.messages.slice(0, 1);
  const replies = thread.messages.filter((message) => message.role === "writer").length;

  return (
    <div
      data-margin-note={thread.id}
      data-predicted-height={Math.round(height)}
      onPointerDown={(event) => {
        event.stopPropagation();
        useStore.setState({ activeThreadId: thread.id });
      }}
      style={{ transform: `translateY(${y}px)`, width, font: style.font, lineHeight: `${style.lineHeight}px` }}
      {...stylex.props(
        styles.item,
        settling && styles.settling,
        side === "left" ? styles.left : styles.right,
        dimmed && styles.dim,
        isActive && styles.active,
      )}
    >
      {shown.map((message) => (
        <div key={message.id} style={isActive ? { marginBottom: MESSAGE_GAP } : undefined}>
          <div
            {...stylex.props(styles.message, message.role === "writer" && styles.writerMessage)}
            style={message.role === "writer" ? { font: sansFont(13), lineHeight: "19px" } : undefined}
          >
            {message.text}
          </div>
          {message.diagram && <DiagramView diagram={message.diagram} streaming={thread.phase === "streaming"} />}
        </div>
      ))}
      {!isActive && thread.phase === "failed" && <div {...stylex.props(styles.meta, styles.failed)}>Failed. Open to retry.</div>}
      {!isActive && thread.phase !== "failed" && replies > 0 && (
        <div {...stylex.props(styles.meta)}>{replies} {replies === 1 ? "reply" : "replies"}</div>
      )}
      {isActive && (
        <div {...stylex.props(styles.footer)}>
          <ThreadReply threadId={thread.id} autoFocus />
          <div {...stylex.props(styles.actions, side === "left" && styles.actionsLeft)}>
            <Button onClick={() => removeThread(noteId, thread.id)}>Dismiss</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function sideOf(thread: Thread, layout: string, canUseLeft: boolean): Side {
  if (layout !== "both" || !canUseLeft) return "right";
  return thread.side;
}

export function Margins({ view, noteId, columnWidth, canUseLeft, narrow }: { view: EditorView; noteId: string; columnWidth: number; canUseLeft: boolean; narrow: boolean }) {
  const threads = useStore((state) => state.notes[noteId]?.threads);
  const activeThreadId = useStore((state) => state.activeThreadId);
  const settings = useStore((state) => state.settings);
  const hidden = useStore((state) => state.justMyWords);
  const tick = useLayoutTick((state) => state.tick);
  const [anchors, setAnchors] = useState<Map<string, number>>(new Map());
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    void fontsReady.then(() => setFontsLoaded(true));
  }, []);

  useEffect(() => {
    setSettling(true);
    const timer = setTimeout(() => setSettling(false), 260);
    return () => clearTimeout(timer);
  }, [activeThreadId]);

  const margin = useMemo(() => (threads ?? []).filter((thread) => thread.kind === "margin" && thread.anchor.from < thread.anchor.to), [threads]);

  useEffect(() => {
    view.requestMeasure({
      key: "apostil-margins",
      read: (measured) => {
        const next = new Map<string, number>();
        for (const thread of margin) {
          const position = Math.min(thread.anchor.from, measured.state.doc.length);
          const coords = measured.coordsAtPos(position, 1);
          next.set(thread.id, coords ? coords.top - measured.documentTop : measured.lineBlockAt(position).top);
        }
        return next;
      },
      write: (next) => setAnchors(next),
    });
  }, [view, margin, tick]);

  const size = TEXT_SIZES[settings.textSize].margin;
  const textFont = settings.marginVoice === "serif" ? serifFont(size) : sansFont(size);
  const style: TextStyle = { font: textFont, lineHeight: Math.round(size * 1.38) };
  const sheetWidth = window.innerWidth - SHEET_PADDING * 2;
  const geometry: Geometry = { width: narrow ? sheetWidth : columnWidth, style };

  const placed = useMemo(() => {
    if (!fontsLoaded || columnWidth <= 0) return { left: [], right: [] };
    const bySide = { left: [] as (MarginItem & { thread: Thread; width: number })[], right: [] as (MarginItem & { thread: Thread; width: number })[] };
    for (const thread of margin) {
      const isActive = thread.id === activeThreadId;
      if (settings.layout === "marks" && !isActive) continue;
      const { height, width } = threadHeight(thread, geometry, isActive);
      const side = sideOf(thread, settings.layout, canUseLeft);
      bySide[side].push({ id: thread.id, anchorY: anchors.get(thread.id) ?? 0, height, width, thread });
    }
    const place = (items: typeof bySide.left) => {
      const positions = new Map(placeMarginItems(items, activeThreadId).map((item) => [item.id, item.y]));
      return items.map((item) => ({ ...item, y: positions.get(item.id) ?? item.anchorY }));
    };
    return { left: place(bySide.left), right: place(bySide.right) };
  }, [margin, anchors, activeThreadId, settings.layout, canUseLeft, columnWidth, style.font, style.lineHeight, fontsLoaded]);

  if (hidden) return null;

  if (narrow) {
    const thread = margin.find((item) => item.id === activeThreadId);
    if (!thread || !fontsLoaded) return null;
    const { height, width } = threadHeight(thread, geometry, true);
    return (
      <div {...stylex.props(styles.sheet)} style={{ height: height + SHEET_PADDING * 2 }} onPointerDown={(event) => event.stopPropagation()}>
        <div {...stylex.props(styles.sheetInner)} style={{ height }}>
          <MarginNote thread={thread} y={0} height={height} width={width} side="right" style={style} isActive dimmed={false} settling={false} noteId={noteId} />
        </div>
      </div>
    );
  }

  const renderSide = (side: Side) => (
    <div
      {...stylex.props(styles.column, side === "left" ? styles.columnLeft : styles.columnRight)}
      style={{ width: columnWidth }}
      data-margin-column={side}
    >
      {placed[side].map((item) => (
        <MarginNote
          key={item.id}
          thread={item.thread}
          y={item.y}
          height={item.height}
          width={item.width}
          side={side}
          style={style}
          isActive={item.id === activeThreadId}
          dimmed={activeThreadId !== null && activeThreadId !== item.id}
          settling={settling}
          noteId={noteId}
        />
      ))}
    </div>
  );

  return (
    <>
      {renderSide("left")}
      {renderSide("right")}
    </>
  );
}
