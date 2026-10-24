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
/** 削除済みパーツの墓標（tombstone）: { [partId]: deletedAt(ms) } */
const LS_DELETED_KEY = 'mobage_avatar_deleted_parts_v1';
/** 墓標の保持期間（これより古い墓標は自動的に掃除） */
const TOMBSTONE_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export const PART_CATALOG_UPDATED_EVENT = 'avatar-part-catalog:updated';

export type DeletedPartMap = Record<string, number>;

// ---------------------------------------------------------------------------
// 削除墓標（tombstone）管理
// 他端末やクラウドに古いコピーが残っていても、削除したパーツが復活しないようにする
// ---------------------------------------------------------------------------

export function readDeletedParts(): DeletedPartMap {
  try {
    const raw = localStorage.getItem(LS_DELETED_KEY);
    const parsed = raw ? (JSON.parse(raw) as DeletedPartMap) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeDeletedParts(map: DeletedPartMap): void {
  try {
    const now = Date.now();
    const pruned: DeletedPartMap = {};
    for (const [id, at] of Object.entries(map)) {
      if (typeof at === 'number' && now - at < TOMBSTONE_TTL_MS) {
        pruned[id] = at;
      }
    }
    localStorage.setItem(LS_DELETED_KEY, JSON.stringify(pruned));
  } catch {
    // ignore
  }
}

/** 墓標を追加・統合（同じIDはより新しい削除時刻を採用）。変化があれば true */
export function mergeDeletedParts(incoming: DeletedPartMap | undefined | null): boolean {
  if (!incoming || typeof incoming !== 'object') return false;
  const current = readDeletedParts();
  let changed = false;
  for (const [id, at] of Object.entries(incoming)) {
    if (typeof at !== 'number') continue;
    if (!current[id] || current[id] < at) {
      current[id] = at;
      changed = true;
    }
  }
  if (changed) writeDeletedParts(current);
  return changed;
}

/**
 * パーツが削除済みかどうか判定
 * パーツIDは作成ごとに一意（part_カテゴリ_時刻_乱数）なので、墓標にあるIDは二度と復活させない。
 * （クローゼットの「保存」などで装着中の古いパーツが自動再保存されても復活しないよう、時刻比較はしない）
 */
export function isPartDeleted(part: Pick<AvatarPart, 'id'>, deleted: DeletedPartMap = readDeletedParts()): boolean {
  return typeof deleted[part.id] === 'number';
}

export function filterDeletedParts(parts: AvatarPart[], deleted: DeletedPartMap = readDeletedParts()): AvatarPart[] {
  return parts.filter((p) => !isPartDeleted(p, deleted));
}

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
    const parts = raw ? (JSON.parse(raw) as AvatarPart[]) : [];
    return filterDeletedParts(parts);
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

/** IndexedDB から指定IDを物理削除 */
async function deleteFromDatabase(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const db = await openPartDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const id of ids) store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

/**
 * 墓標に該当するパーツをローカル（IndexedDB / LocalStorage）から完全に消去する
 * 他端末で削除されたパーツをこの端末からも消すために使用。削除があれば true
 */
export async function purgeDeletedPartsFromLocal(): Promise<boolean> {
  const deleted = readDeletedParts();
  if (Object.keys(deleted).length === 0) return false;

  let removed = false;
  try {
    const db = await openPartDatabase();
    const all = await new Promise<AvatarPart[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll() as IDBRequest<AvatarPart[]>;
      tx.oncomplete = () => resolve(req.result ?? []);
      tx.onerror = () => reject(tx.error);
    });
    const targets = all.filter((p) => isPartDeleted(p, deleted)).map((p) => p.id);
    if (targets.length > 0) {
      await deleteFromDatabase(targets);
      removed = true;
    }
  } catch {
    // ignore
  }

  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    const lsParts = raw ? (JSON.parse(raw) as AvatarPart[]) : [];
    const kept = lsParts.filter((p) => !isPartDeleted(p, deleted));
    if (kept.length !== lsParts.length) {
      writeFallbackParts(kept);
      removed = true;
    }
  } catch {
    // ignore
  }

  if (removed) notifyCatalogUpdated();
  return removed;
}

/** 保存済みの全パーツを登録日時順に取得（削除済みパーツは除外＆物理削除） */
export async function listCatalogParts(): Promise<AvatarPart[]> {
  const deleted = readDeletedParts();
  try {
    const db = await openPartDatabase();
    const rawParts = await new Promise<AvatarPart[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll() as IDBRequest<AvatarPart[]>;
      tx.oncomplete = () => resolve(req.result ?? []);
      tx.onerror = () => reject(tx.error);
    });
    const zombieIds = rawParts.filter((p) => isPartDeleted(p, deleted)).map((p) => p.id);
    if (zombieIds.length > 0) {
      void deleteFromDatabase(zombieIds);
    }
    const parts = rawParts.filter((p) => !isPartDeleted(p, deleted));
    // IndexedDBから取得できたらLocalStorageフォールバックにもキャッシュ同期
    if (parts.length > 0 || zombieIds.length > 0) {
      writeFallbackParts(parts);
    }
    return parts.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  } catch {
    return readFallbackParts().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }
}

export interface SaveCatalogPartOptions {
  /**
   * クラウドから取り込む場合 true。
   * - 取り込み起因のクラウド再アップロードを行わない
   */
  fromCloud?: boolean;
}

/** パーツをカタログに保存・更新（削除済みIDのパーツは保存しない） */
export async function saveCatalogPart(
  part: AvatarPart,
  options?: SaveCatalogPartOptions,
): Promise<AvatarPart> {
  const now = Date.now();
  const fromCloud = Boolean(options?.fromCloud);
  const normalized: AvatarPart = {
    ...part,
    createdAt: part.createdAt ?? now,
    updatedAt: part.updatedAt ?? now,
  };

  // 削除済みのパーツは、クラウド取り込み・装着中パーツの自動再保存などで復活させない
  if (isPartDeleted(normalized)) {
    return normalized;
  }

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
  if (!fromCloud) {
    void import('./cloudCatalogSync').then((m) => m.scheduleCloudCatalogUpload()).catch(() => {});
  }
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

/** 指定IDのパーツをカタログから削除（墓標を残し、全端末・クラウドから完全に消す） */
export async function removeCatalogPart(partId: string): Promise<void> {
  // 1. 削除墓標を記録（他端末・クラウドに残る古いコピーの復活を防ぐ）
  mergeDeletedParts({ [partId]: Date.now() });

  // 2. ローカル（IndexedDB / LocalStorage）から物理削除
  await deleteFromDatabase([partId]);
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    const lsParts = raw ? (JSON.parse(raw) as AvatarPart[]) : [];
    writeFallbackParts(lsParts.filter((p) => p.id !== partId));
  } catch {
    // ignore
  }
  notifyCatalogUpdated();

  // 3. デバウンスを待たず即座にクラウドへ削除を反映
  void import('./cloudCatalogSync')
    .then((m) => m.uploadCatalogToCloud())
    .catch(() => {});
}

/** カタログ内のパーツをすべて消去（全パーツに墓標を残す） */
export async function clearCatalogParts(): Promise<void> {
  const existing = await listCatalogParts();
  const now = Date.now();
  const tombstones: DeletedPartMap = {};
  for (const p of existing) tombstones[p.id] = now;
  mergeDeletedParts(tombstones);

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
  void import('./cloudCatalogSync')
    .then((m) => m.uploadCatalogToCloud())
    .catch(() => {});
}

