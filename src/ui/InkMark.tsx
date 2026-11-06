import * as stylex from "@stylexjs/stylex";

const breathe = stylex.keyframes({
  from: { transform: "scale(0.82) rotate(-6deg)", opacity: 0.55 },
  to: { transform: "scale(1.12) rotate(5deg)", opacity: 1 },
});

const styles = stylex.create({
  mark: { flexShrink: 0, display: "block", color: "var(--apostil-ink)" },
  breathing: {
    animationName: breathe,
    animationDuration: "900ms",
    animationDirection: "alternate",
    animationIterationCount: "infinite",
    animationTimingFunction: "cubic-bezier(0.77, 0, 0.175, 1)",
  },
});

export function InkMark({ size = 14, breathing = false }: { size?: number; breathing?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" {...stylex.props(styles.mark, breathing && styles.breathing)}>
      <path
        fill="currentColor"
        d="M9.6 1.3c1.9-.5 3.1.9 4.1 2.2.8 1 2.3 1.3 3.3 2.4 1.3 1.5 1.7 3.5 1 5.3-.5 1.3-1.7 1.9-2.3 3.1-.7 1.5-1.2 3.2-3 3.9-1.9.7-3.3-.4-4.8-1.3-1.2-.7-2.8-.7-3.8-1.9-1.2-1.4-1.4-3.2-.8-4.9.4-1.2 1.4-1.9 1.7-3.1.4-1.4.2-3 1.3-4.2.8-.9 2-1.2 3.3-1.5zM18.2 16.4a1 1 0 1 1-.1 2 1 1 0 0 1 .1-2z"
      />
    </svg>
  );
}
