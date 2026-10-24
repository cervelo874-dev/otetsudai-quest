import { getState, setState, flushSync } from './store';
import type {
  AppState,
  AvatarSlot,
  Child,
  GachaConfig,
  GachaCoordSet,
  GachaPartSetting,
  GachaRarity,
  NotificationSettings,
  Quest,
  ShopItem,
  Ticket,
} from './types';
import { uid, todayKey, yesterdayKey } from './utils';
import { BONUS_COINS, BONUS_WINDOW_MS, GACHA_COST, rewardFor } from './logic';
import { findOption } from './avatar';
import { createInitialState, DEFAULT_GACHA_CONFIG } from './presets';
import { DEFAULT_EQUIPPED, toEquippedIdMap, type AvatarPart } from './features/avatar';

/* ---------------- helpers ---------------- */

function addLog(s: AppState, icon: string, text: string): void {
  s.logs.unshift({ id: uid(), icon, text, at: Date.now() });
  if (s.logs.length > 80) s.logs.length = 80;
}

function addNotice(s: AppState, childId: string, icon: string, text: string): void {
  s.notices.push({ id: uid(), childId, icon, text, createdAt: Date.now() });
  if (s.notices.length > 50) s.notices.splice(0, s.notices.length - 50);
}

function findChild(s: AppState, id: string): Child | undefined {
  return s.children.find((c) => c.id === id);
}

function grantShopItem(s: AppState, c: Child, it: ShopItem): void {
  if (it.category === 'avatar') {
    if (it.avatarItemId && !c.ownedItems.includes(it.avatarItemId)) c.ownedItems.push(it.avatarItemId);
    return;
  }
  s.tickets.push({
    id: uid(),
    childId: c.id,
    shopItemId: it.id,
    name: it.name,
    icon: it.icon,
    category: it.category,
    minutes: it.minutes,
    status: 'owned',
    acquiredAt: Date.now(),
    usedAt: null,
  });
}

/* ---------------- quests ---------------- */

export function submitQuest(childId: string, questId: string): void {
  setState((s) => {
    if (s.submissions.some((x) => x.childId === childId && x.questId === questId)) return;
    const c = findChild(s, childId);
    const q = s.quests.find((x) => x.id === questId);
    if (!c || !q) return;
    s.submissions.push({ id: uid(), childId, questId, createdAt: Date.now() });
    addLog(s, '💌', `${c.name}が「${q.title}」できた！と報告`);
  });
}

export function approveSubmission(subId: string): void {
  setState((s) => {
    const sub = s.submissions.find((x) => x.id === subId);
    if (!sub) return;
    s.submissions = s.submissions.filter((x) => x.id !== subId);
    const c = findChild(s, sub.childId);
    const q = s.quests.find((x) => x.id === sub.questId);
    if (!c) return;
    const reward = q ? rewardFor(q, c.id) : 0;
    s.chests.push({
      id: uid(),
      childId: c.id,
      coins: reward,
      ticketItemId: null,
      message: `「${q?.title ?? 'おてつだい'}」 ありがとう！`,
      createdAt: Date.now(),
    });
    c.totalQuests += 1;
    const today = todayKey();
    if (c.lastDoneDate !== today) {
      c.streak = c.lastDoneDate === yesterdayKey() ? c.streak + 1 : 1;
      c.lastDoneDate = today;
    }
    s.done.push({ childId: c.id, questId: sub.questId, date: today });
    if (s.done.length > 600) s.done.splice(0, s.done.length - 600);
    addLog(s, '✅', `${c.name}の「${q?.title ?? '?'}」を承認（宝箱 +${reward}コイン）`);
  });
}

export function approveAll(): void {
  getState().submissions.map((x) => x.id).forEach((id) => approveSubmission(id));
}

export function rejectSubmission(subId: string): void {
  setState((s) => {
    const sub = s.submissions.find((x) => x.id === subId);
    if (!sub) return;
    s.submissions = s.submissions.filter((x) => x.id !== subId);
    const c = findChild(s, sub.childId);
    const q = s.quests.find((x) => x.id === sub.questId);
    if (!c) return;
    addNotice(s, c.id, '💪', `「${q?.title ?? 'おてつだい'}」 もういちど やってみよう！ おうちのひとが まってるよ`);
    addLog(s, '↩️', `${c.name}の「${q?.title ?? '?'}」を差し戻し`);
  });
}

/* ---------------- chests ---------------- */

export interface ChestResult {
  coins: number;
  ticketName: string | null;
  ticketIcon: string | null;
  ticketCategory?: 'tablet' | 'real' | null;
  ticketMinutes?: number | null;
  message: string;
}

export function openChest(chestId: string): ChestResult | null {
  const s0 = getState();
  const ch = s0.chests.find((x) => x.id === chestId);
  if (!ch) return null;
  const item = ch.ticketItemId ? s0.shop.find((x) => x.id === ch.ticketItemId) : undefined;
  setState((s) => {
    const chest = s.chests.find((x) => x.id === chestId);
    if (!chest) return;
    s.chests = s.chests.filter((x) => x.id !== chestId);
    const c = findChild(s, chest.childId);
    if (!c) return;
    c.coins += chest.coins;
    if (chest.ticketItemId) {
      const it = s.shop.find((x) => x.id === chest.ticketItemId);
      if (it) grantShopItem(s, c, it);
    }
    addLog(s, '🎁', `${c.name}が宝箱を開けた（+${chest.coins}コイン${it0(item)}）`);
  });
  return {
    coins: ch.coins,
    ticketName: item?.name ?? null,
    ticketIcon: item?.icon ?? null,
    ticketCategory: (item?.category === 'tablet' || item?.category === 'real') ? item.category : null,
    ticketMinutes: item?.minutes ?? null,
    message: ch.message,
  };
}

