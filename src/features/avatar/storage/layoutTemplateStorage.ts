/**
 * アバターパーツの配置テンプレート（位置・角度・サイズ・反転・前後順）の永続化ストレージ
 * ユーザーがクローゼット画面で綺麗に合わせた位置バランスを記憶し、
 * 他のパーツに変更した際にもその位置が引き継がれるようにします。
 */
import { AVATAR_LAYERS } from '../types';
import type { AvatarCategory, GripHandPose, LayerAdjustment, LayerAdjustmentMap } from '../types';
import { normalizeGripHandPose } from '../assets/handSprites';
import { hasCustomAdjustment } from '../utils/parts';

const SAVED_LAYOUT_STORAGE_KEY = 'mobage_avatar_saved_layout_template_v2';
const AUTO_APPLY_PREFERENCE_KEY = 'mobage_avatar_auto_apply_template_v2';

export type SavedLayoutTemplateMap = LayerAdjustmentMap;

const round1 = (v: number) => Math.round(v * 10) / 10;

/** レイヤー調整データを安全にサニタイズ（NaN・Infinity・不正値の排除） */
export function sanitizeLayerAdjustment(raw: unknown): LayerAdjustment | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;

  const dx = typeof obj.dx === 'number' && Number.isFinite(obj.dx) ? round1(obj.dx) : 0;
  const dy = typeof obj.dy === 'number' && Number.isFinite(obj.dy) ? round1(obj.dy) : 0;
  const scale =
    typeof obj.scale === 'number' && Number.isFinite(obj.scale) && obj.scale > 0
      ? Number(obj.scale.toFixed(3))
      : 1;
  const rotation =
    typeof obj.rotation === 'number' && Number.isFinite(obj.rotation)
      ? round1(obj.rotation)
      : 0;

  const adj: LayerAdjustment = {
    dx,
    dy,
    scale,
    rotation,
    flipX: Boolean(obj.flipX),
  };

  if (typeof obj.aboveTops === 'boolean') {
    adj.aboveTops = obj.aboveTops;
  }
  if (obj.holdHandSide === 'right' || obj.holdHandSide === 'left') {
    adj.holdHandSide = obj.holdHandSide;
  }
  if (
    obj.handHoldModeOverride === 'grip_fist' ||
    obj.handHoldModeOverride === 'behind_hand' ||
    obj.handHoldModeOverride === 'in_front'
  ) {
    adj.handHoldModeOverride = obj.handHoldModeOverride;
  }
  if (typeof obj.gripHandPose === 'string' && obj.gripHandPose) {
    adj.gripHandPose = normalizeGripHandPose(obj.gripHandPose as GripHandPose);
  }
  if (typeof obj.gripDx === 'number' && Number.isFinite(obj.gripDx)) {
    adj.gripDx = round1(obj.gripDx);
  }
  if (typeof obj.gripDy === 'number' && Number.isFinite(obj.gripDy)) {
    adj.gripDy = round1(obj.gripDy);
  }
  if (typeof obj.gripScale === 'number' && Number.isFinite(obj.gripScale) && obj.gripScale > 0) {
    adj.gripScale = Number(obj.gripScale.toFixed(3));
  }
  if (typeof obj.gripRotation === 'number' && Number.isFinite(obj.gripRotation)) {
    adj.gripRotation = round1(obj.gripRotation);
  }
  if (typeof obj.gripFlipX === 'boolean') {
    adj.gripFlipX = obj.gripFlipX;
  }
  if (typeof obj.gripFlipY === 'boolean') {
    adj.gripFlipY = obj.gripFlipY;
  }
  if (
    obj.bodyClipMode === 'auto' ||
    obj.bodyClipMode === 'strict' ||
    obj.bodyClipMode === 'off'
  ) {
    adj.bodyClipMode = obj.bodyClipMode;
  }
  if (typeof obj.bodyClipInsetPx === 'number' && Number.isFinite(obj.bodyClipInsetPx)) {
    adj.bodyClipInsetPx = Math.round(obj.bodyClipInsetPx);
  }
  if (
    obj.sleeveModeOverride === 'short_or_sleeveless' ||
    obj.sleeveModeOverride === 'long_sleeve_mask' ||
    obj.sleeveModeOverride === 'hide_arms'
  ) {
    adj.sleeveModeOverride = obj.sleeveModeOverride;
  }

  return adj;
}

