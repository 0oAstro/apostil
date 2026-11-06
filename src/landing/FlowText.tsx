import { layoutNextLine, prepareWithSegments, type LayoutCursor } from "@chenglou/pretext";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { fontsReady } from "../layout/text";
import { color } from "../theme.stylex";

const FONT_SIZE = 23;
const LINE_HEIGHT = 30;
const FONT = `400 ${FONT_SIZE}px "Newsreader Variable"`;
const BLOT_PADDING = 12;

const styles = stylex.create({
  root: { position: "relative", color: color.ink, fontFamily: '"Newsreader Variable", Georgia, serif', fontSize: FONT_SIZE, lineHeight: `${LINE_HEIGHT}px`, letterSpacing: 0, touchAction: "pan-y" },
  line: { position: "absolute", left: 0, whiteSpace: "pre" },
  blot: {
    position: "absolute",
    left: 0,
    top: 0,
    color: color.ink,
    cursor: { default: "grab", ":active": "grabbing" },
    touchAction: "none",
    transformOrigin: "center",
  },
});

type Line = { text: string; x: number; y: number };

function flowAround(text: string, width: number, blotX: number, blotY: number, radius: number): { lines: Line[]; height: number } {
  const prepared = prepareWithSegments(text, FONT);
  const lines: Line[] = [];
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let y = 0;

  while (true) {
    const middle = y + LINE_HEIGHT / 2;
    const distance = Math.abs(middle - blotY);
    let x = 0;
    let lineWidth = width;
    if (distance < radius + BLOT_PADDING) {
      const halfChord = Math.sqrt((radius + BLOT_PADDING) ** 2 - distance ** 2);
      const leftRoom = blotX - halfChord;
      const rightStart = blotX + halfChord;
      if (leftRoom >= width - rightStart) {
        lineWidth = Math.max(leftRoom, 60);
      } else {
        x = Math.min(rightStart, width - 60);
        lineWidth = width - x;
      }
    }
    const line = layoutNextLine(prepared, lineWidth, cursor);
    if (!line) break;
    lines.push({ text: line.text, x, y });
    cursor = line.end;
    y += LINE_HEIGHT;
  }
  return { lines, height: y };
}

export function FlowText({ text }: { text: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const blotRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState(false);
  const [blot, setBlot] = useState({ x: 0.72, y: 62 });
  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  const radius = width < 480 ? 26 : 38;

  useEffect(() => {
    void fontsReady.then(() => setReady(true));
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const blotX = blot.x * width;
  const flowed = ready && width > 0 ? flowAround(text, width, blotX, blot.y, radius) : { lines: [], height: 0 };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOffset.current = { x: event.clientX - blotX, y: event.clientY - blot.y };
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragOffset.current || width === 0) return;
    const x = Math.min(Math.max(event.clientX - dragOffset.current.x, 0), width);
    const y = Math.min(Math.max(event.clientY - dragOffset.current.y, 0), Math.max(flowed.height, radius));
    setBlot({ x: x / width, y });
  };

  return (
    <div ref={rootRef} {...stylex.props(styles.root)} style={{ height: flowed.height }} role="paragraph" aria-label={text}>
      {flowed.lines.map((line, index) => (
        <span key={index} aria-hidden="true" {...stylex.props(styles.line)} style={{ transform: `translate(${line.x}px, ${line.y}px)` }}>
          {line.text}
        </span>
      ))}
      {width > 0 && (
        <svg
          ref={blotRef}
          data-ink-blot
          viewBox="0 0 20 20"
          width={radius * 2}
          height={radius * 2}
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => { dragOffset.current = null; }}
          {...stylex.props(styles.blot)}
          style={{ transform: `translate(${blotX - radius}px, ${blot.y - radius}px)` }}
        >
          <path fill="currentColor" d="M9.6 1.3c1.9-.5 3.1.9 4.1 2.2.8 1 2.3 1.3 3.3 2.4 1.3 1.5 1.7 3.5 1 5.3-.5 1.3-1.7 1.9-2.3 3.1-.7 1.5-1.2 3.2-3 3.9-1.9.7-3.3-.4-4.8-1.3-1.2-.7-2.8-.7-3.8-1.9-1.2-1.4-1.4-3.2-.8-4.9.4-1.2 1.4-1.9 1.7-3.1.4-1.4.2-3 1.3-4.2.8-.9 2-1.2 3.3-1.5zM18.2 16.4a1 1 0 1 1-.1 2 1 1 0 0 1 .1-2z" />
        </svg>
      )}
    </div>
  );
}