function it0(item: ShopItem | undefined): string {
  return item ? ` / ${item.name}` : '';
}

/* ---------------- shop ---------------- */

export type BuyResult = 'ok' | 'nocoins' | 'owned' | 'error';

export function buyItem(childId: string, itemId: string): BuyResult {
  const s0 = getState();
  const c0 = findChild(s0, childId);
  const it0b = s0.shop.find((x) => x.id === itemId);
  if (!c0 || !it0b) return 'error';
  if (it0b.category === 'avatar' && it0b.avatarItemId && c0.ownedItems.includes(it0b.avatarItemId)) return 'owned';
  if (c0.coins < it0b.price) return 'nocoins';
  setState((s) => {
    const c = findChild(s, childId);
    const it = s.shop.find((x) => x.id === itemId);
    if (!c || !it) return;
    if (c.coins < it.price) return;
    c.coins -= it.price;
    grantShopItem(s, c, it);
    addLog(s, '🛒', `${c.name}が「${it.name}」を購入（-${it.price}コイン）`);
  });
  return 'ok';
}

/* ---------------- daily login bonus ---------------- */

/**
 * 毎日ログインボーナス（タブレット1時間券）の判定と配布
 * - 過去の未使用デイリーチケットは期限切れとして整理（たまらないようにする）
 * - 毎日1枚のみ配布し、今日すでに使用した場合は再配布しない
 * @returns 新規にチケットを付与した場合は true、すでに受取済みの場合は false
 */
export function claimDailyLoginBonus(childId: string): boolean {
  const today = todayKey();
  const s0 = getState();
  const c0 = findChild(s0, childId);
  if (!c0) return false;

  // すでに今日使用済みなら配布しない
  if (c0.lastDailyTicketUsedDate === today) {
    // 過去の未使用デイリーチケットがあればクリーンアップのみ行う
    if (s0.tickets.some((t) => t.childId === childId && t.isDaily && t.status === 'owned' && t.dateKey !== today)) {
      setState((s) => {
        s.tickets = s.tickets.filter((t) => !(t.childId === childId && t.isDaily && t.dateKey !== today));
      });
    }
    return false;
  }

  // すでに今日のデイリーチケットが存在している場合
  const hasTodayDailyTicket = s0.tickets.some(
    (t) => t.childId === childId && t.isDaily && t.dateKey === today
  );
  if (hasTodayDailyTicket) {
    // 過去の未使用チケットのみクリーンアップ
    if (s0.tickets.some((t) => t.childId === childId && t.isDaily && t.status === 'owned' && t.dateKey !== today)) {
      setState((s) => {
        s.tickets = s.tickets.filter((t) => !(t.childId === childId && t.isDaily && t.dateKey !== today));
      });
    }
    return false;
  }

  // 新規に今日のデイリーチケットを1枚発行
  setState((s) => {
    const c = findChild(s, childId);
    if (!c) return;

    // 1. 過去の古いデイリーチケットをすべて除去（使わなかったときにたまらないようにする）
    s.tickets = s.tickets.filter((t) => !(t.childId === childId && t.isDaily));

    // 2. 本日のデイリーチケットを1枚追加
    const dailyTicket: Ticket = {
      id: `daily-${c.id}-${today}`,
      childId: c.id,
      shopItemId: 'daily-tablet-60',
      name: '【まいにち】タブレット1時間券',
      icon: '📱',
      category: 'tablet',
      minutes: 60,
      status: 'owned',
      acquiredAt: Date.now(),
      usedAt: null,
      isDaily: true,
      dateKey: today,
    };
    s.tickets.unshift(dailyTicket);
    c.lastDailyLoginDate = today;

    addLog(s, '🎁', `${c.name}がまいにちログインボーナス（タブレット1時間券）を獲得！`);
    addNotice(s, c.id, '🎁', 'まいにちログインボーナス！タブレット1時間券がとどいたよ！');
  });

  return true;
}

/* ---------------- tickets & timer ---------------- */

export type RedeemResult = 'timer' | 'requested' | 'busy' | 'daily_limit' | 'error';

export function redeemTicket(ticketId: string): RedeemResult {
  const s0 = getState();
  const t0 = s0.tickets.find((x) => x.id === ticketId);
  if (!t0 || t0.status !== 'owned') return 'error';

  const today = todayKey();
  const c0 = findChild(s0, t0.childId);

  // デイリーチケットの場合の1日1回限定チェック
  if (t0.isDaily) {
    if (c0?.lastDailyTicketUsedDate === today) {
      return 'daily_limit';
    }
  }

  if (t0.category === 'tablet' && s0.timers.some((x) => x.childId === t0.childId)) return 'busy';

  setState((s) => {
    const t = s.tickets.find((x) => x.id === ticketId);
    if (!t) return;
    const c = findChild(s, t.childId);
    const now = Date.now();
    t.usedAt = now;
    if (t.isDaily && c) {
      c.lastDailyTicketUsedDate = today;
    }
    if (t.category === 'tablet') {
      t.status = 'used';
      s.timers.push({
        childId: t.childId,
        ticketId: t.id,
        name: t.name,
        minutes: t.minutes,
        startedAt: now,
        endsAt: now + t.minutes * 60 * 1000,
        alarmed: false,
      });
      addLog(s, '📱', `${c?.name ?? ''}がタブレット${t.minutes}分タイマーを開始`);
    } else {
      t.status = 'requested';
      addLog(s, '🍪', `${c?.name ?? ''}が「${t.name}」を使いたいそうです`);
    }
  });
  return t0.category === 'tablet' ? 'timer' : 'requested';
}

