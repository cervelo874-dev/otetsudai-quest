import type { CSSProperties } from 'react';
import { AVATAR_LAYERS } from '../types';
import type {
  AvatarCategory,
  AvatarPart,
  CropRect,
  EquippedPartMap,
  EquippedParts,
  EquippedValue,
  LayerAdjustment,
  LayerAdjustmentMap,
} from '../types';
import {
  AVATAR_CANVAS_SIZE,
  CATEGORY_META,
  CHARACTER_BODY_LAYERS,
  DEFAULT_AVATAR_LAYER_ORDER,
  DEFAULT_LAYER_ADJUSTMENT,
} from '../constants';
import { PRESET_BODY } from '../presets/svgParts';

/** 装備値（パーツオブジェクトまたはURL文字列）から画像URLを取得 */
export function resolvePartSrc(value: EquippedValue): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.src;
}

/** 装備値の識別キー（IDまたはURL）を取得 */
export function resolvePartKey(value: EquippedValue): string {
  if (!value) return '';
  return typeof value === 'string' ? value : value.id;
}

/** 指定カテゴリの微調整パラメータを取得（未指定時はデフォルト値） */
export function getLayerAdjustment(
  adjustments: LayerAdjustmentMap | undefined,
  category: AvatarCategory,
): LayerAdjustment {
  const custom = adjustments?.[category];
  if (!custom) return { ...DEFAULT_LAYER_ADJUSTMENT };
  return {
    dx: custom.dx ?? 0,
    dy: custom.dy ?? 0,
    scale: custom.scale ?? 1,
    rotation: custom.rotation ?? 0,
    flipX: Boolean(custom.flipX),
    aboveTops: Boolean(custom.aboveTops),
    sleeveModeOverride: custom.sleeveModeOverride,
    handHoldModeOverride: custom.handHoldModeOverride,
    holdHandSide: custom.holdHandSide,
    gripHandPose: custom.gripHandPose,
    gripDx: custom.gripDx ?? 0,
    gripDy: custom.gripDy ?? 0,
    gripScale: custom.gripScale ?? 1,
    gripRotation: custom.gripRotation ?? 0,
    gripFlipX: Boolean(custom.gripFlipX),
    gripFlipY: Boolean(custom.gripFlipY),
    bodyClipMode: custom.bodyClipMode,
    bodyClipInsetPx: custom.bodyClipInsetPx,
    bobbing: custom.bobbing,
    pairAdjustments: custom.pairAdjustments,
  };
}

/**
 * 左右ペアパーツ（靴など）のベース微調整と左右個別オフセットを合成した LayerAdjustment を返す
 * - side: 'left'（アバターの左足 / 向かって右）または 'right'（アバターの右足 / 向かって左）
 */
export function getEffectivePairAdjustment(
  baseAdj: LayerAdjustment,
  side: 'left' | 'right',
): LayerAdjustment {
  const pairAdj = baseAdj.pairAdjustments?.[side];
  if (!pairAdj) return baseAdj;

  return {
    ...baseAdj,
    dx: baseAdj.dx + (pairAdj.dx ?? 0),
    dy: baseAdj.dy + (pairAdj.dy ?? 0),
    scale: baseAdj.scale * (pairAdj.scale ?? 1),
    rotation: baseAdj.rotation + (pairAdj.rotation ?? 0),
    flipX: pairAdj.flipX !== undefined ? pairAdj.flipX : baseAdj.flipX,
  };
}

