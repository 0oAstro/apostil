import * as stylex from "@stylexjs/stylex";
import { color } from "./theme.stylex";

export const darkTheme = stylex.createTheme(color, {
  page: "#161817",
  paper: "#1c1e1d",
  sand: "#2a2c2a",
  sandDeep: "#3a3c39",
  ink: "#ece8e2",
  inkSoft: "#a9a4a0",
  inkFaint: "#716d6b",
  rule: "#2d2f2d",
  mark: "rgba(236, 232, 226, 0.34)",
  markHover: "rgba(236, 232, 226, 0.1)",
  accent: "#ece8e2",
  danger: "#ef6a70",
  scrim: "rgba(0, 0, 0, 0.55)",
  selection: "rgba(115, 168, 154, 0.3)",
});