export interface FinishResult {
  bonus: boolean;
  diffMs: number;
  refundMinutes?: number;
}

export function pauseTimer(childId: string): void {
  setState((s) => {
    const t = s.timers.find((x) => x.childId === childId);
    if (!t || t.isPaused) return;
    const now = Date.now();
    const remainingMs = Math.max(0, t.endsAt - now);
    t.isPaused = true;
    t.pausedRemainingMs = remainingMs;
    const c = findChild(s, childId);
    addLog(s, '⏸️', `${c?.name ?? ''}がタイマーを一時停止（残り${Math.ceil(remainingMs / 60000)}分）`);
  });
}

export function resumeTimer(childId: string): void {
  setState((s) => {
    const t = s.timers.find((x) => x.childId === childId);
    if (!t || !t.isPaused) return;
    const now = Date.now();
    const remain = t.pausedRemainingMs ?? 0;
    t.isPaused = false;
    t.endsAt = now + remain;
    t.pausedRemainingMs = undefined;
    const c = findChild(s, childId);
    addLog(s, '▶️', `${c?.name ?? ''}がタイマーを再開（残り${Math.ceil(remain / 60000)}分）`);
  });
}

export function finishTimer(childId: string): FinishResult | null {
  const s0 = getState();
  const timer = s0.timers.find((x) => x.childId === childId);
  if (!timer) return null;

  const now = Date.now();
  const remainingMs = timer.isPaused ? (timer.pausedRemainingMs ?? 0) : Math.max(0, timer.endsAt - now);
  const remainingMinutes = Math.floor(remainingMs / 60000);

  const diff = timer.isPaused ? -(timer.pausedRemainingMs ?? 0) : now - timer.endsAt;
  const bonus = Math.abs(diff) <= BONUS_WINDOW_MS;

  setState((s) => {
    // タイマーを削除
    s.timers = s.timers.filter((x) => x.childId !== childId);
    const c = findChild(s, childId);
    if (!c) return;

    // もし1分以上残り時間がある場合、残り時間チケットとして所持品に返却！
    if (remainingMinutes >= 1) {
      const today = todayKey();
      const originTicket = s.tickets.find((t) => t.id === timer.ticketId);
      const isDaily = originTicket?.isDaily || timer.name.includes('まいにち');

      const refundTicket: Ticket = {
        id: `refund-${uid()}`,
        childId: c.id,
        shopItemId: originTicket?.shopItemId || 'refund-tablet',
        name: isDaily ? `【まいにち・のこり${remainingMinutes}分】タブレット券` : `【のこり${remainingMinutes}分】${timer.name.replace(/【.*?】/, '')}`,
        icon: '📱',
        category: 'tablet',
        minutes: remainingMinutes,
        status: 'owned',
        acquiredAt: now,
        usedAt: null,
        isDaily,
        dateKey: isDaily ? today : undefined,
      };

      s.tickets.unshift(refundTicket);
      addNotice(s, c.id, '🎫', `タブレットの のこりじかん（${remainingMinutes}ぷん）が チケットに もどったよ！`);
      addLog(s, '🎫', `${c.name}に残り時間チケット（${remainingMinutes}分）を返却しました`);
    }

    if (bonus) {
      c.coins += BONUS_COINS;
      addLog(s, '🌟', `${c.name}が時間を守ってタブレットを終了（おやくそくボーナス +${BONUS_COINS}）`);
    } else {
      const mins = Math.round(Math.abs(diff) / 60000);
      addLog(s, '📴', `${c.name}がタブレットを終了（予定より${mins}分${diff < 0 ? '早く' : '遅れて'}）`);
    }
  });

  return { bonus, diffMs: diff, refundMinutes: remainingMinutes >= 1 ? remainingMinutes : undefined };
}

export function stopTimerByParent(childId: string): void {
  setState((s) => {
    const c = findChild(s, childId);
    s.timers = s.timers.filter((x) => x.childId !== childId);
    if (c) {
      addNotice(s, c.id, '⏹️', 'おうちのひとが タイマーを とめたよ');
      addLog(s, '⏹️', `${c.name}のタイマーを停止`);
    }
  });
}

export function markAlarmed(childId: string): void {
  setState((s) => {
    const t = s.timers.find((x) => x.childId === childId);
    if (t) t.alarmed = true;
  });
}

export function confirmRealTicket(ticketId: string): void {
  setState((s) => {
    const t = s.tickets.find((x) => x.id === ticketId);
    if (!t) return;
    t.status = 'done';
    const c = findChild(s, t.childId);
    if (c) {
      addNotice(s, c.id, t.icon, `「${t.name}」 おうちのひとから もらえたね！`);
      addLog(s, '🤝', `${c.name}に「${t.name}」を渡しました`);
    }
  });
}

/* ---------------- parent gifts ---------------- */

export function giftBonus(childId: string, coins: number, shopItemId: string | null, message: string): void {
  setState((s) => {
    const c = findChild(s, childId);
    if (!c) return;
    s.chests.push({ id: uid(), childId, coins, ticketItemId: shopItemId, message, createdAt: Date.now() });
    const it = shopItemId ? s.shop.find((x) => x.id === shopItemId) : undefined;
    addLog(s, '🎁', `${c.name}へサプライズ（+${coins}コイン${it0(it)}）`);
  });
}

/* ---------------- gacha (ジュエルステージ＆ガチャ運営スタジオ版) ---------------- */

export type RarityNumber = 1 | 2 | 3;

export interface GachaPrize {
  kind: 'coord_set' | 'custom_part' | 'ticket' | 'shards' | 'coins';
  icon: string;
  label: string;
  rarity: RarityNumber;
  coins: number;
  shards: number;
  shopItemId: string | null;
  partId: string | null;
  coordSetId: string | null;
  partIds: string[];
  isPickup: boolean;
}

