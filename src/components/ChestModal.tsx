import { useState } from 'react';
import type { Chest } from '../types';
import { openChest } from '../actions';
import { sound } from '../sound';
import { burst } from '../effects';
import { Sparkles, ArrowRight, Check } from 'lucide-react';

export function ChestModal({
  chests,
  currentCoins = 0,
  onClose,
}: {
  chests: Chest[];
  currentCoins?: number;
  onClose: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const [openedResult, setOpenedResult] = useState<{
    coins: number;
    ticketName: string | null;
    ticketIcon: string | null;
    ticketCategory?: 'tablet' | 'real' | null;
    ticketMinutes?: number | null;
    message: string;
  } | null>(null);

  // コインカウントアップ用状態
  const [beforeCoins, setBeforeCoins] = useState(currentCoins);
  const [displayCoins, setDisplayCoins] = useState(currentCoins);
  const [countingFinished, setCountingFinished] = useState(false);

  if (chests.length === 0) return null;
  const currentChest = chests[0];

  const handleOpen = () => {
    if (opening || openedResult) return;
    setOpening(true);
    sound.sparkle();

    // 開封直前の所持コインを固定
    const prevCoins = currentCoins;
    setBeforeCoins(prevCoins);
    setDisplayCoins(prevCoins);
    setCountingFinished(false);

    window.setTimeout(() => {
      const res = openChest(currentChest.id);
      if (res) {
        sound.fanfare();
        burst();
        setOpenedResult(res);

        // コインのカウントアップアニメーション（約0.8秒）
        const targetCoins = prevCoins + res.coins;
        const diff = res.coins;
        if (diff > 0) {
          const steps = Math.min(diff, 20);
          const intervalTime = Math.max(30, Math.floor(800 / steps));
          let currentStep = 0;

          const timer = window.setInterval(() => {
            currentStep++;
            if (currentStep >= steps) {
              window.clearInterval(timer);
              setDisplayCoins(targetCoins);
              setCountingFinished(true);
              sound.pop();
            } else {
              const progress = currentStep / steps;
              const val = Math.round(prevCoins + diff * progress);
              setDisplayCoins(val);
            }
          }, intervalTime);
        } else {
          setCountingFinished(true);
        }
      }
      setOpening(false);
    }, 600);
  };

  const handleNext = () => {
    sound.tap();
    setOpenedResult(null);
    setCountingFinished(false);
    if (chests.length <= 1) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-md">
      <div className="relative flex max-w-sm sm:max-w-md w-full flex-col items-center rounded-3xl bg-gradient-to-b from-amber-100 via-amber-50 to-orange-100 p-5 sm:p-6 text-center shadow-2xl border-4 border-amber-300 max-h-[90vh] overflow-y-auto no-scrollbar">
        {!openedResult ? (
          <>
            <div className="text-xl font-black text-amber-900 flex items-center gap-1.5">
              <Sparkles className="text-amber-500 animate-spin" size={24} />
              <span>たからばこが とどいたよ！</span>
              <Sparkles className="text-amber-500 animate-spin" size={24} />
            </div>

            <p className="mt-2 text-sm font-bold text-amber-800">
              {currentChest.message || 'おうちのひとからの ごほうびだよ！'}
            </p>

            <div className="my-8 flex items-center justify-center">
              <button
                onClick={handleOpen}
                disabled={opening}
                className={`btn-pop relative flex h-36 w-36 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-7xl shadow-[0_12px_0_#c2410c] active:shadow-none ${
                  opening ? 'animate-wobble' : 'animate-shake'
                }`}
              >
                <span>🎁</span>
                <span className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-xl font-black text-white shadow-lg animate-bounce">
                  ✨
                </span>
              </button>
            </div>

            <button
              onClick={handleOpen}
              disabled={opening}
              className="btn-pop w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-xl font-black text-white shadow-[0_6px_0_#c2410c] active:translate-y-1 active:shadow-none"
            >
              {opening ? 'あけているよ…✨' : 'タップして あける！✨'}
            </button>
          </>
        ) : (
          <div className="animate-popin flex w-full flex-col items-center py-1">
            <div className="text-5xl animate-bounce mb-1">🎉</div>
            <h3 className="text-2xl font-black text-amber-950">
              たからばこ オープン！！
            </h3>

            {/* 獲得コイン演出 */}
            <div className="my-4 flex w-full flex-col items-center rounded-2xl bg-white p-4 shadow-sm border-2 border-amber-200">
              <span className="text-xs font-black text-amber-800 mb-1">
                手に入れた コイン
              </span>
              <div className="flex items-center gap-2">
                <span className="text-4xl animate-bounce">🪙</span>
                <span className="text-5xl font-black text-amber-600 tracking-tight">
                  +{openedResult.coins}
                </span>
                <span className="text-xl font-black text-amber-800">コイン</span>
              </div>

              {/* 所持コイン ビフォーアフター カウントアップメーター */}
              <div className="mt-3.5 flex w-full items-center justify-between rounded-xl bg-amber-50 px-3.5 py-2.5 border border-amber-200">
                <div className="text-left">
                  <span className="text-[11px] font-bold text-slate-500 block">持っているコイン</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-sm font-bold text-slate-400 line-through">
                      🪙 {beforeCoins}
                    </span>
                    <ArrowRight size={14} className="text-amber-600" />
                    <span className={`text-lg font-black text-amber-700 transition-all ${countingFinished ? 'scale-110 text-amber-600 animate-pulse' : ''}`}>
                      🪙 {displayCoins}
                    </span>
                  </div>
                </div>

                <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700 flex items-center gap-1">
                  <Check size={14} strokeWidth={3} />
                  <span>+{openedResult.coins} 増えたよ！</span>
                </div>
              </div>
            </div>

            {/* 獲得チケット（同封されていた場合） */}
            {openedResult.ticketName && (
              <div className="my-2 flex w-full flex-col rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-4 border-2 border-orange-300 shadow-sm text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="rounded-full bg-orange-200 px-2.5 py-0.5 text-[10px] font-black text-orange-900 flex items-center gap-1">
                    <Sparkles size={12} />
                    <span>ごほうびチケット ゲット！</span>
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                    🎒 もちものに追加されたよ
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm border border-orange-200 shrink-0">
                    {openedResult.ticketIcon ?? '🎟️'}
                  </span>
                  <div>
                    <div className="font-black text-slate-800 text-base">
                      {openedResult.ticketName}
                    </div>
                    <div className="text-xs font-bold text-orange-700 mt-0.5">
                      {openedResult.ticketCategory === 'tablet' && openedResult.ticketMinutes
                        ? `たっぷり ${openedResult.ticketMinutes}ぷん つかえるよ！`
                        : 'おうちのひとに 見せて使ってね！'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* おうちのひとからのメッセージ */}
            {openedResult.message && (
              <div className="my-2 flex w-full items-start gap-2.5 rounded-2xl bg-amber-50/80 p-3 text-left border border-amber-200/80">
                <span className="text-xl shrink-0 mt-0.5">💌</span>
                <div>
                  <div className="text-[11px] font-black text-amber-800">
                    おうちのひとからの メッセージ
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">
                    {openedResult.message}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleNext}
              className="btn-pop mt-3 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-base sm:text-lg font-black text-white shadow-[0_5px_0_#0f766e] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2"
            >
              <span>{chests.length > 1 ? `つぎの たからばこ！ (あと${chests.length - 1}こ)` : 'うけとったよ！✨'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