/** 保存済みの全パーツ配置テンプレートを安全に読み込む */
export function loadSavedLayoutTemplate(): LayerAdjustmentMap {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = localStorage.getItem(SAVED_LAYOUT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const validated: LayerAdjustmentMap = {};
    const allowedLayers = new Set<string>(AVATAR_LAYERS);

    for (const [key, value] of Object.entries(parsed)) {
      if (allowedLayers.has(key)) {
        const sanitized = sanitizeLayerAdjustment(value);
        if (sanitized && hasCustomAdjustment(sanitized)) {
          validated[key as AvatarCategory] = sanitized;
        }
      }
    }
    return validated;
  } catch {
    return {};
  }
}

/** 現在の各パーツ配置を安全にテンプレートとして保存する */
export function saveLayoutTemplate(adjustments: LayerAdjustmentMap): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const cleaned: LayerAdjustmentMap = {};
    const allowedLayers = new Set<string>(AVATAR_LAYERS);

    for (const [cat, adj] of Object.entries(adjustments)) {
      if (allowedLayers.has(cat) && adj) {
        const sanitized = sanitizeLayerAdjustment(adj);
        if (sanitized && hasCustomAdjustment(sanitized)) {
          cleaned[cat as AvatarCategory] = sanitized;
        }
      }
    }
    localStorage.setItem(SAVED_LAYOUT_STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // ignore quota/storage error
  }
}

/** 特定カテゴリのみの配置をテンプレートに保存する */
export function saveCategoryLayoutTemplate(
  category: AvatarCategory,
  adjustment: LayerAdjustment,
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const current = loadSavedLayoutTemplate();
    const sanitized = sanitizeLayerAdjustment(adjustment);
    if (sanitized && hasCustomAdjustment(sanitized)) {
      current[category] = sanitized;
    } else {
      delete current[category];
    }
    localStorage.setItem(SAVED_LAYOUT_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore quota/storage error
  }
}

/** 保存された配置テンプレートを削除・リセットする */
export function clearSavedLayoutTemplate(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.removeItem(SAVED_LAYOUT_STORAGE_KEY);
  } catch {
    // ignore error
  }
}

/** 「パーツ変更時も記憶した配置を維持する」設定を読み込む（デフォルト: true） */
export function loadAutoApplyTemplatePreference(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    const raw = localStorage.getItem(AUTO_APPLY_PREFERENCE_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

/** 「パーツ変更時も記憶した配置を維持する」設定を保存する */
export function saveAutoApplyTemplatePreference(enabled: boolean): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(AUTO_APPLY_PREFERENCE_KEY, String(enabled));
  } catch {
    // ignore error
  }
}

/**
 * 記憶されたテンプレートを現在の微調整マップへ合成・適用する
 * @param current 現在の微調整マップ
 * @param template 記憶されたテンプレート
 * @param category 指定された場合はそのカテゴリのみ適用、未指定時は全カテゴリ適用
 */
export function applyLayoutTemplate(
  current: LayerAdjustmentMap,
  template: LayerAdjustmentMap,
  category?: AvatarCategory,
): LayerAdjustmentMap {
  const result: LayerAdjustmentMap = { ...current };
  if (category) {
    if (template[category]) {
      const sanitized = sanitizeLayerAdjustment(template[category]);
      if (sanitized) {
        result[category] = sanitized;
      }
    }
  } else {
    for (const [cat, adj] of Object.entries(template)) {
      if (adj) {
        const sanitized = sanitizeLayerAdjustment(adj);
        if (sanitized) {
          result[cat as AvatarCategory] = sanitized;
        }
      }
    }
  }
  return result;
}
