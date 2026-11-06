import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { removeThread, useStore } from "../store";
import { measureHeight, serifFont } from "../layout/text";
import { TEXT_SIZES } from "../domain/types";
import { color, font } from "../theme.stylex";
import { diagramHeight, DiagramView } from "./Diagram";
import { InkMark } from "./InkMark";
import { Prose } from "./Prose";
import { ThreadReply } from "./ThreadReply";
import { Button } from "./primitives";

const EDITOR_WIDTH = 660;
const INDENT = 22;

const styles = stylex.create({
  root: {
    position: "relative",
    paddingLeft: INDENT,
    paddingBlock: 10,
    color: color.ink,
    whiteSpace: "normal",
    opacity: 1,
    transitionProperty: "opacity",
    transitionDuration: "240ms",
    "@starting-style": { opacity: 0 },
  },
  ink: { position: "absolute", left: 2, top: 15 },
  writer: { fontFamily: font.sans, color: color.inkSoft, marginBlock: 8, fontSize: "0.94em" },
  actions: { display: "flex", gap: 2, marginLeft: -8, minHeight: 28, alignItems: "center" },
  error: { color: color.danger, fontFamily: font.sans, fontSize: 13 },
  replyBox: { marginTop: 6, maxWidth: 420 },
});

export function InlineThread({ threadId }: { threadId: string }) {
  const thread = useStore((state) => state.notes[state.activeId]?.threads.find((item) => item.id === threadId));
  const activeId = useStore((state) => state.activeId);
  const [replying, setReplying] = useState(false);
  if (!thread) return null;
  const streaming = thread.phase === "streaming";

  return (
    <div {...stylex.props(styles.root)} data-thread-inline={threadId}>
      <span {...stylex.props(styles.ink)}><InkMark size={8} breathing={streaming} /></span>
      {thread.messages.map((message, index) =>
        message.role === "writer" ? (
          <div key={message.id} {...stylex.props(styles.writer)}>{message.text}</div>
        ) : (
          <div key={message.id}>
            <Prose text={message.text} streaming={streaming && index === thread.messages.length - 1} />
            {message.diagram && <DiagramView diagram={message.diagram} streaming={streaming} />}
          </div>
        ),
      )}
      {thread.error && <div {...stylex.props(styles.error)} role="alert">{thread.error}</div>}
      {replying ? (
        <div {...stylex.props(styles.replyBox)}><ThreadReply threadId={threadId} autoFocus /></div>
      ) : (
        !streaming && (
          <div {...stylex.props(styles.actions)}>
            <Button onClick={() => setReplying(true)}>Reply</Button>
            <Button onClick={() => removeThread(activeId, threadId)}>Dismiss</Button>
          </div>
        )
      )}
    </div>
  );
}

export function estimateInlineHeight(threadId: string): number {
  const state = useStore.getState();
  const thread = state.notes[state.activeId]?.threads.find((item) => item.id === threadId);
  if (!thread) return 0;

  const size = TEXT_SIZES[state.settings.textSize].body * 1.06;
  const style = { font: serifFont(size), lineHeight: size * 1.45 };
  const width = EDITOR_WIDTH - INDENT;
  let height = 48;
  for (const message of thread.messages) {
    height += measureHeight(message.text, style, width);
    if (message.diagram) height += diagramHeight(message.diagram, width);
  }
  return height;
}
