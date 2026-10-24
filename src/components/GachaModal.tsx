import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Crown, BookOpen, Repeat, Check, SkipForward, Shirt, X } from 'lucide-react';
import type { Child } from '../types';
import {
  canFreeGacha,
  spinGachaPulls,
  exchangeGachaItem,
  equipGachaPartsToChild,
  getEffectivePartGachaSetting,
  type GachaPullItemResult,
  type RarityNumber,
} from '../actions';
import { useAppState } from '../store';
import { DEFAULT_GACHA_CONFIG } from '../presets';
import {
  AvatarRenderer,
  createEmptyEquippedMap,
  resolveChildEquippedParts,
  usePartCatalog,
  PRESET_BODY,
  CATEGORY_META,
  type AvatarPart,
  type EquippedParts,
} from '../features/avatar';
import { GachaIcon } from './GachaIcons';
import { KidIcon, SmartTicketIcon } from './KidIcons';
import { sound } from '../sound';
import { burst } from '../effects';
import { toast } from './ui';

type ModalTab = 'stage' | 'lineup' | 'exchange';
type AnimPhase = 'idle' | 'opening' | 'orbs' | 'promotion' | 'ssr_runway' | 'result';

export function GachaModal({
  child,
  initialTab = 'spin',
  onClose,
}: {
  child: Child;
  initialTab?: 'spin' | 'exchange';
  onClose: () => void;
}) {
  const state = useAppState();
  const cfg = state.gachaConfig ?? DEFAULT_GACHA_CONFIG;
  const { parts: catalogParts } = usePartCatalog();

  const [tab, setTab] = useState<ModalTab>(initialTab === 'exchange' ? 'exchange' : 'stage');
  const [phase, setPhase] = useState<AnimPhase>('idle');
  const [pulls, setPulls] = useState<GachaPullItemResult[]>([]);
  const [highestRarity, setHighestRarity] = useState<RarityNumber>(1);
  const [promotedVisual, setPromotedVisual] = useState(false);
  const [ssrRunwayIdx, setSsrRunwayIdx] = useState(0);
  const [equippedDone, setEquippedDone] = useState(false);

  // 図鑑・交換所での試着プレビュー対象
  const [previewTarget, setPreviewTarget] = useState<{
    title: string;
    partIds: string[];
    rarity: RarityNumber;
  } | null>(null);

  const timersRef = useRef<number[]>([]);
  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const free = canFreeGacha(child);
  const starJewels = child.starShards ?? 0;

  // 素体と現在の子どもの装備を解決
  const dressupParts = useMemo(
    () => catalogParts.filter((p) => p.category !== 'body'),
    [catalogParts],
  );

  const childBaseEquipped = useMemo<EquippedParts>(() => {
    if (catalogParts.length === 0) {
      return { ...createEmptyEquippedMap(), body: PRESET_BODY };
    }
    return resolveChildEquippedParts(child.avatarStudio, catalogParts);
  }, [child.avatarStudio, catalogParts]);

  // ガチャ限定パーツ一覧（レア度別）
  const gachaOnlyParts = useMemo(() => {
    return dressupParts.filter((p) => getEffectivePartGachaSetting(p, cfg).isGachaOnly);
  }, [dressupParts, cfg]);

  // ピックアップ看板用の目玉アイテム（★3フルコーデ or ★3ピックアップパーツ）
  const featuredShowcase = useMemo(() => {
    const pickupSet =
      cfg.coordSets.find((cs) => cs.isPickup && cs.partIds.length > 0) ?? cfg.coordSets[0];
    if (pickupSet && pickupSet.partIds.length > 0) {
      return {
        type: 'coord_set' as const,
        title: pickupSet.name,
        subtitle: pickupSet.description || `${pickupSet.partIds.length}点フルコーデ一式`,
        partIds: pickupSet.partIds,
      };
    }
    const pickupPart =
      gachaOnlyParts.find((p) => {
        const st = getEffectivePartGachaSetting(p, cfg);
        return st.rarity === 3 && st.isPickup;
      }) ??
      gachaOnlyParts.find((p) => getEffectivePartGachaSetting(p, cfg).rarity === 3) ??
      gachaOnlyParts[0];

    if (pickupPart) {
      return {
        type: 'part' as const,
        title: pickupPart.name,
        subtitle: 'ガチャ限定スペシャルアイテム✨',
        partIds: [pickupPart.id],
      };
    }
    return null;
  }, [cfg, gachaOnlyParts]);

  // 任意のpartIdsを着せたアバター装備マップを作るヘルパー
  const buildTryOnEquipped = (partIds: string[]): EquippedParts => {
    const map: EquippedParts = { ...childBaseEquipped };
    const hands: AvatarPart[] = [];
    for (const pid of partIds) {
      const p = dressupParts.find((x) => x.id === pid);
      if (p) {
        map[p.category] = p;
        if (p.category === 'hand_item') hands.push(p);
      }
    }
    if (hands.length > 0) map.hand_items = hands;
    return map;
  };

  // ★3ランウェイ対象のリスト
  const ssrPulls = useMemo(
    () => pulls.filter((r) => r.prize.rarity === 3),
    [pulls],
  );

  // ガチャ実行（1回 or 10連）
  const handleStartPull = (count: 1 | 10) => {
    if (phase !== 'idle' && phase !== 'result') return;
    clearTimers();
    setEquippedDone(false);

    const outcome = spinGachaPulls(child.id, count, catalogParts);
    if (!outcome.ok) {
      toast('コインが足りないよ！おてつだいで貯めよう💪', '🪙');
      return;
    }

    setPulls(outcome.pulls);
    setHighestRarity(outcome.highestRarity);
    setPromotedVisual(false);
    setSsrRunwayIdx(0);

    // Phase 1: 黄金の鍵でジュエリーボックス解錠！
    setPhase('opening');
    sound.gachaSpin();

    // 1.1秒後 → ジュエルオーブ展開
    timersRef.current.push(
      window.setTimeout(() => {
        setPhase('orbs');
        sound.coin();
      }, 1100),
    );

    const hasPromo = outcome.hasPromotion;
    const ssrItems = outcome.pulls.filter((p) => p.prize.rarity === 3);

    if (hasPromo) {
      // 2.2秒後 → パリーン！昇格演出
      timersRef.current.push(
        window.setTimeout(() => {
          setPhase('promotion');
          setPromotedVisual(true);
          sound.fanfare();
          burst();
        }, 2200),
      );
    }

    const nextStepDelay = hasPromo ? 3500 : 2300;

    if (ssrItems.length > 0) {
      // ★3 SSR当選時はドリームステージ試着ランウェイへ！
      timersRef.current.push(
        window.setTimeout(() => {
          setPhase('ssr_runway');
          sound.fanfare();
          burst();
        }, nextStepDelay),
      );
    } else {
      // ★1〜★2のみの場合はリザルト一覧へ
      timersRef.current.push(
        window.setTimeout(() => {
          setPhase('result');
          if (outcome.highestRarity === 2) {
            sound.fanfare();
            burst();
          } else {
            sound.success();
          }
        }, nextStepDelay),
      );
    }
  };

  // SKIPボタン（いつでも即リザルトへ）
  const handleSkipToResult = () => {
    clearTimers();
    setPromotedVisual(true);
    setPhase('result');
    if (highestRarity === 3) {
      sound.fanfare();
      burst();
    } else {
      sound.tap();
    }
  };

  // 当たったパーツをまとめてその場で着用する
  const wonEquipablePartIds = useMemo(() => {
    const ids: string[] = [];
    for (const r of pulls) {
      for (const pid of r.prize.partIds) {
        if (!ids.includes(pid)) ids.push(pid);
      }
    }
    return ids;
  }, [pulls]);

  const handleEquipWonItems = () => {
    if (wonEquipablePartIds.length === 0) return;
    equipGachaPartsToChild(child.id, wonEquipablePartIds, catalogParts);
    setEquippedDone(true);
    sound.fanfare();
    burst();
    toast('当たったコーデにお着替えしたよ！✨', '👗');
  };

  // 交換所アクション
  const handleExchange = (target: { type: 'coord_set' | 'part'; id: string; name: string }) => {
    const res = exchangeGachaItem(child.id, { type: target.type, id: target.id }, catalogParts);
    if (res === 'ok') {
      sound.fanfare();
      burst();
      toast(`💎 スタージュエルで「${target.name}」をゲットしたよ！`, '🎉');
    } else if (res === 'not_enough') {
      toast('スタージュエルがまだ足りないよ！ガチャで集めよう✨', '💎');
    } else if (res === 'owned') {
      toast('すでに持っているよ！', '✨');
    }
  };

  const isAnimating = phase !== 'idle' && phase !== 'result';

  // 開幕のボックスオーラ色（昇格前はinitialOrbRarityの最大値でじらす！）
  const initialMaxRarity = useMemo<RarityNumber>(() => {
    if (pulls.length === 0) return 1;
    return pulls.reduce(
      (max, r) => (r.initialOrbRarity > max ? r.initialOrbRarity : max),
      1 as RarityNumber,
    );
  }, [pulls]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-fade-in"
      onClick={() => !isAnimating && onClose()}
    >
      <div
        className="relative flex flex-col w-full max-w-xl max-h-[92vh] overflow-hidden rounded-3xl border border-amber-300/30 bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950 text-white shadow-[0_25px_70px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 背景のステージスポットライト装飾 */}
        <div className="pointer-events-none absolute -top-24 left-1/4 h-64 w-32 rotate-12 bg-gradient-to-b from-pink-500/20 via-amber-300/10 to-transparent blur-2xl" />
        <div className="pointer-events-none absolute -top-24 right-1/4 h-64 w-32 -rotate-12 bg-gradient-to-b from-cyan-400/20 via-indigo-400/10 to-transparent blur-2xl" />

        {/* ===== トップヘッダー ===== */}
        <div className="relative z-10 flex items-center justify-between gap-2 border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <GachaIcon type="box_closed" size={36} className="shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-base sm:text-lg font-black tracking-wide bg-gradient-to-r from-amber-200 via-pink-200 to-cyan-200 bg-clip-text text-transparent">
                  ドリームジュエルガチャ
                </h2>
              </div>
              <p className="text-[10px] text-indigo-200/80 truncate">
                黄金のカギで宝石箱を開けて特別コーデをゲット！
              </p>
            </div>
          </div>

          {/* 所持ジュエル＆コイン・閉じるボタン */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 rounded-full bg-indigo-900/80 border border-cyan-400/30 px-2.5 py-1 text-xs font-extrabold text-cyan-200 shadow-inner">
              <GachaIcon type="star_jewel" size={16} />
              <span>{starJewels}</span>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 text-xs font-extrabold text-amber-200">
              <span>🪙</span>
              <span>{child.coins}</span>
            </div>
            {!isAnimating && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition"
                aria-label="とじる"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ===== ナビゲーションタブ（演出中は非表示） ===== */}
        {!isAnimating && (
          <div className="relative z-10 grid grid-cols-3 gap-1.5 bg-black/40 px-4 py-2 border-b border-white/10">
            <button
              type="button"
              onClick={() => {
                setTab('stage');
                setPreviewTarget(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition ${
                tab === 'stage'
                  ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-indigo-500 text-white shadow-md'
                  : 'bg-white/5 text-indigo-200 hover:bg-white/10'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>ガチャステージ</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('lineup')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition ${
                tab === 'lineup'
                  ? 'bg-gradient-to-r from-amber-400 via-pink-500 to-indigo-500 text-white shadow-md'
                  : 'bg-white/5 text-indigo-200 hover:bg-white/10'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>ラインナップ図鑑</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('exchange')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition ${
                tab === 'exchange'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                  : 'bg-white/5 text-indigo-200 hover:bg-white/10'
              }`}
            >
              <GachaIcon type="star_jewel" size={15} />
              <span>ジュエル交換所</span>
            </button>
          </div>
        )}

        {/* ===== メインスクロール領域 ===== */}
        <div className="relative z-10 flex-1 overflow-y-auto p-4">
          {/* 演出中の常設 SKIP ボタン */}
          {isAnimating && (
            <button
              type="button"
              onClick={handleSkipToResult}
              className="absolute top-3 right-3 z-30 flex items-center gap-1 rounded-full bg-black/60 border border-white/30 px-3.5 py-1.5 text-xs font-extrabold text-white backdrop-blur-xs hover:bg-black/80 transition"
            >
              <SkipForward className="h-3.5 w-3.5" />
              <span>SKIP</span>
            </button>
          )}

          {/* =========================================================
              1. ガチャステージ本番 ＆ 4段階ドラマチック演出
             ========================================================= */}
          {tab === 'stage' && (
            <div className="flex flex-col items-center">
              {/* ---------- IDLE（待機中：ピックアップ看板＋宝石箱ステージ） ---------- */}
              {phase === 'idle' && (
                <div className="w-full flex flex-col gap-4">
                  {/* ピックアップ看板ショーケース */}
                  <div className="relative overflow-hidden rounded-2xl border border-amber-300/40 bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-pink-900/80 p-3.5 shadow-lg">
                    <div className="flex items-center gap-3">
                      {featuredShowcase ? (
                        <>
                          <div className="relative shrink-0 rounded-2xl bg-black/40 p-1.5 border border-amber-300/40">
                            <AvatarRenderer
                              equippedParts={buildTryOnEquipped(featuredShowcase.partIds)}
                              size={92}
                              animate
                            />
                            <span className="absolute -top-1.5 -left-1.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-2 py-0.5 text-[9px] font-black text-white shadow-sm">
                              PICKUP ★3
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-300/40 px-2 py-0.5 text-[10px] font-extrabold text-amber-200">
                              <Crown className="h-3 w-3 text-amber-300" />
                              <span>
                                {featuredShowcase.type === 'coord_set'
                                  ? '★3 フルコーデ一式排出'
                                  : '★3 スペシャルパーツ'}
                              </span>
                            </div>
                            <h3 className="mt-1 truncate text-base font-black text-white">
                              {featuredShowcase.title}
                            </h3>
                            <p className="text-xs text-pink-100/90 line-clamp-2">
                              {featuredShowcase.subtitle}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold">
                              <span className="rounded-md bg-pink-500/30 border border-pink-300/40 px-2 py-0.5 text-pink-200">
                                🌈 ★3 SSR: {cfg.rarityRates.r3}%
                              </span>
                              <span className="rounded-md bg-amber-500/30 border border-amber-300/40 px-2 py-0.5 text-amber-200">
                                ✨ ★2 R: {cfg.rarityRates.r2}%
                              </span>
                              <span className="rounded-md bg-sky-500/30 border border-sky-300/40 px-2 py-0.5 text-sky-200">
                                💎 ★1 N: {cfg.rarityRates.r1}%
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3 py-2">
                          <GachaIcon type="orb_r3" size={64} />
                          <div>
                            <span className="rounded-full bg-pink-500/30 px-2 py-0.5 text-[10px] font-black text-pink-200">
                              ROYAL JEWEL STAGE
                            </span>
                            <h3 className="mt-1 text-base font-black text-white">
                              限定コーデ＆ごほうびチケットを手に入れよう！
                            </h3>
                            <p className="text-xs text-indigo-200">
                              ダブっても💎スタージュエルが貯まって好きなアイテムと交換できるよ✨
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 中央ジュエリーボックス演出エリア */}
                  <div className="relative flex flex-col items-center justify-center py-5">
                    <div className="pointer-events-none absolute h-44 w-44 rounded-full bg-gradient-to-r from-amber-400/25 via-pink-500/25 to-cyan-400/25 blur-2xl animate-pulse" />
                    <div className="relative transition-transform duration-500 hover:scale-105">
                      <GachaIcon type="box_closed" size={148} />
                    </div>
                    <p className="mt-2 text-xs font-bold text-amber-200/90 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      <span>ボタンを押すと黄金のカギでジュエリーボックスが開くよ！</span>
                    </p>
                  </div>

                  {/* 1回ガチャ ＆ 10連ガチャ アクションボタン */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {/* 1回引く */}
                    <button
                      type="button"
                      onClick={() => handleStartPull(1)}
                      disabled={!free && child.coins < cfg.singleCost}
                      className="relative flex flex-col items-center justify-center rounded-2xl border border-sky-300/50 bg-gradient-to-b from-sky-500 via-blue-600 to-indigo-700 p-3.5 text-white shadow-lg hover:brightness-110 active:scale-98 disabled:opacity-45 transition"
                    >
                      {free && (
                        <span className="absolute -top-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-3 py-0.5 text-[10px] font-black text-slate-950 shadow-sm">
                          🎁 本日1回無料！
                        </span>
                      )}
                      <span className="text-sm font-black tracking-wide">1回ガチャを引く</span>
                      <span className="mt-1 rounded-full bg-black/30 px-3 py-0.5 text-xs font-extrabold text-amber-200">
                        {free ? '🪙 0（無料✨）' : `🪙 ${cfg.singleCost} コイン`}
                      </span>
                    </button>

                    {/* 10連引く（★2以上1枠確定） */}
                    <button
                      type="button"
                      onClick={() => handleStartPull(10)}
                      disabled={child.coins < cfg.tenPullCost}
                      className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 p-3.5 text-white shadow-[0_0_25px_rgba(245,158,11,0.45)] hover:brightness-110 active:scale-98 disabled:opacity-45 transition"
                    >
                      <span className="absolute -top-2.5 rounded-full bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 px-3 py-0.5 text-[10px] font-black text-slate-950 shadow-sm">
                        🌈 ★2以上1枠確定！おとく✨
                      </span>
                      <span className="text-sm font-black tracking-wide">10連ガチャを引く</span>
                      <span className="mt-1 rounded-full bg-black/35 px-3 py-0.5 text-xs font-extrabold text-amber-200">
                        🪙 {cfg.tenPullCost} コイン
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* ---------- PHASE 1: OPENING（黄金の鍵で解錠＆光の色変化！） ---------- */}
              {phase === 'opening' && (
                <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in">
                  <div
                    className={`relative flex items-center justify-center rounded-full p-8 ${
                      initialMaxRarity === 3
                        ? 'bg-gradient-to-r from-pink-500/40 via-amber-400/40 to-cyan-400/40 shadow-[0_0_80px_rgba(236,72,153,0.8)]'
                        : initialMaxRarity === 2
                        ? 'bg-amber-400/35 shadow-[0_0_70px_rgba(251,191,36,0.75)]'
                        : 'bg-sky-400/30 shadow-[0_0_60px_rgba(56,189,248,0.65)]'
                    }`}
                  >
                    <GachaIcon
                      type="box_open"
                      size={180}
                      className="animate-bounce"
                    />
                  </div>
                  <h3 className="mt-6 text-xl font-black tracking-wider text-amber-200 animate-pulse">
                    ✨ 黄金のカギで解錠中...！！ ✨
                  </h3>
                  <p className="mt-1 text-xs font-bold text-indigo-200">
                    {initialMaxRarity === 3
                      ? '🌈 なないろの輝きがあふれ出している…！？'
                      : initialMaxRarity === 2
                      ? '✨ まぶしい黄金の光が輝いている！'
                      : '💎 ジュエルオーブが飛び出すよ！'}
                  </p>
                </div>
              )}

              {/* ---------- PHASE 2: ORBS & PROMOTION（オーブ展開＆パリーン昇格演出！） ---------- */}
              {(phase === 'orbs' || phase === 'promotion') && (
                <div className="flex flex-col items-center justify-center py-10 w-full text-center animate-fade-in">
                  {phase === 'promotion' && (
                    <div className="mb-4 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-pink-600 via-amber-500 to-purple-600 px-5 py-2 shadow-[0_0_40px_rgba(236,72,153,0.9)] animate-bounce">
                      <p className="text-base sm:text-lg font-black text-white tracking-wider">
                        ⚡ パリーン！！ 奇跡の昇格発生！！ 🌈
                      </p>
                    </div>
                  )}

                  {pulls.length === 1 ? (
                    <div className="my-6 flex flex-col items-center">
                      <div className="relative p-6 rounded-full bg-white/10 shadow-[0_0_60px_rgba(255,255,255,0.35)]">
                        <GachaIcon
                          type={
                            (promotedVisual ? pulls[0].prize.rarity : pulls[0].initialOrbRarity) === 3
                              ? 'orb_r3'
                              : (promotedVisual ? pulls[0].prize.rarity : pulls[0].initialOrbRarity) === 2
                              ? 'orb_r2'
                              : 'orb_r1'
                          }
                          size={156}
                          className="animate-pulse"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="my-4 grid grid-cols-5 gap-3 sm:gap-4 max-w-md mx-auto">
                      {pulls.map((item, idx) => {
                        const r = promotedVisual ? item.prize.rarity : item.initialOrbRarity;
                        return (
                          <div
                            key={idx}
                            className={`flex flex-col items-center justify-center rounded-2xl p-2 transition-all duration-300 ${
                              promotedVisual && item.isFakeoutPromotion
                                ? 'scale-115 ring-2 ring-amber-300 bg-gradient-to-br from-pink-500/40 to-amber-400/40'
                                : 'bg-white/5'
                            }`}
                          >
                            <GachaIcon
                              type={r === 3 ? 'orb_r3' : r === 2 ? 'orb_r2' : 'orb_r1'}
                              size={56}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="mt-4 text-sm font-extrabold text-amber-200">
                    {phase === 'promotion'
                      ? '✨ オーブの色が劇的に変化したよ！！ ✨'
                      : '✨ ジュエルオーブが光を放っている…！ ✨'}
                  </p>
                </div>
              )}

              {/* ---------- PHASE 3: SSR RUNWAY（★3全画面カットイン＆アバター試着ランウェイ！） ---------- */}
              {phase === 'ssr_runway' && ssrPulls[ssrRunwayIdx] && (
                <div className="flex flex-col items-center justify-center py-4 w-full text-center animate-fade-in">
                  {(() => {
                    const currentSSR = ssrPulls[ssrRunwayIdx];
                    const hasAvatarParts = currentSSR.prize.partIds.length > 0;

                    return (
                      <div className="relative w-full rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-pink-600/30 via-indigo-950 to-purple-950 p-5 shadow-[0_0_60px_rgba(236,72,153,0.6)]">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 via-pink-400 to-cyan-300 px-4 py-1 text-xs font-black text-slate-950 shadow-md">
                          <Crown className="h-4 w-4" />
                          <span>
                            {currentSSR.prize.kind === 'coord_set'
                              ? '★3 SSR FULL COORD GET!!'
                              : '★3 SUPER SPECIAL RARE!!'}
                          </span>
                        </div>

                        <h3 className="mt-2 text-xl sm:text-2xl font-black text-white drop-shadow-md">
                          {currentSSR.prize.label}
                        </h3>

                        {/* ステージランウェイ試着表示 */}
                        <div className="my-4 flex flex-col items-center justify-center">
                          {hasAvatarParts ? (
                            <div className="relative flex flex-col items-center">
                              <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400/30 via-pink-400/30 to-cyan-300/30 blur-xl" />
                              <AvatarRenderer
                                equippedParts={buildTryOnEquipped(currentSSR.prize.partIds)}
                                size={190}
                                animate
                                className="relative z-10 drop-shadow-[0_12px_28px_rgba(255,215,0,0.5)]"
                              />
                              <span className="mt-2 rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-bold text-amber-200">
                                👗 ドリームランウェイ試着お披露目中✨
                              </span>
                            </div>
                          ) : currentSSR.prize.kind === 'shards' ? (
                            <div className="py-4">
                              <GachaIcon type="star_jewel" size={110} />
                            </div>
                          ) : (
                            <div className="py-4">
                              <SmartTicketIcon
                                item={{
                                  name: currentSSR.prize.label,
                                  icon: currentSSR.prize.icon,
                                  category: 'real',
                                  minutes: 0,
                                }}
                                size={96}
                              />
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (ssrRunwayIdx + 1 < ssrPulls.length) {
                              setSsrRunwayIdx((i) => i + 1);
                              sound.fanfare();
                            } else {
                              setPhase('result');
                              sound.success();
                            }
                          }}
                          className="mt-2 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-indigo-500 py-3 text-sm font-black text-white shadow-lg hover:brightness-110"
                        >
                          {ssrRunwayIdx + 1 < ssrPulls.length
                            ? 'つぎの★3を見る ✨'
                            : 'リザルト一覧へ進む ✨'}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ---------- PHASE 4: RESULT（ホログラムカード一覧＆その場で着替えるボタン） ---------- */}
              {phase === 'result' && (
                <div className="flex flex-col gap-4 w-full animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      <span>ガチャ結果（{pulls.length}連）</span>
                    </h3>
                    {wonEquipablePartIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleEquipWonItems}
                        disabled={equippedDone}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black shadow-md transition ${
                          equippedDone
                            ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                            : 'bg-gradient-to-r from-pink-500 to-amber-500 text-white hover:brightness-110'
                        }`}
                      >
                        {equippedDone ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>お着替え完了✨</span>
                          </>
                        ) : (
                          <>
                            <Shirt className="h-3.5 w-3.5" />
                            <span>当たった服に今すぐ着替える！</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* ホログラムカードグリッド */}
                  <div
                    className={`grid gap-2.5 ${
                      pulls.length === 1 ? 'grid-cols-1 max-w-xs mx-auto w-full' : 'grid-cols-2 sm:grid-cols-5'
                    }`}
                  >
                    {pulls.map((r, idx) => {
                      const partObj = r.prize.partId
                        ? dressupParts.find((p) => p.id === r.prize.partId)
                        : undefined;
                      const isSSR = r.prize.rarity === 3;
                      const isSR = r.prize.rarity === 2;

                      return (
                        <div
                          key={idx}
                          className={`relative flex flex-col items-center justify-between rounded-2xl border p-2.5 text-center transition ${
                            isSSR
                              ? 'border-2 border-amber-300 bg-gradient-to-b from-pink-500/30 via-purple-900/60 to-indigo-950 shadow-[0_0_20px_rgba(236,72,153,0.45)]'
                              : isSR
                              ? 'border-amber-300/70 bg-gradient-to-b from-amber-500/20 to-slate-900/90'
                              : 'border-sky-400/40 bg-slate-900/80'
                          }`}
                        >
                          {/* レア度＆NEWバッジ */}
                          <div className="flex w-full items-center justify-between text-[10px] font-black">
                            <span
                              className={`rounded-md px-1.5 py-0.2 ${
                                isSSR
                                  ? 'bg-gradient-to-r from-amber-400 to-pink-500 text-slate-950'
                                  : isSR
                                  ? 'bg-amber-400/90 text-slate-950'
                                  : 'bg-sky-500/40 text-sky-200'
                              }`}
                            >
                              {isSSR ? '★3 SSR' : isSR ? '★2 R' : '★1 N'}
                            </span>
                            {r.newlyUnlockedPartIds.length > 0 && (
                              <span className="rounded-full bg-emerald-400 px-1.5 py-0.2 text-[9px] font-black text-slate-950">
                                NEW!
                              </span>
                            )}
                          </div>

                          {/* アイテムビジュアル */}
                          <div className="my-2 flex h-16 w-16 items-center justify-center rounded-xl bg-black/30 p-1">
                            {r.prize.kind === 'coord_set' ? (
                              <AvatarRenderer
                                equippedParts={buildTryOnEquipped(r.prize.partIds)}
                                size={58}
                                animate={false}
                              />
                            ) : partObj ? (
                              <img
                                src={partObj.src}
                                alt={partObj.name}
                                className="h-full w-full object-contain"
                              />
                            ) : r.prize.kind === 'shards' ? (
                              <GachaIcon type="star_jewel" size={44} />
                            ) : r.prize.kind === 'coins' ? (
                              <KidIcon iconKey="ui_coin" size={44} />
                            ) : (
                              <SmartTicketIcon
                                item={{
                                  name: r.prize.label,
                                  icon: r.prize.icon,
                                  category:
                                    r.prize.label.includes('タブレット') ||
                                    r.prize.label.includes('ゲーム')
                                      ? 'tablet'
                                      : 'real',
                                  minutes: 0,
                                }}
                                size={46}
                              />
                            )}
                          </div>

                          <p className="w-full truncate text-xs font-extrabold text-white">
                            {r.prize.label}
                          </p>

                          {/* ダブり変換表示 */}
                          {r.isDuplicate && (
                            <span className="mt-1 rounded-md bg-cyan-500/20 border border-cyan-400/30 px-1.5 py-0.5 text-[9px] font-bold text-cyan-200">
                              💎+{r.refundShards} / 🪙+{r.refundCoins}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* もう1回引く・ステージに戻る */}
                  <div className="mt-2 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPhase('idle')}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 py-2.5 text-xs font-extrabold text-white hover:bg-white/15"
                    >
                      <Repeat className="h-3.5 w-3.5" />
                      <span>ガチャステージに戻る</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-2xl bg-gradient-to-r from-amber-400 to-pink-500 py-2.5 text-xs font-black text-slate-950 shadow-md"
                    >
                      とじる
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              2. ラインナップ図鑑（提供割合＆試着プレビュー）
             ========================================================= */}
          {tab === 'lineup' && (
            <div className="flex flex-col gap-4">
              {/* 試着プレビューバー */}
              {previewTarget && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300/50 bg-indigo-900/70 p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-black/40 p-1">
                      <AvatarRenderer
                        equippedParts={buildTryOnEquipped(previewTarget.partIds)}
                        size={76}
                        animate
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-300">
                        👗 試着プレビュー中
                      </span>
                      <p className="text-sm font-black text-white">{previewTarget.title}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewTarget(null)}
                    className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white/80"
                  >
                    閉じる
                  </button>
                </div>
              )}

              {/* 提供割合サマリー */}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-xs">
                <p className="font-extrabold text-amber-200 mb-1.5">📊 レアリティ別提供割合</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-pink-500/20 border border-pink-400/30 p-2">
                    <div className="font-black text-pink-200">🌈 ★3 SSR</div>
                    <div className="text-sm font-black text-white">{cfg.rarityRates.r3}%</div>
                  </div>
                  <div className="rounded-xl bg-amber-500/20 border border-amber-400/30 p-2">
                    <div className="font-black text-amber-200">✨ ★2 R</div>
                    <div className="text-sm font-black text-white">{cfg.rarityRates.r2}%</div>
                  </div>
                  <div className="rounded-xl bg-sky-500/20 border border-sky-400/30 p-2">
                    <div className="font-black text-sky-200">💎 ★1 N</div>
                    <div className="text-sm font-black text-white">{cfg.rarityRates.r1}%</div>
                  </div>
                </div>
              </div>

              {/* ★3 フルコーデセット一覧 */}
              {cfg.coordSets.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-pink-300 mb-2 flex items-center gap-1">
                    <Crown className="h-3.5 w-3.5" />
                    <span>★3 フルコーデセット（当たると一式まとめてGET！）</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {cfg.coordSets.map((cs) => {
                      const owned = cs.partIds.every((pid: string) => child.ownedItems.includes(pid));
                      return (
                        <button
                          key={cs.id}
                          type="button"
                          onClick={() =>
                            setPreviewTarget({
                              title: cs.name,
                              partIds: cs.partIds,
                              rarity: 3,
                            })
                          }
                          className="flex items-center gap-3 rounded-2xl border border-amber-300/40 bg-white/5 p-2.5 text-left hover:bg-white/10 transition"
                        >
                          <div className="rounded-xl bg-black/40 p-1 shrink-0">
                            <AvatarRenderer
                              equippedParts={buildTryOnEquipped(cs.partIds)}
                              size={60}
                              animate={false}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="rounded-md bg-gradient-to-r from-amber-400 to-pink-500 px-1.5 py-0.2 text-[9px] font-black text-slate-950">
                                ★3 SET
                              </span>
                              {owned && (
                                <span className="rounded-md bg-emerald-400/30 px-1.5 py-0.2 text-[9px] font-bold text-emerald-200">
                                  コンプ済✨
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-xs font-extrabold text-white">
                              {cs.name}
                            </p>
                            <p className="text-[10px] text-indigo-200/80">
                              タップで試着プレビュー（{cs.partIds.length}点セット）
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 単体ガチャ限定パーツ一覧 */}
              <div>
                <h4 className="text-xs font-black text-amber-200 mb-2">
                  ✨ ガチャ限定アバターパーツ ({gachaOnlyParts.length}種)
                </h4>
                {gachaOnlyParts.length === 0 ? (
                  <p className="rounded-xl bg-white/5 p-4 text-center text-xs text-indigo-200/70">
                    現在ガチャ限定に設定されている単体パーツはありません（親モードのガチャ管理から追加できます）
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {gachaOnlyParts.map((part) => {
                      const st = getEffectivePartGachaSetting(part, cfg);
                      const owned = child.ownedItems.includes(part.id);
                      const cat = CATEGORY_META[part.category];
                      return (
                        <button
                          key={part.id}
                          type="button"
                          onClick={() =>
                            setPreviewTarget({
                              title: part.name,
                              partIds: [part.id],
                              rarity: st.rarity,
                            })
                          }
                          className={`flex flex-col items-center rounded-xl border p-2 text-center transition ${
                            owned
                              ? 'border-emerald-400/50 bg-emerald-950/30'
                              : 'border-white/15 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex w-full items-center justify-between text-[9px] font-black">
                            <span
                              className={
                                st.rarity === 3
                                  ? 'text-pink-300'
                                  : st.rarity === 2
                                  ? 'text-amber-300'
                                  : 'text-sky-300'
                              }
                            >
                              ★{st.rarity}
                            </span>
                            {owned && <span className="text-emerald-300">GET済</span>}
                          </div>
                          <div className="my-1 h-12 w-12 rounded-lg bg-black/30 p-1">
                            <img
                              src={part.src}
                              alt={part.name}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <span className="text-[9px] text-indigo-300">{cat?.label}</span>
                          <span className="w-full truncate text-[11px] font-bold text-white">
                            {part.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================
              3. スタージュエル交換所（天井システム）
             ========================================================= */}
          {tab === 'exchange' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between rounded-2xl border border-cyan-400/40 bg-gradient-to-r from-cyan-950/80 to-indigo-950/80 p-3.5">
                <div className="flex items-center gap-2.5">
                  <GachaIcon type="star_jewel" size={40} />
                  <div>
                    <h4 className="text-sm font-black text-white">スタージュエル交換所</h4>
                    <p className="text-[11px] text-cyan-200/80">
                      ガチャで集めたジュエルで好きな限定コーデと交換できるよ！
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-cyan-200">所持ジュエル</span>
                  <div className="text-lg font-black text-cyan-300">💎 {starJewels}個</div>
                </div>
              </div>

              {/* フルコーデセット交換 */}
              {cfg.coordSets.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h5 className="text-xs font-black text-amber-200">
                    👑 ★3 フルコーデセット一式交換
                  </h5>
                  {cfg.coordSets.map((cs) => {
                    const owned = cs.partIds.every((pid: string) => child.ownedItems.includes(pid));
                    const cost = cs.exchangeCost ?? cfg.exchangeCosts.r3Set;
                    const canBuy = !owned && starJewels >= cost;

                    return (
                      <div
                        key={cs.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300/30 bg-white/5 p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="rounded-xl bg-black/40 p-1 shrink-0">
                            <AvatarRenderer
                              equippedParts={buildTryOnEquipped(cs.partIds)}
                              size={56}
                              animate={false}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">{cs.name}</p>
                            <p className="text-[11px] text-indigo-200/80">
                              {cs.partIds.length}点セット一式
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() =>
                            handleExchange({ type: 'coord_set', id: cs.id, name: cs.name })
                          }
                          className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black transition ${
                            owned
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : canBuy
                              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md hover:brightness-110'
                              : 'bg-white/10 text-white/40'
                          }`}
                        >
                          {owned ? 'コンプ済✨' : `💎 ${cost}個で交換`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 単体パーツ交換 */}
              <div className="flex flex-col gap-2">
                <h5 className="text-xs font-black text-cyan-200">
                  ✨ ガチャ限定パーツ単体交換
                </h5>
                {gachaOnlyParts.length === 0 ? (
                  <p className="rounded-xl bg-white/5 p-4 text-center text-xs text-indigo-200/70">
                    交換対象のガチャ限定パーツがまだ登録されていません
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {gachaOnlyParts.map((part) => {
                      const st = getEffectivePartGachaSetting(part, cfg);
                      const owned = child.ownedItems.includes(part.id);
                      const cost =
                        st.exchangeCost ??
                        (st.rarity === 3
                          ? cfg.exchangeCosts.r3Part
                          : st.rarity === 2
                          ? cfg.exchangeCosts.r2Part
                          : cfg.exchangeCosts.r1Part);
                      const canBuy = !owned && starJewels >= cost;

                      return (
                        <div
                          key={part.id}
                          className="flex items-center justify-between gap-2.5 rounded-2xl border border-white/15 bg-white/5 p-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-12 w-12 shrink-0 rounded-xl bg-black/40 p-1">
                              <img
                                src={part.src}
                                alt={part.name}
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <span
                                className={`text-[10px] font-black ${
                                  st.rarity === 3
                                    ? 'text-pink-300'
                                    : st.rarity === 2
                                    ? 'text-amber-300'
                                    : 'text-sky-300'
                                }`}
                              >
                                ★{st.rarity}
                              </span>
                              <p className="truncate text-xs font-extrabold text-white">
                                {part.name}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!canBuy}
                            onClick={() =>
                              handleExchange({ type: 'part', id: part.id, name: part.name })
                            }
                            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-black transition ${
                              owned
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : canBuy
                                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950'
                                : 'bg-white/10 text-white/40'
                            }`}
                          >
                            {owned ? '所持済' : `💎 ${cost}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