export interface GachaPullItemResult {
  prize: GachaPrize;
  initialOrbRarity: RarityNumber;
  isFakeoutPromotion: boolean;
  isDuplicate: boolean;
  refundCoins: number;
  refundShards: number;
  newlyUnlockedPartIds: string[];
}

export type GachaPullsOutcome =
  | {
      ok: true;
      pulls: GachaPullItemResult[];
      free: boolean;
      costPaid: number;
      highestRarity: RarityNumber;
      hasPromotion: boolean;
    }
  | { ok: false; reason: 'nocoins' | 'error' };

export function canFreeGacha(c: Child): boolean {
  const s = getState();
  if (!s.gachaConfig?.enableDailyFree) return false;
  return c.lastFreeGacha !== todayKey();
}

/**
 * パーツのガチャ設定を取得する。
 * 既存の自作パーツはデフォルトで isGachaOnly: false（初期所持）とし、
 * 管理画面でガチャ限定に切り替えたものだけロック対象とする。
 */
export function getEffectivePartGachaSetting(
  part: AvatarPart,
  gachaConfig?: GachaConfig,
): GachaPartSetting {
  const cfg = gachaConfig ?? getState().gachaConfig ?? DEFAULT_GACHA_CONFIG;
  const saved = cfg.partSettings?.[part.id];
  if (saved) return saved;

  const metaRarity = part.meta?.rarity;
  const defaultRarity: GachaRarity =
    metaRarity === 'SSR' || metaRarity === 'SR'
      ? 3
      : metaRarity === 'R'
      ? 2
      : 1;

  return {
    partId: part.id,
    isGachaOnly: false,
    rarity: defaultRarity,
    isPickup: false,
  };
}

/**
 * 子どもがその自作パーツを着用可能（所持済み、または初期所持パーツ）か判定する
 */
export function isCustomPartUnlockedForChild(
  part: AvatarPart,
  child: Child | undefined,
  gachaConfig?: GachaConfig,
): boolean {
  if (!child) return true;
  const setting = getEffectivePartGachaSetting(part, gachaConfig);
  if (!setting.isGachaOnly) return true;
  return child.ownedItems.includes(part.id);
}

function pickWeighted<T>(items: T[], getWeight: (item: T) => number): T {
  const total = items.reduce((sum, it) => sum + Math.max(1, getWeight(it)), 0);
  let r = Math.random() * total;
  for (const it of items) {
    const w = Math.max(1, getWeight(it));
    if (r < w) return it;
    r -= w;
  }
  return items[items.length - 1];
}

function rollTargetRarity(cfg: GachaConfig, guaranteeAtLeastRare: boolean): RarityNumber {
  const r3 = Math.max(0, cfg.rarityRates.r3);
  const r2 = Math.max(0, cfg.rarityRates.r2);
  const r1 = guaranteeAtLeastRare ? 0 : Math.max(0, cfg.rarityRates.r1);
  const total = r3 + r2 + r1;
  if (total <= 0) return guaranteeAtLeastRare ? 2 : 1;

  const roll = Math.random() * total;
  if (roll < r3) return 3;
  if (roll < r3 + r2) return 2;
  return guaranteeAtLeastRare ? 2 : 1;
}

