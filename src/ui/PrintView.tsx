import * as stylex from "@stylexjs/stylex";
import { noteSegments } from "../export";
import { useStore } from "../store";
import { StaticDiagram } from "./Diagram";
import { Prose } from "./Prose";

const styles = stylex.create({
  title: { fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0, marginBottom: 16 },
  thread: { marginLeft: 20, marginBlock: 10, paddingLeft: 12, borderLeftWidth: 1, borderLeftStyle: "solid", borderLeftColor: "#ccc", color: "#444" },
});

export function PrintView() {
  const note = useStore((state) => state.notes[state.activeId]);
  const includeReplies = useStore((state) => state.printIncludesReplies);
  if (!note) return null;

  return (
    <div data-print-view>
      {note.title && <h1 {...stylex.props(styles.title)}>{note.title}</h1>}
      {includeReplies ? (
        noteSegments(note).map((segment, index) => (
          <div key={index}>
            <Prose text={segment.text} streaming={false} />
            {segment.threads.map((thread) => (
              <div key={thread.id} {...stylex.props(styles.thread)}>
                {thread.messages.map((message) => (
                  <div key={message.id}>
                    <Prose text={message.text} streaming={false} />
                    {message.diagram && <StaticDiagram diagram={message.diagram} />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))
      ) : (
        <Prose text={note.text} streaming={false} />
      )}
    </div>
  );
}
