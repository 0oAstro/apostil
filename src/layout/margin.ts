export type MarginItem = { id: string; anchorY: number; height: number };
export type PlacedItem = { id: string; y: number };

const GAP = 14;

export function placeMarginItems(items: MarginItem[], activeId: string | null): PlacedItem[] {
  const sorted = [...items].sort((a, b) => a.anchorY - b.anchorY);
  const activeIndex = sorted.findIndex((item) => item.id === activeId);
  const pivot = activeIndex === -1 ? 0 : activeIndex;
  const positions = new Map<string, number>();

  let nextFree = -Infinity;
  for (let index = pivot; index < sorted.length; index += 1) {
    const item = sorted[index]!;
    const y = index === activeIndex ? item.anchorY : Math.max(item.anchorY, nextFree);
    positions.set(item.id, y);
    nextFree = y + item.height + GAP;
  }

  const pivotItem = sorted[pivot];
  let ceiling = pivotItem ? (positions.get(pivotItem.id) ?? 0) : 0;
  for (let index = pivot - 1; index >= 0; index -= 1) {
    const item = sorted[index]!;
    const y = Math.min(item.anchorY, ceiling - GAP - item.height);
    positions.set(item.id, y);
    ceiling = y;
  }

  return items.map((item) => ({ id: item.id, y: positions.get(item.id) ?? item.anchorY }));
}
