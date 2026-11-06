import { getStroke } from "perfect-freehand";
import { useEffect, useRef } from "react";

type Point = { x: number; y: number; at: number };

const LIFETIME_MS = 700;

function strokePath(context: CanvasRenderingContext2D, outline: number[][]) {
  context.beginPath();
  outline.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x!, y!);
    else context.lineTo(x!, y!);
  });
  context.closePath();
  context.fill();
}

export function InkTrail({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let points: Point[] = [];
    let frame = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio;
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      frame = 0;
      const now = performance.now();
      points = points.filter((point) => now - point.at < LIFETIME_MS);
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (points.length > 1) {
        const newest = points[points.length - 1]!;
        context.fillStyle = color;
        context.globalAlpha = Math.max(0, 1 - (now - newest.at) / LIFETIME_MS) * 0.75;
        strokePath(context, getStroke(points.map((point) => [point.x, point.y]), { size: 5, thinning: 0.7, smoothing: 0.6, streamline: 0.5, end: { taper: true }, start: { taper: true } }));
      }
      if (points.length > 0) frame = requestAnimationFrame(draw);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      points.push({ x: event.clientX, y: event.clientY, at: performance.now() });
      if (!frame) frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [color]);

  return <canvas ref={canvasRef} aria-hidden="true" style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 60 }} />;
}
