import * as stylex from "@stylexjs/stylex";
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { color, ease, font } from "../theme.stylex";
import { ChevronIcon, CloseIcon } from "./icons";

export const press = stylex.create({
  base: {
    transitionProperty: "transform, background-color, color, opacity",
    transitionDuration: "140ms",
    transitionTimingFunction: ease.out,
    transform: { default: null, ":active": "scale(0.97)" },
  },
});

const styles = stylex.create({
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderWidth: 0,
    backgroundColor: {
      default: "transparent",
      ":hover": { default: "transparent", "@media (hover: hover)": color.markHover },
    },
    color: color.inkSoft,
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: "20px",
    paddingBlock: 4,
    paddingInline: 8,
    borderRadius: 6,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  primary: {
    backgroundColor: { default: color.ink, ":hover": color.ink },
    color: color.page,
    paddingInline: 14,
    paddingBlock: 6,
    borderRadius: 999,
    fontWeight: 500,
  },
  dialog: {
    position: "fixed",
    inset: 0,
    margin: "auto",
    padding: 0,
    borderWidth: 0,
    height: "fit-content",
    backgroundColor: color.paper,
    color: color.ink,
    borderRadius: 14,
    boxShadow: "0 24px 70px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.04)",
    maxHeight: "86vh",
    maxWidth: "calc(100vw - 32px)",
    overflow: "hidden",
    fontFamily: font.sans,
    transitionProperty: "opacity, transform, overlay, display",
    transitionBehavior: "allow-discrete",
    transitionDuration: "160ms",
    transitionTimingFunction: ease.out,
    opacity: { default: 0, ":is([open])": 1 },
    transform: { default: "scale(0.97)", ":is([open])": "scale(1)" },
    "@starting-style": { opacity: 0, transform: "scale(0.96)" },
    "::backdrop": {
      backgroundColor: color.scrim,
      opacity: { default: 0, ":is([open])": 1 },
    },
  },
  dialogOpen: {
    opacity: 1,
    transform: "scale(1)",
    transitionDuration: "200ms",
  },
  menuTrigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderWidth: 0,
    backgroundColor: { default: "transparent", ":hover": { default: "transparent", "@media (hover: hover)": color.markHover } },
    color: color.inkSoft,
    fontFamily: font.sans,
    fontSize: 13,
    lineHeight: "20px",
    paddingBlock: 4,
    paddingInline: 8,
    borderRadius: 6,
    cursor: "pointer",
  },
  menu: {
    position: "fixed",
    inset: "auto",
    margin: 0,
    borderWidth: 0,
    backgroundColor: color.paper,
    color: color.ink,
    borderRadius: 10,
    padding: 5,
    boxShadow: "0 10px 34px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.05)",
    fontFamily: font.sans,
    maxWidth: 290,
    transformOrigin: "top left",
    transitionProperty: "opacity, transform, overlay, display",
    transitionBehavior: "allow-discrete",
    transitionDuration: "140ms",
    transitionTimingFunction: ease.out,
    opacity: { default: 0, ":popover-open": 1 },
    transform: { default: "scale(0.97)", ":popover-open": "scale(1)" },
    "@starting-style": { opacity: 0, transform: "scale(0.97)" },
  },
  switchRoot: {
    position: "relative",
    flexShrink: 0,
    width: 34,
    height: 20,
    padding: 0,
    borderWidth: 0,
    borderRadius: 999,
    cursor: "pointer",
    backgroundColor: { default: color.sandDeep, ":is([aria-checked=true])": color.ink },
    transitionProperty: "background-color",
    transitionDuration: "160ms",
  },
  switchThumb: {
    display: "block",
    width: 16,
    height: 16,
    marginLeft: 2,
    borderRadius: "50%",
    backgroundColor: color.page,
    transitionProperty: "transform",
    transitionDuration: "180ms",
    transitionTimingFunction: ease.out,
    transform: "translateX(0)",
  },
  switchThumbOn: { transform: "translateX(14px)" },
  close: { position: "absolute", top: 12, right: 12 },
});

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; xstyle?: stylex.StyleXStyles };

export function Button({ primary, xstyle, className: _className, style: _style, ...props }: ButtonProps) {
  return <button type="button" {...props} {...stylex.props(styles.button, press.base, primary && styles.primary, xstyle)} />;
}

export function Modal({ open, onClose, width, title, children }: { open: boolean; onClose: () => void; width: number; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        if (event.target === ref.current) onClose();
      }}
      style={{ width }}
      {...stylex.props(styles.dialog, open && styles.dialogOpen)}
    >
      {open && children}
      <Button aria-label="Close" xstyle={styles.close} onClick={onClose}>
        <CloseIcon />
      </Button>
    </dialog>
  );
}

function moveMenuFocus(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  const index = items.indexOf(document.activeElement as HTMLElement);
  const delta = event.key === "ArrowDown" ? 1 : -1;
  items[(index + delta + items.length) % items.length]?.focus();
}

export function Menu({ label, children }: { label: ReactNode; children: ReactNode }) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <button ref={triggerRef} type="button" popoverTarget={id} aria-haspopup="menu" {...stylex.props(styles.menuTrigger, press.base)}>
        {label}
        <ChevronIcon />
      </button>
      <div
        ref={menuRef}
        id={id}
        popover="auto"
        role="menu"
        onKeyDown={moveMenuFocus}
        onClick={() => menuRef.current?.hidePopover()}
        onBeforeToggle={(event) => {
          const trigger = triggerRef.current;
          const menu = menuRef.current;
          if (event.newState !== "open" || !trigger || !menu) return;
          const bounds = trigger.getBoundingClientRect();
          menu.style.top = `${bounds.bottom + 4}px`;
          menu.style.left = `${bounds.left}px`;
        }}
        onToggle={(event) => {
          if (event.newState === "open") menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
        }}
        {...stylex.props(styles.menu)}
      >
        {children}
      </div>
    </>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} {...stylex.props(styles.switchRoot)}>
      <span {...stylex.props(styles.switchThumb, checked && styles.switchThumbOn)} />
    </button>
  );
}
