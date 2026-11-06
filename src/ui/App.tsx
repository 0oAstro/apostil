import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { connectionIsComplete } from "../ai/providers";
import { INK_COLORS } from "../domain/types";
import { updateNote, useStore } from "../store";
import { color, font } from "../theme.stylex";
import { darkTheme } from "../themes";
import { ChatPanel } from "./ChatPanel";
import { ConnectDialog, CustomizeDialog } from "./Customize";
import { Editor } from "./Editor";
import { ExportDialog } from "./ExportDialog";
import { Header } from "./Header";
import { CloseIcon, MenuIcon } from "./icons";
import { InkMark } from "./InkMark";
import { InkTrail } from "./InkTrail";
import { Palette } from "./Palette";
import { PrintView } from "./PrintView";
import { Button } from "./primitives";
import { SelectionMenu } from "./SelectionMenu";
import { Sidebar } from "./Sidebar";
import { SlashMenu } from "./SlashMenu";

const styles = stylex.create({
  app: { position: "fixed", inset: 0, overflowY: "auto", overflowX: "hidden", backgroundColor: color.page, color: color.ink, fontFamily: font.sans },
  top: { position: "fixed", top: 10, left: 12, zIndex: 25, display: "flex", alignItems: "center", gap: 6 },
  brand: { display: "flex", alignItems: "center", gap: 7, color: color.ink, textDecoration: "none", fontFamily: font.serif, fontSize: 17, fontWeight: 500 },
  page: {
    position: "relative",
    width: 660,
    maxWidth: "calc(100vw - 40px)",
    marginInline: "auto",
    paddingTop: 58,
    transitionProperty: "transform, opacity",
    transitionDuration: "280ms",
    transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
  },
  pageWithChat: { opacity: 0.45, transform: "translateX(-160px)" },
  title: {
    display: "block",
    width: "100%",
    borderWidth: 0,
    outline: "none",
    backgroundColor: "transparent",
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 30,
    fontWeight: 600,
    letterSpacing: "-0.022em",
    lineHeight: 1.2,
    padding: 0,
    marginTop: 14,
    marginBottom: 18,
  },
  connect: { position: "fixed", right: 14, bottom: 12, zIndex: 15, fontSize: 12, color: color.inkFaint, fontFamily: font.sans },
});

function useTheme() {
  const appearance = useStore((state) => state.settings.appearance);
  const inkColor = useStore((state) => state.settings.inkColor);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = appearance === "dark" || (appearance === "system" && media.matches);
      const root = document.documentElement;
      root.className = dark ? (stylex.props(darkTheme).className ?? "") : "";
      root.style.colorScheme = dark ? "dark" : "light";
      root.style.setProperty("--apostil-default-ink", dark ? "#ece8e2" : "#1f2322");
      root.style.setProperty("--apostil-ink", inkColor === INK_COLORS[0] ? "var(--apostil-default-ink)" : inkColor);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [appearance, inkColor]);
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        const { dialog } = useStore.getState();
        useStore.setState({ dialog: dialog === "palette" ? null : "palette" });
      } else if (key === "\\") {
        event.preventDefault();
        useStore.setState((state) => ({ sidebarOpen: !state.sidebarOpen }));
      } else if (key === "j") {
        event.preventDefault();
        useStore.setState((state) => ({ chatOpen: !state.chatOpen }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export function App() {
  const loaded = useStore((state) => state.loaded);
  const activeId = useStore((state) => state.activeId);
  const title = useStore((state) => state.notes[state.activeId]?.title ?? "");
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const chatOpen = useStore((state) => state.chatOpen);
  const ink = useStore((state) => state.settings.inkFromPointer);
  const connected = useStore((state) => connectionIsComplete(state.connection));
  const [inkColor, setInkColor] = useState("#1f2322");
  useTheme();
  useShortcuts();

  useEffect(() => {
    setInkColor(getComputedStyle(document.documentElement).getPropertyValue("--apostil-default-ink") || "#1f2322");
  }, [ink]);

  useEffect(() => {
    document.title = title ? `${title} · Apostil` : "Apostil";
  }, [title]);

  if (!loaded) return null;

  return (
    <div {...stylex.props(styles.app)} data-app-scroller>
      <div {...stylex.props(styles.top)}>
        <Button aria-label={sidebarOpen ? "Close notes" : "Open notes"} onClick={() => useStore.setState({ sidebarOpen: !sidebarOpen })}>
          {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
        </Button>
        <a href="../" {...stylex.props(styles.brand)}><InkMark size={13} /> apostil</a>
      </div>
      <Sidebar />
      <main {...stylex.props(styles.page, chatOpen && styles.pageWithChat)} key={activeId}>
        <Header noteId={activeId} />
        <input
          aria-label="Title"
          placeholder="Untitled"
          value={title}
          onChange={(event) => updateNote(activeId, (note) => ({ ...note, title: event.target.value, updatedAt: Date.now() }))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              document.querySelector<HTMLElement>("[data-editor-host] .cm-content")?.focus();
            }
          }}
          {...stylex.props(styles.title)}
        />
        <Editor noteId={activeId} />
      </main>
      <ChatPanel />
      <SelectionMenu />
      <SlashMenu />
      <ExportDialog />
      <CustomizeDialog />
      <ConnectDialog />
      <Palette />
      <PrintView />
      {!connected && (
        <Button xstyle={styles.connect} onClick={() => useStore.setState({ dialog: "connect" })}>Connect a model</Button>
      )}
      {ink && <InkTrail color={inkColor} />}
      <Toaster position="bottom-center" toastOptions={{ style: { fontFamily: "var(--apostil-toast-font)" } }} />
    </div>
  );
}

