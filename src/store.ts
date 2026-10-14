import { useSyncExternalStore } from 'react';
import type { AppState } from './types';
import { DEFAULT_AVATAR, createInitialState, STATE_VERSION, DEFAULT_NOTIFICATION_SETTINGS } from './presets';

export const STORAGE_KEY = 'otetsudai-quest-state-v1';

type Listener = () => void;
const listeners = new Set<Listener>();

function normalize(p: Partial<AppState>): AppState {
  const base = createInitialState();
  const rawChildren = Array.isArray(p.children) && p.children.length > 0 ? p.children : base.children;

  const children = rawChildren.map((c, i) => {
    const fallbackChild = base.children[i] || base.children[0];
    return {
      ...fallbackChild,
      ...c,
      coins: typeof c.coins === 'number' ? c.coins : fallbackChild.coins,
      streak: typeof c.streak === 'number' ? c.streak : fallbackChild.streak,
      totalQuests: typeof c.totalQuests === 'number' ? c.totalQuests : fallbackChild.totalQuests,
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
    quests: Array.isArray(p.quests) && p.quests.length > 0
      ? p.quests.map((q) => ({ ...q, rewardOverrides: q.rewardOverrides ?? {} }))
      : base.quests,
    submissions: Array.isArray(p.submissions) ? p.submissions : [],
    chests: Array.isArray(p.chests) ? p.chests : [],
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
  };
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
      if (parsed && parsed.version === STATE_VERSION) return normalize(parsed);
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
 */
registerStoreBridge(
  (remoteState: AppState) => {
    state = normalize(remoteState);
    persist(state);
    emit();
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
  persist(state);
  emit();
  scheduleCloudSync(state);
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

