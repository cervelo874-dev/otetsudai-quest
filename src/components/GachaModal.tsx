import { useState, useEffect } from 'react';
import type { Child } from '../types';
import { canFreeGacha, spinGacha, exchangeStarShards, type GachaPrize } from '../actions';
import { GACHA_COST } from '../logic';
import { AVATAR_OPTIONS, type AvatarOption } from '../avatar';
import { sound } from '../sound';
import { burst } from '../effects';
import { toast } from './ui';
import { GachaMachineVisual } from './GachaMachineVisual';
import { Sparkles, Coins, RefreshCw, Star, Check, ArrowRight, X } from 'lucide-react';

export function GachaModal({
  child,
  onClose,
  initialTab = 'spin',
}: {
  child: Child;
  onClose: () => void;
  initialTab?: 'spin' | 'exchange';
}) {
  const isFree = canFreeGacha(child);
  const [activeTab, setActiveTab] = useState<'spin' | 'exchange'>(initialTab);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'dropping' | 'opening' | 'result'>('idle');
  const [prize, setPrize] = useState<GachaPrize | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [refundCoins, setRefundCoins] = useState(0);
  const [refundShards, setRefundShards] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // ガチャを回すハンドラー
  const handleSpin = () => {
    if (phase !== 'idle') return;
    if (!isFree && child.coins < GACHA_COST) {
      sound.error();
      toast('コインがたりないよ！', '🪙');
      return;
    }

    setPhase('spinning');
    sound.gachaSpin();

    // ハンドル回転演出（約1.6秒）
    window.setTimeout(() => {
      const outcome = spinGacha(child.id);
      if (outcome.ok) {
        setPrize(outcome.prize);
        setIsDuplicate(outcome.isDuplicate);
        setRefundCoins(outcome.refundCoins);
        setRefundShards(outcome.refundShards);

        // カプセル落下フェーズ
        setPhase('dropping');
        sound.pop();
      } else {
        sound.error();
        setPhase('idle');
      }
    }, 1600);
  };

  // カプセルをタップして開封するハンドラー
  const handleOpenCapsule = () => {
    if (phase !== 'dropping' || !prize) return;
    setPhase('opening');
    sound.fanfare();
    burst();

    if (prize.rarity === 3) {
      window.setTimeout(() => burst(), 300);
      window.setTimeout(() => burst(), 650);
    }

    window.setTimeout(() => {
      setPhase('result');
    }, 700);
  };

  // ほしのかけら交換ハンドラー
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

  const rarityInfo: Record<number, { label: string; badgeCls: string; borderCls: string; glowCls: string }> = {
    1: {
      label: '★1 ノーマル',
      badgeCls: 'bg-slate-200 text-slate-700',
      borderCls: 'border-slate-300 bg-slate-50',
      glowCls: 'from-blue-400 to-indigo-500',
    },
    2: {
      label: '★2 レア！✨',
      badgeCls: 'bg-gradient-to-r from-sky-400 to-blue-500 text-white',
      borderCls: 'border-sky-300 bg-sky-50',
      glowCls: 'from-purple-400 to-pink-500',
    },
    3: {
      label: '★3 レジェンド！！🌈👑',
      badgeCls: 'bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-white animate-pulse',
      borderCls: 'border-amber-400 bg-gradient-to-b from-amber-50 via-pink-50 to-purple-50 animate-legend-glow',
      glowCls: 'from-amber-400 via-rose-500 to-purple-600',
    },
  };

  // 交換対象アイテム（アクセサリや服などカテゴリー分け可能）
  const exchangeItems = AVATAR_OPTIONS.filter(
    (o) => !o.hidden && o.id !== 'acc_none' && o.id !== 'wp_none' && o.id !== 'pet_none'
  );

  const categories = [
    { id: 'all', label: 'すべて' },
    { id: 'outfit', label: 'おようふく' },
    { id: 'accessory', label: 'あたま' },
    { id: 'weapon', label: 'もちもの' },
    { id: 'pet', label: 'ペット' },
    { id: 'bg', label: 'はいけい' },
  ];

  const filteredItems = exchangeItems.filter((it) => {
    if (selectedCategory === 'all') return true;
    return it.slot === selectedCategory;
  });

  return (
    <div className="flex flex-col items-center max-w-md mx-auto w-full">
      {/* ヘッダー情報バー */}
      <div className="w-full flex items-center justify-between border-b pb-2.5 mb-3">
        <h3 className="text-xl font-black text-amber-950 flex items-center gap-2">
          <span className="text-2xl">🎰</span>
          <span>ごほうびガチャ</span>
        </h3>
        <div className="flex items-center gap-2">
          {/* ほしのかけら */}
          <button
            type="button"
            onClick={() => {
              sound.tap();
              setActiveTab('exchange');
            }}
            title="ほしのかけら交換所へ"
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 px-3 py-1 font-black text-amber-950 text-xs shadow-sm border border-amber-300 hover:scale-105 transition-transform"
          >
            <span className="text-amber-500 text-sm">🌟</span>
            <span>{child.starShards ?? 0} こ</span>
          </button>
          {/* コイン */}
          <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 font-black text-yellow-950 text-xs shadow-sm border border-yellow-300">
            <span>🪙</span>
            <span>{child.coins}</span>
          </div>
        </div>
      </div>

      {/* タブ切り替え（ガチャをまわす / かけら交換所）※回転演出中は非表示 */}
      {phase === 'idle' && (
        <div className="flex w-full rounded-2xl bg-slate-100 p-1 mb-3">
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
            className={`flex-1 rounded-xl py-2 text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'exchange'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>🌟</span>
            <span>かけら こうかんじょ</span>
          </button>
        </div>
      )}

      {/* ==================== 1. ガチャをまわす画面（リアル自販機） ==================== */}
      {activeTab === 'spin' && (
        <div className="flex flex-col items-center text-center w-full min-h-[360px] justify-center">
          {/* --- A: 待機中 (idle) --- */}
          {phase === 'idle' && (
            <div className="flex flex-col items-center w-full animate-popin">
              <div className="mb-2">
                <GachaMachineVisual
                  size="lg"
                  isFree={isFree}
                  showHandlePrompt={true}
                  onClick={handleSpin}
                  className="cursor-pointer"
                />
              </div>

              <div className="text-xs font-bold text-slate-600 mb-1">
                ハンドルをタップ、または下のボタンを押してね！
              </div>
              <div className="text-[11px] font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full mb-3 border border-amber-200">
                ★1 (55%) / ★2 レア (35%) / ★3 レジェンド (10%)
              </div>

              <button
                type="button"
                onClick={handleSpin}
                disabled={!isFree && child.coins < GACHA_COST}
                className={`btn-pop flex items-center justify-center gap-2 w-full rounded-2xl py-3.5 text-lg font-black shadow-lg transition-all ${
                  isFree
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-white shadow-[0_6px_0_#0f766e] animate-pulse'
                    : child.coins >= GACHA_COST
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-[0_6px_0_#c2410c]'
                    : 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed'
                }`}
              >
                {isFree ? (
                  <>
                    <Sparkles size={22} className="animate-spin" />
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

          {/* --- B: ハンドル回転中 (spinning) --- */}
          {phase === 'spinning' && (
            <div className="flex flex-col items-center justify-center py-4 w-full">
              <GachaMachineVisual
                size="lg"
                isSpinning={true}
                isFree={isFree}
              />
              <div className="mt-4 flex items-center gap-2 text-xl font-black text-amber-900 animate-pulse">
                <span className="text-2xl animate-spin">🌀</span>
                <span>ガチャン！ガチャン！ まわしているよ…！</span>
              </div>
            </div>
          )}

          {/* --- C: カプセル落下・待機 (dropping) --- */}
          {phase === 'dropping' && prize && (
            <div className="flex flex-col items-center justify-center py-2 w-full animate-popin">
              {/* フキダシプロンプト */}
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-black text-white shadow-lg animate-bounce border-2 border-white">
                <span>👆</span>
                <span>カプセルを タップして パカッと あけてね！</span>
              </div>

              {/* リアルなカプセルトイ（タップ可能） */}
              <button
                type="button"
                onClick={handleOpenCapsule}
                className="group relative flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 focus:outline-none"
              >
                {/* オーラ・後光エフェクト */}
                <div
                  className={`absolute -inset-6 rounded-full blur-xl opacity-60 animate-pulse bg-gradient-to-r ${
                    rarityInfo[prize.rarity]?.glowCls ?? 'from-amber-300 to-yellow-400'
                  }`}
                />

                {/* リアルなカプセルSVG */}
                <div className="relative w-40 h-40 filter drop-shadow-2xl animate-bounce">
                  <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
                    <defs>
                      {/* 金カプセル */}
                      <linearGradient id="goldCapsuleTop" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#a16207" />
                      </linearGradient>
                      {/* 銀/紫カプセル */}
                      <linearGradient id="rareCapsuleTop" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e9d5ff" />
                        <stop offset="50%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#6b21a8" />
                      </linearGradient>
                      {/* 赤ノーマルカプセル */}
                      <linearGradient id="normalCapsuleTop" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fca5a5" />
                        <stop offset="50%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#991b1b" />
                      </linearGradient>
                      {/* 白底ボトム */}
                      <linearGradient id="capsuleBottom" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#cbd5e1" />
                      </linearGradient>
                    </defs>

                    {/* 下半分（乳白色ベース） */}
                    <path
                      d="M 15,60 A 45,45 0 0,0 105,60 Z"
                      fill="url(#capsuleBottom)"
                      stroke="#94a3b8"
                      strokeWidth="2.5"
                    />
                    {/* 上半分（レア度色） */}
                    <path
                      d="M 15,60 A 45,45 0 0,1 105,60 Z"
                      fill={
                        prize.rarity === 3
                          ? 'url(#goldCapsuleTop)'
                          : prize.rarity === 2
                          ? 'url(#rareCapsuleTop)'
                          : 'url(#normalCapsuleTop)'
                      }
                      stroke={prize.rarity === 3 ? '#ca8a04' : '#64748b'}
                      strokeWidth="2.5"
                    />

                    {/* 接合リング帯 */}
                    <rect
                      x="12"
                      y="57"
                      width="96"
                      height="6"
                      rx="3"
                      fill="#ffffff"
                      stroke="#64748b"
                      strokeWidth="1.5"
                    />

                    {/* ハイライト艶 */}
                    <path
                      d="M 28,32 Q 45,20 70,24 Q 45,35 32,50 Q 25,40 28,32 Z"
                      fill="#ffffff"
                      opacity="0.65"
                    />

                    {/* キラリ星 */}
                    {prize.rarity === 3 && (
                      <text x="80" y="45" fontSize="20" fill="#ffffff" className="animate-spin origin-center">
                        ✨
                      </text>
                    )}
                  </svg>
                </div>

                <div className="mt-4 text-base font-black text-slate-800 flex items-center gap-1.5 group-hover:text-indigo-600">
                  <span>✨</span>
                  <span>なにが でてくるかな…？ タップ！</span>
                </div>
              </button>
            </div>
          )}

          {/* --- D: 開封演出中 (opening) --- */}
          {phase === 'opening' && prize && (
            <div className="relative flex flex-col items-center justify-center py-10 w-full">
              {/* 開いて飛んでいくカプセル */}
              <div className="relative w-44 h-44 flex items-center justify-center">
                {/* 激しい光 */}
                <div className="absolute inset-0 rounded-full bg-yellow-300 blur-2xl animate-ping opacity-80" />
                <div className="absolute text-7xl animate-spin">🌟</div>
                <div className="absolute text-5xl -top-4 -left-4 animate-bounce">✨</div>
                <div className="absolute text-5xl -bottom-4 -right-4 animate-bounce">🎉</div>

                {/* 割れた上フタが上へ */}
                <div className="absolute -top-12 transition-all transform -translate-y-8 rotate-12 duration-500 opacity-80">
                  <span className="text-5xl">🌕</span>
                </div>
                {/* 割れた下フタが下へ */}
                <div className="absolute -bottom-12 transition-all transform translate-y-8 -rotate-12 duration-500 opacity-80">
                  <span className="text-5xl">⚪</span>
                </div>
              </div>

              <div className="mt-6 text-2xl font-black text-amber-600 animate-pulse">
                パカッ！！✨
              </div>
            </div>
          )}

          {/* --- E: 結果画面 (result) --- */}
          {phase === 'result' && prize && (
            <div className="animate-popin flex flex-col items-center text-center py-2 w-full">
              <div className="text-4xl animate-bounce mb-1">
                {prize.rarity === 3 ? '👑🎉🌈' : '🎉✨'}
              </div>

              {/* レア度バッジ */}
              <div
                className={`rounded-full px-5 py-1 text-xs font-black shadow-md mb-3 ${
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
                <span className="text-6xl mb-2 drop-shadow-md">{prize.icon}</span>
                <span className="text-xl font-black text-slate-800">{prize.label}</span>

                {/* ほしのかけら当選の場合 */}
                {prize.kind === 'shards' && (
                  <div className="mt-3 flex flex-col items-center gap-1.5">
                    <span className="text-lg font-black text-amber-700 bg-white/90 px-4 py-1.5 rounded-2xl shadow-sm border border-amber-200">
                      🌟 ほしのかけら ＋{prize.shards}こ ゲット！
                    </span>
                    <span className="text-xs font-bold text-amber-800">
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

                {/* チケット当選の場合 */}
                {prize.kind === 'ticket' && (
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl mt-2 border border-indigo-200">
                    ごほうびチケットボックスに追加されたよ！🎟️
                  </span>
                )}

                {/* アバター当選の場合 */}
                {prize.kind === 'avatar' && !isDuplicate && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl mt-2 border border-emerald-200">
                    アバターきせかえで つかえるようになったよ！👕✨
                  </span>
                )}

                {/* ダブり救済ボーナスの表示 */}
                {isDuplicate && (
                  <div className="mt-3 flex flex-col items-center rounded-2xl bg-amber-100/90 p-3 border border-amber-300 w-full animate-popin">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <RefreshCw size={14} className="text-amber-700 animate-spin" />
                      <span>すでにもっている アイテム だったよ！</span>
                    </div>
                    <div className="mt-1 text-sm font-black text-amber-900">
                      ダブりボーナス！ 🌟ほしのかけら+{refundShards}こ ＆ 🪙+{refundCoins}コイン にへんかん！✨
                    </div>
                  </div>
                )}
              </div>

              {/* ボタン列 */}
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => {
                    sound.tap();
                    setPhase('idle');
                  }}
                  className="btn-pop flex-1 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 py-3 text-sm font-black text-amber-950 shadow-[0_4px_0_#d97706]"
                >
                  もう１かい まわす！
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.tap();
                    onClose();
                  }}
                  className="btn-pop flex-1 rounded-2xl bg-slate-200 py-3 text-sm font-black text-slate-700 hover:bg-slate-300"
                >
                  おわる
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== 2. ほしのかけら交換所 ==================== */}
      {activeTab === 'exchange' && phase === 'idle' && (
        <div className="flex flex-col w-full animate-popin">
          {/* 交換レート・所持状況ガイド */}
          <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-3 border border-amber-200 mb-3">
            <div className="flex items-center gap-2">
              <Star className="text-amber-500 fill-amber-400" size={24} />
              <div>
                <div className="text-xs font-bold text-amber-900">
                  もっている ほしのかけら: <span className="text-lg font-black text-amber-600">{child.starShards ?? 0}</span> こ
                </div>
                <div className="text-[10px] text-amber-700">
                  すきなアイテムをえらんで 確実にアンロックできるよ！
                </div>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-600 bg-white/90 px-2.5 py-1 rounded-xl border border-amber-200 text-right">
              <div>★1: 2こ</div>
              <div>★2: 5こ</div>
              <div className="text-amber-700 font-black">★3: 10こ</div>
            </div>
          </div>

          {/* カテゴリフィルター */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1 no-scrollbar">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  sound.tap();
                  setSelectedCategory(c.id);
                }}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                  selectedCategory === c.id
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* アイテム一覧 */}
          <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {filteredItems.map((item) => {
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
                    <span className="text-3xl shrink-0 drop-shadow-sm">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-800 truncate leading-tight">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            item.rarity === 3
                              ? 'bg-amber-100 text-amber-800 font-black'
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
                    <div className="w-full text-center py-1.5 rounded-xl bg-slate-200 text-[10px] font-bold text-slate-500 flex items-center justify-center gap-1">
                      <Check size={12} strokeWidth={3} />
                      <span>もっているよ</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => handleExchange(item.id, cost, item.name)}
                      className={`btn-pop w-full py-1.5 rounded-xl text-xs font-black transition-all ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 shadow-[0_2px_0_#d97706] hover:bg-amber-300'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? 'こうかんする！' : `あと ${cost - (child.starShards ?? 0)}こ`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              sound.tap();
              onClose();
            }}
            className="btn-pop mt-3 w-full rounded-2xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
          >
            とじる
          </button>
        </div>
      )}
    </div>
  );
}
