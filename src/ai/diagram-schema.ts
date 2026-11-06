import { z } from "zod";
import type { Diagram, Shape, Stage } from "../domain/diagram";

const size = z.number().min(9).max(40).optional();

const text = z.object({
  type: z.literal("text"),
  x: z.number(),
  y: z.number(),
  text: z.string(),
  size,
  anchor: z.enum(["start", "middle", "end"]).optional(),
  maxWidth: z.number().positive().optional(),
  italic: z.boolean().optional(),
  weight: z.enum(["regular", "bold"]).optional(),
});

const line = z.object({
  type: z.literal("line"),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  arrow: z.boolean().optional(),
  dashed: z.boolean().optional(),
});

const rect = z.object({
  type: z.literal("rect"),
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  radius: z.number().nonnegative().optional(),
  fill: z.boolean().optional(),
});

const circle = z.object({
  type: z.literal("circle"),
  cx: z.number(),
  cy: z.number(),
  r: z.number().nonnegative(),
  fill: z.boolean().optional(),
});

const path = z.object({
  type: z.literal("path"),
  d: z.string().regex(/^[MmLlHhVvCcSsQqTtAaZz0-9 ,.\-eE]+$/),
  arrow: z.boolean().optional(),
  dashed: z.boolean().optional(),
});

export const shapeSchema = z.discriminatedUnion("type", [text, line, rect, circle, path]);

export const stageSchema = z.object({
  caption: z.string().describe("One sentence on what this stage adds."),
  shapes: z.array(shapeSchema).describe("Shapes this stage adds on top of all earlier stages."),
});

export const diagramSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  height: z.number().min(80).max(720).describe("Canvas height. The canvas is always 480 wide."),
  stages: z.array(stageSchema).min(1).max(8),
});

function readObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseIfString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function readPartialDiagram(value: unknown, complete: boolean): Diagram | null {
  const raw = readObject(parseIfString(value));
  if (!raw || typeof raw.title !== "string") return null;

  const stages: Stage[] = [];
  const rawStages = Array.isArray(raw.stages) ? raw.stages : [];
  for (const rawStage of rawStages) {
    const stage = readObject(rawStage);
    if (!stage) continue;
    const shapes: Shape[] = [];
    const rawShapes = Array.isArray(stage.shapes) ? stage.shapes : [];
    const isNewestStage = rawStage === rawStages[rawStages.length - 1];
    const settled = complete || !isNewestStage ? rawShapes : rawShapes.slice(0, -1);
    for (const rawShape of settled) {
      const parsed = shapeSchema.safeParse(rawShape);
      if (parsed.success) shapes.push(parsed.data);
    }
    stages.push({ caption: typeof stage.caption === "string" ? stage.caption : "", shapes });
  }

  const height = typeof raw.height === "number" ? Math.min(Math.max(raw.height, 80), 720) : 240;
  const subtitle = typeof raw.subtitle === "string" ? raw.subtitle : undefined;
  return { title: raw.title, subtitle, height, stages };
}
