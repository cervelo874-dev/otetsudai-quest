import { getState, setState, flushSync } from './store';
import type { AppState, AvatarSlot, Child, NotificationSettings, Quest, ShopItem, Ticket } from './types';
import { uid, todayKey, yesterdayKey } from './utils';
import { BONUS_COINS, BONUS_WINDOW_MS, GACHA_COST, rewardFor } from './logic';
import { AVATAR_OPTIONS, findOption, isUnlockableAvatarItem, isDefaultAvatarItem, getShardCost } from './avatar';
import { createInitialState } from './presets';
import { DEFAULT_EQUIPPED, toEquippedIdMap } from './features/avatar';

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

/* ---------------- gacha (アップグレード版) ---------------- */

export type RarityNumber = 1 | 2 | 3;

export interface GachaPrize {
  kind: 'coins' | 'ticket' | 'avatar' | 'shards';
  icon: string;
  label: string;
  rarity: RarityNumber;
  coins: number;
  shards: number;
  shopItemId: string | null;
  avatarItemId: string | null;
}

export type GachaOutcome =
  | {
      ok: true;
      prize: GachaPrize;
      free: boolean;
      isDuplicate: boolean;
      refundCoins: number;
      refundShards: number;
    }
  | { ok: false; reason: 'nocoins' | 'error' };

export function canFreeGacha(c: Child): boolean {
  return c.lastFreeGacha !== todayKey();
}

function shardsPrize(shards: number, coins: number, rarity: RarityNumber, label: string): GachaPrize {
  return { kind: 'shards', icon: '🌟', label, rarity, coins, shards, shopItemId: null, avatarItemId: null };
}

function rollPrize(s: AppState): GachaPrize {
  const r = Math.random() * 100;

  // ---------------- ★3 レジェンド (10%: 90 <= r < 100) ----------------
  if (r >= 90) {
    const sub = Math.random() * 100;

    // 1. レジェンドアバターアイテム直撃 (60%)
    if (sub < 60) {
      const legendAvatarOptions = AVATAR_OPTIONS.filter((o) => o.rarity === 3 && isUnlockableAvatarItem(o));
      if (legendAvatarOptions.length > 0) {
        const pick = legendAvatarOptions[Math.floor(Math.random() * legendAvatarOptions.length)];
        return {
          kind: 'avatar',
          icon: pick.icon,
          label: pick.name,
          rarity: 3,
          coins: 0,
          shards: 0,
          shopItemId: null,
          avatarItemId: pick.id,
        };
      }
    }

    // 2. 🌟 ほしのかけら 4個 ＋ 50コイン (25%)
    if (sub < 85) {
      return shardsPrize(4, 50, 3, '★3 ほしのかけら×4 ＋ 50コイン！');
    }

    // 3. レジェンドチケット (15%)
    const dinner = s.shop.find((x) => x.id === 'sh-dinner');
    if (dinner) {
      return { kind: 'ticket', icon: dinner.icon, label: dinner.name, rarity: 3, coins: 0, shards: 0, shopItemId: dinner.id, avatarItemId: null };
    }
    const outing = s.shop.find((x) => x.id === 'sh-outing');
    if (outing) {
      return { kind: 'ticket', icon: outing.icon, label: outing.name, rarity: 3, coins: 0, shards: 0, shopItemId: outing.id, avatarItemId: null };
    }

    return shardsPrize(4, 50, 3, '★3 ほしのかけら×4 ＋ 50コイン！');
  }

  // ---------------- ★2 レア (35%: 55 <= r < 90) ----------------
  if (r >= 55) {
    const sub = Math.random() * 100;

    // 1. レアアバターアイテム直撃 (45%)
    if (sub < 45) {
      const rareAvatarOptions = AVATAR_OPTIONS.filter((o) => o.rarity === 2 && isUnlockableAvatarItem(o));
      if (rareAvatarOptions.length > 0) {
        const pick = rareAvatarOptions[Math.floor(Math.random() * rareAvatarOptions.length)];
        return {
          kind: 'avatar',
          icon: pick.icon,
          label: `★2 ${pick.name}`,
          rarity: 2,
          coins: 0,
          shards: 0,
          shopItemId: null,
          avatarItemId: pick.id,
        };
      }
    }

    // 2. 🌟 ほしのかけら 2個 ＋ 20コイン (35%)
    if (sub < 80) {
      return shardsPrize(2, 20, 2, '★2 ほしのかけら×2 ＋ 20コイン！');
    }

    // 3. レアチケット (20%)
    const candidates = s.shop.filter((x) => ['sh-tab15', 'sh-snack-up', 'sh-book'].includes(x.id));
    if (candidates.length > 0) {
      const t = candidates[Math.floor(Math.random() * candidates.length)];
      return { kind: 'ticket', icon: t.icon, label: `★2 ${t.name}`, rarity: 2, coins: 0, shards: 0, shopItemId: t.id, avatarItemId: null };
    }

    return shardsPrize(2, 20, 2, '★2 ほしのかけら×2 ＋ 20コイン！');
  }

  // ---------------- ★1 ノーマル (55%: 0 <= r < 55) ----------------
  const sub = Math.random() * 100;

  // 1. 🌟 ほしのかけら 1個 ＋ 15コイン (65%)
  if (sub < 65) {
    return shardsPrize(1, 15, 1, '★1 ほしのかけら×1 ＋ 15コイン');
  }

  // 2. ノーマルアバターアイテム (20%)
  if (sub < 85) {
    const normalAvatarOptions = AVATAR_OPTIONS.filter((o) => o.rarity === 1 && isUnlockableAvatarItem(o));
    if (normalAvatarOptions.length > 0) {
      const pick = normalAvatarOptions[Math.floor(Math.random() * normalAvatarOptions.length)];
      return {
        kind: 'avatar',
        icon: pick.icon,
        label: `★1 ${pick.name}`,
        rarity: 1,
        coins: 0,
        shards: 0,
        shopItemId: null,
        avatarItemId: pick.id,
      };
    }
  }

  // 3. プチチケット (15%)
  const candidates = s.shop.filter((x) => ['sh-tab10', 'sh-snack'].includes(x.id));
  if (candidates.length > 0) {
    const t = candidates[Math.floor(Math.random() * candidates.length)];
    return { kind: 'ticket', icon: t.icon, label: `★1 ${t.name}`, rarity: 1, coins: 0, shards: 0, shopItemId: t.id, avatarItemId: null };
  }

  return shardsPrize(1, 15, 1, '★1 ほしのかけら×1 ＋ 15コイン');
}

