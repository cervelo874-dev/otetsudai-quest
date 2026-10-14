import { useState } from 'react';
import type { Chest } from '../types';
import { openChest } from '../actions';
import { sound } from '../sound';
import { burst } from '../effects';
import { Sparkles } from 'lucide-react';

export function ChestModal({
  chests,
  onClose,
}: {
  chests: Chest[];
  onClose: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const [openedResult, setOpenedResult] = useState<{
    coins: number;
    ticketName: string | null;
    ticketIcon: string | null;
    message: string;
  } | null>(null);

  if (chests.length === 0) return null;
  const currentChest = chests[0];

  const handleOpen = () => {
    if (opening || openedResult) return;
    setOpening(true);
    sound.sparkle();

    window.setTimeout(() => {
      const res = openChest(currentChest.id);
      if (res) {
        sound.fanfare();
        burst();
        setOpenedResult(res);
      }
      setOpening(false);
    }, 600);
  };

  const handleNext = () => {
    sound.tap();
    setOpenedResult(null);
    if (chests.length <= 1) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md">
      <div className="relative flex max-w-sm w-full flex-col items-center rounded-3xl bg-gradient-to-b from-amber-100 via-amber-50 to-orange-100 p-6 text-center shadow-2xl border-4 border-amber-300">
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
              className="btn-pop w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-4 text-xl font-black text-white shadow-[0_6px_0_#c2410c] active:shadow-none"
            >
              {opening ? 'あけているよ…✨' : 'タップして あける！✨'}
            </button>
          </>
        ) : (
          <div className="animate-popin flex w-full flex-col items-center py-2">
            <div className="text-4xl animate-bounce">🎉</div>
            <h3 className="mt-2 text-2xl font-black text-amber-900">やったね！！</h3>

            <div className="my-6 flex flex-col items-center justify-center rounded-2xl bg-white/80 p-5 w-full shadow-inner border border-amber-200">
              <div className="flex items-center gap-2">
                <span className="text-5xl">🪙</span>
                <span className="text-5xl font-black text-amber-600">
                  +{openedResult.coins}
                </span>
              </div>
              <div className="mt-2 text-lg font-black text-amber-800">コイン ゲット！</div>

              {openedResult.ticketName && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-orange-100 px-4 py-2 text-base font-black text-orange-900">
                  <span className="text-2xl">{openedResult.ticketIcon ?? '🎟️'}</span>
                  <span>{openedResult.ticketName} も もらえたよ！</span>
                </div>
              )}
            </div>

            <button
              onClick={handleNext}
              className="btn-pop w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-lg font-black text-white shadow-[0_6px_0_#0f766e] active:shadow-none"
            >
              {chests.length > 1 ? 'つぎの たからばこ！' : 'うけとったよ！✨'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
