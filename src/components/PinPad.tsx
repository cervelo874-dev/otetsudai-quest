import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Delete } from 'lucide-react';
import { sound } from '../sound';

/** 大きなテンキーで4桁PINを入力 */
export function PinPad({
  title,
  subtitle,
  onSubmit,
  footer,
  tone = 'kid',
}: {
  title: string;
  subtitle?: string;
  onSubmit: (pin: string) => boolean;
  footer?: ReactNode;
  tone?: 'kid' | 'parent';
}) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const press = useCallback(
    (d: string) => {
      if (busy.current) return;
      sound.tap();
      setPin((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + d;
        if (next.length === 4) {
          busy.current = true;
          window.setTimeout(() => {
            const ok = onSubmit(next);
            if (!mounted.current) return;
            if (!ok) {
              sound.error();
              setErr(true);
              window.setTimeout(() => {
                if (!mounted.current) return;
                setErr(false);
                setPin('');
                busy.current = false;
              }, 650);
            } else {
              busy.current = false;
            }
          }, 160);
        }
        return next;
      });
    },
    [onSubmit],
  );

  const back = useCallback(() => {
    if (busy.current) return;
    sound.tap();
    setPin((p) => p.slice(0, -1));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, back]);

  const keyCls =
    tone === 'kid'
      ? 'bg-gradient-to-b from-white to-sky-50 text-sky-700 shadow-[0_6px_0_#bae6fd] active:shadow-none'
      : 'bg-gradient-to-b from-white to-slate-50 text-slate-700 shadow-[0_6px_0_#e2e8f0] active:shadow-none';

  return (
    <div className="w-full">
      <div className="text-center">
        <div className="text-2xl font-black text-slate-700">{title}</div>
        {subtitle && <div className="mt-1 text-base font-bold text-slate-400">{subtitle}</div>}
      </div>
      <div className={`my-5 flex justify-center gap-4 ${err ? 'animate-errshake' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-6 w-6 rounded-full border-4 transition-all ${
              err
                ? 'border-rose-400 bg-rose-400'
                : i < pin.length
                  ? 'scale-110 border-amber-400 bg-amber-400'
                  : 'border-slate-300 bg-white'
            }`}
          />
        ))}
      </div>
      {err && <div className="-mt-2 mb-3 text-center font-black text-rose-500">ちがうみたい… もういちど！</div>}
      <div className="mx-auto grid max-w-xs grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => press(d)} className={`btn-pop h-16 rounded-2xl text-3xl font-black ${keyCls}`}>
            {d}
          </button>
        ))}
        <button
          onClick={() => {
            sound.tap();
            setPin('');
          }}
          className={`btn-pop h-16 rounded-2xl text-base font-black ${keyCls}`}
        >
          けす
        </button>
        <button onClick={() => press('0')} className={`btn-pop h-16 rounded-2xl text-3xl font-black ${keyCls}`}>
          0
        </button>
        <button onClick={back} className={`btn-pop flex h-16 items-center justify-center rounded-2xl ${keyCls}`} aria-label="1文字けす">
          <Delete size={28} />
        </button>
      </div>
      {footer && <div className="mt-5">{footer}</div>}
    </div>
  );
}
