import * as stylex from "@stylexjs/stylex";
import { useEffect, useId, useState } from "react";
import { croppedView, DIAGRAM_WIDTH, type Diagram, type Shape } from "../domain/diagram";
import { serifFont, wrapLines } from "../layout/text";
import { color, ease, font } from "../theme.stylex";
import { ChevronLeft, ChevronRight, ReplayIcon } from "./icons";
import { Button, Modal } from "./primitives";

const drawIn = stylex.keyframes({ from: { strokeDashoffset: 1 }, to: { strokeDashoffset: 0 } });
const fadeIn = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

const styles = stylex.create({
  figure: { margin: 0, paddingBlock: 12, fontFamily: font.serif, color: color.ink },
  title: { fontSize: 19, fontWeight: 500, textAlign: "center" },
  subtitle: { fontSize: 13, color: color.inkFaint, textAlign: "center", marginTop: 2, fontStyle: "italic" },
  printSvg: { maxWidth: 420, marginInline: "auto" },
  svg: { display: "block", width: "100%", height: "auto", marginTop: 8, overflow: "visible" },
  stroke: {
    animationName: drawIn,
    animationDuration: "520ms",
    animationTimingFunction: ease.inOut,
    animationFillMode: "both",
    strokeDasharray: 1,
  },
  fade: { animationName: fadeIn, animationDuration: "280ms", animationFillMode: "both", animationTimingFunction: "ease" },
  footer: { display: "flex", alignItems: "center", gap: 8, marginTop: 6, minHeight: 28 },
  caption: { flex: 1, fontSize: 14.5, lineHeight: 1.4, color: color.inkSoft },
  steps: { display: "flex", alignItems: "center", fontFamily: font.sans, fontSize: 12, color: color.inkFaint, flexShrink: 0 },
  iconButton: { paddingInline: 4 },
  larger: { fontFamily: font.sans, fontSize: 12, color: color.inkFaint, paddingInline: 0 },
  largerBody: { padding: 28, overflow: "auto", maxHeight: "86vh" },
});

const MARKER_REF = (id: string, arrow?: boolean) => (arrow ? `url(#${id})` : undefined);