function rollSinglePrizeForRarity(
  s: AppState,
  rarity: RarityNumber,
  catalogParts: AvatarPart[],
): GachaPrize {
  const cfg = s.gachaConfig ?? DEFAULT_GACHA_CONFIG;

  // ガチャ限定に設定されているパーツ群を抽出
  const gachaPartsForRarity = catalogParts.filter((p) => {
    const st = getEffectivePartGachaSetting(p, cfg);
    return st.isGachaOnly && st.rarity === rarity;
  });

  // ★3の場合はフルコーデセットも候補
  const coordSets = rarity === 3
    ? (cfg.coordSets ?? []).filter((cs) => cs.partIds.length > 0)
    : [];

  const hasCustomCandidates = gachaPartsForRarity.length > 0 || coordSets.length > 0;
  const partShare = rarity === 3
    ? cfg.avatarWeightPercent.r3
    : rarity === 2
    ? cfg.avatarWeightPercent.r2
    : cfg.avatarWeightPercent.r1;

  // 1. パーツ or フルコーデセット抽選（主役！）
  if (hasCustomCandidates && Math.random() * 100 < partShare) {
    if (rarity === 3 && coordSets.length > 0 && (gachaPartsForRarity.length === 0 || Math.random() < 0.55)) {
      const pickedSet = pickWeighted(coordSets, (cs) => cs.isPickup ? 220 : 100);
      return {
        kind: 'coord_set',
        icon: '👑',
        label: pickedSet.name,
        rarity: 3,
        coins: 0,
        shards: 0,
        shopItemId: null,
        partId: pickedSet.partIds[0] ?? null,
        coordSetId: pickedSet.id,
        partIds: [...pickedSet.partIds],
        isPickup: Boolean(pickedSet.isPickup),
      };
    }

    if (gachaPartsForRarity.length > 0) {
      const pickedPart = pickWeighted(gachaPartsForRarity, (p) => {
        const st = getEffectivePartGachaSetting(p, cfg);
        return st.isPickup ? 220 : 100;
      });
      const st = getEffectivePartGachaSetting(pickedPart, cfg);
      return {
        kind: 'custom_part',
        icon: '✨',
        label: pickedPart.name,
        rarity,
        coins: 0,
        shards: 0,
        shopItemId: null,
        partId: pickedPart.id,
        coordSetId: null,
        partIds: [pickedPart.id],
        isPickup: Boolean(st.isPickup),
      };
    }
  }

  // 2. 控えめ確率でのショップごほうびチケット or スタージュエル＋コイン
  const subRoll = Math.random() * 100;
  const enabledShopTickets = s.shop.filter((x) => cfg.enabledShopTicketIds.includes(x.id));

  if (rarity === 3) {
    const ticketPool = enabledShopTickets.filter((x) => x.price >= 120 || ['sh-dinner', 'sh-outing'].includes(x.id));
    const pool = ticketPool.length > 0 ? ticketPool : enabledShopTickets;
    if (pool.length > 0 && subRoll < cfg.ticketSubWeightPercent) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      return {
        kind: 'ticket',
        icon: t.icon,
        label: t.name,
        rarity: 3,
        coins: 0,
        shards: 0,
        shopItemId: t.id,
        partId: null,
        coordSetId: null,
        partIds: [],
        isPickup: false,
      };
    }
    return {
      kind: 'shards',
      icon: '💎',
      label: `スタージュエル×${cfg.subPrizeCoins.r3Shards} ＋ ${cfg.subPrizeCoins.r3Coins}コイン`,
      rarity: 3,
      coins: cfg.subPrizeCoins.r3Coins,
      shards: cfg.subPrizeCoins.r3Shards,
      shopItemId: null,
      partId: null,
      coordSetId: null,
      partIds: [],
      isPickup: false,
    };
  }

  if (rarity === 2) {
    const ticketPool = enabledShopTickets.filter((x) => x.price >= 40 && x.price < 150);
    const pool = ticketPool.length > 0 ? ticketPool : enabledShopTickets;
    if (pool.length > 0 && subRoll < cfg.ticketSubWeightPercent) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      return {
        kind: 'ticket',
        icon: t.icon,
        label: t.name,
        rarity: 2,
        coins: 0,
        shards: 0,
        shopItemId: t.id,
        partId: null,
        coordSetId: null,
        partIds: [],
        isPickup: false,
      };
    }
    return {
      kind: 'shards',
      icon: '💎',
      label: `スタージュエル×${cfg.subPrizeCoins.r2Shards} ＋ ${cfg.subPrizeCoins.r2Coins}コイン`,
      rarity: 2,
      coins: cfg.subPrizeCoins.r2Coins,
      shards: cfg.subPrizeCoins.r2Shards,
      shopItemId: null,
      partId: null,
      coordSetId: null,
      partIds: [],
      isPickup: false,
    };
  }

  // ★1 N
  const ticketPool1 = enabledShopTickets.filter((x) => x.price <= 60);
  const pool1 = ticketPool1.length > 0 ? ticketPool1 : enabledShopTickets;
  if (pool1.length > 0 && subRoll < Math.min(25, cfg.ticketSubWeightPercent)) {
    const t = pool1[Math.floor(Math.random() * pool1.length)];
    return {
      kind: 'ticket',
      icon: t.icon,
      label: t.name,
      rarity: 1,
      coins: 0,
      shards: 0,
      shopItemId: t.id,
      partId: null,
      coordSetId: null,
      partIds: [],
      isPickup: false,
    };
  }
  if (subRoll < 70) {
    return {
      kind: 'shards',
      icon: '💎',
      label: `スタージュエル×${cfg.subPrizeCoins.r1Shards} ＋ ${cfg.subPrizeCoins.r1Coins}コイン`,
      rarity: 1,
      coins: cfg.subPrizeCoins.r1Coins,
      shards: cfg.subPrizeCoins.r1Shards,
      shopItemId: null,
      partId: null,
      coordSetId: null,
      partIds: [],
      isPickup: false,
    };
  }
  return {
    kind: 'coins',
    icon: '🪙',
    label: `${cfg.subPrizeCoins.r1Coins}コイン`,
    rarity: 1,
    coins: cfg.subPrizeCoins.r1Coins,
    shards: 0,
    shopItemId: null,
    partId: null,
    coordSetId: null,
    partIds: [],
    isPickup: false,
  };
}

/**
 * 1回または10連ガチャを実行する
 */
