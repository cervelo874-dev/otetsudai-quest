import { useSyncExternalStore } from 'react';
import type { AppState, Child, Quest, ShopItem, Ticket } from './types';
import {
  DEFAULT_AVATAR,
  DEFAULT_CHILD_PROPS,
  createInitialState,
  STATE_VERSION,
  DEFAULT_NOTIFICATION_SETTINGS,
} from './presets';

export const STORAGE_KEY = 'otetsudai-quest-state-v1';

type Listener = () => void;
const listeners = new Set<Listener>();

export function normalize(p: Partial<AppState>): AppState {
  const base = createInitialState();
  const rawChildren = Array.isArray(p.children) && p.children.length > 0 ? p.children : base.children;

  const children = rawChildren.map((c, i) => {
    // 既存プリセットの子どもの場合はそのプリセットをfallbackに、
    // 新規作成された子どもの場合は DEFAULT_CHILD_PROPS を安全なフォールバックとする
    const presetFallback = base.children.find((bc) => bc.id === c.id);
    const fallbackChild = presetFallback || {
      ...DEFAULT_CHILD_PROPS,
      id: c.id || `c-${i}`,
      name: c.name || '子ども',
    };

    return {
      ...fallbackChild,
      ...c,
      id: c.id || fallbackChild.id,
      name: c.name || fallbackChild.name,
      coins: typeof c.coins === 'number' ? c.coins : fallbackChild.coins,
      streak: typeof c.streak === 'number' ? c.streak : fallbackChild.streak,
      totalQuests: typeof c.totalQuests === 'number' ? c.totalQuests : fallbackChild.totalQuests,
      starShards: typeof c.starShards === 'number' ? c.starShards : (fallbackChild.starShards ?? 0),
      ownedItems: Array.isArray(c.ownedItems) ? c.ownedItems : [],
      avatar: {
        ...DEFAULT_AVATAR,
        ...(fallbackChild.avatar || {}),
        ...(c.avatar || {}),
      },
    };
  });

  return {
    ...base,
    ...p,
    parentPin: typeof p.parentPin === 'string' ? p.parentPin : base.parentPin,
    children,
    deletedChildIds: Array.isArray(p.deletedChildIds) ? p.deletedChildIds : [],
    deletedQuestIds: Array.isArray(p.deletedQuestIds) ? p.deletedQuestIds : [],
    deletedShopItemIds: Array.isArray(p.deletedShopItemIds) ? p.deletedShopItemIds : [],
    quests: Array.isArray(p.quests) && p.quests.length > 0
      ? p.quests.map((q) => ({ ...q, rewardOverrides: q.rewardOverrides ?? {} }))
      : base.quests,
    submissions: Array.isArray(p.submissions) ? p.submissions : [],
    chests: Array.isArray(p.chests) ? p.chests : [],
    // ユーザーが作成・編集したチケット一覧（shop）を最優先で維持！
    shop: Array.isArray(p.shop) && p.shop.length > 0 ? p.shop : base.shop,
    tickets: Array.isArray(p.tickets) ? p.tickets : [],
    timers: Array.isArray(p.timers) ? p.timers : [],
    notices: Array.isArray(p.notices) ? p.notices : [],
    logs: Array.isArray(p.logs) ? p.logs : base.logs,
    done: Array.isArray(p.done) ? p.done : [],
    notificationSettings: {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...(p.notificationSettings || {}),
    },
    version: STATE_VERSION,
    lastUpdatedAt: typeof p.lastUpdatedAt === 'number' ? p.lastUpdatedAt : Date.now(),
  };
}

/**
 * ローカルステートとリモートステートを安全にマージする
 * - ローカルで新しく追加された子どもやチケットを絶対に消滅させない
 * - 意図的に削除された子ども（deletedChildIds）は復活させない
 * - リモートにしか存在しない新規データは取り込む
 */
