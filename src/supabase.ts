import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { AppState } from './types';

// 端末ローカル設定用のストレージキー
const ROOM_ID_STORAGE_KEY = 'otetsudai-room-id';
const DEFAULT_ROOM_ID = 'default-family';

export type SyncStatus = 'connected' | 'connecting' | 'disconnected' | 'local_only' | 'error';

// 環境変数の取得
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// プレースホルダーまたは空文字列のチェック
const isValidUrl = typeof rawUrl === 'string' && rawUrl.startsWith('http') && !rawUrl.includes('あなたの');
const isValidKey = typeof rawKey === 'string' && rawKey.length > 20 && !rawKey.includes('あなたの');

export const isSupabaseConfigured = isValidUrl && isValidKey;

// Supabase クライアント初期化（未設定時は null）
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// URL パラメータ ?room=〇〇 の自動連携＆URLクリーンアップ
if (typeof window !== 'undefined') {
  try {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const clean = roomParam.trim();
      if (clean) {
        localStorage.setItem(ROOM_ID_STORAGE_KEY, clean);
      }
      params.delete('room');
      const newQuery = params.toString() ? `?${params.toString()}` : '';
      const newUrl = window.location.pathname + newQuery + window.location.hash;
      window.history.replaceState(null, '', newUrl);
    }
  } catch {
    /* ignore */
  }
}

// 家族のあいことば（ルームID）の取得と保存
export function getRoomId(): string {
  if (typeof window === 'undefined') return DEFAULT_ROOM_ID;
  try {
    return localStorage.getItem(ROOM_ID_STORAGE_KEY) || DEFAULT_ROOM_ID;
  } catch {
    return DEFAULT_ROOM_ID;
  }
}

/**
 * 端末で明示的にあいことばが設定（または招待URLで連携）されているかどうか
 */
export function hasConfiguredRoomId(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = localStorage.getItem(ROOM_ID_STORAGE_KEY);
    return !!stored && stored.trim().length > 0;
  } catch {
    return true;
  }
}

export function setRoomId(newRoomId: string): void {
  const clean = newRoomId.trim() || DEFAULT_ROOM_ID;
  try {
    localStorage.setItem(ROOM_ID_STORAGE_KEY, clean);
  } catch {
    /* ignore */
  }
  // ルーム変更時に同期を再起動
  restartSync();
}

/**
 * タブレット招待用URLを生成
 */
export function getInviteUrl(): string {
  if (typeof window === 'undefined') return '';
  const roomId = getRoomId();
  return `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;
}

// 同期ステータス管理
let currentStatus: SyncStatus = isSupabaseConfigured ? 'connecting' : 'local_only';
type StatusListener = (status: SyncStatus) => void;
const statusListeners = new Set<StatusListener>();

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function subscribeSyncStatus(fn: StatusListener): () => void {
  statusListeners.add(fn);
  fn(currentStatus);
  return () => {
    statusListeners.delete(fn);
  };
}

function setSyncStatus(status: SyncStatus): void {
  if (currentStatus !== status) {
    currentStatus = status;
    statusListeners.forEach((fn) => fn(status));
  }
}

// 外部連携用コールバック（store.ts から注入）
let onRemoteStateReceived: ((remoteState: AppState) => void) | null = null;
let getCurrentLocalState: (() => AppState) | null = null;

export function registerStoreBridge(
  onReceived: (remoteState: AppState) => void,
  getState: () => AppState
): void {
  onRemoteStateReceived = onReceived;
  getCurrentLocalState = getState;
}

// Realtime チャンネルとタイマー
let channel: RealtimeChannel | null = null;
let upsertTimeout: number | null = null;
let isRemoteUpdating = false;

export function isApplyingRemoteUpdate(): boolean {
  return isRemoteUpdating;
}

/**
 * リモートから受信したステートをローカルに反映（再送信ループ防止フラグ付き）
 */
export function applyRemoteStateSafe(remoteState: AppState): void {
  if (!onRemoteStateReceived) return;
  isRemoteUpdating = true;
  try {
    onRemoteStateReceived(remoteState);
  } finally {
    // わずかなディレイ後にフラグ解除
    setTimeout(() => {
      isRemoteUpdating = false;
    }, 100);
  }
}

/**
 * Supabase への非同期 UPSERT（デバウンス処理付き）
 */
export function scheduleCloudSync(state: AppState): void {
  if (!supabase || !isSupabaseConfigured || isRemoteUpdating) return;

  if (upsertTimeout !== null) {
    window.clearTimeout(upsertTimeout);
  }

  upsertTimeout = window.setTimeout(async () => {
    upsertTimeout = null;
    const roomId = getRoomId();
    try {
      const { error } = await supabase.from('family_states').upsert({
        room_id: roomId,
        state: state,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.warn('Supabase upsert warning:', error.message);
        setSyncStatus('error');
      } else {
        setSyncStatus('connected');
      }
    } catch (err) {
      console.warn('Supabase upsert network error:', err);
      setSyncStatus('error');
    }
  }, 400); // 400ms デバウンス
}

/**
 * 同期の初期化＆Realtime チャンネルの購読
 */
export async function startSync(): Promise<void> {
  if (!supabase || !isSupabaseConfigured) {
    setSyncStatus('local_only');
    return;
  }

  setSyncStatus('connecting');
  const roomId = getRoomId();

  // 1. 初回読み込み（最新クラウドステートの取得）
  try {
    const { data, error } = await supabase
      .from('family_states')
      .select('state, updated_at')
      .eq('room_id', roomId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch error:', error.message);
      setSyncStatus('error');
    } else if (data?.state) {
      // クラウドに既存データがある場合はローカルに反映
      applyRemoteStateSafe(data.state as AppState);
      setSyncStatus('connected');
    } else if (getCurrentLocalState) {
      // クラウドにデータがない場合は現在のローカル初期ステートを保存
      const current = getCurrentLocalState();
      await supabase.from('family_states').upsert({
        room_id: roomId,
        state: current,
        updated_at: new Date().toISOString(),
      });
      setSyncStatus('connected');
    }
  } catch (err) {
    console.warn('Supabase initial fetch network error:', err);
    setSyncStatus('error');
  }

  // 2. Realtime 購読の開始
  try {
    if (channel) {
      await supabase.removeChannel(channel);
      channel = null;
    }

    channel = supabase
      .channel(`family-sync-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_states',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newState = (payload.new as { state?: AppState })?.state;
          if (newState) {
            applyRemoteStateSafe(newState);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSyncStatus('error');
        } else if (status === 'CLOSED') {
          setSyncStatus('disconnected');
        }
      });
  } catch (err) {
    console.warn('Supabase realtime subscribe error:', err);
    setSyncStatus('error');
  }
}

/**
 * ルームID変更時などに同期を再起動
 */
export async function restartSync(): Promise<void> {
  if (channel && supabase) {
    try {
      await supabase.removeChannel(channel);
    } catch {
      /* ignore */
    }
    channel = null;
  }
  await startSync();
}
