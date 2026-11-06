import {
  clearCache,
  layout,
  layoutWithLines,
  measureLineStats,
  prepare,
  prepareWithSegments,
} from "@chenglou/pretext";

export type TextStyle = { font: string; lineHeight: number };

export const serifFont = (size: number, weight = 400) => `${weight} ${size}px "Newsreader Variable"`;
export const sansFont = (size: number, weight = 400) => `${weight} ${size}px "Instrument Sans Variable"`;

export function measureHeight(text: string, style: TextStyle, width: number): number {
  if (!text) return 0;
  const prepared = prepare(text, style.font, { whiteSpace: "pre-wrap" });
  return layout(prepared, width, style.lineHeight).height;
}

export function wrapLines(text: string, font: string, width: number): string[] {
  const prepared = prepareWithSegments(text, font, { whiteSpace: "pre-wrap" });
  return layoutWithLines(prepared, width, 1).lines.map((line) => line.text);
}

export function balancedWidth(text: string, font: string, maxWidth: number): number {
  const prepared = prepareWithSegments(text, font, { whiteSpace: "pre-wrap" });
  const target = measureLineStats(prepared, maxWidth);
  if (target.lineCount <= 1) return Math.min(Math.ceil(target.maxLineWidth), maxWidth);

  let low = maxWidth / 2;
  let high = maxWidth;
  while (high - low > 2) {
    const middle = (low + high) / 2;
    if (measureLineStats(prepared, middle).lineCount <= target.lineCount) high = middle;
    else low = middle;
  }
  return Math.ceil(high);
}

export const fontsReady: Promise<void> = document.fonts.ready.then(() => clearCache());
