/**
 * モバゲー風3頭身2Dアバター描画モジュール ＆ AI位置合わせ・透過スタジオ
 *
 * 既存アプリへの移植時は、この `src/features/avatar/` ディレクトリをそのままコピーして利用できます。
 */

// 1. 型定義
export * from './types';

// 2. 定数・メタデータ
export * from './constants';

// 3. コンポーネント
export { AvatarRenderer, type AvatarRendererProps } from './components/AvatarRenderer';
export { AvatarCloset, type AvatarClosetProps } from './components/AvatarCloset';
export {
  AvatarLayerOrderPanel,
  type AvatarLayerOrderPanelProps,
} from './components/AvatarLayerOrderPanel';
export {
  EllipseCropModal,
  type EllipseCropModalProps,
  type EllipseCropResult,
  type EllipseCropReferenceOption,
} from './components/EllipseCropModal';
export {
  PartCalibrationStudio,
  type PartCalibrationStudioProps,
} from './components/PartCalibrationStudio';
export { CATEGORY_ICONS } from './components/categoryIcons';

// 4. アバター透過PNG書き出しユーティリティ
export {
  renderAvatarToCanvas,
  exportAvatarAsDataURL,
  exportAvatarAsBlob,
  downloadDataUrl,
  downloadBlob,
  loadAvatarImage,
  type AvatarExportOptions,
} from './utils/composeAvatar';

// 5. パーツ・装備マップ・レイヤー微調整ユーティリティ
export {
  resolvePartSrc,
  resolvePartKey,
  getLayerAdjustment,
  hasCustomAdjustment,
  getEquippedSignature,
  getOrderedCharacterBodyLayers,
  resolveAvatarLayerOrder,
  adjustmentToLayerStyle,
  createEmptyEquippedMap,
  normalizeEquippedParts,
  toEquippedIdMap,
  cropToStageStyle,
  sanitizeFileName,
  isDressOrOnePiecePart,
  getPartThumbnailStyle,
  getPartDefaultAdjustment,
  resolveEffectiveAdjustments,
} from './utils/parts';

// 6. クロマキー透過・トランスフォーム計算ユーティリティ
export {
  processChromaKeyImageData,
  detectCornerBackgroundColors,
  createInitialFitTransform,
  drawPartWithTransform,
  stagePointToSourcePixel,
  getTransformedBoundingCorners,
  rgbToHex,
  hexToRgb,
  type ChromaKeyColor,
  type ChromaKeySettings,
} from './utils/imageProcessing';

// 7. カタログ＆目安ポイント管理フック・ストレージ
export {
  useEllipseSelection,
  boundsToGeometry,
  geometryToBounds,
  isPointInsideEllipse,
  getHandlePositions,
  type ResizeHandle,
  type EllipseBounds,
  type EllipseGeometry,
  type UseEllipseSelectionOptions,
} from './hooks/useEllipseSelection';
export { usePartCatalog } from './hooks/usePartCatalog';
export { useReferenceAnchors } from './hooks/useReferenceAnchors';
export {
  listCatalogParts,
  saveCatalogPart,
  duplicateCatalogPart,
  removeCatalogPart,
  clearCatalogParts,
  PART_CATALOG_UPDATED_EVENT,
  type DuplicateCatalogPartOptions,
} from './storage/partCatalog';
export {
  fetchCloudCatalog,
  checkNewCloudItems,
  importCloudPartsToLocal,
  uploadCatalogToCloud,
  scheduleCloudCatalogUpload,
  startCloudCatalogSync,
  NEW_AVATAR_PARTS_DETECTED_EVENT,
  type NewPartsDetectedDetail,
} from './storage/cloudCatalogSync';
export {
  loadReferenceAnchors,
  saveReferenceAnchors,
  loadProportionGuideConfig,
  saveProportionGuideConfig,
} from './storage/anchorStorage';
export {
  loadSavedLayoutTemplate,
  saveLayoutTemplate,
  saveCategoryLayoutTemplate,
  clearSavedLayoutTemplate,
  loadAutoApplyTemplatePreference,
  saveAutoApplyTemplatePreference,
  applyLayoutTemplate,
} from './storage/layoutTemplateStorage';

// 8. 自動サイズ正規化・ソケット関節リギング・輪郭解析・自動握り手ユーティリティ
export {
  detectOpaqueBounds,
  computeAutoNormalizedTransform,
  computeTransformMatchingReferenceBounds,
  analyzeNormalizedCanvasRig,
  solveAutoRigAdjustments,
  extractSkinAndOutlinePalette,
  getOppositeSymmetryCategory,
  buildMirroredPartName,
  mirrorPartRigHorizontally,
  DEFAULT_PART_COLOR_PALETTE,
  type SolvedAvatarRigResult,
  type SolvedHandGripFist,
} from './utils/autoRigging';

// 9. 3層サンドイッチ用 指先チップ定義＆ベクターパスプリセット
export {
  HAND_SPRITE_PRESETS,
  GRIP_HAND_POSE_LIST,
  FINGER_CHIP_SVG_PATHS,
  normalizeGripHandPose,
  type HandSpritePair,
  type FingerChipPose,
} from './assets/handSprites';

// 10. 初期プリセットパーツ＆子どものアバター解決ヘルパー
export {
  PRESET_PARTS,
  PRESET_BODY,
  PRESET_BODY_SRC,
  DEFAULT_EQUIPPED,
} from './presets/svgParts';

