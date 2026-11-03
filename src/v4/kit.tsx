// FORMA LAB 4.0 UI kit.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, GripVertical, Info } from 'lucide-react';
import { back } from '../lib/router';

export function NavBar({ title, right, fallback = '/' }: { title?: ReactNode; right?: ReactNode; fallback?: string }) {
  return (
    <header className="navbar">
      <button className="icon-btn clear" onClick={() => back(fallback)} aria-label="Indietro">
        <ChevronLeft size={24} />
      </button>
      <div className="navbar-title">{title}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </header>
  );
}

export function AppBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="appbar">
      <h1 className="appbar-title">{title}</h1>
      {right}
    </header>
  );
}

export function Section({ title, action, children, label }: { title: string; action?: ReactNode; children: ReactNode; label?: string }) {
  return (
    <section className="section" aria-label={label ?? title}>
      <div className="section-head">
        <h2 className="t-h2">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Acc({ title, icon, children, open = false, badge }: { title: string; icon?: ReactNode; children: ReactNode; open?: boolean; badge?: ReactNode }) {
  return (
    <details className="acc" open={open}>
      <summary>
        {icon}
        {title}
        {badge}
        <ChevronDown size={18} className="chev" />
      </summary>
      <div className="body">{children}</div>
    </details>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

export function Notice({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="notice" role="note">
      {icon ?? <Info size={17} color="var(--data)" />}
      <div>{children}</div>
    </div>
  );
}

export function Empty({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ico">{icon}</div>
      <div className="t-h3">{title}</div>
      {children && <p className="t-sm c2" style={{ marginTop: 6 }}>{children}</p>}
      {action && <div className="mt16">{action}</div>}
    </div>
  );
}

export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="grab" aria-hidden />
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Confirm({ open, title, body, confirmLabel, danger, onConfirm, onClose }: { open: boolean; title: string; body?: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} label={title}>
      <div className="col">
        <h3 className="t-h2">{title}</h3>
        {body && <div className="t-sm c2">{body}</div>}
        <button
          className={`btn lg block ${danger ? 'danger' : 'primary'}`}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
        <button className="btn block ghost" onClick={onClose}>
          Annulla
        </button>
      </div>
    </Sheet>
  );
}

type ToastAction = { label: string; run: () => void };
type ToastFn = (m: string, action?: ToastAction, ms?: number) => void;
let toastImpl: ToastFn = () => {};
export const toast: ToastFn = (m, action, ms) => toastImpl(m, action, ms);
export function ToastHost() {
  const [msg, setMsg] = useState<{ m: string; action?: ToastAction } | null>(null);
  useEffect(() => {
    let t: number | undefined;
    toastImpl = (m, action, ms) => {
      setMsg({ m, action });
      clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), ms ?? (action ? 4500 : 2400));
    };
    return () => clearTimeout(t);
  }, []);
  return msg ? (
    <div className="toast row" role="status" aria-live="polite" style={{ gap: 12 }}>
      <span className="grow">{msg.m}</span>
      {msg.action && (
        <button
          className="btn sm"
          onClick={() => {
            msg.action!.run();
            setMsg(null);
          }}
        >
          {msg.action.label}
        </button>
      )}
    </div>
  ) : null;
}

/** Short celebration overlay (record). Respects reduced motion via CSS. */
let celebrateImpl: (text: string) => void = () => {};
export const celebrate = (text: string) => celebrateImpl(text);
export function CelebrationHost() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let t: number | undefined;
    celebrateImpl = (x) => {
      setText(x);
      clearTimeout(t);
      t = window.setTimeout(() => setText(null), 2000);
      if ('vibrate' in navigator) navigator.vibrate?.([30, 40, 60]);
    };
    return () => clearTimeout(t);
  }, []);
  if (!text) return null;
  const colors = ['#2f6bff', '#00b8ff', '#22c55e', '#f59e0b', '#ffffff'];
  return (
    <div className="celebrate" role="status" aria-live="assertive">
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2;
        const r = 120 + (i % 4) * 30;
        return <i key={i} style={{ background: colors[i % colors.length], ['--dx' as string]: `${Math.cos(a) * r}px`, ['--dy' as string]: `${Math.sin(a) * r}px` }} />;
      })}
      <div className="medal">🏅 Nuovo record!<div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{text}</div></div>
    </div>
  );
}

/** Reorderable list: drag the handle (touch or mouse) or use the arrow buttons (keyboard/VoiceOver). */
export function SortableList<T extends { id: string }>({ items, onChange, render, label }: { items: T[]; onChange: (items: T[]) => void; render: (item: T, handle: ReactNode, move: (d: number) => void) => ReactNode; label: string }) {
  const [drag, setDrag] = useState<{ id: string; y0: number; dy: number } | null>(null);
  const refs = useRef(new Map<string, HTMLDivElement>());
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    const [x] = n.splice(i, 1);
    n.splice(j, 0, x);
    onChange(n);
  };
  const end = () => {
    if (!drag) return;
    const i = items.findIndex((x) => x.id === drag.id);
    const el = refs.current.get(drag.id);
    if (el) {
      const mid = el.getBoundingClientRect().top + el.offsetHeight / 2;
      let target = i;
      items.forEach((it, k) => {
        const r = refs.current.get(it.id)?.getBoundingClientRect();
        if (!r || it.id === drag.id) return;
        const c = r.top + r.height / 2;
        if (k > i && mid > c) target = k;
        if (k < i && mid < c && target === i) target = k;
      });
      if (target !== i) move(i, target - i);
    }
    setDrag(null);
  };
  return (
    <div role="list" aria-label={label} onPointerMove={(e) => drag && setDrag({ ...drag, dy: e.clientY - drag.y0 })} onPointerUp={end} onPointerCancel={() => setDrag(null)}>
      {items.map((it, i) => {
        const handle = (
          <span
            className="drag-handle icon-btn clear"
            role="img"
            aria-label="Trascina per riordinare"
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              setDrag({ id: it.id, y0: e.clientY, dy: 0 });
            }}
          >
            <GripVertical size={18} />
          </span>
        );
        const dragging = drag?.id === it.id;
        return (
          <div
            key={it.id}
            role="listitem"
            ref={(el) => (el ? refs.current.set(it.id, el) : refs.current.delete(it.id))}
            className={dragging ? 'dragging' : undefined}
            style={dragging ? { transform: `translateY(${drag!.dy}px)` } : undefined}
          >
            {render(it, handle, (d) => move(i, d))}
          </div>
        );
      })}
    </div>
  );
}
