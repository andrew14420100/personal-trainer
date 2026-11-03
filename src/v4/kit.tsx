// FORMA LAB 4.0 UI kit.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, Info } from 'lucide-react';
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

type ToastFn = (m: string) => void;
let toastImpl: ToastFn = () => {};
export const toast: ToastFn = (m) => toastImpl(m);
export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: number | undefined;
    toastImpl = (m) => {
      setMsg(m);
      clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), 2400);
    };
    return () => clearTimeout(t);
  }, []);
  return msg ? (
    <div className="toast" role="status" aria-live="polite">
      {msg}
    </div>
  ) : null;
}
