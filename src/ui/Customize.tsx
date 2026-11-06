import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { connectionIsComplete, PROVIDERS, type Connection, type ProviderId } from "../ai/providers";
import { BUILT_IN_VOICES, INK_COLORS, type Appearance, type Layout, type MarginVoice, type NoteMode, type Pace, type TextSize } from "../domain/types";
import { newId, saveConnection, updateSettings, useStore, type CustomizeTab } from "../store";
import { color, ease, font } from "../theme.stylex";
import { Button, Modal, press, Toggle } from "./primitives";

export const optionStyles = stylex.create({
  option: {
    display: "block",
    textAlign: "left",
    backgroundColor: "transparent",
    color: color.ink,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.rule,
    borderRadius: 9,
    padding: 11,
    cursor: "pointer",
    fontFamily: font.sans,
    width: "100%",
    transitionProperty: "border-color, transform",
    transitionDuration: "140ms",
    transitionTimingFunction: ease.out,
    transform: { default: null, ":active": "scale(0.98)" },
  },
  selected: { borderColor: color.ink },
  label: { fontSize: 13, fontWeight: 500 },
  hint: { fontSize: 12, color: color.inkFaint, marginTop: 3, lineHeight: 1.35 },
});

const styles = stylex.create({
  shell: { display: "grid", gridTemplateColumns: "170px 1fr", height: "min(640px, 86vh)" },
  nav: { padding: 14, borderRightWidth: 1, borderRightStyle: "solid", borderRightColor: color.rule, display: "flex", flexDirection: "column", gap: 2 },
  navItem: {
    textAlign: "left",
    borderWidth: 0,
    backgroundColor: { default: "transparent", ":hover": { default: "transparent", "@media (hover: hover)": color.markHover } },
    color: color.inkSoft,
    padding: 7,
    borderRadius: 6,
    fontFamily: font.sans,
    fontSize: 13,
    cursor: "pointer",
  },
  navActive: { backgroundColor: color.markHover, color: color.ink },
  content: { padding: 24, overflowY: "auto" },
  heading: { fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 18, paddingRight: 24 },
  group: { marginBottom: 22 },
  groupTitle: { fontSize: 13, fontWeight: 500, marginBottom: 8 },
  options2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 },
  options3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  toggle: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 22, cursor: "pointer" },
  serif: { fontFamily: font.serif, fontSize: 15 },
  swatches: { display: "flex", gap: 8 },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "transparent",
    outlineWidth: 2,
    outlineStyle: "solid",
    outlineColor: "transparent",
    cursor: "pointer",
  },
  swatchSelected: { outlineColor: color.inkFaint },
  field: { display: "block", marginBottom: 14 },
  fieldLabel: { display: "block", fontSize: 13, fontWeight: 500, marginBottom: 5 },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: color.rule, ":focus": color.inkFaint },
    borderRadius: 7,
    outline: "none",
    color: color.ink,
    fontFamily: font.sans,
    fontSize: 13,
    paddingBlock: 7,
    paddingInline: 9,
  },
  failure: { fontSize: 13, color: color.danger, lineHeight: 1.4, marginBlock: 10, overflowWrap: "anywhere" },
  note: { fontSize: 12, color: color.inkFaint, lineHeight: 1.45, marginTop: 10 },
  actions: { display: "flex", gap: 8, alignItems: "center", marginTop: 6 },
  voice: { paddingBlock: 10, borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: color.rule, fontSize: 13 },
  voiceHint: { color: color.inkFaint, fontSize: 12, marginTop: 2, lineHeight: 1.35 },
  voiceRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  link: { color: "inherit", textUnderlineOffset: 2 },
  aboutText: { fontFamily: font.serif, fontSize: 16, lineHeight: 1.45, marginBlock: 0, marginBottom: 12 },
});