export function spinGachaPulls(
  childId: string,
  count: 1 | 10,
  catalogParts: AvatarPart[],
): GachaPullsOutcome {
  const s0 = getState();
  const c0 = findChild(s0, childId);
  if (!c0) return { ok: false, reason: 'error' };

  const cfg = s0.gachaConfig ?? DEFAULT_GACHA_CONFIG;
  const free = count === 1 && canFreeGacha(c0);
  const cost = free ? 0 : count === 10 ? cfg.tenPullCost : cfg.singleCost;

  if (!free && c0.coins < cost) {
    return { ok: false, reason: 'nocoins' };
  }

  const results: GachaPullItemResult[] = [];

  setState((s) => {
    const c = findChild(s, childId);
    if (!c) return;
    if (!free && c.coins < cost) return;

    if (free) c.lastFreeGacha = todayKey();
    else c.coins -= cost;

    let hasRareOrAbove = false;

    for (let i = 0; i < count; i++) {
      // 10連の最後の1枠でまだ★2以上が出ていなければ★2以上確定！
      const guaranteeRare = count === 10 && i === 9 && !hasRareOrAbove;
      const rarity = rollTargetRarity(cfg, guaranteeRare);
      if (rarity >= 2) hasRareOrAbove = true;

      const prize = rollSinglePrizeForRarity(s, rarity, catalogParts);

      // 昇格演出（フェイクアウト）判定
      let initialOrbRarity: RarityNumber = rarity;
      let isFakeoutPromotion = false;
      if (rarity === 3 && Math.random() < 0.45) {
        initialOrbRarity = 2; // 金オーブに見せかけて虹へ昇格！
        isFakeoutPromotion = true;
      } else if (rarity === 2 && Math.random() < 0.25) {
        initialOrbRarity = 1; // 青オーブに見せかけて金へ昇格！
        isFakeoutPromotion = true;
      }

      let isDuplicate = false;
      let refundCoins = 0;
      let refundShards = 0;
      const newlyUnlockedPartIds: string[] = [];

      if (prize.kind === 'coord_set' || prize.kind === 'custom_part') {
        const targetIds = prize.partIds;
        let allOwned = true;
        for (const pid of targetIds) {
          if (!c.ownedItems.includes(pid)) {
            c.ownedItems.push(pid);
            newlyUnlockedPartIds.push(pid);
            allOwned = false;
          }
        }
        if (allOwned) {
          isDuplicate = true;
          refundShards =
            rarity === 3
              ? cfg.duplicateRefund.r3Shards
              : rarity === 2
              ? cfg.duplicateRefund.r2Shards
              : cfg.duplicateRefund.r1Shards;
          refundCoins =
            rarity === 3
              ? cfg.duplicateRefund.r3Coins
              : rarity === 2
              ? cfg.duplicateRefund.r2Coins
              : cfg.duplicateRefund.r1Coins;
          c.starShards = (c.starShards ?? 0) + refundShards;
          c.coins += refundCoins;
        }
      } else if (prize.kind === 'ticket' && prize.shopItemId) {
        const it = s.shop.find((x) => x.id === prize.shopItemId);
        if (it) grantShopItem(s, c, it);
      } else if (prize.kind === 'shards') {
        c.starShards = (c.starShards ?? 0) + prize.shards;
        c.coins += prize.coins;
      } else if (prize.kind === 'coins') {
        c.coins += prize.coins;
      }

      results.push({
        prize,
        initialOrbRarity,
        isFakeoutPromotion,
        isDuplicate,
        refundCoins,
        refundShards,
        newlyUnlockedPartIds,
      });
    }

    const best = results.reduce((max, r) => (r.prize.rarity > max ? r.prize.rarity : max), 1 as RarityNumber);
    const summaryLabel =
      count === 10
        ? `10連ジュエルガチャ（最高★${best}・「${results[0]?.prize.label}」ほか）`
        : `ジュエルガチャ${free ? '（無料）' : ''}で「${results[0]?.prize.label}」`;
    addLog(s, '💎', `${c.name}が${summaryLabel}をゲット！`);
  });

  if (results.length === 0) return { ok: false, reason: 'error' };

  const highestRarity = results.reduce(
    (max, r) => (r.prize.rarity > max ? r.prize.rarity : max),
    1 as RarityNumber,
  );
  const hasPromotion = results.some((r) => r.isFakeoutPromotion);

  return {
    ok: true,
    pulls: results,
    free,
    costPaid: cost,
    highestRarity,
    hasPromotion,
  };
}

/**
 * 旧互換の1回ガチャラッパー
 */
export function spinGacha(childId: string, catalogParts: AvatarPart[] = []): GachaPullsOutcome {
  return spinGachaPulls(childId, 1, catalogParts);
}

/* ---------------- スタージュエル交換所（天井） ---------------- */

export function exchangeGachaItem(
  childId: string,
  target: { type: 'coord_set' | 'part'; id: string },
  catalogParts: AvatarPart[],
): 'ok' | 'not_enough' | 'owned' | 'error' {
  const s0 = getState();
  const c0 = findChild(s0, childId);
  if (!c0) return 'error';
  const cfg = s0.gachaConfig ?? DEFAULT_GACHA_CONFIG;

  if (target.type === 'coord_set') {
    const cs = cfg.coordSets.find((x) => x.id === target.id);
    if (!cs || cs.partIds.length === 0) return 'error';
    const allOwned = cs.partIds.every((pid) => c0.ownedItems.includes(pid));
    if (allOwned) return 'owned';
    const cost = cs.exchangeCost ?? cfg.exchangeCosts.r3Set;
    if ((c0.starShards ?? 0) < cost) return 'not_enough';

    setState((s) => {
      const c = findChild(s, childId);
      if (!c) return;
      c.starShards = (c.starShards ?? 0) - cost;
      for (const pid of cs.partIds) {
        if (!c.ownedItems.includes(pid)) c.ownedItems.push(pid);
      }
      addLog(s, '💎', `${c.name}がスタージュエル${cost}個でフルコーデ「${cs.name}」を交換！`);
      addNotice(s, c.id, '💎', `スタージュエルでフルコーデ「${cs.name}」を手に入れたよ！`);
    });
    return 'ok';
  }

  const part = catalogParts.find((p) => p.id === target.id);
  if (!part) return 'error';
  const st = getEffectivePartGachaSetting(part, cfg);
  if (!st.isGachaOnly || c0.ownedItems.includes(part.id)) return 'owned';

  const cost =
    st.exchangeCost ??
    (st.rarity === 3
      ? cfg.exchangeCosts.r3Part
      : st.rarity === 2
      ? cfg.exchangeCosts.r2Part
      : cfg.exchangeCosts.r1Part);

  if ((c0.starShards ?? 0) < cost) return 'not_enough';

  setState((s) => {
    const c = findChild(s, childId);
    if (!c) return;
    c.starShards = (c.starShards ?? 0) - cost;
    if (!c.ownedItems.includes(part.id)) c.ownedItems.push(part.id);
    addLog(s, '💎', `${c.name}がスタージュエル${cost}個で「${part.name}」を交換！`);
    addNotice(s, c.id, '💎', `スタージュエルで「${part.name}」を手に入れたよ！`);
  });

  return 'ok';
}

/* ---------------- 親用：ガチャ運営スタジオ管理アクション ---------------- */

