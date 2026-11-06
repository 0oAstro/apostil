import * as stylex from "@stylexjs/stylex";

export const color = stylex.defineVars({
  page: "#f5f3ef",
  paper: "#fbfaf7",
  sand: "#ebe4dc",
  sandDeep: "#dcd0c5",
  ink: "#1f2322",
  inkSoft: "#585254",
  inkFaint: "#969394",
  rule: "#e3ded7",
  mark: "rgba(31, 35, 34, 0.28)",
  markHover: "rgba(31, 35, 34, 0.09)",
  accent: "#1f2322",
  danger: "#c8313c",
  scrim: "rgba(31, 35, 34, 0.32)",
  selection: "rgba(115, 168, 154, 0.32)",
});

export const font = stylex.defineVars({
  serif: '"Newsreader Variable", Georgia, serif',
  sans: '"Instrument Sans Variable", ui-sans-serif, sans-serif',
  mono: '"Geist Mono Variable", ui-monospace, monospace',
});

export const ease = stylex.defineConsts({
  out: "cubic-bezier(0.23, 1, 0.32, 1)",
  inOut: "cubic-bezier(0.77, 0, 0.175, 1)",
  drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
  pop: "linear(0, .092, .296, .528, .736, .897, 1.004, 1.063, 1.085, 1.084, 1.068, 1.049, 1.029, 1.014, 1.003, .996, .993, .993, .993, .995, .997, .998, .999, 1)",
});