export function mergeStates(local: AppState, remote: Partial<AppState>): { merged: AppState; hasLocalNewData: boolean } {
  const normRemote = normalize(remote);
  let hasLocalNewData = false;

  const deletedSet = new Set([
    ...(local.deletedChildIds || []),
    ...(normRemote.deletedChildIds || []),
  ]);

  // 1. Children のスマートマージ
  const childMap = new Map<string, Child>();

  // リモートの子ども（削除リストに入っていないもの）
  normRemote.children.forEach((c) => {
    if (!deletedSet.has(c.id)) {
      childMap.set(c.id, c);
    }
  });

  // ローカルの子ども（新しく追加された子どもを絶対に保護！）
  local.children.forEach((localChild) => {
    if (deletedSet.has(localChild.id)) return;
    const remoteChild = childMap.get(localChild.id);
    if (!remoteChild) {
      // ローカルにしか存在しない新しい子どもを検出！保持する
      childMap.set(localChild.id, localChild);
      hasLocalNewData = true;
    } else {
      // 両方に存在する場合：
      // 所持アイテムは結合（重複排除）
      const mergedItems = Array.from(new Set([...(remoteChild.ownedItems || []), ...(localChild.ownedItems || [])]));
      
      const remoteNewer = (normRemote.lastUpdatedAt || 0) > (local.lastUpdatedAt || 0);
      const chosenChild = remoteNewer ? remoteChild : localChild;

      childMap.set(localChild.id, {
        ...remoteChild,
        ...localChild,
        name: chosenChild.name,
        age: chosenChild.age,
        pin: chosenChild.pin,
        color: chosenChild.color,
        allowQuickLogin: chosenChild.allowQuickLogin !== undefined ? chosenChild.allowQuickLogin : true,
        coins: Math.max(remoteChild.coins, localChild.coins),
        starShards: Math.max(remoteChild.starShards ?? 0, localChild.starShards ?? 0),
        totalQuests: Math.max(remoteChild.totalQuests, localChild.totalQuests),
        streak: Math.max(remoteChild.streak, localChild.streak),
        ownedItems: mergedItems,
        avatar: {
          ...DEFAULT_AVATAR,
          ...(remoteChild.avatar || {}),
          ...(localChild.avatar || {}),
        },
      });
    }
  });

  const deletedQuestSet = new Set([
    ...(local.deletedQuestIds || []),
    ...(normRemote.deletedQuestIds || []),
  ]);

  const deletedShopSet = new Set([
    ...(local.deletedShopItemIds || []),
    ...(normRemote.deletedShopItemIds || []),
  ]);

  const mergedChildren = Array.from(childMap.values());

  // 2. Shop（チケット）のマージ：削除リストに含まれないものを対象にユーザー追加チケットを保護
  const shopMap = new Map<string, ShopItem>();
  normRemote.shop.forEach((s) => {
    if (!deletedShopSet.has(s.id)) shopMap.set(s.id, s);
  });
  local.shop.forEach((s) => {
    if (!deletedShopSet.has(s.id) && !shopMap.has(s.id)) {
      shopMap.set(s.id, s);
      hasLocalNewData = true;
    }
  });

  // 3. Quests のマージ：削除リストに含まれないものを対象にユーザー追加クエストを保護
  const questMap = new Map<string, Quest>();
  normRemote.quests.forEach((q) => {
    if (!deletedQuestSet.has(q.id)) questMap.set(q.id, q);
  });
  local.quests.forEach((q) => {
    if (!deletedQuestSet.has(q.id) && !questMap.has(q.id)) {
      questMap.set(q.id, q);
      hasLocalNewData = true;
    }
  });

  // 4. Tickets のマージ（所持チケット）
  const ticketMap = new Map<string, Ticket>();
  normRemote.tickets.forEach((t) => ticketMap.set(t.id, t));
  local.tickets.forEach((t) => {
    if (!ticketMap.has(t.id)) {
      ticketMap.set(t.id, t);
      hasLocalNewData = true;
    }
  });

  const merged: AppState = {
    ...normRemote,
    parentPin: local.parentPin || normRemote.parentPin,
    children: mergedChildren.length > 0 ? mergedChildren : normRemote.children,
    shop: Array.from(shopMap.values()),
    quests: Array.from(questMap.values()),
    tickets: Array.from(ticketMap.values()),
    // タイマーや申請は最新のリモートを採用（他端末のリアルタイム操作に追従）
    timers: normRemote.timers,
    submissions: normRemote.submissions,
    chests: normRemote.chests,
    deletedChildIds: Array.from(deletedSet),
    deletedQuestIds: Array.from(deletedQuestSet),
    deletedShopItemIds: Array.from(deletedShopSet),
    lastUpdatedAt: Math.max(local.lastUpdatedAt || 0, normRemote.lastUpdatedAt || 0, Date.now()),
  };

  return { merged, hasLocalNewData };
}

function persist(s: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* 容量超過などは無視（メモリ上の状態で動作継続） */
  }
}

function load(): AppState {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reset') === 'true' || window.location.hash.includes('reset')) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      // バージョンが過去のものであっても破棄せず、安全にnormalizeしてデータを保護する
      if (parsed && typeof parsed === 'object') {
        const migrated = normalize(parsed);
        persist(migrated);
        return migrated;
      }
    }
  } catch {
    /* 壊れたデータは初期化 */
  }
  const init = createInitialState();
  persist(init);
  return init;
}

import {
  registerStoreBridge,
  scheduleCloudSync,
  flushCloudSync,
  startSync,
  subscribeSyncStatus,
  getSyncStatus,
  type SyncStatus,
} from './supabase';

let state: AppState = load();

function emit(): void {
  listeners.forEach((l) => l());
}

export function getState(): AppState {
  return state;
}

/**
 * リモート（Supabase）からステートを受信したときの反映ハンドラ
 * ローカルの最新データを破棄せず、安全にスマートマージする
 */
registerStoreBridge(
  (remoteState: AppState) => {
    const { merged, hasLocalNewData } = mergeStates(state, remoteState);
    state = merged;
    persist(state);
    emit();
    // ローカルにしか存在しなかった新しい子どもやデータを取り込んだ場合は、
    // クラウド側へも直ちにマージ結果を同期（flush）してクラウドも最新化する！
    if (hasLocalNewData) {
      flushCloudSync(state);
    }
  },
  () => state
);

// 初回クラウド同期の開始
if (typeof window !== 'undefined') {
  startSync();
}

/**
 * ドラフト（ディープコピー）を書き換える形で状態を更新し、localStorage に保存。
 * クラウド（Supabase）にも即座に非同期同期をスケジュール。
 */
export function setState(updater: (draft: AppState) => AppState | void): void {
  const draft = structuredClone(state);
  const result = updater(draft);
  state = result ?? draft;
  state.lastUpdatedAt = Date.now();
  persist(state);
  emit();
  scheduleCloudSync(state);
}

/**
 * 重要データの変更（子どもの追加・削除など）時にクラウド同期を即時フラッシュ
 */
export function flushSync(): void {
  flushCloudSync(state);
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** 別タブ（親画面⇔子画面）での変更を storage イベントでリアルタイム同期 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    if (e.key === null) {
      // localStorage.clear() された場合
      state = load();
      emit();
      return;
    }
    if (!e.newValue) {
      state = load();
      emit();
      return;
    }
    try {
      const parsed = JSON.parse(e.newValue) as Partial<AppState>;
      state = normalize(parsed);
      emit();
    } catch {
      /* 不正データは無視 */
    }
  });
}

export function useStore(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatus, getSyncStatus);
}

