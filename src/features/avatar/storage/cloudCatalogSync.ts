/**
 * アバター自作パーツの Supabase クラウド同期モジュール
 *
 * 複数端末（PC、スマホ、タブレット）間で、作成したパーツを自動でクラウド共有し、
 * 他の端末で新しいパーツが作成された際にはローカル保存（IndexedDB）を促すポップアップ通知を発火します。
 */
import { supabase, isSupabaseConfigured, getRoomId } from '../../../supabase';
import type { AvatarPart } from '../types';
import { listCatalogParts, PART_CATALOG_UPDATED_EVENT } from './partCatalog';

export const NEW_AVATAR_PARTS_DETECTED_EVENT = 'avatar-new-parts:detected';

export interface NewPartsDetectedDetail {
  newCount: number;
  newParts: AvatarPart[];
  allCloudParts: AvatarPart[];
  lastUpdatedAt: number;
}

export interface CloudCatalogState {
  parts: AvatarPart[];
  updatedAt: number;
  deviceId?: string;
}

// 端末固有のランダムID（自端末の更新による二重通知を防止）
const DEVICE_ID =
  typeof window !== 'undefined'
    ? (() => {
        let id = sessionStorage.getItem('mobage_avatar_device_id');
        if (!id) {
          id = `dev_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
          sessionStorage.setItem('mobage_avatar_device_id', id);
        }
        return id;
      })()
    : 'server';

function getCatalogRoomId(): string {
  const baseRoomId = getRoomId();
  return `${baseRoomId}__avatar_catalog`;
}

let syncTimeout: number | null = null;
let realtimeChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
let lastKnownCloudUpdatedAt = 0;
let isApplyingCloudSync = false;

/**
 * クラウドから最新の自作パーツ一覧を取得
 */
export async function fetchCloudCatalog(): Promise<{ parts: AvatarPart[]; updatedAt: number } | null> {
  if (!supabase || !isSupabaseConfigured) return null;
  const catalogRoomId = getCatalogRoomId();

  try {
    const { data, error } = await supabase
      .from('family_states')
      .select('state, updated_at')
      .eq('room_id', catalogRoomId)
      .maybeSingle();

    if (error) {
      console.warn('Cloud catalog fetch error:', error.message);
      return null;
    }

    if (data?.state) {
      const payload = data.state as { parts?: AvatarPart[]; updatedAt?: number; deviceId?: string };
      const parts = Array.isArray(payload.parts) ? payload.parts : [];
      const updatedAt = typeof payload.updatedAt === 'number' ? payload.updatedAt : Date.now();
      return { parts, updatedAt };
    }
    return { parts: [], updatedAt: 0 };
  } catch (err) {
    console.warn('Cloud catalog network error:', err);
    return null;
  }
}

/**
 * クラウドに新しいアイテムがあるか差分を検知
 */
export async function checkNewCloudItems(): Promise<NewPartsDetectedDetail | null> {
  const cloudData = await fetchCloudCatalog();
  if (!cloudData || cloudData.parts.length === 0) return null;

  const localParts = await listCatalogParts();
  const localIdMap = new Map<string, AvatarPart>();
  for (const lp of localParts) {
    localIdMap.set(lp.id, lp);
  }

  // ローカルに存在しない、またはクラウド側の方が新しいパーツを検出
  const newParts: AvatarPart[] = [];
  for (const cp of cloudData.parts) {
    const local = localIdMap.get(cp.id);
    if (!local) {
      newParts.push(cp);
    } else if (cp.createdAt && local.createdAt && cp.createdAt > local.createdAt) {
      newParts.push(cp);
    }
  }

  if (newParts.length > 0) {
    return {
      newCount: newParts.length,
      newParts,
      allCloudParts: cloudData.parts,
      lastUpdatedAt: cloudData.updatedAt,
    };
  }
  return null;
}

/**
 * クラウドのパーツ一覧をローカルの IndexedDB & LocalStorage に一括保存
 */
export async function importCloudPartsToLocal(partsToImport?: AvatarPart[]): Promise<number> {
  let targetParts = partsToImport;
  if (!targetParts) {
    const cloudData = await fetchCloudCatalog();
    if (!cloudData) return 0;
    targetParts = cloudData.parts;
  }
  if (targetParts.length === 0) return 0;

  isApplyingCloudSync = true;
  try {
    const { saveCatalogPart } = await import('./partCatalog');
    for (const part of targetParts) {
      await saveCatalogPart(part);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PART_CATALOG_UPDATED_EVENT));
    }
    return targetParts.length;
  } finally {
    setTimeout(() => {
      isApplyingCloudSync = false;
    }, 200);
  }
}

/**
 * ローカルのパーツ一覧を Supabase クラウドへアップロード
 */
export async function uploadCatalogToCloud(customParts?: AvatarPart[]): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured || isApplyingCloudSync) return false;
  const catalogRoomId = getCatalogRoomId();

  let parts = customParts;
  if (!parts) {
    parts = await listCatalogParts();
  }

  const now = Date.now();
  lastKnownCloudUpdatedAt = now;

  const payload: CloudCatalogState = {
    parts,
    updatedAt: now,
    deviceId: DEVICE_ID,
  };

  try {
    const { error } = await supabase.from('family_states').upsert({
      room_id: catalogRoomId,
      state: payload,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Failed to upload avatar catalog to cloud:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Network error uploading avatar catalog:', err);
    return false;
  }
}

/**
 * パーツ保存・削除時にクラウド同期をデバウンススケジュール
 */
export function scheduleCloudCatalogUpload(delayMs = 600): void {
  if (!supabase || !isSupabaseConfigured || isApplyingCloudSync) return;

  if (syncTimeout !== null) {
    window.clearTimeout(syncTimeout);
  }

  syncTimeout = window.setTimeout(async () => {
    syncTimeout = null;
    await uploadCatalogToCloud();
  }, delayMs);
}

/**
 * 新着アイテム検知イベントを発火
 */
function emitNewPartsEvent(detail: NewPartsDetectedDetail): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<NewPartsDetectedDetail>(NEW_AVATAR_PARTS_DETECTED_EVENT, {
        detail,
      })
    );
  }
}

/**
 * クラウド同期リスナー＆Realtime チャンネルの開始
 */
export async function startCloudCatalogSync(): Promise<() => void> {
  if (!supabase || !isSupabaseConfigured) {
    return () => {};
  }

  const catalogRoomId = getCatalogRoomId();

  // 1. 初回差分チェック
  const initialDiff = await checkNewCloudItems();
  if (initialDiff && initialDiff.newCount > 0) {
    emitNewPartsEvent(initialDiff);
  } else {
    // ローカルにパーツがあってクラウドが空の場合、自動でクラウドへ初期同期
    const localParts = await listCatalogParts();
    if (localParts.length > 0) {
      const cloudData = await fetchCloudCatalog();
      if (!cloudData || cloudData.parts.length === 0) {
        await uploadCatalogToCloud(localParts);
      }
    }
  }

  // 2. Realtime 購読開始（他端末で作成されたパーツを即座にキャッチ）
  try {
    if (realtimeChannel) {
      await supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    realtimeChannel = supabase
      .channel(`avatar-catalog-${catalogRoomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_states',
          filter: `room_id=eq.${catalogRoomId}`,
        },
        async (payload) => {
          const newState = (payload.new as { state?: CloudCatalogState })?.state;
          if (!newState) return;

          // 自身が送信した更新は通知スキップ
          if (newState.deviceId === DEVICE_ID) {
            return;
          }

          if (newState.updatedAt && newState.updatedAt <= lastKnownCloudUpdatedAt) {
            return;
          }
          lastKnownCloudUpdatedAt = newState.updatedAt || Date.now();

          // 差分チェック
          const diff = await checkNewCloudItems();
          if (diff && diff.newCount > 0) {
            emitNewPartsEvent(diff);
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscribe error for avatar catalog:', err);
  }

  // 3. 定期チェック（3分ごと）＆ 画面復帰時（visibilitychange）
  const intervalId = window.setInterval(async () => {
    const diff = await checkNewCloudItems();
    if (diff && diff.newCount > 0) {
      emitNewPartsEvent(diff);
    }
  }, 180000); // 3分

  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
      const diff = await checkNewCloudItems();
      if (diff && diff.newCount > 0) {
        emitNewPartsEvent(diff);
      }
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    window.clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (realtimeChannel && supabase) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  };
}