export function spinGacha(childId: string): GachaOutcome {
  const s0 = getState();
  const c0 = findChild(s0, childId);
  if (!c0) return { ok: false, reason: 'error' };
  const free = canFreeGacha(c0);
  if (!free && c0.coins < GACHA_COST) return { ok: false, reason: 'nocoins' };

  const prize = rollPrize(s0);
  let isDuplicate = false;
  let refundCoins = 0;
  let refundShards = 0;

  setState((s) => {
    const c = findChild(s, childId);
    if (!c) return;
    if (!free && c.coins < GACHA_COST) return;

    if (free) c.lastFreeGacha = todayKey();
    else c.coins -= GACHA_COST;

    if (prize.kind === 'shards') {
      c.starShards = (c.starShards ?? 0) + prize.shards;
      c.coins += prize.coins;
    } else if (prize.kind === 'coins') {
      c.coins += prize.coins;
    } else if (prize.kind === 'ticket' && prize.shopItemId) {
      const it = s.shop.find((x) => x.id === prize.shopItemId);
      if (it) grantShopItem(s, c, it);
    } else if (prize.kind === 'avatar' && prize.avatarItemId) {
      if (!c.ownedItems.includes(prize.avatarItemId)) {
        c.ownedItems.push(prize.avatarItemId);
      } else {
        // ダブり救済ロジック：ほしのかけら＋コインに変換！
        isDuplicate = true;
        refundShards = prize.rarity === 3 ? 3 : prize.rarity === 2 ? 2 : 1;
        refundCoins = prize.rarity === 3 ? 30 : prize.rarity === 2 ? 15 : 10;
        c.starShards = (c.starShards ?? 0) + refundShards;
        c.coins += refundCoins;
      }
    }

    if (isDuplicate) {
      addLog(s, '🎰', `${c.name}がガチャ${free ? '（無料）' : ''}で「${prize.label}」（もっているので🌟ほしのかけら+${refundShards}個＆+${refundCoins}コインにへんかん✨）`);
    } else if (prize.kind === 'shards') {
      addLog(s, '🎰', `${c.name}がガチャ${free ? '（無料）' : ''}で「🌟ほしのかけら×${prize.shards} ＋ ${prize.coins}コイン」をゲット！`);
    } else {
      addLog(s, '🎰', `${c.name}がガチャ${free ? '（無料）' : ''}で「${prize.label}」をゲット！`);
    }
  });

  return { ok: true, prize, free, isDuplicate, refundCoins, refundShards };
}

/* ---------------- ほしのかけら交換所 ---------------- */

export function exchangeStarShards(
  childId: string,
  avatarItemId: string
): 'ok' | 'not_enough' | 'owned' | 'default' | 'error' {
  const s0 = getState();
  const c0 = findChild(s0, childId);
  if (!c0) return 'error';
  if (c0.ownedItems.includes(avatarItemId)) return 'owned';

  const opt = findOption(avatarItemId);
  if (!opt) return 'error';

  // デフォルトで最初から持っているアイテムは交換不要
  if (isDefaultAvatarItem(opt)) return 'default';

  const cost = getShardCost(opt.rarity);
  if ((c0.starShards ?? 0) < cost) return 'not_enough';

  setState((s) => {
    const c = findChild(s, childId);
    if (!c) return;
    c.starShards = (c.starShards ?? 0) - cost;
    c.ownedItems.push(avatarItemId);
    addLog(s, '🌟', `${c.name}が🌟ほしのかけら${cost}個で「${opt.name}」を交換！`);
    addNotice(s, c.id, '🌟', `ほしのかけらで「${opt.name}」を手に入れたよ！`);
  });

  return 'ok';
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