/** 微調整がデフォルトから変更されているか判定 */
export function hasCustomAdjustment(adj: LayerAdjustment | undefined): boolean {
  if (!adj) return false;
  const hasBaseCustom =
    Math.abs(adj.dx) > 0.01 ||
    Math.abs(adj.dy) > 0.01 ||
    Math.abs(adj.scale - 1) > 0.001 ||
    Math.abs(adj.rotation) > 0.05 ||
    Boolean(adj.flipX) ||
    Boolean(adj.aboveTops) ||
    Boolean(adj.sleeveModeOverride) ||
    Boolean(adj.handHoldModeOverride) ||
    Boolean(adj.holdHandSide && adj.holdHandSide !== 'right') ||
    Boolean(adj.gripHandPose && adj.gripHandPose !== 'chibi_single') ||
    Math.abs(adj.gripDx ?? 0) > 0.01 ||
    Math.abs(adj.gripDy ?? 0) > 0.01 ||
    Math.abs((adj.gripScale ?? 1) - 1) > 0.001 ||
    Math.abs(adj.gripRotation ?? 0) > 0.05 ||
    Boolean(adj.gripFlipX) ||
    Boolean(adj.gripFlipY) ||
    Boolean(adj.bodyClipMode && adj.bodyClipMode !== 'auto') ||
    (adj.bodyClipInsetPx !== undefined && Math.abs(adj.bodyClipInsetPx - 2) > 0.01);

  if (hasBaseCustom) return true;

  if (adj.pairAdjustments?.left) {
    const l = adj.pairAdjustments.left;
    if (
      Math.abs(l.dx ?? 0) > 0.01 ||
      Math.abs(l.dy ?? 0) > 0.01 ||
      Math.abs((l.scale ?? 1) - 1) > 0.001 ||
      Math.abs(l.rotation ?? 0) > 0.05 ||
      Boolean(l.flipX)
    ) {
      return true;
    }
  }

  if (adj.pairAdjustments?.right) {
    const r = adj.pairAdjustments.right;
    if (
      Math.abs(r.dx ?? 0) > 0.01 ||
      Math.abs(r.dy ?? 0) > 0.01 ||
      Math.abs((r.scale ?? 1) - 1) > 0.001 ||
      Math.abs(r.rotation ?? 0) > 0.05 ||
      Boolean(r.flipX)
    ) {
      return true;
    }
  }

  return false;
}

/** 現在の装備状態＋微調整状態の比較用シグネチャ文字列を生成 */
export function getEquippedSignature(
  equipped: EquippedParts,
  adjustments?: LayerAdjustmentMap,
): string {
  const eqSig = AVATAR_LAYERS.map((category) => `${category}:${resolvePartKey(equipped[category])}`).join('|');
  if (!adjustments) return eqSig;
  const adjSig = AVATAR_LAYERS.map((category) => {
    const a = getLayerAdjustment(adjustments, category);
    const pairSig = a.pairAdjustments
      ? `[${a.pairAdjustments.left?.dx ?? 0},${a.pairAdjustments.left?.dy ?? 0},${a.pairAdjustments.left?.scale ?? 1},${a.pairAdjustments.left?.rotation ?? 0},${a.pairAdjustments.left?.flipX ? 1 : 0}|${a.pairAdjustments.right?.dx ?? 0},${a.pairAdjustments.right?.dy ?? 0},${a.pairAdjustments.right?.scale ?? 1},${a.pairAdjustments.right?.rotation ?? 0},${a.pairAdjustments.right?.flipX ? 1 : 0}]`
      : '';
    return `${category}@${a.dx},${a.dy},${a.scale},${a.rotation},${a.flipX ? 1 : 0},${a.aboveTops ? 1 : 0},${a.sleeveModeOverride ?? ''},${a.handHoldModeOverride ?? ''},${a.holdHandSide ?? ''},${a.gripHandPose ?? ''},${a.gripDx ?? 0},${a.gripDy ?? 0},${a.gripScale ?? 1},${a.gripRotation ?? 0},${a.gripFlipX ? 1 : 0},${a.gripFlipY ? 1 : 0},${a.bodyClipMode ?? ''},${a.bodyClipInsetPx ?? ''}${pairSig}`;
  }).join('|');
  return `${eqSig}##${adjSig}`;
}

/**
 * キャラクター本体レイヤー群の描画順を返す。
 * - `aboveTops: true` が指定されたレイヤー（左腕・右腕など）は、`tops` の直後に移動して服の前面に描画されます。
 * - 持ち物が `behind_hand`（手の後ろに持つ）モードの時は、`hand_item` を `body`（および腕）のすぐ背面に配置します。
 */
