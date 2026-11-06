import type { Message, Note, Thread } from "./domain/types";

function threadAsMarkdown(thread: Thread): string {
  const lines: string[] = [];
  for (const message of thread.messages) {
    const speaker = message.role === "writer" ? "Me" : "Apostil";
    lines.push(`> **${speaker}:** ${message.text.replaceAll("\n", "\n> ")}`);
    if (message.diagram) lines.push(`> *Drawing: ${message.diagram.title}. ${stageCaptions(message)}*`);
  }
  return lines.join("\n>\n");
}

function stageCaptions(message: Message): string {
  return (message.diagram?.stages ?? []).map((stage) => stage.caption).filter(Boolean).join(" ");
}

export type NoteSegment = { text: string; threads: Thread[] };

export function noteSegments(note: Note): NoteSegment[] {
  const threadsByLineEnd = new Map<number, Thread[]>();
  for (const thread of note.threads) {
    const newline = note.text.indexOf("\n", thread.anchor.to);
    const lineEnd = newline === -1 ? note.text.length : newline;
    threadsByLineEnd.set(lineEnd, [...(threadsByLineEnd.get(lineEnd) ?? []), thread]);
  }

  const segments: NoteSegment[] = [];
  let position = 0;
  for (const lineEnd of [...threadsByLineEnd.keys()].sort((a, b) => a - b)) {
    segments.push({ text: note.text.slice(position, lineEnd), threads: threadsByLineEnd.get(lineEnd)! });
    position = lineEnd;
  }
  segments.push({ text: note.text.slice(position), threads: [] });
  return segments;
}

export function noteToMarkdown(note: Note, includeReplies: boolean): string {
  const heading = note.title ? `# ${note.title}\n\n` : "";
  if (!includeReplies) return `${heading}${note.text}\n`;

  let output = "";
  for (const segment of noteSegments(note)) {
    output += segment.text;
    for (const thread of segment.threads) output += `\n\n${threadAsMarkdown(thread)}\n`;
  }
  return `${heading}${output.trimEnd()}\n`;
}

export function fileName(note: Note, extension: string): string {
  const safe = (note.title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${safe || "untitled"}.${extension}`;
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export async function noteToWord(note: Note, includeReplies: boolean): Promise<Blob> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const paragraphs = [];
  if (note.title) paragraphs.push(new Paragraph({ text: note.title, heading: HeadingLevel.TITLE }));

  const markdown = noteToMarkdown({ ...note, title: "" }, includeReplies).trimEnd();
  for (const line of markdown.split("\n")) {
    const heading = /^(#{1,3}) (.*)$/.exec(line);
    if (heading) {
      const level = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][heading[1]!.length - 1];
      paragraphs.push(new Paragraph({ text: heading[2]!, heading: level }));
    } else if (/^[-*] /.test(line)) {
      paragraphs.push(new Paragraph({ text: line.slice(2), bullet: { level: 0 } }));
    } else if (line.startsWith(">")) {
      const text = line.replace(/^> ?/, "").replaceAll("**", "").replaceAll("*", "");
      paragraphs.push(new Paragraph({ children: [new TextRun({ text, italics: true, color: "666666" })], indent: { left: 360 } }));
    } else {
      paragraphs.push(new Paragraph({ text: line }));
    }
  }
  return Packer.toBlob(new Document({ sections: [{ children: paragraphs }] }));
}
