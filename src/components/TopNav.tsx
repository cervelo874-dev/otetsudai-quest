import { Volume2, VolumeX, Shield, Smile } from 'lucide-react';
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
    <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b-2 border-amber-200/70 bg-amber-100/95 px-2.5 sm:px-4 backdrop-blur-md shadow-xs">
      {/* 左側: タイトル ＆ 子ども名バッジ */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <span className="text-xl shrink-0">🏰</span>
        <span className="hidden md:inline font-black text-amber-900 text-sm lg:text-base whitespace-nowrap">
          おてつだいクエスト＆ごほうびタウン
        </span>
        {currentChildName && mode === 'kid' && (
          <span className="rounded-full bg-sky-200/90 border border-sky-300 px-2.5 py-0.5 text-xs font-black text-sky-900 truncate max-w-[120px] sm:max-w-[180px] shadow-xs">
            {currentChildName}のページ
          </span>
        )}
      </div>

      {/* 右側: アクションボタン群（Switch風ぽってりピル型・折り返し防止） */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {mode === 'kid' && onBackToSelect && (
          <button
            onClick={() => {
              sound.tap();
              onBackToSelect();
            }}
            className="btn-pop flex items-center gap-1 rounded-2xl bg-white px-2.5 sm:px-3 py-1.5 text-xs font-black text-slate-700 shadow-[0_2px_0_#cbd5e1] border border-slate-200 hover:bg-slate-50 transition"
            title="子どもをえらぶ画面へ戻る"
          >
            <Smile size={15} className="text-amber-500 shrink-0" />
            <span className="whitespace-nowrap">
              <span className="hidden sm:inline">こどもを</span>えらぶ
            </span>
          </button>
        )}

        <button
          onClick={() => {
            sound.tap();
            onSwitchMode(mode === 'parent' ? 'kid' : 'parent');
          }}
          className={`btn-pop flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs sm:text-sm font-black transition ${
            mode === 'parent'
              ? 'bg-sky-500 text-white shadow-[0_3px_0_#0284c7] hover:bg-sky-600'
              : 'bg-indigo-600 text-white shadow-[0_3px_0_#4338ca] hover:bg-indigo-700'
          }`}
          title="モード切り替え"
        >
          {mode === 'parent' ? (
            <>
              <Smile size={16} className="shrink-0" />
              <span className="whitespace-nowrap">
                <span className="hidden sm:inline">こどもがめんへ</span>
                <span className="sm:hidden">こども</span>
              </span>
            </>
          ) : (
            <>
              <Shield size={16} className="shrink-0" />
              <span className="whitespace-nowrap">
                <span className="hidden sm:inline">おやがめんへ</span>
                <span className="sm:hidden">おや</span>
              </span>
            </>
          )}
        </button>

        <button
          onClick={toggleSound}
          className={`btn-pop flex h-9 w-9 items-center justify-center rounded-2xl border transition shadow-xs ${
            muted
              ? 'bg-rose-100 text-rose-600 border-rose-300'
              : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
          }`}
          title={muted ? '音をならす' : 'ミュートにする'}
        >
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
      </div>
    </header>
  );
}
