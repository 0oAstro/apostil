import * as stylex from "@stylexjs/stylex";
import { marked, type Token, type Tokens } from "marked";
import { memo, type ReactNode } from "react";
import remend from "remend";
import { safeHref } from "../domain/markdown";
import { color, font } from "../theme.stylex";

const styles = stylex.create({
  root: { fontFamily: font.serif, fontSize: "1.06em", lineHeight: 1.45, color: color.ink },
  p: { margin: 0, marginBottom: "0.6em" },
  list: { margin: 0, marginBottom: "0.6em", paddingLeft: "1.3em" },
  item: { marginBottom: "0.25em" },
  heading: { fontWeight: 600, margin: 0, marginBlock: "0.6em 0.3em", fontSize: "1.05em" },
  strong: { fontWeight: 600 },
  code: { fontFamily: font.mono, fontSize: "0.82em", backgroundColor: color.sand, paddingInline: "0.3em", borderRadius: 3 },
  pre: { fontFamily: font.mono, fontSize: "0.82em", backgroundColor: color.sand, padding: 12, borderRadius: 6, overflowX: "auto", margin: 0, marginBottom: "0.6em", whiteSpace: "pre" },
  quote: { margin: 0, marginBottom: "0.6em", paddingLeft: "0.8em", borderLeftWidth: 2, borderLeftStyle: "solid", borderLeftColor: color.rule, color: color.inkSoft },
  link: { color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 },
  rule: { borderWidth: 0, borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: color.rule, marginBlock: "0.8em" },
  table: { borderCollapse: "collapse", marginBottom: "0.6em", fontSize: "0.92em" },
  cell: { borderWidth: 1, borderStyle: "solid", borderColor: color.rule, paddingBlock: 3, paddingInline: 8, textAlign: "left" },
});

function renderTokens(tokens: Token[] | undefined): ReactNode {
  return tokens?.map((token, index) => <TokenView key={index} token={token} />);
}

function TokenView({ token }: { token: Token }): ReactNode {
  switch (token.type) {
    case "paragraph":
      return <p {...stylex.props(styles.p)}>{renderTokens((token as Tokens.Paragraph).tokens)}</p>;
    case "heading":
      return <h4 {...stylex.props(styles.heading)}>{renderTokens((token as Tokens.Heading).tokens)}</h4>;
    case "list": {
      const list = token as Tokens.List;
      const items = list.items.map((item, index) => (
        <li key={index} {...stylex.props(styles.item)}>{renderTokens(item.tokens)}</li>
      ));
      return list.ordered ? <ol start={list.start || 1} {...stylex.props(styles.list)}>{items}</ol> : <ul {...stylex.props(styles.list)}>{items}</ul>;
    }
    case "blockquote":
      return <blockquote {...stylex.props(styles.quote)}>{renderTokens((token as Tokens.Blockquote).tokens)}</blockquote>;
    case "code":
      return <pre {...stylex.props(styles.pre)}><code>{(token as Tokens.Code).text}</code></pre>;
    case "hr":
      return <hr {...stylex.props(styles.rule)} />;
    case "table": {
      const table = token as Tokens.Table;
      return (
        <table {...stylex.props(styles.table)}>
          <thead>
            <tr>{table.header.map((cell, index) => <th key={index} {...stylex.props(styles.cell)}>{renderTokens(cell.tokens)}</th>)}</tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>{row.map((cell, index) => <td key={index} {...stylex.props(styles.cell)}>{renderTokens(cell.tokens)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      );
    }
    case "strong":
      return <strong {...stylex.props(styles.strong)}>{renderTokens((token as Tokens.Strong).tokens)}</strong>;
    case "em":
      return <em>{renderTokens((token as Tokens.Em).tokens)}</em>;
    case "del":
      return <s>{renderTokens((token as Tokens.Del).tokens)}</s>;
    case "codespan":
      return <code {...stylex.props(styles.code)}>{(token as Tokens.Codespan).text}</code>;
    case "br":
      return <br />;
    case "link": {
      const link = token as Tokens.Link;
      const href = safeHref(link.href);
      if (!href) return <>{renderTokens(link.tokens)}</>;
      return <a href={href} target="_blank" rel="noreferrer" {...stylex.props(styles.link)}>{renderTokens(link.tokens)}</a>;
    }
    case "image":
      return (token as Tokens.Image).text;
    case "text": {
      const text = token as Tokens.Text;
      return text.tokens ? renderTokens(text.tokens) : text.text;
    }
    case "space":
      return null;
    default:
      return "text" in token ? String(token.text) : "raw" in token ? String(token.raw) : null;
  }
}

export const Prose = memo(function Prose({ text, streaming }: { text: string; streaming: boolean }) {
  const tokens = marked.lexer(streaming ? remend(text) : text);
  return <div {...stylex.props(styles.root)}>{renderTokens(tokens)}</div>;
});