export function updateGachaConfig(patch: Partial<GachaConfig>): void {
  setState((s) => {
    s.gachaConfig = {
      ...(s.gachaConfig ?? DEFAULT_GACHA_CONFIG),
      ...patch,
    };
  });
}

export function setGachaPartSetting(
  partId: string,
  patch: Partial<Omit<GachaPartSetting, 'partId'>>,
  defaultFallback?: AvatarPart,
): void {
  setState((s) => {
    if (!s.gachaConfig) s.gachaConfig = { ...DEFAULT_GACHA_CONFIG };
    const prev = defaultFallback
      ? getEffectivePartGachaSetting(defaultFallback, s.gachaConfig)
      : s.gachaConfig.partSettings[partId] ?? {
          partId,
          isGachaOnly: false,
          rarity: 1 as GachaRarity,
          isPickup: false,
        };
    s.gachaConfig.partSettings[partId] = {
      ...prev,
      ...patch,
      partId,
    };
  });
}

export function saveGachaCoordSet(
  coordSet: Omit<GachaCoordSet, 'id' | 'createdAt'> & { id?: string },
): void {
  setState((s) => {
    if (!s.gachaConfig) s.gachaConfig = { ...DEFAULT_GACHA_CONFIG };
    const existingIdx = coordSet.id
      ? s.gachaConfig.coordSets.findIndex((x) => x.id === coordSet.id)
      : -1;
    if (existingIdx >= 0 && coordSet.id) {
      s.gachaConfig.coordSets[existingIdx] = {
        ...s.gachaConfig.coordSets[existingIdx],
        name: coordSet.name.trim() || 'スペシャルコーデ',
        description: (coordSet.description ?? '').trim(),
        partIds: [...coordSet.partIds],
        isPickup: Boolean(coordSet.isPickup),
      };
    } else {
      s.gachaConfig.coordSets.push({
        id: coordSet.id || uid(),
        name: coordSet.name.trim() || 'スペシャルコーデ',
        description: (coordSet.description ?? '').trim(),
        partIds: [...coordSet.partIds],
        isPickup: Boolean(coordSet.isPickup),
        createdAt: Date.now(),
      });
    }
  });
}

export function deleteGachaCoordSet(coordSetId: string): void {
  setState((s) => {
    if (!s.gachaConfig) return;
    s.gachaConfig.coordSets = s.gachaConfig.coordSets.filter((x) => x.id !== coordSetId);
  });
}

/**
 * ガチャで当たったパーツ（またはフルコーデ一式）をその場で子どものアバターに着用させる
 */
export function equipGachaPartsToChild(
  childId: string,
  partIds: string[],
  catalogParts: AvatarPart[],
): void {
  setState((s) => {
    const c = findChild(s, childId);
    if (!c) return;
    const prevEquipped = { ...(c.avatarStudio?.equipped ?? {}) };
    const prevAdjustments = { ...(c.avatarStudio?.adjustments ?? {}) };
    let prevHands = Array.isArray(c.avatarStudio?.hand_items)
      ? [...c.avatarStudio.hand_items]
      : prevEquipped.hand_item
      ? [prevEquipped.hand_item]
      : [];

    for (const pid of partIds) {
      const part = catalogParts.find((p) => p.id === pid);
      if (!part) continue;
      if (part.category === 'hand_item') {
        if (!prevHands.includes(part.id)) {
          prevHands = [...prevHands, part.id].slice(-3);
        }
        prevEquipped.hand_item = prevHands[prevHands.length - 1] ?? part.id;
      } else {
        prevEquipped[part.category] = part.id;
      }
    }

    c.avatarStudio = {
      equipped: prevEquipped,
      adjustments: prevAdjustments,
      hand_items: prevHands,
    };
  });
  flushSync();
}


/* ---------------- avatar ---------------- */

export function updateAvatar(childId: string, slot: AvatarSlot, value: string): void {
  setState((s) => {
    const c = findChild(s, childId);
    if (!c) return;
    const opt = findOption(value);
    if (opt && (opt.locked || opt.gachaOnly) && !c.ownedItems.includes(opt.id)) return;
    c.avatar[slot] = value;
  });
}

export function updateChildAvatarStudio(
  childId: string,
  equipped: Partial<Record<import('./features/avatar').AvatarCategory, string | null>>,
  adjustments: import('./features/avatar').LayerAdjustmentMap,
  handItems?: string[],
): void {
  setState((s) => {
    const c = findChild(s, childId);
    if (!c) return;
    const finalHandItems =
      handItems !== undefined
        ? handItems
        : equipped.hand_item
        ? [equipped.hand_item]
        : [];
    c.avatarStudio = {
      equipped,
      adjustments,
      hand_items: finalHandItems,
    };
  });
  flushSync();
}

/** 親が工房で素体を作成・更新した際に全子どもの素体を一括更新する */
export function updateAllChildrenAvatarBody(bodyPartId: string): void {
  const defaultMap = toEquippedIdMap(DEFAULT_EQUIPPED);
  setState((s) => {
    for (const c of s.children) {
      if (!c.avatarStudio) {
        c.avatarStudio = {
          equipped: {
            ...defaultMap,
            body: bodyPartId,
          },
          adjustments: {},
        };
      } else {
        c.avatarStudio.equipped = {
          ...defaultMap,
          ...c.avatarStudio.equipped,
          body: bodyPartId,
        };
      }
    }
  });
  flushSync();
}

/** 親が工房で設定したアバター（装備＆微調整）を全子どもに完全同期する */
export function syncParentStudioAvatarToChildren(
  equipped: Partial<Record<import('./features/avatar').AvatarCategory, string | null>>,
  adjustments: import('./features/avatar').LayerAdjustmentMap,
  handItems?: string[],
): void {
  setState((s) => {
    for (const c of s.children) {
      c.avatarStudio = {
        equipped: { ...equipped },
        adjustments: { ...adjustments },
        hand_items: handItems ?? (equipped.hand_item ? [equipped.hand_item] : []),
      };
    }
  });
  flushSync();
}

