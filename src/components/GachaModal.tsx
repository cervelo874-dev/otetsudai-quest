import { useState } from 'react';
import type { Child } from '../types';
import { canFreeGacha, spinGacha, exchangeStarShards, type GachaPrize } from '../actions';
import { GACHA_COST } from '../logic';
import { AVATAR_OPTIONS } from '../avatar';
import { sound } from '../sound';
import { burst } from '../effects';
import { toast } from './ui';
import { Sparkles, Coins, RefreshCw, Star, Check } from 'lucide-react';

export function GachaModal({
  child,
  onClose,
}: {
  child: Child;
  onClose: () => void;
  }) {
  const isFree = canFreeGacha(child);
  const [activeTab, setActiveTab] = useState<'spin' | 'exchange'>('spin');
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'dropping' | 'result'>('idle');
  const [prize, setPrize] = useState<GachaPrize | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [refundCoins, setRefundCoins] = useState(0);
  const [refundShards, setRefundShards] = useState(0);

  const handleSpin = () => {
    if (phase !== 'idle') return;
    if (!isFree && child.coins < GACHA_COST) {
      sound.error();
      toast('コインがたりないよ！', '🪙');
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
        setRefundShards(outcome.refundShards);
        setPhase('dropping');
        sound.pop();

        window.setTimeout(() => {
          setPhase('result');
          sound.fanfare();
          burst();
          if (outcome.prize.rarity === 3) {
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

  const handleExchange = (avatarItemId: string, cost: number, name: string) => {
    if ((child.starShards ?? 0) < cost) {
      sound.error();
      toast('ほしのかけらが たりないよ！', '🌟');
      return;
    }
    sound.fanfare();
    burst();
    const res = exchangeStarShards(child.id, avatarItemId);
    if (res === 'ok') {
      toast(`「${name}」と こうかんしたよ！🎒`, '✨');
    }
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

  // 交換対象のアイテム（非表示やデフォルトなし以外）
  const exchangeItems = AVATAR_OPTIONS.filter(
    (o) => !o.hidden && o.id !== 'acc_none' && o.id !== 'wp_none' && o.id !== 'pet_none'
  );

  return (
    <div className="flex flex-col items-center">
      {/* ヘッダー情報バー */}
      <div className="w-full flex items-center justify-between border-b pb-2 mb-3">
        <h3 className="text-xl font-black text-amber-900 flex items-center gap-1.5">
          <span>🎰</span>
          <span>ごほうびガチャ</span>
        </h3>
        <div className="flex items-center gap-2">
          {/* ほしのかけら */}
          <div className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-black text-amber-900 text-xs shadow-sm">
            <span className="text-amber-500">🌟</span>
            <span>{child.starShards ?? 0} こ</span>
          </div>
          {/* コイン */}
          <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 font-black text-yellow-900 text-xs shadow-sm">
            <span>🪙</span>
            <span>{child.coins}</span>
          </div>
        </div>
      </div>

      {/* タブ切り替え（ガチャをまわす / かけら交換所） */}
      {phase === 'idle' && (
        <div className="flex w-full rounded-2xl bg-slate-100 p-1 mb-4">
          <button
            type="button"
            onClick={() => {
              sound.tap();
              setActiveTab('spin');
            }}
            className={`flex-1 rounded-xl py-2 text-xs font-black transition-all ${
              activeTab === 'spin'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🎰 ガチャをまわす
          </button>
          <button
            type="button"
            onClick={() => {
              sound.tap();
              setActiveTab('exchange');
            }}
            className={`flex-1 rounded-xl py-2 text-xs font-black transition-all flex items-center justify-center gap-1 ${
              activeTab === 'exchange'
                ? 'bg-amber-400 text-amber-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>🌟</span>
            <span>かけら こうかんじょ</span>
          </button>
        </div>
      )}

      {/* ---------------- 1. ガチャ実行モード ---------------- */}
      {activeTab === 'spin' && phase === 'idle' && (
        <div className="flex flex-col items-center text-center py-2 w-full">
          {/* ガチャマシン外観 */}
          <div className="relative mb-5 flex h-44 w-44 flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-rose-400 to-pink-500 p-3 shadow-[0_8px_0_#be185d]">
            <div className="flex h-24 w-32 items-center justify-center rounded-2xl bg-white/70 shadow-inner">
              <span className="text-5xl animate-bounce">🎁</span>
            </div>
            <div className="mt-3 flex h-7 w-28 items-center justify-center rounded-full bg-yellow-300 font-black text-amber-900 shadow-md text-xs">
              まわしてね！✨
            </div>
          </div>

          <div className="text-sm font-bold text-slate-700 mb-1">
            🌟 ほしのかけら や レアアイテムが でるよ！
          </div>
          <div className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full mb-4 border border-amber-200">
            ★1 (55%) / ★2 レア (35%) / ★3 レジェンド (10%)
          </div>

          <button
            onClick={handleSpin}
            disabled={!isFree && child.coins < GACHA_COST}
            className={`btn-pop flex items-center justify-center gap-2 w-full rounded-2xl py-3.5 text-lg font-black shadow-lg ${
              isFree
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-[0_6px_0_#0f766e]'
                : child.coins >= GACHA_COST
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_6px_0_#c2410c]'
                : 'bg-slate-300 text-slate-500 shadow-none'
            }`}
          >
            {isFree ? (
              <>
                <Sparkles size={22} />
                <span>きょうの 1かい むりょう！✨</span>
              </>
            ) : (
              <>
                <Coins size={22} />
                <span>{GACHA_COST} コインで まわす！</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ---------------- 2. ガチャ回転演出 ---------------- */}
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

      {/* ---------------- 3. ガチャ結果画面 ---------------- */}
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
            className={`flex flex-col items-center justify-center rounded-3xl border-3 p-5 w-full shadow-inner mb-4 transition-all ${
              rarityInfo[prize.rarity]?.borderCls ?? 'border-amber-200 bg-amber-50'
            }`}
          >
            <span className="text-5xl mb-2">{prize.icon}</span>
            <span className="text-xl font-black text-slate-800">{prize.label}</span>

            {/* ほしのかけら当選の場合 */}
            {prize.kind === 'shards' && (
              <div className="mt-2 flex flex-col items-center gap-1">
                <span className="text-base font-black text-amber-600 bg-white/80 px-3 py-1 rounded-xl shadow-sm">
                  🌟 ほしのかけら ＋{prize.shards}こ ゲット！
                </span>
                <span className="text-xs font-bold text-amber-700">
                  🪙 ＋{prize.coins} コインも プレゼント！
                </span>
              </div>
            )}

            {/* コイン当選の場合 */}
            {prize.kind === 'coins' && (
              <span className="text-base font-black text-amber-600 mt-2">
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
                <div className="mt-1 text-sm font-black text-amber-800">
                  ダブりボーナス！ 🌟ほしのかけら+{refundShards}こ ＆ 🪙+{refundCoins}コイン にへんかん！✨
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
                setRefundShards(0);
              }}
              className="btn-pop flex-1 rounded-2xl bg-indigo-500 py-3 text-sm font-black text-white shadow-[0_4px_0_#3730a3]"
            >
              もう1かい まわす
            </button>
            <button
              onClick={() => {
                sound.tap();
                onClose();
              }}
              className="btn-pop flex-1 rounded-2xl bg-slate-200 py-3 text-sm font-black text-slate-700 shadow-[0_4px_0_#94a3b8]"
            >
              おわる
            </button>
          </div>
        </div>
      )}

      {/* ---------------- 4. ほしのかけら交換所 ---------------- */}
      {activeTab === 'exchange' && phase === 'idle' && (
        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between bg-amber-50 rounded-2xl p-3 border border-amber-200 mb-3">
            <div className="flex items-center gap-2">
              <Star className="text-amber-500 fill-amber-400" size={24} />
              <div>
                <div className="text-xs font-bold text-amber-900">
                  もっている ほしのかけら: <span className="text-base font-black text-amber-600">{child.starShards ?? 0}</span> こ
                </div>
                <div className="text-[10px] text-amber-700">
                  すきな アバターアイテムを えらんで こうかんしよう！
                </div>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-amber-100">
              ★1: 2こ / ★2: 5こ / ★3: 10こ
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {exchangeItems.map((item) => {
              const isOwned = child.ownedItems.includes(item.id);
              const cost = item.rarity === 3 ? 10 : item.rarity === 2 ? 5 : 2;
              const canAfford = (child.starShards ?? 0) >= cost;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl p-2.5 border-2 flex flex-col justify-between transition-all ${
                    isOwned
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : canAfford
                      ? 'bg-white border-amber-300 shadow-sm hover:border-amber-400'
                      : 'bg-white border-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-2xl shrink-0">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-800 truncate leading-tight">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            item.rarity === 3
                              ? 'bg-purple-100 text-purple-700'
                              : item.rarity === 2
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.rarity ? `★${item.rarity}` : '★1'}
                        </span>
                        <span className="text-[10px] font-black text-amber-600">
                          🌟 {cost}こ
                        </span>
                      </div>
                    </div>
                  </div>

                  {isOwned ? (
                    <div className="w-full text-center py-1 rounded-xl bg-slate-200 text-[10px] font-bold text-slate-500 flex items-center justify-center gap-1">
                      <Check size={12} />
                      <span>もっているよ</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => handleExchange(item.id, cost, item.name)}
                      className={`btn-pop w-full py-1.5 rounded-xl text-xs font-black transition-all ${
                        canAfford
                          ? 'bg-amber-400 text-amber-950 shadow-[0_2px_0_#d97706] hover:bg-amber-300'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      こうかんする
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
