/**
 * ブラウザ内パーツカタログ保存モジュール（IndexedDB + LocalStorage フォールバック）
 * スタジオで位置合わせ＆透過した512x512パーツを保存し、クローゼットで即座に試着可能にします。
 */
import type { AvatarCategory, AvatarPart } from '../types';
import { AVATAR_CANVAS_SIZE } from '../constants';
import { createOffscreenCanvas } from '../utils/imageProcessing';
import { loadAvatarImage } from '../utils/composeAvatar';
import {
  buildMirroredPartName,
  getOppositeSymmetryCategory,
  mirrorPartRigHorizontally,
} from '../utils/autoRigging';

const DB_NAME = 'mobage_avatar_studio_db';
const STORE_NAME = 'custom_parts';
const DB_VERSION = 1;
const LS_FALLBACK_KEY = 'mobage_avatar_custom_parts_v1';

export const PART_CATALOG_UPDATED_EVENT = 'avatar-part-catalog:updated';

let cachedDbPromise: Promise<IDBDatabase> | null = null;

function openPartDatabase(): Promise<IDBDatabase> {
  if (cachedDbPromise) return cachedDbPromise;
  cachedDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      cachedDbPromise = null;
      reject(request.error);
    };
  });
  return cachedDbPromise;
}

function notifyCatalogUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PART_CATALOG_UPDATED_EVENT));
  }
}

export function readFallbackParts(): AvatarPart[] {
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    return raw ? (JSON.parse(raw) as AvatarPart[]) : [];
  } catch {
    return [];
  }
}

export function writeFallbackParts(parts: AvatarPart[]): void {
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(parts));
  } catch {
    // 容量上限などの場合は無視
  }
}

/** 保存済みの全パーツを登録日時順に取得 */
export async function listCatalogParts(): Promise<AvatarPart[]> {
  try {
    const db = await openPartDatabase();
    const parts = await new Promise<AvatarPart[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll() as IDBRequest<AvatarPart[]>;
      tx.oncomplete = () => resolve(req.result ?? []);
      tx.onerror = () => reject(tx.error);
    });
    // IndexedDBから取得できたらLocalStorageフォールバックにもキャッシュ同期
    if (parts.length > 0) {
      writeFallbackParts(parts);
    }
    return parts.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  } catch {
    return readFallbackParts().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }
}

/** パーツをカタログに保存・更新 */
export async function saveCatalogPart(part: AvatarPart): Promise<AvatarPart> {
  const now = Date.now();
  const normalized: AvatarPart = {
    ...part,
    createdAt: part.createdAt ?? now,
    updatedAt: part.updatedAt ?? now,
  };
  try {
    const db = await openPartDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(normalized);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }

  // 同期ロード用にLocalStorageフォールバックにも必ず反映
  try {
    const current = readFallbackParts().filter((p) => p.id !== normalized.id);
    current.push(normalized);
    writeFallbackParts(current);
  } catch {
    // ignore
  }

  notifyCatalogUpdated();
  void import('./cloudCatalogSync').then((m) => m.scheduleCloudCatalogUpload()).catch(() => {});
  return normalized;
}

export interface DuplicateCatalogPartOptions {
  /** trueの場合、512x512画像を左右反転し、左腕↔右腕 / 左脚↔右脚などの反対側カテゴリへサイズ・高さを完全統一して複製する */
  mirrorToOpposite?: boolean;
  /** 強制的に左右反転するかどうか（同カテゴリ内での左右反転複製にも利用可能） */
  mirrorHorizontal?: boolean;
  /** 複製先カテゴリ（省略時は mirrorToOpposite なら反対側カテゴリ、それ以外は元カテゴリ） */
  targetCategory?: AvatarCategory;
  /** 新しいパーツ名（省略時は自動命名） */
  newName?: string;
}

/**
 * 登録済みパーツを複製してカタログに保存する
 * - 同カテゴリ複製（サイズ・ソケット位置を100%保持したまま別IDで複製）
 * - 左右反転して反対側の腕・脚へ複製（左腕↔右腕、左脚↔右脚のサイズ・高さ・ソケット位置を完全対称で統一）
 */
export async function duplicateCatalogPart(
  part: AvatarPart,
  options?: DuplicateCatalogPartOptions,
): Promise<AvatarPart> {
  const shouldMirror = Boolean(options?.mirrorToOpposite || options?.mirrorHorizontal);
  const oppositeCat = getOppositeSymmetryCategory(part.category);
  const targetCategory =
    options?.targetCategory ??
    (options?.mirrorToOpposite && oppositeCat ? oppositeCat : part.category);
  const randSuffix = Math.random().toString(36).slice(2, 6);
  const newId = `part_${targetCategory}_${Date.now().toString(36)}_${randSuffix}`;

  if (!shouldMirror) {
    const clonedRig = part.rig ? JSON.parse(JSON.stringify(part.rig)) : undefined;
    const copyPart: AvatarPart = {
      id: newId,
      category: targetCategory,
      name: options?.newName?.trim() || `${part.name} (コピー)`,
      src: part.src,
      rig: clonedRig,
      createdAt: Date.now(),
    };
    return saveCatalogPart(copyPart);
  }

  // 512x512 キャンバス上で中心 (X=256) を軸に左右反転描画し、サイズ・Y座標を100%一致させる
  const S = AVATAR_CANVAS_SIZE;
  const img = await loadAvatarImage(part.src);
  const mirroredCanvas = createOffscreenCanvas(S, S);
  const ctx = mirroredCanvas.getContext('2d', { willReadFrequently: true })!;
  ctx.save();
  ctx.translate(S, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0, S, S);
  ctx.restore();

  const mirroredRig = mirrorPartRigHorizontally(part.rig, targetCategory, mirroredCanvas);
  const mirroredDataUrl = mirroredCanvas.toDataURL('image/png');
  const autoName =
    options?.newName?.trim() || buildMirroredPartName(part.name, part.category, targetCategory);

  const mirroredPart: AvatarPart = {
    id: newId,
    category: targetCategory,
    name: autoName,
    src: mirroredDataUrl,
    rig: mirroredRig,
    createdAt: Date.now(),
  };

  return saveCatalogPart(mirroredPart);
}

/** 指定IDのパーツをカタログから削除 */
export async function removeCatalogPart(partId: string): Promise<void> {
  try {
    const db = await openPartDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(partId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // fallback handled below
  }
  const current = readFallbackParts();
  if (current.length > 0) {
    writeFallbackParts(current.filter((p) => p.id !== partId));
  }
  notifyCatalogUpdated();
  void import('./cloudCatalogSync').then((m) => m.scheduleCloudCatalogUpload()).catch(() => {});
}

/** カタログ内のパーツをすべて消去 */
export async function clearCatalogParts(): Promise<void> {
  try {
    const db = await openPartDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // fallback handled below
  }
  try {
    localStorage.removeItem(LS_FALLBACK_KEY);
  } catch {
    // ignore
  }
  notifyCatalogUpdated();
  void import('./cloudCatalogSync').then((m) => m.scheduleCloudCatalogUpload()).catch(() => {});
}

