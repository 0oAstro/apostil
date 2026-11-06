import * as stylex from "@stylexjs/stylex";
import { getStroke } from "perfect-freehand";
import { useEffect, useState } from "react";
import { color, ease, font } from "../theme.stylex";
import { InkMark } from "../ui/InkMark";
import { FlowText } from "./FlowText";

type Example = {
  id: string;
  task: string;
  reaction: string;
  title: string;
  lines: { before: string; quote: string; after: string }[];
  margin: string;
};

const EXAMPLES: Example[] = [
  {
    id: "premise",
    task: "question your premise",
    reaction: "?",
    title: "Essay draft",
    lines: [{ before: "Remote work ", quote: "makes everyone less creative", after: " because people stop bumping into each other." }],
    margin: "Everyone? What would you expect to see in a team that bumps into each other and still makes nothing new?",
  },
  {
    id: "mistake",
    task: "catch a wrong turn",
    reaction: "×",
    title: "Signup flow",
    lines: [{ before: "Save the user's password in the users table, then ", quote: "login just checks if it matches", after: ", I think?" }],
    margin: "Checks it how? If someone copied that table tonight, what would they be holding?",
  },
  {
    id: "draw",
    task: "draw what you cannot picture",
    reaction: "▦",
    title: "Forces on a ramp",
    lines: [{ before: "I have a hard time seeing ", quote: "how friction and gravity balance on an incline", after: "." }],
    margin: "Sketch the block first. Which arrow do you think is the one you keep getting wrong? Then I'll draw it.",
  },
  {
    id: "listen",
    task: "listen to a rough day",
    reaction: "♡",
    title: "Journal",
    lines: [{ before: "", quote: "I had a super rough day at work", after: "." }],
    margin: "That sounds rough. What happened?",
  },
];

const brushPath = (() => {
  const points: number[][] = [];
  for (let step = 0; step <= 24; step += 1) points.push([step * 10, 6 + Math.sin(step * 0.9) * 0.9]);
  const outline = getStroke(points, { size: 9, thinning: 0.5, smoothing: 0.8, start: { taper: 18 }, end: { taper: 26 } });
  return `M${outline.map(([x, y]) => `${x!.toFixed(1)} ${y!.toFixed(1)}`).join("L")}Z`;
})();

const styles = stylex.create({
  root: { minHeight: "100dvh", backgroundColor: "#fff", color: color.ink, fontFamily: font.serif, boxSizing: "border-box", padding: { default: 20, "@media (min-width: 900px)": 36 }, display: "flex", flexDirection: "column" },
  logo: { display: "block", width: "fit-content", color: color.ink },
  columns: {
    display: "grid",
    gridTemplateColumns: { default: "minmax(0, 1fr)", "@media (min-width: 1020px)": "minmax(0, 620px) minmax(0, 1fr)" },
    gap: { default: 48, "@media (min-width: 1020px)": 72 },
    marginTop: 44,
    flex: 1,
    alignItems: "start",
  },
  intro: { display: "flex", flexDirection: "column", gap: 26, maxWidth: 620, fontSize: 23, lineHeight: "30px" },
  strong: { margin: 0, fontWeight: 600, fontSize: 23, lineHeight: "30px" },
  para: { margin: 0 },
  task: {
    position: "relative",
    cursor: "pointer",
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
    color: "inherit",
    font: "inherit",
    textDecorationLine: "underline",
    textDecorationThickness: "1px",
    textUnderlineOffset: 3,
    textDecorationColor: { default: color.inkFaint, ":hover": color.ink },
    transitionProperty: "text-decoration-color",
    transitionDuration: "120ms",
  },
  reaction: {
    position: "absolute",
    left: 2,
    bottom: "calc(100% + 2px)",
    display: "grid",
    placeItems: "center",
    width: 34,
    height: 34,
    borderRadius: "50%",
    backgroundColor: "#e1d5cd",
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 16,
    transformOrigin: "0 100%",
    pointerEvents: "none",
    opacity: 0,
    transform: "scale(0.6)",
    transitionProperty: "transform, opacity",
    transitionDuration: "120ms",
    transitionTimingFunction: "ease",
  },
  reactionOn: {
    opacity: 1,
    transform: "scale(1)",
    transitionDuration: "500ms, 120ms",
    transitionTimingFunction: ease.pop,
  },
  ctas: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 },
  cta: { position: "relative", display: "inline-flex", alignItems: "center", gap: 3, color: color.ink, textDecoration: "none", fontWeight: 600, transitionProperty: "transform", transitionDuration: "140ms", transitionTimingFunction: ease.out, transform: { default: null, ":active": "scale(0.98)" } },
  ctaLabel: { position: "relative", zIndex: 1 },
  brush: { position: "absolute", left: -3, right: 20, bottom: -3, height: 10, width: "calc(100% - 17px)", color: "#e1d5cd", zIndex: 0 },
  demo: { position: "relative", backgroundColor: "#f5f3ef", borderRadius: 4, minHeight: 300, padding: 28, fontFamily: font.sans, boxSizing: "border-box" },
  demoBar: { display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: color.inkSoft },
  demoTitle: { fontSize: 27, fontWeight: 600, letterSpacing: "-0.022em", marginTop: 14, marginBottom: 14 },
  demoGrid: { display: "grid", gridTemplateColumns: { default: "minmax(0, 1fr)", "@media (min-width: 640px)": "minmax(0, 1.3fr) minmax(0, 1fr)" }, gap: 26, fontSize: 15, lineHeight: 1.5 },
  demoQuote: { textDecorationLine: "underline", textDecorationColor: "rgba(31, 35, 34, 0.4)", textUnderlineOffset: 3 },
  demoMargin: {
    fontFamily: font.serif,
    fontSize: 16,
    lineHeight: 1.36,
    opacity: 1,
    filter: "blur(0)",
    transform: "translateY(0)",
    transitionProperty: "opacity, filter, transform",
    transitionDuration: "420ms",
    transitionDelay: "260ms",
    transitionTimingFunction: ease.out,
    "@starting-style": { opacity: 0, filter: "blur(3px)", transform: "translateY(5px)" },
  },
  footer: { display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginTop: 56, fontSize: 14, color: color.inkFaint },
  link: { color: "inherit", textUnderlineOffset: 2 },
});