function Options<T extends string>({ title, value, options, columns, onChange }: {
  title: string;
  value: T;
  options: { id: T; label: string; hint?: string }[];
  columns: 2 | 3;
  onChange: (next: T) => void;
}) {
  return (
    <div {...stylex.props(styles.group)}>
      <div {...stylex.props(styles.groupTitle)}>{title}</div>
      <div {...stylex.props(columns === 2 ? styles.options2 : styles.options3)}>
        {options.map((option) => (
          <button key={option.id} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)} {...stylex.props(optionStyles.option, value === option.id && optionStyles.selected)}>
            <div {...stylex.props(optionStyles.label)}>{option.label}</div>
            {option.hint && <div {...stylex.props(optionStyles.hint)}>{option.hint}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function CustomizeTabView() {
  const settings = useStore((state) => state.settings);
  return (
    <>
      <h2 {...stylex.props(styles.heading)}>Customize Apostil</h2>
      <Options<NoteMode>
        title="New notes start in"
        columns={2}
        value={settings.defaultMode}
        onChange={(defaultMode) => updateSettings({ defaultMode })}
        options={[
          { id: "reads-along", label: "Reads along", hint: "Reads as you write and speaks up when it has something." },
          { id: "when-asked", label: "When you ask", hint: "Quiet until you select words or open the chat." },
        ]}
      />
      <div {...stylex.props(styles.toggle)}>
        <div>
          <div {...stylex.props(optionStyles.label)}>Ink from the pointer</div>
          <div {...stylex.props(optionStyles.hint)}>A drop of ink follows the pointer, then fades.</div>
        </div>
        <Toggle label="Ink from the pointer" checked={settings.inkFromPointer} onChange={(inkFromPointer) => updateSettings({ inkFromPointer })} />
      </div>
      <Options<Pace>
        title="Reading pace"
        columns={2}
        value={settings.pace}
        onChange={(pace) => updateSettings({ pace })}
        options={[
          { id: "regular", label: "Regular", hint: "Reads a moment after you stop typing." },
          { id: "slow", label: "Slow", hint: "Waits longer, for when you pause to think." },
        ]}
      />
      <Options<Layout>
        title="Where thoughts appear"
        columns={3}
        value={settings.layout}
        onChange={(layout) => updateSettings({ layout })}
        options={[
          { id: "both", label: "Both margins", hint: "Your words in the middle." },
          { id: "right", label: "Right margin", hint: "Everything on one side." },
          { id: "marks", label: "Marks only", hint: "Underlines. Click to read." },
        ]}
      />
      <Options<Appearance>
        title="Appearance"
        columns={3}
        value={settings.appearance}
        onChange={(appearance) => updateSettings({ appearance })}
        options={[{ id: "system", label: "System" }, { id: "light", label: "Light" }, { id: "dark", label: "Dark" }]}
      />
      <Options<TextSize>
        title="Text size"
        columns={3}
        value={settings.textSize}
        onChange={(textSize) => updateSettings({ textSize })}
        options={[{ id: "small", label: "Small" }, { id: "default", label: "Default" }, { id: "large", label: "Large" }]}
      />
      <Options<MarginVoice>
        title="Margin lettering"
        columns={2}
        value={settings.marginVoice}
        onChange={(marginVoice) => updateSettings({ marginVoice })}
        options={[{ id: "serif", label: "Apostil's own", hint: "A serif, so it reads as another hand." }, { id: "sans", label: "Same as yours", hint: "One typeface for the page." }]}
      />
      <div {...stylex.props(styles.group)}>
        <div {...stylex.props(styles.groupTitle)}>Ink</div>
        <div {...stylex.props(styles.swatches)}>
          {INK_COLORS.map((ink, index) => (
            <button
              key={ink}
              type="button"
              aria-label={`Ink ${index + 1}`}
              aria-pressed={settings.inkColor === ink}
              onClick={() => updateSettings({ inkColor: ink })}
              style={{ backgroundColor: index === 0 ? "var(--apostil-default-ink)" : ink }}
              {...stylex.props(styles.swatch, press.base, settings.inkColor === ink && styles.swatchSelected)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function VoicesTab() {
  const customVoices = useStore((state) => state.settings.customVoices);
  const [name, setName] = useState("");
  const [instruction, setInstruction] = useState("");

  const addVoice = () => {
    if (!name.trim() || !instruction.trim()) return;
    updateSettings({ customVoices: [...customVoices, { id: newId(), name: name.trim(), instruction: instruction.trim() }] });
    setName("");
    setInstruction("");
  };

  return (
    <>
      <h2 {...stylex.props(styles.heading)}>Voices</h2>
      {BUILT_IN_VOICES.map((voice) => (
        <div key={voice.id} {...stylex.props(styles.voice)}>
          <div>{voice.name}</div>
          <div {...stylex.props(styles.voiceHint)}>{voice.instruction}</div>
        </div>
      ))}
      {customVoices.map((voice) => (
        <div key={voice.id} {...stylex.props(styles.voice)}>
          <div {...stylex.props(styles.voiceRow)}>
            {voice.name}
            <Button onClick={() => updateSettings({ customVoices: customVoices.filter((item) => item.id !== voice.id) })}>Remove</Button>
          </div>
          <div {...stylex.props(styles.voiceHint)}>{voice.instruction}</div>
        </div>
      ))}
      <div {...stylex.props(styles.group)} style={{ marginTop: 20 }}>
        <div {...stylex.props(styles.groupTitle)}>New voice</div>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.fieldLabel)}>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} {...stylex.props(styles.input)} />
        </label>
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.fieldLabel)}>How it behaves</span>
          <input value={instruction} onChange={(event) => setInstruction(event.target.value)} {...stylex.props(styles.input)} />
        </label>
        <Button primary onClick={addVoice}>Add voice</Button>
      </div>
    </>
  );
}

export function ConnectionForm({ onSaved }: { onSaved?: () => void }) {
  const saved = useStore((state) => state.connection);
  const [draft, setDraft] = useState<Connection>(saved);
  const [status, setStatus] = useState<"idle" | "testing">("idle");
  const [failure, setFailure] = useState("");
  useEffect(() => setDraft(saved), [saved]);

  const info = PROVIDERS[draft.provider];
  const change = (patch: Partial<Connection>) => setDraft({ ...draft, ...patch });

  const switchProvider = (provider: ProviderId) => {
    const model = PROVIDERS[provider].modelHint.startsWith("The ") ? "" : PROVIDERS[provider].modelHint;
    setDraft({ ...draft, provider, model, endpoint: "" });
  };

  const save = async () => {
    setStatus("testing");
    setFailure("");
    try {
      const { testConnection } = await import("../ai/run");
      await testConnection(draft);
      saveConnection(draft);
      toast.success("Connected. Your key stays in this browser.");
      onSaved?.();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setStatus("idle");
    }
  };

  return (
    <>
      <label {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.fieldLabel)}>Provider</span>
        <select value={draft.provider} onChange={(event) => switchProvider(event.target.value as ProviderId)} {...stylex.props(styles.input)}>
          {(Object.keys(PROVIDERS) as ProviderId[]).map((id) => (
            <option key={id} value={id}>{PROVIDERS[id].label}</option>
          ))}
        </select>
      </label>
      <label {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.fieldLabel)}>API key</span>
        <input type="password" autoComplete="off" placeholder={info.keyHint} value={draft.apiKey} onChange={(event) => change({ apiKey: event.target.value })} {...stylex.props(styles.input)} />
      </label>
      <label {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.fieldLabel)}>Model</span>
        <input placeholder={info.modelHint} value={draft.model} onChange={(event) => change({ model: event.target.value })} {...stylex.props(styles.input)} />
      </label>
      <label {...stylex.props(styles.field)}>
        <span {...stylex.props(styles.fieldLabel)}>Endpoint</span>
        <input placeholder={info.endpointHint} value={draft.endpoint} onChange={(event) => change({ endpoint: event.target.value })} {...stylex.props(styles.input)} />
      </label>
      {draft.provider === "amazon-bedrock" && (
        <label {...stylex.props(styles.field)}>
          <span {...stylex.props(styles.fieldLabel)}>Region</span>
          <input value={draft.region} onChange={(event) => change({ region: event.target.value })} {...stylex.props(styles.input)} />
        </label>
      )}
      <div {...stylex.props(styles.actions)}>
        <Button primary disabled={status === "testing" || !connectionIsComplete(draft)} onClick={() => void save()}>
          {status === "testing" ? "Testing…" : "Test and save"}
        </Button>
        <Button onClick={() => saveConnection({ ...draft, apiKey: "" })}>Forget key</Button>
      </div>
      {failure && <p role="alert" {...stylex.props(styles.failure)}>{failure}</p>}
      <p {...stylex.props(styles.note)}>
        There is no Apostil server. Requests go straight from this browser to the endpoint above, and the key stays in this browser's storage. Prefer a short-lived key. An endpoint must allow requests from web pages.
      </p>
    </>
  );
}

const TABS: { id: CustomizeTab; label: string }[] = [
  { id: "customize", label: "Customize" },
  { id: "voices", label: "Voices" },
  { id: "connection", label: "Model" },
  { id: "about", label: "About" },
];

export function CustomizeDialog() {
  const open = useStore((state) => state.dialog === "customize");
  const tab = useStore((state) => state.customizeTab);
  return (
    <Modal open={open} onClose={() => useStore.setState({ dialog: null })} width={760} title="Customize">
      <div {...stylex.props(styles.shell)}>
        <nav {...stylex.props(styles.nav)}>
          {TABS.map((item) => (
            <button key={item.id} type="button" onClick={() => useStore.setState({ customizeTab: item.id })} {...stylex.props(styles.navItem, press.base, tab === item.id && styles.navActive)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div {...stylex.props(styles.content)}>
          {tab === "customize" && <CustomizeTabView />}
          {tab === "voices" && <VoicesTab />}
          {tab === "connection" && (
            <>
              <h2 {...stylex.props(styles.heading)}>Model</h2>
              <ConnectionForm />
            </>
          )}
          {tab === "about" && (
            <>
              <h2 {...stylex.props(styles.heading)}>About</h2>
              <p {...stylex.props(styles.aboutText)}>An apostil is a note written in a margin. This one thinks with you, not for you.</p>
              <p {...stylex.props(styles.note)}>
                Open source under the MIT license. <a {...stylex.props(styles.link)} href="https://github.com/0oAstro/apostil">Source on GitHub</a>.
              </p>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function ConnectDialog() {
  const open = useStore((state) => state.dialog === "connect");
  const close = () => useStore.setState({ dialog: null });
  return (
    <Modal open={open} onClose={close} width={460} title="Connect a model">
      <div style={{ padding: 24 }}>
        <h2 {...stylex.props(styles.heading)}>Connect a model</h2>
        <ConnectionForm onSaved={close} />
      </div>
    </Modal>
  );
}
