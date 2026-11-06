import * as stylex from "@stylexjs/stylex";
import { useState, type KeyboardEvent } from "react";
import { replyInThread } from "../actions";
import { color, font } from "../theme.stylex";

const styles = stylex.create({
  input: {
    display: "block",
    width: "100%",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: { default: color.rule, ":focus": color.inkFaint },
    outline: "none",
    resize: "none",
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: "20px",
    height: 28,
    paddingBlock: 4,
    paddingInline: 0,
  },
});

export function ThreadReply({ threadId, autoFocus }: { threadId: string; autoFocus?: boolean }) {
  const [text, setText] = useState("");

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const value = text.trim();
      if (!value) return;
      setText("");
      void replyInThread(threadId, value);
    }
  };

  return (
    <textarea
      aria-label="Reply"
      placeholder="Reply…"
      rows={1}
      autoFocus={autoFocus}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onKeyDown={onKeyDown}
      {...stylex.props(styles.input)}
    />
  );
}
