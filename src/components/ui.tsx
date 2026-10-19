import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

/* ---------------- Toast ---------------- */

interface ToastItem {
  id: number;
  text: string;
  icon: string;
}

type ToastListener = (t: ToastItem) => void;
let toastListeners: ToastListener[] = [];
let toastSeq = 0;

export function toast(text: string, icon = '✨'): void {
  const t: ToastItem = { id: ++toastSeq, text, icon };
  toastListeners.forEach((l) => l(t));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const l: ToastListener = (t) => {
      setItems((p) => [...p.slice(-3), t]);
      window.setTimeout(() => setItems((p) => p.filter((x) => x.id !== t.id)), 2600);
    };
    toastListeners.push(l);
    return () => {
      toastListeners = toastListeners.filter((x) => x !== l);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[300] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className="animate-popin max-w-md rounded-full bg-slate-900/90 px-5 py-3 text-center text-base font-bold text-white shadow-xl"
        >
          <span className="mr-1">{t.icon}</span>
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Modal ---------------- */

export function Modal({
  open,
  onClose,
  children,
  className = '',
  hideClose = false,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  hideClose?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const maxWClass = className.includes('max-w-') ? '' : 'max-w-md';
  const padClass = className.includes('p-') ? '' : 'p-6';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`animate-popin relative max-h-[92vh] w-full ${maxWClass} ${padClass} overflow-y-auto rounded-3xl bg-white shadow-2xl ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideClose && (
          <button
            onClick={onClose}
            className="btn-pop absolute right-3 top-3 z-10 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
            aria-label="とじる"
          >
            <X size={20} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------------- Section title ---------------- */

export function KidTitle({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <h2 className="mb-3 mt-2 flex items-center gap-2 text-2xl font-black text-slate-700">
      <span className="text-3xl">{icon}</span>
      {children}
    </h2>
  );
}
