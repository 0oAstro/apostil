export type ReaderState =
  | { tag: "idle" }
  | { tag: "waiting" }
  | { tag: "reading"; speaking: boolean; editedSince: boolean };

export type ReaderEvent = "edit" | "pause-elapsed" | "reply-started" | "finished";
export type ReaderEffect = "start-timer" | "start-read" | "abort-read";

type Step = { state: ReaderState; effects: ReaderEffect[] };

const WAITING: ReaderState = { tag: "waiting" };
const IDLE: ReaderState = { tag: "idle" };

export function stepReader(state: ReaderState, event: ReaderEvent): Step {
  switch (state.tag) {
    case "idle":
      return event === "edit" ? { state: WAITING, effects: ["start-timer"] } : { state, effects: [] };
    case "waiting":
      if (event === "edit") return { state: WAITING, effects: ["start-timer"] };
      if (event === "pause-elapsed") {
        return { state: { tag: "reading", speaking: false, editedSince: false }, effects: ["start-read"] };
      }
      return { state, effects: [] };
    case "reading":
      if (event === "edit") {
        if (!state.speaking) return { state: WAITING, effects: ["abort-read", "start-timer"] };
        return { state: { ...state, editedSince: true }, effects: [] };
      }
      if (event === "reply-started") return { state: { ...state, speaking: true }, effects: [] };
      if (event === "finished") {
        return state.editedSince ? { state: WAITING, effects: ["start-timer"] } : { state: IDLE, effects: [] };
      }
      return { state, effects: [] };
  }
}
