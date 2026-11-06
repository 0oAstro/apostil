import type { Diagram } from "./domain/diagram";
import type { Note, Thread } from "./domain/types";

const TEXT = `Think of this page as yours. You write first, and Apostil reads along.

Understanding feels the same as recognizing, which is why rereading notes feels like studying.

Dynamic programming is just filling in a table of smaller answers.

Select any words to gloss them, ask about them, or see them drawn. Type / for commands. Connect a model under Customize to make it answer you.`;

const firstQuote = "Understanding feels the same as recognizing";
const secondQuote = "just filling in a table of smaller answers";

const grid = (x: number, y: number, value: string) => ({ type: "text" as const, x, y, text: value, anchor: "middle" as const, size: 16 });

const gridDiagram: Diagram = {
  title: "How many ways to each cell?",
  subtitle: "Start top left. Move only right or down.",
  height: 196,
  stages: [
    {
      caption: "Each cell in the top row and left column has exactly one way in.",
      shapes: [
        { type: "rect", x: 150, y: 8, width: 180, height: 180, radius: 3 },
        { type: "line", x1: 210, y1: 8, x2: 210, y2: 188 },
        { type: "line", x1: 270, y1: 8, x2: 270, y2: 188 },
        { type: "line", x1: 150, y1: 68, x2: 330, y2: 68 },
        { type: "line", x1: 150, y1: 128, x2: 330, y2: 128 },
        grid(180, 38, "1"), grid(240, 38, "1"), grid(300, 38, "1"), grid(180, 98, "1"), grid(180, 158, "1"),
      ],
    },
    {
      caption: "The middle cell adds one from above and one from the left.",
      shapes: [grid(240, 98, "2")],
    },
    {
      caption: "Every other cell follows the same rule, above plus left.",
      shapes: [grid(300, 98, "3"), grid(240, 158, "3")],
    },
    {
      caption: "The last cell adds its two neighbors: 3 + 3 = 6.",
      shapes: [
        { type: "rect", x: 271, y: 129, width: 58, height: 58, fill: true },
        grid(300, 158, "6"),
        { type: "line", x1: 300, y1: 112, x2: 300, y2: 138, arrow: true },
        { type: "line", x1: 254, y1: 158, x2: 284, y2: 158, arrow: true },
      ],
    },
  ],
};

export function createWelcomeNote(): Note {
  const firstFrom = TEXT.indexOf(firstQuote);
  const secondFrom = TEXT.indexOf(secondQuote);
  const secondLineEnd = TEXT.indexOf("\n", secondFrom);

  const threads: Thread[] = [
    {
      id: "welcome-left",
      kind: "margin",
      side: "left",
      anchor: { from: firstFrom, to: firstFrom + firstQuote.length },
      quote: firstQuote,
      phase: "idle",
      messages: [{ id: "welcome-left-1", role: "apostil", text: "If they feel the same, what test would tell them apart for you tonight?" }],
    },
    {
      id: "welcome-inline",
      kind: "inline",
      side: "right",
      anchor: { from: secondFrom, to: secondLineEnd },
      quote: secondQuote,
      phase: "idle",
      messages: [
        {
          id: "welcome-inline-1",
          role: "apostil",
          text: "Which smaller answers does each cell need? Try the grid one stage at a time before you read the caption.",
          diagram: gridDiagram,
        },
      ],
    },
  ];

  return {
    id: crypto.randomUUID(),
    title: "Start here",
    text: TEXT,
    instruction: "",
    voiceId: "apostil",
    mode: "reads-along",
    threads,
    chat: [],
    updatedAt: Date.now(),
  };
}