export function getOrderedCharacterBodyLayers(
  adjustments?: LayerAdjustmentMap,
  handHoldMode: 'grip_fist' | 'behind_hand' | 'in_front' = 'grip_fist',
): AvatarCategory[] {
  const promotedToAboveTops: AvatarCategory[] = [];
  const normalOrder: AvatarCategory[] = [];

  for (const cat of CHARACTER_BODY_LAYERS) {
    if (cat === 'hand_item' && handHoldMode === 'behind_hand') {
      continue;
    }
    const adj = adjustments?.[cat];
    // 腕パーツ（arm_left / arm_right）は服の後ろ（奥）がデフォルト配置。
    // 明示的に aboveTops === true が指定された場合のみ服の前面へ昇格。
    const isExplicitAboveTops = Boolean(
      adj?.aboveTops &&
        (cat === 'arm_left' ||
          cat === 'arm_right' ||
          cat === 'leg_left' ||
          cat === 'leg_right' ||
          cat === 'bottoms' ||
          cat === 'shoes'),
    );

    if (isExplicitAboveTops) {
      promotedToAboveTops.push(cat);
    } else {
      normalOrder.push(cat);
    }
  }

  const result: AvatarCategory[] = [];
  for (const cat of normalOrder) {
    if (cat === 'body' && handHoldMode === 'behind_hand') {
      result.push('hand_item');
    }
    result.push(cat);
    if (cat === 'tops' && promotedToAboveTops.length > 0) {
      result.push(...promotedToAboveTops);
    }
  }
  return result;
}

/**
 * カスタムレイヤー順序を解決する。
 * 配列に不足しているカテゴリがあれば末尾に安全に補完し、重複を排除します。
 */
export function resolveAvatarLayerOrder(
  adjustments?: LayerAdjustmentMap,
  customLayerOrder?: AvatarCategory[],
): AvatarCategory[] {
  const baseOrder = customLayerOrder ?? adjustments?.layerOrder ?? DEFAULT_AVATAR_LAYER_ORDER;
  const result: AvatarCategory[] = [];
  const seen = new Set<AvatarCategory>();

  for (const cat of baseOrder) {
    if (AVATAR_LAYERS.includes(cat) && !seen.has(cat)) {
      result.push(cat);
      seen.add(cat);
    }
  }

  // 欠落しているカテゴリがあれば標準順序から安全に追加補完
  for (const cat of DEFAULT_AVATAR_LAYER_ORDER) {
    if (!seen.has(cat)) {
      result.push(cat);
      seen.add(cat);
    }
  }

  return result;
}

/**
 * レイヤーごとの微調整 (LayerAdjustment) を CSS スタイルへ変換する。
 * 512pxに対する % で移動するため、どんな表示サイズ (sm/md/lg/full/px) でも完全に同じ比率で反映されます。
 */
export function adjustmentToLayerStyle(
  category: AvatarCategory,
  adjustment: LayerAdjustment | undefined,
  customPivot?: { x: number; y: number },
): CSSProperties | undefined {
  if (!adjustment || !hasCustomAdjustment(adjustment)) return undefined;

  const pivot = customPivot ?? CATEGORY_META[category].pivot;
  const originX = (pivot.x / AVATAR_CANVAS_SIZE) * 100;
  const originY = (pivot.y / AVATAR_CANVAS_SIZE) * 100;
  const txPct = (adjustment.dx / AVATAR_CANVAS_SIZE) * 100;
  const tyPct = (adjustment.dy / AVATAR_CANVAS_SIZE) * 100;
  const sx = adjustment.scale * (adjustment.flipX ? -1 : 1);
  const sy = adjustment.scale;

  return {
    transformOrigin: `${originX.toFixed(2)}% ${originY.toFixed(2)}%`,
    transform: `translate(${txPct.toFixed(3)}%, ${tyPct.toFixed(3)}%) rotate(${adjustment.rotation}deg) scale(${sx}, ${sy})`,
  };
}

/**
 * 長袖の二の腕マスクや、持ち物着用時の「開いた手先（パー）」マスクを
 * CSS mask-image（複数円の合成対応）へ変換する
 */
