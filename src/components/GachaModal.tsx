import { useState } from 'react';
import type { Child } from '../types';
import { canFreeGacha, spinGacha, type GachaPrize } from '../actions';
import { GACHA_COST } from '../logic';
import { sound } from '../sound';
import { burst } from '../effects';
import { Sparkles, Coins, Gift, RefreshCw } from 'lucide-react';

export function GachaModal({
  child,
  onClose,
}: {
  child: Child;
  onClose: () => void;
}) {
  const isFree = canFreeGacha(child);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'dropping' | 'result'>('idle');
  const [prize, setPrize] = useState<GachaPrize | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [refundCoins, setRefundCoins] = useState(0);

  const handleSpin = () => {
    if (phase !== 'idle') return;
    if (!isFree && child.coins < GACHA_COST) {
      sound.error();
      return;
    }

    setPhase('spinning');
    sound.gachaSpin();

    window.setTimeout(() => {
      const outcome = spinGacha(child.id);
      if (outcome.ok) {
        setPrize(outcome.prize);
        setIsDuplicate(outcome.isDuplicate);
        setRefundCoins(outcome.refundCoins);
        setPhase('dropping');
        sound.pop();

        window.setTimeout(() => {
          setPhase('result');
          sound.fanfare();
          burst();
          if (outcome.prize.rarity === 3) {
            // ★3レジェンドはさらに豪華な紙吹雪！
            window.setTimeout(() => burst(), 300);
            window.setTimeout(() => burst(), 600);
          }
        }, 800);
      } else {
        sound.error();
        setPhase('idle');
      }
    }, 1800);
  };

  const rarityInfo: Record<number, { label: string; badgeCls: string; borderCls: string }> = {
    1: {
      label: '★1 ノーマル',
      badgeCls: 'bg-slate-200 text-slate-700',
      borderCls: 'border-slate-300 bg-slate-50',
    },
    2: {
      label: '★2 レア！✨',
      badgeCls: 'bg-gradient-to-r from-sky-400 to-blue-500 text-white',
      borderCls: 'border-sky-300 bg-sky-50',
    },
    3: {
      label: '★3 レジェンド！！🌈👑',
      badgeCls: 'bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-white animate-pulse',
      borderCls: 'border-amber-400 bg-gradient-to-b from-amber-50 via-pink-50 to-purple-50 animate-legend-glow',
    },
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full flex items-center justify-between border-b pb-2 mb-3">
        <h3 className="text-xl font-black text-amber-900 flex items-center gap-1.5">
          <span>🎰</span>
          <span>ごほうびガチャ</span>
        </h3>
        <div className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-black text-amber-800 text-sm">
          <span>🪙</span>
          <span>{child.coins} コイン</span>
        </div>
      </div>

      {phase === 'idle' && (
        <div className="flex flex-col items-center text-center py-2">
          {/* ガチャマシン外観 */}
          <div className="relative mb-6 flex h-48 w-44 flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-rose-400 to-pink-500 p-3 shadow-[0_8px_0_#be185d]">
            <div className="flex h-24 w-32 items-center justify-center rounded-2xl bg-white/70 shadow-inner">
              <span className="text-5xl animate-bounce">🎁</span>
            </div>
            <div className="mt-4 flex h-8 w-28 items-center justify-center rounded-full bg-yellow-300 font-black text-amber-900 shadow-md text-sm">
              まわしてね！✨
            </div>
          </div>

          <div className="text-sm font-bold text-slate-600 mb-2">
            カプセルから コインや レアアイテムが とびだすよ！
          </div>
          <div className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full mb-4 border border-amber-200">
            ★1 (60%) / ★2 レア (30%) / ★3 レジェンド (10%)
          </div>

          <button
            onClick={handleSpin}
            disabled={!isFree && child.coins < GACHA_COST}
            className={`btn-pop flex items-center justify-center gap-2 w-full rounded-2xl py-4 text-xl font-black shadow-lg ${
              isFree
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-[0_6px_0_#0f766e]'
                : child.coins >= GACHA_COST
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_6px_0_#c2410c]'
                  : 'bg-slate-300 text-slate-500 shadow-none'
            }`}
          >
            {isFree ? (
              <>
                <Sparkles size={24} />
                <span>きょうの 1かい むりょう！✨</span>
              </>
            ) : (
              <>
                <Coins size={24} />
                <span>{GACHA_COST}コインで まわす！</span>
              </>
            )}
          </button>
        </div>
      )}

      {phase === 'spinning' && (
        <div className="flex flex-col items-center py-12">
          <div className="animate-spin text-7xl mb-4">🌀</div>
          <div className="text-xl font-black text-amber-800 animate-pulse">
            ガチャガチャ まわしているよ…！
          </div>
        </div>
      )}

      {phase === 'dropping' && (
        <div className="flex flex-col items-center py-8">
          <div className="animate-bounce text-8xl mb-4">🔮</div>
          <div className="text-xl font-black text-indigo-700 animate-pulse">
            カプセルが ポンッと でてきたよ！！
          </div>
        </div>
      )}

      {phase === 'result' && prize && (
        <div className="animate-popin flex flex-col items-center text-center py-2 w-full">
          <div className="text-4xl animate-bounce mb-1">
            {prize.rarity === 3 ? '👑🎉' : '🎉'}
          </div>

          {/* レア度バッジ */}
          <div
            className={`rounded-full px-4 py-1 text-xs font-black shadow-md mb-3 ${
              rarityInfo[prize.rarity]?.badgeCls ?? 'bg-amber-400 text-slate-900'
            }`}
          >
            {rarityInfo[prize.rarity]?.label ?? `★${prize.rarity}`}
          </div>

          {/* 当選アイテムカード */}
          <div
            className={`flex flex-col items-center justify-center rounded-3xl border-3 p-6 w-full shadow-inner mb-4 transition-all ${
              rarityInfo[prize.rarity]?.borderCls ?? 'border-amber-200 bg-amber-50'
            }`}
          >
            <span className="text-6xl mb-2">{prize.icon}</span>
            <span className="text-2xl font-black text-slate-800">{prize.label}</span>

            {/* コイン当選の場合 */}
            {prize.kind === 'coins' && (
              <span className="text-lg font-black text-amber-600 mt-1">
                ＋{prize.coins} コイン ゲット！🪙
              </span>
            )}

            {/* ダブり救済ボーナスの表示 */}
            {isDuplicate && (
              <div className="mt-3 flex flex-col items-center rounded-2xl bg-amber-100 p-3 border border-amber-300 w-full animate-popin">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <RefreshCw size={14} className="text-amber-600 animate-spin" />
                  <span>すでにもっている アイテム だったよ！</span>
                </div>
                <div className="mt-1 text-base font-black text-amber-700">
                  ダブりボーナス！ ＋{refundCoins}コイン にへんかん！🪙✨
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 w-full">
            <button
              onClick={() => {
                sound.tap();
                setPhase('idle');
                setPrize(null);
                setIsDuplicate(false);
                setRefundCoins(0);
              }}
              className="btn-pop flex-1 rounded-2xl bg-indigo-500 py-3 text-base font-black text-white shadow-[0_4px_0_#3730a3]"
            >
              もう1かい まわす
            </button>
            <button
              onClick={() => {
                sound.tap();
                onClose();
              }}
              className="btn-pop flex-1 rounded-2xl bg-slate-200 py-3 text-base font-black text-slate-700 shadow-[0_4px_0_#94a3b8]"
            >
              おわる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