function Cta({ href, children }: { href: string; children: string }) {
  return (
    <li>
      <a href={href} {...stylex.props(styles.cta)}>
        <svg viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden="true" {...stylex.props(styles.brush)}>
          <path d={brushPath} fill="currentColor" />
        </svg>
        <span {...stylex.props(styles.ctaLabel)}>{children}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9.5 18.25 15.75 12 9.5 5.75" />
        </svg>
      </a>
    </li>
  );
}

export function Landing() {
  const [activeId, setActiveId] = useState(EXAMPLES[0]!.id);
  const [touched, setTouched] = useState(false);
  const active = EXAMPLES.find((example) => example.id === activeId) ?? EXAMPLES[0]!;

  useEffect(() => {
    if (touched || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      setActiveId((current) => {
        const index = EXAMPLES.findIndex((example) => example.id === current);
        return EXAMPLES[(index + 1) % EXAMPLES.length]!.id;
      });
    }, 5200);
    return () => clearInterval(timer);
  }, [touched]);

  const choose = (id: string) => {
    setActiveId(id);
    setTouched(true);
  };

  return (
    <div {...stylex.props(styles.root)}>
      <a href="./" aria-label="Apostil home" {...stylex.props(styles.logo)}><InkMark size={30} /></a>
      <main {...stylex.props(styles.columns)}>
        <div {...stylex.props(styles.intro)}>
          <h1 {...stylex.props(styles.strong)}>Apostil is a notebook that reads what you write and answers in the margin.</h1>
          <FlowText text="You write first. Your thoughts go on the page before anything else does. Then it asks the question you skipped, catches the step you got wrong, and draws what you could not picture. It is built to make you think more, not less. Drag the ink if it is in your way." />
          <p {...stylex.props(styles.para)}>
            It can{" "}
            {EXAMPLES.map((example, index) => (
              <span key={example.id}>
                <button type="button" onPointerEnter={() => choose(example.id)} onFocus={() => choose(example.id)} onClick={() => choose(example.id)} {...stylex.props(styles.task)}>
                  {example.task}
                  <span aria-hidden="true" {...stylex.props(styles.reaction, activeId === example.id && styles.reactionOn)}>{example.reaction}</span>
                </button>
                {index < EXAMPLES.length - 2 ? ", " : index === EXAMPLES.length - 2 ? ", or " : "."}
              </span>
            ))}
          </p>
          <ul {...stylex.props(styles.ctas)}>
            <Cta href="./write/">Start writing</Cta>
            <Cta href="https://github.com/0oAstro/apostil">Read the source</Cta>
          </ul>
        </div>
        <section aria-label="Example note" {...stylex.props(styles.demo)}>
          <div {...stylex.props(styles.demoBar)}><InkMark size={10} /> Reads along</div>
          <div {...stylex.props(styles.demoTitle)}>{active.title}</div>
          <div {...stylex.props(styles.demoGrid)} key={active.id}>
            <div>
              {active.lines.map((line) => (
                <p key={line.quote} style={{ margin: 0 }}>
                  {line.before}<span {...stylex.props(styles.demoQuote)}>{line.quote}</span>{line.after}
                </p>
              ))}
            </div>
            <div {...stylex.props(styles.demoMargin)}>{active.margin}</div>
          </div>
        </section>
      </main>
      <footer {...stylex.props(styles.footer)}>
        <span>Open source under the MIT license.</span>
        <span>Your notes stay in your browser. Bring any model.</span>
      </footer>
    </div>
  );
}