export function createSleeveMaskStyle(
  ...masks: ({ cx: number; cy: number; radius: number } | undefined)[]
): CSSProperties | undefined {
  const valid = masks.filter(
    (m): m is { cx: number; cy: number; radius: number } => Boolean(m),
  );
  if (valid.length === 0) return undefined;

  const gradients = valid.map((mask) => {
    const cxPct = ((mask.cx / AVATAR_CANVAS_SIZE) * 100).toFixed(2);
    const cyPct = ((mask.cy / AVATAR_CANVAS_SIZE) * 100).toFixed(2);
    const rPct = ((mask.radius / AVATAR_CANVAS_SIZE) * 100).toFixed(2);
    const featherPct = (((mask.radius + 7) / AVATAR_CANVAS_SIZE) * 100).toFixed(2);
    return `radial-gradient(circle at ${cxPct}% ${cyPct}%, transparent ${rPct}%, black ${featherPct}%)`;
  });

  const combined = gradients.join(', ');
  if (valid.length === 1) {
    return {
      WebkitMaskImage: combined,
      maskImage: combined,
    };
  }
  return {
    WebkitMaskImage: combined,
    maskImage: combined,
    WebkitMaskComposite: 'source-in',
    maskComposite: 'intersect',
  };
}

/** 空の装備マップ（全18カテゴリが null）を生成 */
export function createEmptyEquippedMap(): EquippedPartMap {
  const empty = {} as EquippedPartMap;
  for (const category of AVATAR_LAYERS) {
    empty[category] = null;
  }
  return empty;
}

/**
 * 親アプリから渡された EquippedParts（URL文字列や未指定キーを含む）を
 * 全18カテゴリが揃った EquippedPartMap (Record<AvatarCategory, AvatarPart | null>) に正規化
 */
export function normalizeEquippedParts(
  equipped: EquippedParts | undefined,
  ownedParts: AvatarPart[] = [],
): EquippedPartMap {
  const result = createEmptyEquippedMap();
  if (!equipped) return result;

  for (const category of AVATAR_LAYERS) {
    const val = equipped[category];
    if (!val) {
      result[category] = null;
    } else if (typeof val === 'string') {
      const matched = ownedParts.find(
        (p) => p.category === category && (p.id === val || p.src === val),
      );
      result[category] = matched ?? {
        id: val,
        category,
        name: '外部パーツ',
        src: val,
      };
    } else {
      const matched = ownedParts.find(
        (p) => p.category === category && p.id === val.id,
      );
      result[category] = matched ?? val;
    }
  }

  // 素体 (body) の完全安全ガード：null または src なしの場合は必ず公式素体または登録素体を充填
  if (!result.body || !result.body.src) {
    const customBody = ownedParts.find((p) => p.category === 'body' && p.src);
    result.body = customBody ?? PRESET_BODY;
  }

  // 複数持ち物 (hand_items) の正規化
  if (Array.isArray(equipped.hand_items)) {
    result.hand_items = equipped.hand_items
      .map((val) => {
        if (!val) return null;
        if (typeof val === 'string') {
          return (
            ownedParts.find((p) => p.category === 'hand_item' && (p.id === val || p.src === val)) ?? {
              id: val,
              category: 'hand_item' as AvatarCategory,
              name: '持ち物',
              src: val,
            }
          );
        }
        return val;
      })
      .filter((p): p is AvatarPart => p !== null);
  } else if (result.hand_item) {
    result.hand_items = [result.hand_item];
  } else {
    result.hand_items = [];
  }

  return result;
}

/** 装備マップを「カテゴリ -> パーツID | null」のシンプルなオブジェクトへ変換（Supabase保存用） */
export function toEquippedIdMap(
  equipped: EquippedParts,
): Record<AvatarCategory, string | null> {
  const out = {} as Record<AvatarCategory, string | null>;
  for (const category of AVATAR_LAYERS) {
    const val = equipped[category];
    if (!val) out[category] = null;
    else out[category] = typeof val === 'string' ? val : val.id;
  }
  return out;
}

/**
 * 512x512座標系での切り抜き範囲 (CropRect) を
 * 正方形コンテナ内部のステージ要素に適用するパーセント指定スタイルに変換
 */
