export type TextShape = {
  type: "text";
  x: number;
  y: number;
  text: string;
  size?: number;
  anchor?: "start" | "middle" | "end";
  maxWidth?: number;
  italic?: boolean;
  weight?: "regular" | "bold";
};

export type Shape =
  | TextShape
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; arrow?: boolean; dashed?: boolean }
  | { type: "rect"; x: number; y: number; width: number; height: number; radius?: number; fill?: boolean }
  | { type: "circle"; cx: number; cy: number; r: number; fill?: boolean }
  | { type: "path"; d: string; arrow?: boolean; dashed?: boolean };

export type Stage = { caption: string; shapes: Shape[] };

export type Diagram = {
  title: string;
  subtitle?: string;
  height: number;
  stages: Stage[];
};

export const DIAGRAM_WIDTH = 480;

const CROP_PADDING = 10;

function verticalExtent(shape: Shape): { top: number; bottom: number } | null {
  switch (shape.type) {
    case "text": {
      const size = shape.size ?? 14;
      return { top: shape.y - size, bottom: shape.y + size };
    }
    case "line":
      return { top: Math.min(shape.y1, shape.y2), bottom: Math.max(shape.y1, shape.y2) };
    case "rect":
      return { top: shape.y, bottom: shape.y + shape.height };
    case "circle":
      return { top: shape.cy - shape.r, bottom: shape.cy + shape.r };
    case "path": {
      const numbers = shape.d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
      const ys = numbers.filter((_, index) => index % 2 === 1);
      return ys.length ? { top: Math.min(...ys), bottom: Math.max(...ys) } : null;
    }
  }
}

export function croppedView(diagram: Diagram): { top: number; height: number } {
  let top = Infinity;
  let bottom = -Infinity;
  for (const stage of diagram.stages) {
    for (const shape of stage.shapes) {
      const extent = verticalExtent(shape);
      if (extent) {
        top = Math.min(top, extent.top);
        bottom = Math.max(bottom, extent.bottom);
      }
    }
  }
  if (top === Infinity) return { top: 0, height: diagram.height };
  return { top: top - CROP_PADDING, height: bottom - top + CROP_PADDING * 2 };
}