import { PRESET_PARTS, PRESET_BODY, DEFAULT_EQUIPPED } from './presets/svgParts';
import type { AvatarCategory, AvatarPart, EquippedParts, EquippedPartMap } from './types';
import { isDressOrOnePiecePart } from './utils/parts';

export function resolveChildEquippedParts(
  avatarStudio?: {
    equipped?: Partial<Record<string, string | null>>;
    hand_items?: string[];
  },
  catalogParts: AvatarPart[] = [],
): EquippedParts {
  const allPartsMap = new Map<string, AvatarPart>();
  allPartsMap.set(PRESET_BODY.id, PRESET_BODY);
  for (const p of catalogParts) {
    allPartsMap.set(p.id, p);
  }

  // 1. 親工房で設定されている最新の素体（localStorage）または自作素体（catalogParts）を取得
  let parentStudioBodyPart: AvatarPart | null = null;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('mobage_avatar_current_equipped_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.body && typeof parsed.body === 'object' && parsed.body.src) {
          parentStudioBodyPart = parsed.body as AvatarPart;
        } else if (parsed.body && typeof parsed.body === 'string') {
          parentStudioBodyPart = allPartsMap.get(parsed.body) ?? null;
        }
      }
    } catch {
      // ignore
    }
  }

  const customBodies = catalogParts.filter(
    (p) => p.category === 'body' && (p.source === 'custom' || !p.id.startsWith('preset_')),
  );
  const activeCustomBody = customBodies.length > 0 ? customBodies[customBodies.length - 1] : null;
  const preferredBody = parentStudioBodyPart ?? activeCustomBody ?? PRESET_BODY;

  // 2. 自作素体（またはフォールバック素体）を基本ベースとする
  const result: EquippedParts = {
    body: preferredBody,
  };

  // 3. 子どもの個別着せ替えデータ（avatarStudio.equipped）をマージ
  if (avatarStudio?.equipped) {
    for (const [cat, partId] of Object.entries(avatarStudio.equipped)) {
      const categoryKey = cat as AvatarCategory;
      if (partId === null) {
        // 明示的に「はずす」された場合（素体以外）
        if (categoryKey !== 'body') {
          result[categoryKey] = null;
        }
      } else if (partId) {
        const found = allPartsMap.get(partId);
        if (found) {
          result[categoryKey] = found;
        }
      }
    }
  }

  // 3.5 複数持ち物 (hand_items) の解決
  if (avatarStudio?.hand_items && Array.isArray(avatarStudio.hand_items)) {
    const resolvedHandItems: AvatarPart[] = [];
    for (const hId of avatarStudio.hand_items) {
      const p = allPartsMap.get(hId);
      if (p) resolvedHandItems.push(p);
    }
    result.hand_items = resolvedHandItems;
    if (resolvedHandItems.length > 0 && !result.hand_item) {
      result.hand_item = resolvedHandItems[0];
    } else if (resolvedHandItems.length === 0) {
      result.hand_item = null;
    }
  } else if (result.hand_item) {
    const single =
      typeof result.hand_item === 'string'
        ? allPartsMap.get(result.hand_item) ?? null
        : result.hand_item;
    result.hand_items = single ? [single] : [];
  } else {
    result.hand_items = [];
  }

  // 3.8 トップス（ワンピース・服）やボトムス（ズボン）にセット記憶がある場合、手足が未指定なら自動連動で補完
  const currentTops = result.tops as AvatarPart | null;
  if (currentTops?.linkedParts) {
    const lp = currentTops.linkedParts;
    if (lp.arm_left && !result.arm_left) {
      const p = allPartsMap.get(lp.arm_left);
      if (p) result.arm_left = p;
    }
    if (lp.arm_right && !result.arm_right) {
      const p = allPartsMap.get(lp.arm_right);
      if (p) result.arm_right = p;
    }
    if (lp.leg_left && !result.leg_left) {
      const p = allPartsMap.get(lp.leg_left);
      if (p) result.leg_left = p;
    }
    if (lp.leg_right && !result.leg_right) {
      const p = allPartsMap.get(lp.leg_right);
      if (p) result.leg_right = p;
    }
    // ワンピース・ドレス着用時のみ、ズボンを自動で非装着にする（通常の服では絶対に外さない）
    if (isDressOrOnePiecePart(currentTops) && lp.bottoms === null && (!avatarStudio?.equipped || avatarStudio.equipped.bottoms === undefined)) {
      result.bottoms = null;
    }
  }

  const currentBottoms = result.bottoms as AvatarPart | null;
  if (currentBottoms?.linkedParts) {
    const lp = currentBottoms.linkedParts;
    if (lp.leg_left && !result.leg_left) {
      const p = allPartsMap.get(lp.leg_left);
      if (p) result.leg_left = p;
    }
    if (lp.leg_right && !result.leg_right) {
      const p = allPartsMap.get(lp.leg_right);
      if (p) result.leg_right = p;
    }
  }

  // 4. 素体の強制ガード：素体が未設定、null、または旧SVG（preset_body_tan等）の場合、
  //    必ずアバター工房の高品質イラスト素体／自作素体にアップグレード
  const currentBodyId = typeof result.body === 'string' ? result.body : result.body?.id;
  const currentBodySrc = typeof result.body === 'string' ? result.body : result.body?.src;
  if (!result.body || currentBodyId === 'preset_body_tan' || !currentBodySrc) {
    result.body = preferredBody;
  }

  return result;
}


