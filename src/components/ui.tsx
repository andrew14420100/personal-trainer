import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Minus, Plus, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { back } from '../lib/router';

export function TopBar({ title, right, fallback = '/', over = false }: { title?: ReactNode; right?: ReactNode; fallback?: string; over?: boolean }) {
  return (
    <header className={`topbar${over ? ' over' : ''}`}>
      <button className="icon-btn" onClick={() => back(fallback)} aria-label="Indietro">
        <ChevronLeft size={22} />
      </button>
      <div className="topbar-title">{title}</div>
      <div style={{ minWidth: 44, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>{right}</div>
    </header>
  );
}

export function Section({ title, action, children, id }: { title: string; action?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="section" id={id} aria-label={title}>
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Notice({ kind = 'warn', children }: { kind?: 'warn' | 'info' | 'ok'; children: ReactNode }) {
  const Icon = kind === 'warn' ? AlertTriangle : kind === 'ok' ? CheckCircle2 : Info;
  return (
    <div className={`notice ${kind === 'warn' ? '' : kind}`} role="note">
      <Icon size={18} aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function Empty({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ico" aria-hidden>
        {icon}
      </div>
      <div style={{ fontWeight: 700, fontSize: 17 }}>{title}</div>
      {children && (
        <p className="text-2 small" style={{ marginTop: 6, maxWidth: 340, marginInline: 'auto' }}>
          {children}
        </p>
      )}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" aria-hidden />
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function NumberStepper({
  value,
  onChange,
  step,
  unit,
  label,
  min = 0,
  decimals = 2,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  unit: string;
  label: string;
  min?: number;
  decimals?: number;
}) {
  const [text, setText] = useState(value == null ? '' : String(value).replace('.', ','));
  useEffect(() => setText(value == null ? '' : String(value).replace('.', ',')), [value]);
  const commit = (s: string) => {
    const t = s.replace(',', '.').trim();
    if (t === '') return onChange(null);
    const n = Number(t);
    if (Number.isFinite(n) && n >= min) onChange(Number(n.toFixed(decimals)));
    else setText(value == null ? '' : String(value).replace('.', ','));
  };
  const bump = (d: number) => onChange(Math.max(min, Number(((value ?? 0) + d).toFixed(decimals))));
  return (
    <div className="stepper">
      <button type="button" onClick={() => bump(-step)} aria-label={`Diminuisci ${label}`}>
        <Minus size={20} />
      </button>
      <div>
        <input
          inputMode="decimal"
          aria-label={label}
          value={text}
          placeholder="—"
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <span className="unit">{unit}</span>
      </div>
      <button type="button" onClick={() => bump(step)} aria-label={`Aumenta ${label}`}>
        <Plus size={20} />
      </button>
    </div>
  );
}

// ── Toasts ──────────────────────────────────────────────────────────────────
type ToastFn = (msg: string) => void;
let toastImpl: ToastFn = () => {};
export const toast: ToastFn = (m) => toastImpl(m);

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: number | undefined;
    toastImpl = (m) => {
      setMsg(m);
      clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), 2600);
    };
    return () => clearTimeout(t);
  }, []);
  if (!msg) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {msg}
    </div>
  );
}

/** Confirm dialog in a sheet (native confirm() is unreliable inside iOS standalone apps). */
export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label={title}>
      <div className="stack">
        <h3 className="display h3">{title}</h3>
        {body && <div className="text-2 small">{body}</div>}
        <button
          className={`btn block ${danger ? 'danger' : 'primary'}`}
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
