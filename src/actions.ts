import { getState, setState } from './store';
import type { AppState, AvatarSlot, Child, Quest, ShopItem } from './types';
import { uid, todayKey, yesterdayKey } from './utils';
import { BONUS_COINS, BONUS_WINDOW_MS, GACHA_COST, rewardFor } from './logic';
import { AVATAR_OPTIONS, findOption } from './avatar';
import { createInitialState } from './presets';

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
  return { coins: ch.coins, ticketName: item?.name ?? null, ticketIcon: item?.icon ?? null, message: ch.message };
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
    c.coins -= it.price;
    grantShopItem(s, c, it);
    addLog(s, '🛒', `${c.name}が「${it.name}」を購入（-${it.price}コイン）`);
  });
  return 'ok';
}

/* ---------------- tickets & timer ---------------- */

export type RedeemResult = 'timer' | 'requested' | 'busy' | 'error';

export function redeemTicket(ticketId: string): RedeemResult {
  const s0 = getState();
  const t0 = s0.tickets.find((x) => x.id === ticketId);
  if (!t0 || t0.status !== 'owned') return 'error';
  if (t0.category === 'tablet' && s0.timers.some((x) => x.childId === t0.childId)) return 'busy';
  setState((s) => {
    const t = s.tickets.find((x) => x.id === ticketId);
    if (!t) return;
    const c = findChild(s, t.childId);
    const now = Date.now();
    t.usedAt = now;
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
}

export function finishTimer(childId: string): FinishResult | null {
  const s0 = getState();
  const timer = s0.timers.find((x) => x.childId === childId);
  if (!timer) return null;
  const diff = Date.now() - timer.endsAt;
  const bonus = Math.abs(diff) <= BONUS_WINDOW_MS;
  setState((s) => {
    s.timers = s.timers.filter((x) => x.childId !== childId);
    const c = findChild(s, childId);
    if (!c) return;
    if (bonus) {
      c.coins += BONUS_COINS;
      addLog(s, '🌟', `${c.name}が時間を守ってタブレットを終了（おやくそくボーナス +${BONUS_COINS}）`);
    } else {
      const mins = Math.round(Math.abs(diff) / 60000);
      addLog(s, '📴', `${c.name}がタブレットを終了（予定より${mins}分${diff < 0 ? '早く' : '遅れて'}）`);
    }
  });
  return { bonus, diffMs: diff };
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
  kind: 'coins' | 'ticket' | 'avatar';
  icon: string;
  label: string;
  rarity: RarityNumber;
  coins: number;
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
    }
  | { ok: false; reason: 'nocoins' | 'error' };

export function canFreeGacha(c: Child): boolean {
  return c.lastFreeGacha !== todayKey();
}

function coinPrize(coins: number, rarity: RarityNumber, label: string): GachaPrize {
  return { kind: 'coins', icon: '🪙', label, rarity, coins, shopItemId: null, avatarItemId: null };
}

function rollPrize(s: AppState): GachaPrize {
  const r = Math.random() * 100;

  // ---------------- ★3 レジェンド (10%: 90 <= r < 100) ----------------
  if (r >= 90) {
    const sub = Math.random() * 100;
    // 200コイン (黄金ジャックポット)
    if (sub < 25) {
      return coinPrize(200, 3, '★3 黄金ジャックポット！(200コイン)');
    }
    // レジェンドチケット
    if (sub < 45) {
      const dinner = s.shop.find((x) => x.id === 'sh-dinner');
      if (dinner) {
        return { kind: 'ticket', icon: dinner.icon, label: dinner.name, rarity: 3, coins: 0, shopItemId: dinner.id, avatarItemId: null };
      }
      const outing = s.shop.find((x) => x.id === 'sh-outing');
      if (outing) {
        return { kind: 'ticket', icon: outing.icon, label: outing.name, rarity: 3, coins: 0, shopItemId: outing.id, avatarItemId: null };
      }
    }
    // レジェンドアバターアイテム
    const legendAvatarOptions = AVATAR_OPTIONS.filter((o) => o.rarity === 3);
    if (legendAvatarOptions.length > 0) {
      const pick = legendAvatarOptions[Math.floor(Math.random() * legendAvatarOptions.length)];
      return {
        kind: 'avatar',
        icon: pick.icon,
        label: pick.name,
        rarity: 3,
        coins: 0,
        shopItemId: null,
        avatarItemId: pick.id,
      };
    }
    return coinPrize(200, 3, '★3 黄金ジャックポット！(200コイン)');
  }

  // ---------------- ★2 レア (30%: 60 <= r < 90) ----------------
  if (r >= 60) {
    const sub = Math.random() * 100;
    // 80コイン (ラッキー袋)
    if (sub < 30) {
      return coinPrize(80, 2, '★2 ラッキー袋！(80コイン)');
    }
    // レアチケット
    if (sub < 55) {
      const candidates = s.shop.filter((x) => ['sh-tab15', 'sh-snack-up', 'sh-book'].includes(x.id));
      if (candidates.length > 0) {
        const t = candidates[Math.floor(Math.random() * candidates.length)];
        return { kind: 'ticket', icon: t.icon, label: `★2 ${t.name}`, rarity: 2, coins: 0, shopItemId: t.id, avatarItemId: null };
      }
    }
    // レアアバターアイテム
    const rareAvatarOptions = AVATAR_OPTIONS.filter((o) => o.rarity === 2);
    if (rareAvatarOptions.length > 0) {
      const pick = rareAvatarOptions[Math.floor(Math.random() * rareAvatarOptions.length)];
      return {
        kind: 'avatar',
        icon: pick.icon,
        label: `★2 ${pick.name}`,
        rarity: 2,
        coins: 0,
        shopItemId: null,
        avatarItemId: pick.id,
      };
    }
    return coinPrize(80, 2, '★2 ラッキー袋！(80コイン)');
  }

  // ---------------- ★1 ノーマル (60%: 0 <= r < 60) ----------------
  const sub = Math.random() * 100;
  if (sub < 55) {
    return coinPrize(30, 1, '★1 コイン(参加賞 30コイン)');
  }
  if (sub < 80) {
    const candidates = s.shop.filter((x) => ['sh-tab10', 'sh-snack'].includes(x.id));
    if (candidates.length > 0) {
      const t = candidates[Math.floor(Math.random() * candidates.length)];
      return { kind: 'ticket', icon: t.icon, label: `★1 ${t.name}`, rarity: 1, coins: 0, shopItemId: t.id, avatarItemId: null };
    }
  }
  const normalAvatarOptions = AVATAR_OPTIONS.filter((o) => o.rarity === 1 && o.id !== 'acc_none' && o.id !== 'wp_none' && o.id !== 'pet_none');
  if (normalAvatarOptions.length > 0) {
    const pick = normalAvatarOptions[Math.floor(Math.random() * normalAvatarOptions.length)];
    return {
      kind: 'avatar',
      icon: pick.icon,
      label: `★1 ${pick.name}`,
      rarity: 1,
      coins: 0,
      shopItemId: null,
      avatarItemId: pick.id,
    };
  }
  return coinPrize(30, 1, '★1 コイン(参加賞 30コイン)');
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

  setState((s) => {
    const c = findChild(s, childId);
    if (!c) return;

    if (free) c.lastFreeGacha = todayKey();
    else c.coins -= GACHA_COST;

    if (prize.kind === 'coins') {
      c.coins += prize.coins;
    } else if (prize.kind === 'ticket' && prize.shopItemId) {
      const it = s.shop.find((x) => x.id === prize.shopItemId);
      if (it) grantShopItem(s, c, it);
    } else if (prize.kind === 'avatar' && prize.avatarItemId) {
      if (!c.ownedItems.includes(prize.avatarItemId)) {
        c.ownedItems.push(prize.avatarItemId);
      } else {
        // ダブり救済ロジック
        isDuplicate = true;
        refundCoins = prize.rarity === 3 ? 60 : prize.rarity === 2 ? 35 : 20;
        c.coins += refundCoins;
      }
    }

    if (isDuplicate) {
      addLog(s, '🎰', `${c.name}がガチャ${free ? '（無料）' : ''}で「${prize.label}」（もっているので＋${refundCoins}コインにへんかん✨）`);
    } else {
      addLog(s, '🎰', `${c.name}がガチャ${free ? '（無料）' : ''}で「${prize.kind === 'coins' ? `${prize.coins}コイン` : prize.label}」をゲット！`);
    }
  });

  return { ok: true, prize, free, isDuplicate, refundCoins };
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

export function dismissNotice(id: string): void {
  setState((s) => {
    s.notices = s.notices.filter((n) => n.id !== id);
  });
}

/* ---------------- admin: quests ---------------- */

export function saveQuest(q: Quest): void {
  setState((s) => {
    const i = s.quests.findIndex((x) => x.id === q.id);
    if (i >= 0) s.quests[i] = q;
    else s.quests.push(q);
    addLog(s, '📝', `お手伝い「${q.title}」を${i >= 0 ? '更新' : '追加'}`);
  });
}

export function deleteQuest(id: string): void {
  setState((s) => {
    const q = s.quests.find((x) => x.id === id);
    s.quests = s.quests.filter((x) => x.id !== id);
    s.submissions = s.submissions.filter((x) => x.questId !== id);
    if (q) addLog(s, '🗑️', `お手伝い「${q.title}」を削除`);
  });
}

/* ---------------- admin: shop ---------------- */

export function saveShopItem(it: ShopItem): void {
  setState((s) => {
    const i = s.shop.findIndex((x) => x.id === it.id);
    if (i >= 0) s.shop[i] = it;
    else s.shop.push(it);
    addLog(s, '🏪', `商品「${it.name}」を${i >= 0 ? '更新' : '追加'}`);
  });
}

export function deleteShopItem(id: string): void {
  setState((s) => {
    const it = s.shop.find((x) => x.id === id);
    s.shop = s.shop.filter((x) => x.id !== id);
    if (it) addLog(s, '🗑️', `商品「${it.name}」を削除`);
  });
}

/* ---------------- admin: children ---------------- */

export function saveChild(c: Child): void {
  setState((s) => {
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
}

export function deleteChild(id: string): void {
  setState((s) => {
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
