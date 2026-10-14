import { Volume2, VolumeX, Shield, Smile, ArrowLeftRight } from 'lucide-react';
import { sound } from '../sound';
import { useState } from 'react';

export function TopNav({
  mode,
  onSwitchMode,
  currentChildName,
  onBackToSelect,
}: {
  mode: 'kid' | 'parent' | 'login';
  onSwitchMode: (target: 'kid' | 'parent') => void;
  currentChildName?: string;
  onBackToSelect?: () => void;
}) {
  const [muted, setMuted] = useState(sound.muted);

  const toggleSound = () => {
    const next = !muted;
    sound.setMuted(next);
    setMuted(next);
    if (!next) sound.tap();
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b-2 border-amber-200/60 bg-amber-100/90 px-3 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="text-xl">🏰</span>
        <span className="hidden font-black text-amber-900 sm:inline text-sm md:text-base">
          おてつだいクエスト＆ごほうびタウン
        </span>
        {currentChildName && mode === 'kid' && (
          <span className="rounded-full bg-sky-200 px-2.5 py-0.5 text-xs font-bold text-sky-800">
            {currentChildName}の ページ
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {mode === 'kid' && onBackToSelect && (
          <button
            onClick={() => {
              sound.tap();
              onBackToSelect();
            }}
            className="btn-pop flex items-center gap-1 rounded-xl bg-white px-2.5 py-1.5 text-xs font-black text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <Smile size={15} />
            <span>こどもをえらぶ</span>
          </button>
        )}

        <button
          onClick={() => {
            sound.tap();
            onSwitchMode(mode === 'parent' ? 'kid' : 'parent');
          }}
          className={`btn-pop flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-black shadow-sm ${
            mode === 'parent'
              ? 'bg-sky-500 text-white hover:bg-sky-600'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
          title="テストや管理がスムーズに行えるワンタップ切り替えバーです"
        >
          <ArrowLeftRight size={15} />
          {mode === 'parent' ? (
            <>
              <Smile size={16} />
              <span>こどもがめんへ</span>
            </>
          ) : (
            <>
              <Shield size={16} />
              <span>おやがめんへ</span>
            </>
          )}
        </button>

        <button
          onClick={toggleSound}
          className={`btn-pop flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300 ${
            muted ? 'bg-rose-100 text-rose-600' : 'bg-white text-amber-700'
          }`}
          title={muted ? '音をならす' : 'ミュートにする'}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </header>
  );
}
