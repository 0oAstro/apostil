import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { toast } from "sonner";
import { download, fileName, noteToMarkdown, noteToWord } from "../export";
import { activeNote, useStore } from "../store";
import { color, font } from "../theme.stylex";
import { Button, Modal, Toggle } from "./primitives";
import { optionStyles } from "./Customize";

type Format = "pdf" | "word" | "markdown";

const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: "pdf", label: "PDF", hint: "Prints from your browser." },
  { id: "word", label: "Word", hint: "A .docx file to keep editing." },
  { id: "markdown", label: "Markdown", hint: "Plain text for anywhere." },
];

const styles = stylex.create({
  body: { padding: 24 },
  title: { fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 14, paddingRight: 24 },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  toggle: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginTop: 16, fontSize: 13 },
  toggleHint: { fontSize: 12, color: color.inkFaint, marginTop: 2 },
  footer: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20, fontFamily: font.sans },
});

export function ExportDialog() {
  const open = useStore((state) => state.dialog === "export");
  const title = useStore((state) => state.notes[state.activeId]?.title);
  const [format, setFormat] = useState<Format>("pdf");
  const [includeReplies, setIncludeReplies] = useState(true);
  const close = () => useStore.setState({ dialog: null });

  const runExport = async () => {
    const note = activeNote();
    if (!note) return;
    if (format === "markdown") {
      download(new Blob([noteToMarkdown(note, includeReplies)], { type: "text/markdown" }), fileName(note, "md"));
    } else if (format === "word") {
      try {
        download(await noteToWord(note, includeReplies), fileName(note, "docx"));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not write the Word file.");
        return;
      }
    } else {
      useStore.setState({ dialog: null, sidebarOpen: false, chatOpen: false, printIncludesReplies: includeReplies });
      setTimeout(() => window.print(), 320);
      return;
    }
    close();
  };

  return (
    <Modal open={open} onClose={close} width={440} title="Export">
      <div {...stylex.props(styles.body)}>
        <h2 {...stylex.props(styles.title)}>Export “{title || "Untitled"}”</h2>
        <div {...stylex.props(styles.grid)}>
          {FORMATS.map((item) => (
            <button key={item.id} type="button" aria-pressed={format === item.id} onClick={() => setFormat(item.id)} {...stylex.props(optionStyles.option, format === item.id && optionStyles.selected)}>
              <div {...stylex.props(optionStyles.label)}>{item.label}</div>
              <div {...stylex.props(optionStyles.hint)}>{item.hint}</div>
            </button>
          ))}
        </div>
        <div {...stylex.props(styles.toggle)}>
          <div>
            <div>Include the margins</div>
            <div {...stylex.props(styles.toggleHint)}>Turn this off to export only your own words.</div>
          </div>
          <Toggle label="Include the margins" checked={includeReplies} onChange={setIncludeReplies} />
        </div>
        <div {...stylex.props(styles.footer)}>
          <Button onClick={close}>Cancel</Button>
          <Button primary onClick={() => void runExport()}>Export {FORMATS.find((item) => item.id === format)?.label}</Button>
        </div>
      </div>
    </Modal>
  );
}