export function cropToStageStyle(crop: CropRect): CSSProperties {
  const scale = 100 / crop.size;
  return {
    width: `${AVATAR_CANVAS_SIZE * scale}%`,
    height: `${AVATAR_CANVAS_SIZE * scale}%`,
    left: `${-crop.x * scale}%`,
    top: `${-crop.y * scale}%`,
  };
}

/** ファイル名に使えない文字をアンダースコアに置換 */
export function sanitizeFileName(raw: string): string {
  const cleaned = raw.trim().replace(/[\\/:*?"<>|\s]+/g, '_');
  return cleaned || 'part';
}

/**
 * 指定されたパーツが「ワンピース」または「ドレス」であるかを判定する。
 * - linkedParts.isOnePiece が true
 * - パーツ名に「ワンピース」「ワンピ」「ドレス」「dress」「onepiece」が含まれる
 * - meta.isOnePiece または meta.dress が true
 */
export function isDressOrOnePiecePart(part: AvatarPart | null | undefined): boolean {
  if (!part) return false;
  if (part.category !== 'tops') return false;

  if (part.linkedParts?.isOnePiece === true) return true;

  const name = (part.name || '').toLowerCase();
  if (
    name.includes('ワンピース') ||
    name.includes('ワンピ') ||
    name.includes('ドレス') ||
    name.includes('dress') ||
    name.includes('onepiece') ||
    name.includes('one-piece')
  ) {
    return true;
  }

  if (part.meta && (part.meta.isOnePiece || part.meta.dress)) {
    return true;
  }

  return false;
}

/**
 * パーツ選択サムネイル（カード）内で、透過PNGパーツを枠の中心に大きくセンタリング表示するためのCSSスタイルを計算
 */
export function getPartThumbnailStyle(part: AvatarPart | null | undefined): CSSProperties {
  if (!part) return {};
  const meta = CATEGORY_META[part.category];
  const bounds = part.rig?.bounds;

  let scale = 1.35;
  let cx = meta?.targetSpec?.defaultCenter?.x ?? 256;
  let cy = meta?.targetSpec?.defaultCenter?.y ?? 256;

  if (
    bounds &&
    typeof bounds.width === 'number' &&
    typeof bounds.height === 'number' &&
    bounds.width > 0 &&
    bounds.height > 0
  ) {
    if (Number.isFinite(bounds.centerX)) cx = bounds.centerX;
    if (Number.isFinite(bounds.centerY)) cy = bounds.centerY;

    // 靴（shoes）の場合は左右対称の両足セットのため、X軸の中心はキャンバス中央(256)に固定
    if (part.category === 'shoes') {
      cx = 256;
    }

    const effectiveWidth = part.category === 'shoes' ? Math.max(bounds.width, 92) : bounds.width;
    const maxDim = Math.max(effectiveWidth, bounds.height);
    if (Number.isFinite(maxDim) && maxDim > 0) {
      scale = Math.min(2.8, Math.max(1.15, (AVATAR_CANVAS_SIZE * 0.72) / maxDim));
    }
  } else if (meta?.targetSpec) {
    const maxDim = Math.max(meta.targetSpec.targetWidth, meta.targetSpec.targetHeight);
    if (Number.isFinite(maxDim) && maxDim > 0) {
      scale = Math.min(2.6, Math.max(1.15, (AVATAR_CANVAS_SIZE * 0.75) / maxDim));
    }
  }

  if (!Number.isFinite(scale) || scale <= 0) scale = 1.35;
  if (!Number.isFinite(cx)) cx = 256;
  if (!Number.isFinite(cy)) cy = 256;

  // キャンバス中心(256, 256)とパーツ中心(cx, cy)のズレを打ち消す移動量（%）
  // transform-origin: center center かつ translate(tx, ty) scale(s) の場合、
  // 拡大によって中心からのオフセット (cx - 256, cy - 256) が scale 倍に広がるため、
  // カード中央に正確に引き戻すには移動量にも scale を乗算する必要がある。
  const tx = ((256 - cx) / AVATAR_CANVAS_SIZE) * 100 * scale;
  const ty = ((256 - cy) / AVATAR_CANVAS_SIZE) * 100 * scale;

  return {
    transform: `translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%) scale(${scale.toFixed(2)})`,
    transformOrigin: 'center center',
  };
}