export function dismissNotice(id: string): void {
  setState((s) => {
    s.notices = s.notices.filter((n) => n.id !== id);
  });
}

/* ---------------- admin: quests ---------------- */

export function saveQuest(q: Quest): void {
  setState((s) => {
    if (s.deletedQuestIds) {
      s.deletedQuestIds = s.deletedQuestIds.filter((id) => id !== q.id);
    }
    const i = s.quests.findIndex((x) => x.id === q.id);
    if (i >= 0) s.quests[i] = q;
    else s.quests.push(q);
    addLog(s, '📝', `お手伝い「${q.title}」を${i >= 0 ? '更新' : '追加'}`);
  });
  flushSync();
}

export function deleteQuest(id: string): void {
  setState((s) => {
    if (!s.deletedQuestIds) s.deletedQuestIds = [];
    if (!s.deletedQuestIds.includes(id)) {
      s.deletedQuestIds.push(id);
    }
    const q = s.quests.find((x) => x.id === id);
    s.quests = s.quests.filter((x) => x.id !== id);
    s.submissions = s.submissions.filter((x) => x.questId !== id);
    if (q) addLog(s, '🗑️', `お手伝い「${q.title}」を削除`);
  });
  flushSync();
}

/* ---------------- admin: shop ---------------- */

export function saveShopItem(it: ShopItem): void {
  setState((s) => {
    if (s.deletedShopItemIds) {
      s.deletedShopItemIds = s.deletedShopItemIds.filter((id) => id !== it.id);
    }
    const i = s.shop.findIndex((x) => x.id === it.id);
    if (i >= 0) s.shop[i] = it;
    else s.shop.push(it);
    addLog(s, '🏪', `商品「${it.name}」を${i >= 0 ? '更新' : '追加'}`);
  });
  flushSync();
}

export function deleteShopItem(id: string): void {
  setState((s) => {
    if (!s.deletedShopItemIds) s.deletedShopItemIds = [];
    if (!s.deletedShopItemIds.includes(id)) {
      s.deletedShopItemIds.push(id);
    }
    const it = s.shop.find((x) => x.id === id);
    s.shop = s.shop.filter((x) => x.id !== id);
    if (it) addLog(s, '🗑️', `商品「${it.name}」を削除`);
  });
  flushSync();
}

/* ---------------- admin: children ---------------- */

export function saveChild(c: Child): void {
  setState((s) => {
    // 意図的に削除されたIDリストにあれば解除
    if (s.deletedChildIds) {
      s.deletedChildIds = s.deletedChildIds.filter((id) => id !== c.id);
    }
    const i = s.children.findIndex((x) => x.id === c.id);
    if (i >= 0) {
      const prevName = s.children[i].name;
      s.children[i] = c;
      if (prevName !== c.name) {
        addLog(s, '👤', `子どもの名前を「${prevName}」から「${c.name}」に変更`);
      } else {
        addLog(s, '👤', `${c.name}のプロフィールを更新`);
      }
    } else {
      s.children.push(c);
      addLog(s, '👶', `新しい子ども「${c.name}」を追加`);
    }
  });
  // クラウドへ即座に送信（デバウンス待機なし）
  flushSync();
}

export function deleteChild(id: string): void {
  setState((s) => {
    if (!s.deletedChildIds) s.deletedChildIds = [];
    if (!s.deletedChildIds.includes(id)) {
      s.deletedChildIds.push(id);
    }
    const c = findChild(s, id);
    s.children = s.children.filter((x) => x.id !== id);
    s.quests.forEach((q) => {
      q.assignedTo = q.assignedTo.filter((x) => x !== id);
      delete q.rewardOverrides[id];
    });
    s.submissions = s.submissions.filter((x) => x.childId !== id);
    s.chests = s.chests.filter((x) => x.childId !== id);
    s.tickets = s.tickets.filter((x) => x.childId !== id);
    s.timers = s.timers.filter((x) => x.childId !== id);
    s.notices = s.notices.filter((x) => x.childId !== id);
    s.done = s.done.filter((x) => x.childId !== id);
    if (c) addLog(s, '🗑️', `${c.name}を削除`);
  });
  // クラウドへ即座に送信（デバウンス待機なし）
  flushSync();
}

export function setParentPin(pin: string): void {
  setState((s) => {
    s.parentPin = pin;
    addLog(s, '🔐', '保護者パスコードを変更');
  });
}

export function resetAllData(): void {
  setState(() => createInitialState());
}

/* ---------------- reorder items ---------------- */

export function reorderQuests(fromIndex: number, toIndex: number): void {
  setState((s) => {
    if (fromIndex < 0 || fromIndex >= s.quests.length || toIndex < 0 || toIndex >= s.quests.length) return;
    const item = s.quests.splice(fromIndex, 1)[0];
    s.quests.splice(toIndex, 0, item);
  });
}

export function reorderShopItems(fromIndex: number, toIndex: number): void {
  setState((s) => {
    if (fromIndex < 0 || fromIndex >= s.shop.length || toIndex < 0 || toIndex >= s.shop.length) return;
    const item = s.shop.splice(fromIndex, 1)[0];
    s.shop.splice(toIndex, 0, item);
  });
}

/* ---------------- notification settings ---------------- */

export function updateNotificationSettings(settings: Partial<NotificationSettings>): void {
  setState((s) => {
    s.notificationSettings = {
      ...s.notificationSettings,
      ...settings,
    };
  });
}