function ShapeView({ shape, markerId, index, fresh }: { shape: Shape; markerId: string; index: number; fresh: boolean }) {
  const delay = fresh ? { animationDelay: `${index * 40}ms` } : undefined;
  const strokeProps = {
    pathLength: 1,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.2,
    strokeLinecap: "round" as const,
    style: delay,
    ...stylex.props(fresh && styles.stroke),
  };

  switch (shape.type) {
    case "line": {
      if (shape.dashed) {
        return <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} fill="none" stroke="currentColor" strokeWidth={1.2} strokeDasharray="4 4" markerEnd={MARKER_REF(markerId, shape.arrow)} />;
      }
      return <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} markerEnd={MARKER_REF(markerId, shape.arrow)} {...strokeProps} />;
    }
    case "path":
      if (shape.dashed) {
        return <path d={shape.d} fill="none" stroke="currentColor" strokeWidth={1.2} strokeDasharray="4 4" markerEnd={MARKER_REF(markerId, shape.arrow)} />;
      }
      return <path d={shape.d} markerEnd={MARKER_REF(markerId, shape.arrow)} {...strokeProps} />;
    case "rect":
      if (shape.fill) {
        return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.radius} fill="currentColor" fillOpacity={0.08} style={delay} {...stylex.props(fresh && styles.fade)} />;
      }
      return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.radius} {...strokeProps} />;
    case "circle":
      if (shape.fill) {
        return <circle cx={shape.cx} cy={shape.cy} r={shape.r} fill="currentColor" style={delay} {...stylex.props(fresh && styles.fade)} />;
      }
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...strokeProps} />;
    case "text": {
      const size = shape.size ?? 14;
      const weight = shape.weight === "bold" ? 600 : 400;
      const lines = shape.maxWidth ? wrapLines(shape.text, serifFont(size, weight), shape.maxWidth) : [shape.text];
      const lineHeight = size * 1.25;
      return (
        <text
          x={shape.x}
          y={shape.y}
          fontSize={size}
          fontWeight={weight}
          fontStyle={shape.italic ? "italic" : undefined}
          textAnchor={shape.anchor ?? "start"}
          fill="currentColor"
          dominantBaseline="middle"
          stroke={color.page}
          strokeWidth={4}
          paintOrder="stroke"
          strokeLinejoin="round"
          style={{ fontFamily: "inherit", ...delay }}
          {...stylex.props(fresh && styles.fade)}
        >
          {lines.map((line, lineIndex) => (
            <tspan key={lineIndex} x={shape.x} dy={lineIndex === 0 ? 0 : lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      );
    }
  }
}

export function DiagramView({ diagram, streaming }: { diagram: Diagram; streaming?: boolean }) {
  const lastStage = Math.max(diagram.stages.length - 1, 0);
  const [stage, setStage] = useState(lastStage);
  const [replayKey, setReplayKey] = useState(0);
  const [large, setLarge] = useState(false);
  const markerId = useId().replace(/:/g, "");

  useEffect(() => {
    if (streaming) setStage(lastStage);
  }, [streaming, lastStage]);

  const current = Math.min(stage, lastStage);
  const stageList = diagram.stages;
  const count = stageList.length;
  const view = croppedView(diagram);

  const body = (
    <figure {...stylex.props(styles.figure)}>
      <div {...stylex.props(styles.title)}>{diagram.title}</div>
      {diagram.subtitle && <div {...stylex.props(styles.subtitle)}>{diagram.subtitle}</div>}
      <svg key={replayKey} viewBox={`0 ${view.top} ${DIAGRAM_WIDTH} ${view.height}`} role="img" aria-label={diagram.title} {...stylex.props(styles.svg)}>
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M1 1.5 8.5 5 1 8.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </marker>
        </defs>
        {stageList.slice(0, current + 1).flatMap((item, stageIndex) =>
          item.shapes.map((shape, shapeIndex) => (
            <ShapeView key={`${stageIndex}-${shapeIndex}`} shape={shape} markerId={markerId} index={shapeIndex} fresh={stageIndex === current} />
          )),
        )}
      </svg>
      <figcaption {...stylex.props(styles.footer)}>
        <span {...stylex.props(styles.caption)}>{stageList[current]?.caption}</span>
        {count > 1 && (
          <span {...stylex.props(styles.steps)}>
            <Button aria-label="Previous stage" disabled={current === 0} xstyle={styles.iconButton} onClick={() => setStage(current - 1)}>
              <ChevronLeft />
            </Button>
            {current + 1} of {count}
            <Button aria-label="Next stage" disabled={current === lastStage} xstyle={styles.iconButton} onClick={() => setStage(current + 1)}>
              <ChevronRight />
            </Button>
            <Button aria-label="Replay" xstyle={styles.iconButton} onClick={() => { setStage(0); setReplayKey(replayKey + 1); }}>
              <ReplayIcon />
            </Button>
          </span>
        )}
      </figcaption>
    </figure>
  );

  return (
    <>
      {body}
      <Button xstyle={styles.larger} onClick={() => setLarge(true)}>See it larger</Button>
      <Modal open={large} onClose={() => setLarge(false)} width={880} title={diagram.title}>
        <div {...stylex.props(styles.largerBody)}>{body}</div>
      </Modal>
    </>
  );
}

export function StaticDiagram({ diagram }: { diagram: Diagram }) {
  const view = croppedView(diagram);
  const markerId = useId().replace(/:/g, "");
  const captions = diagram.stages.map((stage) => stage.caption).filter(Boolean);
  return (
    <figure {...stylex.props(styles.figure)}>
      <div {...stylex.props(styles.title)}>{diagram.title}</div>
      {diagram.subtitle && <div {...stylex.props(styles.subtitle)}>{diagram.subtitle}</div>}
      <svg viewBox={`0 ${view.top} ${DIAGRAM_WIDTH} ${view.height}`} role="img" aria-label={diagram.title} {...stylex.props(styles.svg, styles.printSvg)}>
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M1 1.5 8.5 5 1 8.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </marker>
        </defs>
        {diagram.stages.flatMap((stage, stageIndex) =>
          stage.shapes.map((shape, shapeIndex) => (
            <ShapeView key={`${stageIndex}-${shapeIndex}`} shape={shape} markerId={markerId} index={shapeIndex} fresh={false} />
          )),
        )}
      </svg>
      {captions.map((caption) => (
        <div key={caption} {...stylex.props(styles.caption)}>{caption}</div>
      ))}
    </figure>
  );
}

const CAPTION_AND_TITLE = 104;

export function diagramHeight(diagram: Diagram, width: number): number {
  return (croppedView(diagram).height * width) / DIAGRAM_WIDTH + CAPTION_AND_TITLE;
}
