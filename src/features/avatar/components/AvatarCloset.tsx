import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Ban,
  BookmarkCheck,
  Check,
  ChevronDown,
  Circle,
  CircleUser,
  Cloud,
  Copy,
  Download,
  FlipHorizontal,
  FlipVertical,
  Layers,
  Link2,
  Loader2,
  Move,
  Pause,
  Pencil,
  PersonStanding,
  Play,
  Plus,
  RotateCcw,
  Save,
  Scissors,
  Sliders,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  applyLayoutTemplate,
  loadAutoApplyTemplatePreference,
  loadSavedLayoutTemplate,
  saveAutoApplyTemplatePreference,
  saveCategoryLayoutTemplate,
  saveLayoutTemplate,
  type SavedLayoutTemplateMap,
} from '../storage/layoutTemplateStorage';
import { AVATAR_LAYERS } from '../types';
import type {
  AvatarCategory,
  AvatarPart,
  BodySilhouetteClipMode,
  EquippedPartMap,
  EquippedParts,
  HandHoldMode,
  ItemLayerPlacement,
  LayerAdjustment,
  LayerAdjustmentMap,
  TopSleeveMode,
} from '../types';
import {
  AVATAR_CANVAS_SIZE,
  CATEGORY_META,
  DEFAULT_AVATAR_LAYER_ORDER,
  FACE_CROP,
  FULL_CROP,
} from '../constants';
import {
  createEmptyEquippedMap,
  getEquippedSignature,
  getLayerAdjustment,
  hasCustomAdjustment,
  isDressOrOnePiecePart,
  normalizeEquippedParts,
  resolvePartKey,
  resolvePartSrc,
} from '../utils/parts';
import { PRESET_BODY_SRC } from '../presets/svgParts';
import {
  getOppositeSymmetryCategory,
  solveAutoRigAdjustments,
} from '../utils/autoRigging';
import {
  duplicateCatalogPart,
  saveCatalogPart,
  type DuplicateCatalogPartOptions,
} from '../storage/partCatalog';
import {
  checkNewCloudItems,
  importCloudPartsToLocal,
  uploadCatalogToCloud,
} from '../storage/cloudCatalogSync';
import { toast } from '../../../components/ui';
import { downloadDataUrl, exportAvatarAsDataURL } from '../utils/composeAvatar';
import { AvatarRenderer } from './AvatarRenderer';
import { AvatarLayerOrderPanel } from './AvatarLayerOrderPanel';
import {
  EllipseCropModal,
  type EllipseCropResult,
  type EllipseCropReferenceOption,
} from './EllipseCropModal';
import { CATEGORY_ICONS } from './categoryIcons';

export interface AvatarClosetProps {
  /** 親アプリの「所持パーツリスト」 */
  ownedParts: AvatarPart[];
  /** 現在の装備データ */
  equippedParts: EquippedParts;
  /** 現在のレイヤー位置・角度・サイズ微調整データ */
  adjustments?: LayerAdjustmentMap;
  /** 「決定」ボタンを押した時に発火するコールバック（装備データと微調整データの両方を渡す） */
  onSave: (
    newEquippedParts: EquippedPartMap,
    newAdjustments: LayerAdjustmentMap,
  ) => void | Promise<void>;
  /** 試着状態が変化するたびに通知するオプションコールバック */
  onDraftChange?: (draftEquipped: EquippedPartMap, draftAdjustments: LayerAdjustmentMap) => void;
  /** スタジオでパーツを作成後、すぐにそのパーツを試着状態で開くための指定 */
  initialTryOnPart?: AvatarPart | null;
  /** 初期選択カテゴリ */
  initialCategory?: AvatarCategory;
  /** スタジオ画面へジャンプするためのコールバック（任意） */
  onOpenStudioForCategory?: (category: AvatarCategory) => void;
  /** 登録済みパーツをスタジオに読み込んで再編集するコールバック（任意） */
  onEditPartInStudio?: (part: AvatarPart) => void;
  /** カタログ内のパーツを複製するコールバック（任意・省略時は内蔵カタログに直接複製） */
  onDuplicatePart?: (
    part: AvatarPart,
    options?: DuplicateCatalogPartOptions,
  ) => Promise<AvatarPart | void> | void;
  /** カタログ内のパーツを削除するコールバック（任意） */
  onDeletePart?: (partId: string) => void | Promise<void>;
  /** 決定ボタンのラベル */
  saveButtonLabel?: string;
  className?: string;
}

const PROMOTABLE_TO_ABOVE_TOPS: AvatarCategory[] = [
  'arm_left',
  'arm_right',
  'leg_left',
  'leg_right',
  'bottoms',
  'shoes',
];

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * 既存アプリ組み込み用：着せ替えクローゼットUI (<AvatarCloset />)
 *
 * - 全18カテゴリ（素体から独立した左腕・右腕・左脚・右脚を含む）すべてで「なし（未装着）」を選択可能
 * - 服装に合わせて手や足、持ち物、靴などの位置・角度・サイズ・前後順をプレビュー上で直接ドラッグ＆スライダー微調整可能
 * - 左側のアバタープレビューを常時画面に固定（Sticky追従）し、右パネルをタブ＆独立スクロール化することでスクロールしてもアバターが見えなくならない設計
 */
export function AvatarCloset({
  ownedParts,
  equippedParts,
  adjustments: initialAdjustments = {},
  onSave,
  onDraftChange,
  initialTryOnPart = null,
  initialCategory,
  onOpenStudioForCategory,
  onEditPartInStudio,
  onDuplicatePart,
  onDeletePart,
  saveButtonLabel = '決定（装備と位置調整を保存）',
  className = '',
}: AvatarClosetProps) {
  const buildInitialDraft = () => {
    const base = normalizeEquippedParts(equippedParts, ownedParts);
    if (initialTryOnPart) {
      base[initialTryOnPart.category] = initialTryOnPart;
    }
    return base;
  };

  const [draft, setDraft] = useState<EquippedPartMap>(buildInitialDraft);
  const [draftAdjustments, setDraftAdjustments] = useState<LayerAdjustmentMap>(
    () => ({ ...initialAdjustments }),
  );
  const [activeCategory, setActiveCategory] = useState<AvatarCategory>(
    initialTryOnPart?.category ?? initialCategory ?? 'body',
  );
  const [rightTab, setRightTab] = useState<'parts' | 'adjust' | 'layers'>('parts');

  // レイヤー重なり順の変更ハンドラ
  const handleLayerOrderChange = (newOrder: AvatarCategory[]) => {
    setDraftAdjustments((prev) => ({
      ...prev,
      layerOrder: newOrder,
    }));
  };

  // レイヤー重なり順の標準リセットハンドラ
  const handleResetLayerOrder = () => {
    setDraftAdjustments((prev) => ({
      ...prev,
      layerOrder: [...DEFAULT_AVATAR_LAYER_ORDER],
    }));
    toast('レイヤーの重なり順を標準に戻しました', '🔄');
  };
  const [previewMode, setPreviewMode] = useState<'full' | 'face'>('full');
  const [animate, setAnimate] = useState<boolean>(true);
  // 関節吸着は完全廃止のため常にOFF
  const autoRig = false;
  const [dragAdjustOnPreview, setDragAdjustOnPreview] = useState<boolean>(true);
  const [isDraggingPreview, setIsDraggingPreview] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const [savedTemplate, setSavedTemplate] = useState<SavedLayoutTemplateMap>(loadSavedLayoutTemplate);
  const [autoApplyTemplate, setAutoApplyTemplate] = useState<boolean>(
    loadAutoApplyTemplatePreference,
  );
  // 素体のはみ出しカット（高度な設定）の折りたたみ状態（デフォルト閉じる）
  const [showAdvancedClipping, setShowAdvancedClipping] = useState<boolean>(false);
  // パーツ名のインライン編集状態
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editingPartName, setEditingPartName] = useState<string>('');

  // 楕円切り抜きモーダルの対象パーツ
  const [croppingPart, setCroppingPart] = useState<AvatarPart | null>(null);
  const [fullAvatarCropGuideSrc, setFullAvatarCropGuideSrc] = useState<string | null>(null);

  // 編集対象パーツを開いた際、そのパーツ以外の現在のアバター全身透過PNGを非同期生成（参照ガイド用）
  useEffect(() => {
    if (!croppingPart) {
      setFullAvatarCropGuideSrc(null);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const url = await exportAvatarAsDataURL(draft, {
          excludeLayers: [croppingPart.category],
          adjustments: draftAdjustments,
        });
        if (active) {
          setFullAvatarCropGuideSrc(url);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [croppingPart, draft, draftAdjustments]);

  // 照らし合わせ用 参照ガイドリストの構築
  const cropReferenceOptions = useMemo<EllipseCropReferenceOption[]>(() => {
    if (!croppingPart) return [];
    const res: EllipseCropReferenceOption[] = [];

    // 1. 素体（首元・頭部・鎖骨・胴体・手足の基本ガイド）
    const bodySrc = resolvePartSrc(draft.body) || PRESET_BODY_SRC;
    if (bodySrc) {
      res.push({
        id: 'body',
        label: '素体（頭・首・鎖骨・ボディライン）',
        src: bodySrc,
        category: 'body',
      });
    }

    // 2. アバター全身（編集中パーツ以外をすべて合成したオニオンスキン）
    if (fullAvatarCropGuideSrc) {
      res.push({
        id: 'full_avatar',
        label: 'アバター全身（編集パーツ以外）',
        src: fullAvatarCropGuideSrc,
      });
    }

    // 3. 前髪
    const hairFrontSrc = resolvePartSrc(draft.hair_front);
    if (hairFrontSrc && croppingPart.category !== 'hair_front') {
      res.push({
        id: 'hair_front',
        label: '前髪 (Hair Front)',
        src: hairFrontSrc,
        category: 'hair_front',
      });
    }

    // 4. トップス（服）
    const topsSrc = resolvePartSrc(draft.tops);
    if (topsSrc && croppingPart.category !== 'tops') {
      res.push({
        id: 'tops',
        label: 'トップス・服 (Tops)',
        src: topsSrc,
        category: 'tops',
      });
    }

    // 5. ボトムス（ズボン）
    const bottomsSrc = resolvePartSrc(draft.bottoms);
    if (bottomsSrc && croppingPart.category !== 'bottoms') {
      res.push({
        id: 'bottoms',
        label: 'ボトムス・ズボン (Bottoms)',
        src: bottomsSrc,
        category: 'bottoms',
      });
    }

    return res;
  }, [croppingPart, draft, fullAvatarCropGuideSrc]);

  // 編集中パーツのカテゴリに応じた初期選択参照ガイド
  const defaultCropReferenceId = useMemo(() => {
    if (!croppingPart) return 'body';
    if (['hat_glasses'].includes(croppingPart.category)) {
      return fullAvatarCropGuideSrc ? 'full_avatar' : 'body';
    }
    return 'body';
  }, [croppingPart, fullAvatarCropGuideSrc]);

  const handleApplyCropToPart = async (result: EllipseCropResult) => {
    if (!croppingPart) return;
    const updatedPart: AvatarPart = {
      ...croppingPart,
      src: result.dataUrl,
    };
    try {
      await saveCatalogPart(updatedPart);
      setDraft((prev) => ({
        ...prev,
        [croppingPart.category]: updatedPart,
      }));
      toast(`「${croppingPart.name}」に楕円切り抜きを反映しました！✨`, '✂️');
    } catch (err) {
      console.error('Failed to save cropped part:', err);
      toast('パーツの保存に失敗しました', '❌');
    }
  };

  const previewBoxRef = useRef<HTMLDivElement | null>(null);
  const previewDragRef = useRef<{
    target: 'part' | 'grip_hand';
    startX: number;
    startY: number;
    origDx: number;
    origDy: number;
  } | null>(null);

  const parentSignature = getEquippedSignature(equippedParts, initialAdjustments);
  const tryOnId = initialTryOnPart?.id ?? '';

  useEffect(() => {
    setDraft(buildInitialDraft());
    setDraftAdjustments({ ...initialAdjustments });
    if (initialTryOnPart) {
      setActiveCategory(initialTryOnPart.category);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentSignature, tryOnId]);

  const draftCallbackRef = useRef(onDraftChange);
  draftCallbackRef.current = onDraftChange;
  useEffect(() => {
    draftCallbackRef.current?.(draft, draftAdjustments);
  }, [draft, draftAdjustments]);

  // カテゴリごとの所持パーツ一覧
  const partsByCategory = useMemo(() => {
    const map = new Map<AvatarCategory, AvatarPart[]>();
    for (const layer of AVATAR_LAYERS) {
      map.set(layer, []);
    }
    for (const part of ownedParts) {
      const list = map.get(part.category);
      if (list) list.push(part);
    }
    return map;
  }, [ownedParts]);

  // 親子ソケット関節リギング計算結果
  const solvedRig = useMemo(
    () => solveAutoRigAdjustments(draft, draftAdjustments, autoRig),
    [draft, draftAdjustments, autoRig],
  );
  const activeAutoOffset = solvedRig.autoOffsets[activeCategory];

  const activeCategoryParts = partsByCategory.get(activeCategory) ?? [];
  const currentEquippedInActive = draft[activeCategory];
  const currentAdjustment = getLayerAdjustment(draftAdjustments, activeCategory);
  const isCurrentAdjusted = hasCustomAdjustment(currentAdjustment);

  // 複数持ち物リストの取得と現在編集中の持ち物
  const currentHandItems: AvatarPart[] = useMemo(() => {
    if (Array.isArray(draft.hand_items) && draft.hand_items.length > 0) {
      return draft.hand_items;
    }
    if (draft.hand_item) {
      return [draft.hand_item];
    }
    return [];
  }, [draft.hand_items, draft.hand_item]);

  const [selectedHandItemId, setSelectedHandItemId] = useState<string | null>(null);
  const activeHandItem = useMemo(() => {
    if (currentHandItems.length === 0) return null;
    if (selectedHandItemId) {
      const found = currentHandItems.find((p) => p.id === selectedHandItemId);
      if (found) return found;
    }
    return currentHandItems[0];
  }, [currentHandItems, selectedHandItemId]);

  const activeHandItemAdjustment = useMemo(() => {
    if (!activeHandItem) return getLayerAdjustment(draftAdjustments, 'hand_item');
    const specific = draftAdjustments.handItemAdjustments?.[activeHandItem.id];
    if (specific) return specific;
    return getLayerAdjustment(draftAdjustments, 'hand_item');
  }, [activeHandItem, draftAdjustments]);

  const handItemAdjustment = activeHandItemAdjustment;

  const hasAnyEquipped = useMemo(
    () => AVATAR_LAYERS.some((cat) => Boolean(draft[cat])),
    [draft],
  );
  const hasAnyAdjustments = useMemo(
    () => AVATAR_LAYERS.some((cat) => hasCustomAdjustment(draftAdjustments[cat])),
    [draftAdjustments],
  );
  const isDirty = getEquippedSignature(draft, draftAdjustments) !== parentSignature;

  // トップスと手の現在のセット記憶状況
  const currentTopsKey = resolvePartKey(draft.tops);
  const currentTopsPart = useMemo(() => {
    if (!currentTopsKey) return null;
    return (
      ownedParts.find((p) => p.id === currentTopsKey) ??
      (typeof draft.tops === 'object' && draft.tops ? draft.tops : null)
    );
  }, [currentTopsKey, ownedParts, draft.tops]);

  const currentArmLeftKey = resolvePartKey(draft.arm_left) || null;
  const currentArmRightKey = resolvePartKey(draft.arm_right) || null;

  const currentArmLeftName = useMemo(() => {
    if (!currentArmLeftKey) return '素体の腕';
    if (typeof draft.arm_left === 'object' && draft.arm_left?.name) return draft.arm_left.name;
    const found = ownedParts.find((p) => p.id === currentArmLeftKey);
    return found?.name ?? 'カスタム腕';
  }, [currentArmLeftKey, draft.arm_left, ownedParts]);

  const currentArmRightName = useMemo(() => {
    if (!currentArmRightKey) return '素体の腕';
    if (typeof draft.arm_right === 'object' && draft.arm_right?.name) return draft.arm_right.name;
    const found = ownedParts.find((p) => p.id === currentArmRightKey);
    return found?.name ?? 'カスタム腕';
  }, [currentArmRightKey, draft.arm_right, ownedParts]);

  const isHandsLinkedToTops = useMemo(() => {
    if (!currentTopsPart?.linkedParts) return false;
    const lp = currentTopsPart.linkedParts;
    return (
      (lp.arm_left ?? null) === currentArmLeftKey &&
      (lp.arm_right ?? null) === currentArmRightKey
    );
  }, [currentTopsPart, currentArmLeftKey, currentArmRightKey]);

  // ボトムスと足の現在のセット記憶状況
  const currentBottomsKey = resolvePartKey(draft.bottoms);
  const currentBottomsPart = useMemo(() => {
    if (!currentBottomsKey) return null;
    return (
      ownedParts.find((p) => p.id === currentBottomsKey) ??
      (typeof draft.bottoms === 'object' && draft.bottoms ? draft.bottoms : null)
    );
  }, [currentBottomsKey, ownedParts, draft.bottoms]);

  const currentLegLeftKey = resolvePartKey(draft.leg_left) || null;
  const currentLegRightKey = resolvePartKey(draft.leg_right) || null;

  const currentLegLeftName = useMemo(() => {
    if (!currentLegLeftKey) return '素体の脚';
    if (typeof draft.leg_left === 'object' && draft.leg_left?.name) return draft.leg_left.name;
    const found = ownedParts.find((p) => p.id === currentLegLeftKey);
    return found?.name ?? 'カスタム脚';
  }, [currentLegLeftKey, draft.leg_left, ownedParts]);

  const currentLegRightName = useMemo(() => {
    if (!currentLegRightKey) return '素体の脚';
    if (typeof draft.leg_right === 'object' && draft.leg_right?.name) return draft.leg_right.name;
    const found = ownedParts.find((p) => p.id === currentLegRightKey);
    return found?.name ?? 'カスタム脚';
  }, [currentLegRightKey, draft.leg_right, ownedParts]);

  // ワンピース・ドレス用（手・足両方がこの服にセット記憶されているか）
  const isFullSetLinkedToTops = useMemo(() => {
    if (!currentTopsPart?.linkedParts) return false;
    const lp = currentTopsPart.linkedParts;
    return (
      (lp.arm_left ?? null) === currentArmLeftKey &&
      (lp.arm_right ?? null) === currentArmRightKey &&
      (lp.leg_left ?? null) === currentLegLeftKey &&
      (lp.leg_right ?? null) === currentLegRightKey
    );
  }, [currentTopsPart, currentArmLeftKey, currentArmRightKey, currentLegLeftKey, currentLegRightKey]);

  const isLegsLinkedToBottoms = useMemo(() => {
    if (!currentBottomsPart?.linkedParts) return false;
    const lp = currentBottomsPart.linkedParts;
    return (
      (lp.leg_left ?? null) === currentLegLeftKey &&
      (lp.leg_right ?? null) === currentLegRightKey
    );
  }, [currentBottomsPart, currentLegLeftKey, currentLegRightKey]);

  const isTopsRelatedCategory = ['tops', 'arm_left', 'arm_right'].includes(activeCategory);
  const isBottomsRelatedCategory = ['bottoms', 'leg_left', 'leg_right'].includes(activeCategory);

  // 現在のカテゴリの微調整を更新
  const updateActiveAdjustment = (patch: Partial<LayerAdjustment>) => {
    setDraftAdjustments((prev) => {
      const current = getLayerAdjustment(prev, activeCategory);
      const next: LayerAdjustment = {
        ...current,
        ...patch,
        dx: patch.dx !== undefined ? round1(patch.dx) : current.dx,
        dy: patch.dy !== undefined ? round1(patch.dy) : current.dy,
        scale: patch.scale !== undefined ? Number(patch.scale.toFixed(3)) : current.scale,
        rotation: patch.rotation !== undefined ? round1(patch.rotation) : current.rotation,
      };
      return {
        ...prev,
        [activeCategory]: next,
      };
    });
  };

  // 持ち物（hand_item）の微調整を更新
  const updateHandItemAdjustment = (patch: Partial<LayerAdjustment>, targetItemId?: string) => {
    setDraftAdjustments((prev) => {
      const targetId = targetItemId ?? activeHandItem?.id;
      const current =
        targetId && prev.handItemAdjustments?.[targetId]
          ? prev.handItemAdjustments[targetId]
          : getLayerAdjustment(prev, 'hand_item');

      const next: LayerAdjustment = {
        ...current,
        ...patch,
        dx: patch.dx !== undefined ? round1(patch.dx) : current.dx,
        dy: patch.dy !== undefined ? round1(patch.dy) : current.dy,
        scale: patch.scale !== undefined ? Number(patch.scale.toFixed(3)) : current.scale,
        rotation: patch.rotation !== undefined ? round1(patch.rotation) : current.rotation,
        flipX: patch.flipX !== undefined ? patch.flipX : current.flipX,
        bobbing: patch.bobbing !== undefined ? patch.bobbing : current.bobbing,
        layerPlacement: patch.layerPlacement !== undefined ? patch.layerPlacement : current.layerPlacement,
      };

      const updatedMap: LayerAdjustmentMap = {
        ...prev,
      };

      if (targetId) {
        updatedMap.handItemAdjustments = {
          ...(prev.handItemAdjustments || {}),
          [targetId]: next,
        };
        // 最初のアイテム、または単一アイテムの場合は hand_item も更新
        if (!currentHandItems[0] || currentHandItems[0].id === targetId) {
          updatedMap.hand_item = next;
        }
      } else {
        updatedMap.hand_item = next;
      }

      return updatedMap;
    });
  };

  const resetHandItemMainAdjustment = () => {
    updateHandItemAdjustment({
      dx: 0,
      dy: 0,
      scale: 1,
      rotation: 0,
      flipX: false,
    });
  };

  const resetActiveAdjustment = () => {
    setDraftAdjustments((prev) => {
      const next = { ...prev };
      delete next[activeCategory];
      return next;
    });
  };

  const resetAllAdjustments = () => {
    setDraftAdjustments({});
  };

  // ==================== プレビュー画面上での直接ドラッグ＆ホイール微調整 ====================
  const handlePreviewPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragAdjustOnPreview || e.button !== 0) return;
    if (!currentEquippedInActive && !draft.hand_item) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingPreview(true);
    if (activeCategory === 'hand_item' || (!currentEquippedInActive && draft.hand_item)) {
      previewDragRef.current = {
        target: 'part',
        startX: e.clientX,
        startY: e.clientY,
        origDx: handItemAdjustment.dx,
        origDy: handItemAdjustment.dy,
      };
    } else {
      previewDragRef.current = {
        target: 'part',
        startX: e.clientX,
        startY: e.clientY,
        origDx: currentAdjustment.dx,
        origDy: currentAdjustment.dy,
      };
    }
  };

  const handlePreviewPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = previewDragRef.current;
    const box = previewBoxRef.current;
    if (!drag || !box) return;
    const rect = box.getBoundingClientRect();
    const activeCrop = previewMode === 'face' ? FACE_CROP : FULL_CROP;
    const pxToCanvas = activeCrop.size / Math.max(1, rect.width);

    const deltaX = (e.clientX - drag.startX) * pxToCanvas;
    const deltaY = (e.clientY - drag.startY) * pxToCanvas;

    if (activeCategory === 'hand_item' || (!currentEquippedInActive && draft.hand_item)) {
      updateHandItemAdjustment({
        dx: drag.origDx + deltaX,
        dy: drag.origDy + deltaY,
      });
    } else {
      updateActiveAdjustment({
        dx: drag.origDx + deltaX,
        dy: drag.origDy + deltaY,
      });
    }
  };

  const handlePreviewPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    previewDragRef.current = null;
    setIsDraggingPreview(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // プレビュー上で Shift + マウスホイールで角度回転、マウスホイール単体でサイズ拡縮
  const wheelStateRef = useRef({
    dragAdjustOnPreview,
    activeCategory,
    currentEquippedInActive,
    hasHandItem: Boolean(draft.hand_item),
    currentAdjustment,
    handItemAdjustment,
    updateActiveAdjustment,
    updateHandItemAdjustment,
  });
  wheelStateRef.current = {
    dragAdjustOnPreview,
    activeCategory,
    currentEquippedInActive,
    hasHandItem: Boolean(draft.hand_item),
    currentAdjustment,
    handItemAdjustment,
    updateActiveAdjustment,
    updateHandItemAdjustment,
  };

  useEffect(() => {
    const box = previewBoxRef.current;
    if (!box) return;
    const handleWheel = (e: WheelEvent) => {
      const st = wheelStateRef.current;
      if (!st.dragAdjustOnPreview) return;
      const isTargetHandItem =
        st.activeCategory === 'hand_item' || (!st.currentEquippedInActive && st.hasHandItem);
      if (!isTargetHandItem && !st.currentEquippedInActive) return;

      e.preventDefault();
      const delta = e.deltaY || e.deltaX;
      const dir = delta > 0 ? -1 : 1;

      if (e.shiftKey) {
        const stepDeg = e.altKey ? 1 : 3;
        if (isTargetHandItem) {
          const nextRot = Math.max(
            -180,
            Math.min(180, st.handItemAdjustment.rotation + dir * stepDeg),
          );
          st.updateHandItemAdjustment({ rotation: nextRot });
        } else {
          const nextRot = Math.max(
            -180,
            Math.min(180, st.currentAdjustment.rotation + dir * stepDeg),
          );
          st.updateActiveAdjustment({ rotation: nextRot });
        }
      } else {
        const stepScale = e.altKey ? 0.01 : 0.03;
        if (isTargetHandItem) {
          const nextScale = Math.max(
            0.4,
            Math.min(2.0, st.handItemAdjustment.scale + dir * stepScale),
          );
          st.updateHandItemAdjustment({ scale: nextScale });
        } else {
          const nextScale = Math.max(
            0.4,
            Math.min(2.0, st.currentAdjustment.scale + dir * stepScale),
          );
          st.updateActiveAdjustment({ scale: nextScale });
        }
      }
    };
    box.addEventListener('wheel', handleWheel, { passive: false });
    return () => box.removeEventListener('wheel', handleWheel);
  }, []);

  const savedNoticeTimerRef = useRef<number | null>(null);
  const actionNoticeTimerRef = useRef<number | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showActionNotice = (msg: string) => {
    setActionNotice(msg);
    if (actionNoticeTimerRef.current !== null) {
      window.clearTimeout(actionNoticeTimerRef.current);
    }
    actionNoticeTimerRef.current = window.setTimeout(() => {
      setActionNotice(null);
      actionNoticeTimerRef.current = null;
    }, 2800);
  };

  useEffect(() => {
    return () => {
      if (savedNoticeTimerRef.current !== null) {
        window.clearTimeout(savedNoticeTimerRef.current);
      }
      if (actionNoticeTimerRef.current !== null) {
        window.clearTimeout(actionNoticeTimerRef.current);
      }
    };
  }, []);

  const hasSavedTemplate = useMemo(
    () => Object.keys(savedTemplate).length > 0,
    [savedTemplate],
  );
  const hasActiveCategoryTemplate = Boolean(savedTemplate[activeCategory]);

  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  // クラウド上の最新パーツを手動でチェック・同期
  const handleManualCloudSync = async () => {
    setIsCloudSyncing(true);
    try {
      const diff = await checkNewCloudItems();
      if (diff && diff.newCount > 0) {
        const count = await importCloudPartsToLocal(diff.newParts);
        showActionNotice(`☁️ クラウドから ${count} 件の新しいパーツを取り込みました！`);
      } else {
        await uploadCatalogToCloud();
        showActionNotice('☁️ すでに最新の状態です（クラウドと同期完了）');
      }
    } catch (err) {
      console.error('Manual cloud sync failed:', err);
      showActionNotice('❌ クラウド同期に失敗しました');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // 全パーツの現在の微調整配置をテンプレートとして記憶
  const handleSaveAllTemplates = () => {
    saveLayoutTemplate(draftAdjustments);
    setSavedTemplate(loadSavedLayoutTemplate());
    showActionNotice('現在の全部位の配置を記憶しました！');
  };

  // 選択中部位の現在の微調整配置のみを記憶
  const handleSaveActiveTemplate = () => {
    saveCategoryLayoutTemplate(activeCategory, currentAdjustment);
    setSavedTemplate(loadSavedLayoutTemplate());
    showActionNotice(`「${CATEGORY_META[activeCategory].label}」の配置を記憶しました！`);
  };

  // 記憶したテンプレート配置を全パーツへ適用
  const handleApplyTemplates = () => {
    const updated = applyLayoutTemplate(draftAdjustments, savedTemplate);
    setDraftAdjustments(updated);
    showActionNotice('記憶した配置を全パーツへ適用しました！');
  };

  // 選択中部位に記憶済みのテンプレート配置を適用
  const handleApplyActiveCategoryTemplate = () => {
    const tpl = savedTemplate[activeCategory];
    if (!tpl) return;
    setDraftAdjustments((prev) => ({
      ...prev,
      [activeCategory]: {
        ...getLayerAdjustment(prev, activeCategory),
        dx: tpl.dx,
        dy: tpl.dy,
        scale: tpl.scale,
        rotation: tpl.rotation,
        flipX: tpl.flipX,
        aboveTops: tpl.aboveTops ?? prev[activeCategory]?.aboveTops,
      },
    }));
    showActionNotice(`「${CATEGORY_META[activeCategory].label}」に記憶した配置を適用しました！`);
  };

  // 「パーツ変更時も配置を維持する（自動適用）」の切り替え
  const handleToggleAutoApplyTemplate = (checked: boolean) => {
    setAutoApplyTemplate(checked);
    saveAutoApplyTemplatePreference(checked);
    showActionNotice(
      checked
        ? '着替え時も配置を維持するモードをONにしました'
        : '着替え時も配置を維持するモードをOFFにしました',
    );
  };

  // パーツ選択・解除（持ち物は複数選択対応、配置維持モードがONの場合は記憶した位置・サイズを自動適用）
  const handleSelectPart = (part: AvatarPart) => {
    if (part.category === 'hand_item') {
      setDraft((prev) => {
        const existingItems = Array.isArray(prev.hand_items)
          ? [...prev.hand_items]
          : prev.hand_item
          ? [prev.hand_item]
          : [];
        const existsIdx = existingItems.findIndex((p) => p.id === part.id);
        let nextHandItems: AvatarPart[];
        if (existsIdx >= 0) {
          nextHandItems = existingItems.filter((p) => p.id !== part.id);
        } else {
          nextHandItems = [...existingItems, part];
        }
        return {
          ...prev,
          hand_item: nextHandItems[0] ?? null,
          hand_items: nextHandItems,
        };
      });
      setSelectedHandItemId(part.id);
      return;
    }

    setDraft((prev) => {
      const currentKey = resolvePartKey(prev[part.category]);
      if (currentKey === part.id) {
        // 素体（body）は非装着にしない（絶対に消えない安全ガード）
        if (part.category === 'body') return prev;
        return { ...prev, [part.category]: null };
      }
      const next = { ...prev, [part.category]: part };
      const isOnePiece = isDressOrOnePiecePart(part);

      // ワンピース・ドレスの場合のみズボンを自動で外す。
      // ワンピース以外の通常の服（Tシャツ等）を着た際は、絶対にズボンを外さない！
      if (part.category === 'tops') {
        if (isOnePiece) {
          next.bottoms = null;
        } else if (!next.bottoms) {
          // 直前までワンピースを着ていてズボンが脱げていた場合、所持ズボンを自動復元！
          next.bottoms = ownedParts.find((p) => p.category === 'bottoms') ?? null;
        }
      }

      // トップスやボトムスにセット記憶された手や足があれば一緒に自動装着
      if (part.linkedParts) {
        for (const [linkedCat, linkedId] of Object.entries(part.linkedParts)) {
          if (linkedCat === 'adjustments' || linkedCat === 'isOnePiece') continue;
          if (linkedId) {
            const linkedPart = ownedParts.find((p) => p.id === linkedId);
            if (linkedPart) {
              next[linkedCat as AvatarCategory] = linkedPart;
            }
          } else if (linkedId === null && linkedCat !== 'body') {
            // ボトムス（ズボン）を外すのはワンピース・ドレスの場合のみ！
            if (linkedCat === 'bottoms') {
              if (isOnePiece) {
                next.bottoms = null;
              }
            } else {
              next[linkedCat as AvatarCategory] = null;
            }
          }
        }
      }
      return next;
    });

    // セット記憶された手足の配置（位置情報など）を自動適用
    if (part.linkedParts?.adjustments) {
      setDraftAdjustments((prev) => ({
        ...prev,
        ...part.linkedParts!.adjustments,
      }));
    }

    // 「配置維持モード」がONで、かつ記憶された配置があれば自動適用
    if (autoApplyTemplate && savedTemplate[part.category]) {
      const tpl = savedTemplate[part.category]!;
      setDraftAdjustments((prev) => ({
        ...prev,
        [part.category]: {
          ...getLayerAdjustment(prev, part.category),
          dx: tpl.dx,
          dy: tpl.dy,
          scale: tpl.scale,
          rotation: tpl.rotation,
          flipX: tpl.flipX,
          aboveTops: tpl.aboveTops ?? prev[part.category]?.aboveTops,
        },
      }));
      showActionNotice(`「${CATEGORY_META[part.category].label}」に記憶済みの配置を自動適用しました`);
    }
  };

  // トップスに現在プレビュー中の手・腕をセット記憶する
  const handleLinkCurrentHandsToTops = async () => {
    if (!currentTopsPart) {
      toast('服（トップス）が着用されていません', '⚠️');
      return;
    }

    const armLeftAdj = getLayerAdjustment(draftAdjustments, 'arm_left');
    const armRightAdj = getLayerAdjustment(draftAdjustments, 'arm_right');

    const currentLinked = { ...(currentTopsPart.linkedParts || {}) };
    delete currentLinked.bottoms; // 通常の服への手記憶時はズボン非装着を解除
    delete currentLinked.leg_left; // 足の連動も解除
    delete currentLinked.leg_right;

    const updatedTops: AvatarPart = {
      ...currentTopsPart,
      linkedParts: {
        ...currentLinked,
        isOnePiece: false,
        arm_left: currentArmLeftKey,
        arm_right: currentArmRightKey,
        adjustments: {
          ...(currentTopsPart.linkedParts?.adjustments || {}),
          arm_left: {
            ...armLeftAdj,
            aboveTops: armLeftAdj.aboveTops ?? false,
          },
          arm_right: {
            ...armRightAdj,
            aboveTops: armRightAdj.aboveTops ?? false,
          },
        },
      },
    };

    try {
      await saveCatalogPart(updatedTops);
      setDraft((prev) => ({ ...prev, tops: updatedTops }));
      toast(
        `服「${currentTopsPart.name}」に手（左: ${currentArmLeftName} / 右: ${currentArmRightName}）をセット記憶しました！✨`,
        '🤝',
      );
    } catch (err) {
      console.error('Failed to save linked hands to tops:', err);
      toast('セット記憶の保存に失敗しました', '❌');
    }
  };

  // ボトムスに現在プレビュー中の脚・足をセット記憶する
  const handleLinkCurrentLegsToBottoms = async () => {
    if (!currentBottomsPart) {
      toast('ズボン（ボトムス）が着用されていません', '⚠️');
      return;
    }

    const legLeftAdj = getLayerAdjustment(draftAdjustments, 'leg_left');
    const legRightAdj = getLayerAdjustment(draftAdjustments, 'leg_right');

    const updatedBottoms: AvatarPart = {
      ...currentBottomsPart,
      linkedParts: {
        ...(currentBottomsPart.linkedParts || {}),
        leg_left: currentLegLeftKey,
        leg_right: currentLegRightKey,
        adjustments: {
          ...(currentBottomsPart.linkedParts?.adjustments || {}),
          leg_left: { ...legLeftAdj },
          leg_right: { ...legRightAdj },
        },
      },
    };

    try {
      await saveCatalogPart(updatedBottoms);
      setDraft((prev) => ({ ...prev, bottoms: updatedBottoms }));
      toast(
        `ズボン「${currentBottomsPart.name}」に足（左: ${currentLegLeftName} / 右: ${currentLegRightName}）をセット記憶しました！✨`,
        '🤝',
      );
    } catch (err) {
      console.error('Failed to save linked legs to bottoms:', err);
      toast('セット記憶の保存に失敗しました', '❌');
    }
  };

  // ワンピース・ドレス用に、トップスに現在の手（左右腕）＋足（左右脚）＋ズボンオフをセット記憶する
  const handleLinkCurrentFullSetToTops = async () => {
    if (!currentTopsPart) {
      toast('服（トップス）が着用されていません', '⚠️');
      return;
    }

    const armLeftAdj = getLayerAdjustment(draftAdjustments, 'arm_left');
    const armRightAdj = getLayerAdjustment(draftAdjustments, 'arm_right');
    const legLeftAdj = getLayerAdjustment(draftAdjustments, 'leg_left');
    const legRightAdj = getLayerAdjustment(draftAdjustments, 'leg_right');

    const updatedTops: AvatarPart = {
      ...currentTopsPart,
      linkedParts: {
        ...(currentTopsPart.linkedParts || {}),
        isOnePiece: true,
        arm_left: currentArmLeftKey,
        arm_right: currentArmRightKey,
        leg_left: currentLegLeftKey,
        leg_right: currentLegRightKey,
        bottoms: null, // ワンピース着用時はズボン・スカートを自動で非装着にする
        adjustments: {
          ...(currentTopsPart.linkedParts?.adjustments || {}),
          arm_left: {
            ...armLeftAdj,
            aboveTops: armLeftAdj.aboveTops ?? false,
          },
          arm_right: {
            ...armRightAdj,
            aboveTops: armRightAdj.aboveTops ?? false,
          },
          leg_left: { ...legLeftAdj },
          leg_right: { ...legRightAdj },
        },
      },
    };

    try {
      await saveCatalogPart(updatedTops);
      setDraft((prev) => ({ ...prev, tops: updatedTops }));
      toast(
        `ワンピース「${currentTopsPart.name}」に手・足・ズボンオフをセット記憶しました！✨`,
        '👗',
      );
    } catch (err) {
      console.error('Failed to save full set to tops:', err);
      toast('セット記憶の保存に失敗しました', '❌');
    }
  };

  // 服のセット記憶を解除
  const handleClearTopsLinkedParts = async () => {
    if (!currentTopsPart) return;
    const updatedTops: AvatarPart = {
      ...currentTopsPart,
      linkedParts: undefined,
    };
    try {
      await saveCatalogPart(updatedTops);
      setDraft((prev) => ({ ...prev, tops: updatedTops }));
      toast(`服「${currentTopsPart.name}」のセット記憶を解除しました`, '🗑️');
    } catch (err) {
      console.error('Failed to clear linked parts from tops:', err);
      toast('セット記憶の解除に失敗しました', '❌');
    }
  };

  // ズボンのセット記憶を解除
  const handleClearBottomsLinkedParts = async () => {
    if (!currentBottomsPart) return;
    const updatedBottoms: AvatarPart = {
      ...currentBottomsPart,
      linkedParts: undefined,
    };
    try {
      await saveCatalogPart(updatedBottoms);
      setDraft((prev) => ({ ...prev, bottoms: updatedBottoms }));
      toast(`ズボン「${currentBottomsPart.name}」のセット記憶を解除しました`, '🗑️');
    } catch (err) {
      console.error('Failed to clear linked parts from bottoms:', err);
      toast('セット記憶の解除に失敗しました', '❌');
    }
  };

  // パーツ名のインライン編集ハンドラ
  const handleStartRename = (part: AvatarPart) => {
    setEditingPartId(part.id);
    setEditingPartName(part.name);
  };

  const handleCancelRename = () => {
    setEditingPartId(null);
    setEditingPartName('');
  };

  const handleSaveRename = async (part: AvatarPart) => {
    const trimmed = editingPartName.trim();
    if (!trimmed) {
      toast('パーツの名前を入力してください', '⚠️');
      return;
    }
    if (trimmed === part.name) {
      setEditingPartId(null);
      return;
    }

    const updatedPart: AvatarPart = {
      ...part,
      name: trimmed,
    };

    try {
      await saveCatalogPart(updatedPart);
      // 装着中の場合は draft 側の名前も即時同期
      setDraft((prev) => {
        const currentEquipped = prev[part.category];
        const isCurrent =
          typeof currentEquipped === 'string'
            ? currentEquipped === part.id
            : currentEquipped?.id === part.id;
        if (isCurrent) {
          return { ...prev, [part.category]: updatedPart };
        }
        return prev;
      });
      setEditingPartId(null);
      setEditingPartName('');
      toast(`パーツ名を「${trimmed}」に変更しました！`, '✏️');
    } catch (err) {
      console.error('Failed to rename part:', err);
      toast('名前の変更に失敗しました', '❌');
    }
  };

  const handleUnequipCategory = (category: AvatarCategory) => {
    if (category === 'body') {
      toast('素体（ベース）ははずせません', '⚠️');
      return;
    }
    setDraft((prev) => ({
      ...prev,
      [category]: null,
      ...(category === 'hand_item' ? { hand_items: [] } : {}),
    }));
    if (category === 'hand_item') {
      setSelectedHandItemId(null);
    }
  };

  const handleUnequipAll = () => {
    setDraft(createEmptyEquippedMap());
  };

  const handleResetAllToSaved = () => {
    setDraft(normalizeEquippedParts(equippedParts, ownedParts));
    setDraftAdjustments({ ...initialAdjustments });
  };

  // 左右対称カテゴリ（左腕↔右腕、左脚↔右脚）の反対側カテゴリと基準パーツ
  const oppositeSymmetryCategory = useMemo(
    () => getOppositeSymmetryCategory(activeCategory),
    [activeCategory],
  );
  const oppositeCandidatePart = useMemo(() => {
    if (!oppositeSymmetryCategory) return null;
    const eq = draft[oppositeSymmetryCategory];
    if (eq) return eq;
    const list = partsByCategory.get(oppositeSymmetryCategory);
    return list && list.length > 0 ? list[0] : null;
  }, [draft, oppositeSymmetryCategory, partsByCategory]);

  // パーツの複製（同カテゴリ複製 または 左右反転して反対側の腕・脚へ複製）
  const handleDuplicatePartClick = async (
    part: AvatarPart,
    options?: {
      mirrorToOpposite?: boolean;
      equipCreated?: boolean;
      switchToCreatedCategory?: boolean;
    },
  ) => {
    try {
      const dupOpts: DuplicateCatalogPartOptions = {
        mirrorToOpposite: options?.mirrorToOpposite,
      };
      const result = onDuplicatePart
        ? await onDuplicatePart(part, dupOpts)
        : await duplicateCatalogPart(part, dupOpts);
      const created = result ?? null;
      if (created) {
        if (options?.equipCreated) {
          setDraft((prev) => ({
            ...prev,
            [created.category]: created,
          }));
        }
        if (options?.switchToCreatedCategory) {
          setActiveCategory(created.category);
        }
        showActionNotice(
          options?.mirrorToOpposite
            ? `「${part.name}」を左右反転し、${CATEGORY_META[created.category].label}「${created.name}」へ同一サイズで複製${options?.equipCreated ? '・装着' : ''}しました！`
            : `「${created.name}」を複製${options?.equipCreated ? '・装着' : ''}しました！`,
        );
      }
    } catch (err) {
      console.error('パーツ複製エラー:', err);
    }
  };

  // 左右の腕・脚のサイズ倍率・高さ・角度（対称）をワンクリックで同期する
  const handleSyncSymmetryAdjustment = (direction: 'to_opposite' | 'from_opposite') => {
    if (!oppositeSymmetryCategory) return;
    const srcCat = direction === 'to_opposite' ? activeCategory : oppositeSymmetryCategory;
    const dstCat = direction === 'to_opposite' ? oppositeSymmetryCategory : activeCategory;
    const srcAdj = getLayerAdjustment(draftAdjustments, srcCat);
    const dstCur = getLayerAdjustment(draftAdjustments, dstCat);
    const synced: LayerAdjustment = {
      ...dstCur,
      dx: round1(-srcAdj.dx),
      dy: round1(srcAdj.dy),
      scale: srcAdj.scale,
      rotation: round1(-srcAdj.rotation),
      aboveTops: srcAdj.aboveTops,
    };
    setDraftAdjustments((prev) => ({
      ...prev,
      [dstCat]: synced,
    }));
    showActionNotice(
      `「${CATEGORY_META[srcCat].label}」のサイズ(${Math.round(srcAdj.scale * 100)}%)・高さ・対称角度を「${CATEGORY_META[dstCat].label}」へ統一しました！`,
    );
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      await onSave(draft, draftAdjustments);
      setSavedNotice(true);
      if (savedNoticeTimerRef.current !== null) {
        window.clearTimeout(savedNoticeTimerRef.current);
      }
      savedNoticeTimerRef.current = window.setTimeout(() => {
        setSavedNotice(false);
        savedNoticeTimerRef.current = null;
      }, 1800);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPng = async () => {
    try {
      const isFace = previewMode === 'face';
      const dataUrl = await exportAvatarAsDataURL(draft, {
        size: AVATAR_CANVAS_SIZE,
        faceOnly: isFace,
        circleClip: isFace,
        adjustments: draftAdjustments,
        autoRig,
      });
      downloadDataUrl(dataUrl, isFace ? 'avatar_face_icon.png' : 'avatar_full_512.png');
    } catch (err) {
      console.error('PNG出力に失敗しました:', err);
    }
  };

  return (
    <div
      className={`grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)] ${className}`}
    >
      {/* ==================== 左カラム：常時固定（Sticky）アバタープレビュー ==================== */}
      <section className="sticky top-20 z-20 flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
        {/* ヘッダー：カテゴリ名 ＆ クリーンなアイコントグル群 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-zinc-900">プレビュー</span>
            <span className="text-xs text-zinc-300">/</span>
            <span className="truncate text-xs font-medium text-zinc-600">
              {CATEGORY_META[activeCategory].label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* ドラッグ移動トグル */}
            <button
              type="button"
              onClick={() => setDragAdjustOnPreview((v) => !v)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                dragAdjustOnPreview
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
              }`}
              title="ONの時、プレビュー画面を直接ドラッグして現在選択中の部位（腕・足・持ち物など）の位置を微調整できます"
            >
              <Move className="h-3 w-3" />
              <span>ドラッグ</span>
            </button>
          </div>
        </div>

        {/* プレビュー本体 */}
        <div
          ref={previewBoxRef}
          onPointerDown={handlePreviewPointerDown}
          onPointerMove={handlePreviewPointerMove}
          onPointerUp={handlePreviewPointerUp}
          onPointerCancel={handlePreviewPointerUp}
          className={`relative mx-auto w-full max-w-[320px] touch-none select-none overflow-hidden rounded-xl border transition ${
            isDraggingPreview
              ? 'border-zinc-900 ring-2 ring-zinc-900/10'
              : 'border-zinc-200/80 shadow-inner'
          }`}
          style={{
            cursor:
              dragAdjustOnPreview && currentEquippedInActive
                ? isDraggingPreview
                  ? 'grabbing'
                  : 'grab'
                : 'default',
          }}
        >
          {previewMode === 'full' ? (
            <AvatarRenderer
              equippedParts={draft}
              adjustments={draftAdjustments}
              autoRig={autoRig}
              size="full"
              animate={animate && !isDraggingPreview}
              showEmptyPlaceholder
              highlightLayer={isDraggingPreview || rightTab === 'adjust' ? activeCategory : null}
              className="avatar-checker"
            />
          ) : (
            <div className="avatar-checker flex aspect-square w-full flex-col items-center justify-center gap-4 p-4">
              <AvatarRenderer
                equippedParts={draft}
                adjustments={draftAdjustments}
                autoRig={autoRig}
                size={168}
                faceOnly
                animate={animate && !isDraggingPreview}
                showEmptyPlaceholder
                highlightLayer={isDraggingPreview || rightTab === 'adjust' ? activeCategory : null}
                className="shadow-md rounded-full ring-2 ring-white"
              />
              <div className="flex items-end gap-3">
                <AvatarRenderer
                  equippedParts={draft}
                  adjustments={draftAdjustments}
                  autoRig={autoRig}
                  size={52}
                  faceOnly
                  animate={animate}
                  className="shadow-sm rounded-full ring-2 ring-white"
                />
                <AvatarRenderer
                  equippedParts={draft}
                  adjustments={draftAdjustments}
                  autoRig={autoRig}
                  size={36}
                  faceOnly
                  animate={animate}
                  className="shadow-sm rounded-full ring-2 ring-white"
                />
                <AvatarRenderer
                  equippedParts={draft}
                  adjustments={draftAdjustments}
                  autoRig={autoRig}
                  size={26}
                  faceOnly
                  animate={animate}
                  className="shadow-sm rounded-full ring-2 ring-white"
                />
              </div>
            </div>
          )}

          {/* ミニマルなステータスチップ */}
          {isDirty && (
            <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-zinc-900/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              編集中
            </span>
          )}



          {currentEquippedInActive && isCurrentAdjusted && (
            <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-md bg-zinc-900/80 backdrop-blur-md px-2 py-0.5 font-mono text-[10px] text-zinc-200 shadow-sm">
              手動 X:{currentAdjustment.dx > 0 ? `+${currentAdjustment.dx}` : currentAdjustment.dx}{' '}
              Y:{currentAdjustment.dy > 0 ? `+${currentAdjustment.dy}` : currentAdjustment.dy}
            </span>
          )}
        </div>

        {/* コントロールバー（全体 / 顔アイコン ＆ アニメ ＆ PNG） */}
        <div className="flex items-center justify-between gap-2">
          {/* 表示モードセグメント */}
          <div className="flex rounded-lg bg-zinc-100 p-0.5 border border-zinc-200/60">
            <button
              type="button"
              onClick={() => setPreviewMode('full')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition ${
                previewMode === 'full'
                  ? 'bg-white text-zinc-900 shadow-sm font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <PersonStanding className="h-3.5 w-3.5" />
              <span>全体</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('face')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition ${
                previewMode === 'face'
                  ? 'bg-white text-zinc-900 shadow-sm font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <CircleUser className="h-3.5 w-3.5" />
              <span>アイコン</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAnimate((v) => !v)}
              className={`flex items-center gap-1 rounded-lg border border-zinc-200/80 px-2.5 py-1 text-xs transition ${
                animate
                  ? 'bg-zinc-100 text-zinc-900 font-medium'
                  : 'bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700'
              }`}
              title="アニメーションの再生/停止"
            >
              {animate ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              <span>{animate ? 'アニメON' : '停止中'}</span>
            </button>

            <button
              type="button"
              onClick={() => setRightTab('layers')}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium shadow-sm transition ${
                rightTab === 'layers'
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200/80 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
              title="全アイテムのレイヤー重なり順（前後関係）を並び替え"
            >
              <Layers className="h-3 w-3" />
              <span>レイヤー順</span>
            </button>

            <button
              type="button"
              onClick={() => void handleExportPng()}
              className="flex items-center gap-1 rounded-lg border border-zinc-200/80 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm transition"
              title="現在のプレビューをPNG画像としてダウンロード"
            >
              <Download className="h-3 w-3 text-zinc-500" />
              <span>PNG</span>
            </button>
          </div>
        </div>

        {/* 🤝 服・手足のセット記憶（すっきり洗練カード） */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
              <span>🤝</span>
              <span>手足のセット記憶</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-medium bg-zinc-100 px-1.5 py-0.5 rounded">
              着せ替え時に自動連動
            </span>
          </div>

          {/* トップス ＆ 手・足 */}
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-800 truncate">
                {currentTopsPart ? (
                  <>服: <strong className="text-indigo-600 font-bold">{currentTopsPart.name}</strong></>
                ) : (
                  <span className="text-zinc-400">服未装着</span>
                )}
              </span>
              {currentTopsPart && (
                isFullSetLinkedToTops ? (
                  <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                    ✓ 手足セット済
                  </span>
                ) : isHandsLinkedToTops ? (
                  <span className="rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                    ✓ 手セット済
                  </span>
                ) : (
                  <span className="rounded bg-amber-50 text-amber-700 border border-amber-200/60 px-1.5 py-0.5 text-[10px] font-medium shrink-0">
                    未記憶
                  </span>
                )
              )}
            </div>

            {currentTopsPart ? (
              <>
                <div className="text-[10px] text-zinc-500 space-y-0.5">
                  <p className="truncate">手: 左({currentArmLeftName}) / 右({currentArmRightName})</p>
                  <p className="truncate">足: 左({currentLegLeftName}) / 右({currentLegRightName})</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => void handleLinkCurrentHandsToTops()}
                    className={`flex items-center justify-center gap-1 rounded-lg py-1.5 px-2 text-xs font-medium transition border ${
                      isHandsLinkedToTops && !isFullSetLinkedToTops
                        ? 'bg-zinc-100 text-zinc-700 border-zinc-300'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs'
                    }`}
                    title="この服を着たときに、現在の手（腕）が自動で一緒に着替えます"
                  >
                    <Check className="h-3 w-3 text-zinc-500" />
                    <span>手とセット記憶</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleLinkCurrentFullSetToTops()}
                    className={`flex items-center justify-center gap-1 rounded-lg py-1.5 px-2 text-xs font-semibold transition border ${
                      isFullSetLinkedToTops
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-2xs'
                    }`}
                    title="ワンピース・ドレス用：この服を着たときに手・足の両方が着替え、ズボンは自動で外れます"
                  >
                    <span>👗</span>
                    <span>手足セット(ワンピ)</span>
                  </button>
                </div>
                {(isHandsLinkedToTops || isFullSetLinkedToTops) && (
                  <button
                    type="button"
                    onClick={() => void handleClearTopsLinkedParts()}
                    className="self-end text-[10px] text-zinc-400 hover:text-rose-600 transition"
                  >
                    セット記憶を解除
                  </button>
                )}
              </>
            ) : (
              <p className="text-[10px] text-zinc-400">服を着ると、手や足のセット記憶ができます</p>
            )}
          </div>

          {/* ボトムス ＆ 足 */}
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-800 truncate">
                {currentBottomsPart ? (
                  <>ズボン: <strong className="text-emerald-600 font-bold">{currentBottomsPart.name}</strong></>
                ) : (
                  <span className="text-zinc-400">ズボン未装着</span>
                )}
              </span>
              {currentBottomsPart && (
                isLegsLinkedToBottoms ? (
                  <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                    ✓ 足セット済
                  </span>
                ) : (
                  <span className="rounded bg-amber-50 text-amber-700 border border-amber-200/60 px-1.5 py-0.5 text-[10px] font-medium shrink-0">
                    未記憶
                  </span>
                )
              )}
            </div>

            {currentBottomsPart ? (
              <>
                <p className="text-[10px] text-zinc-500 truncate">
                  足: 左({currentLegLeftName}) / 右({currentLegRightName})
                </p>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => void handleLinkCurrentLegsToBottoms()}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 px-2 text-xs font-medium transition border ${
                      isLegsLinkedToBottoms
                        ? 'bg-zinc-100 text-zinc-700 border-zinc-300'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs'
                    }`}
                    title="このズボンを履いたときに、現在の脚（足）が自動で一緒に着替えます"
                  >
                    <Check className="h-3 w-3 text-zinc-500" />
                    <span>足とセット記憶</span>
                  </button>
                  {isLegsLinkedToBottoms && (
                    <button
                      type="button"
                      onClick={() => void handleClearBottomsLinkedParts()}
                      className="text-[10px] text-zinc-400 hover:text-rose-600 px-1 py-1 transition"
                      title="セット記憶を解除"
                    >
                      解除
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[10px] text-zinc-400">ズボンを履くと、足のセット記憶ができます</p>
            )}
          </div>
        </div>

        {/* 段階的開示（Progressive Disclosure）：素体の輪郭クリッピング設定アコーディオン */}
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 transition">
          <button
            type="button"
            onClick={() => setShowAdvancedClipping((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-zinc-700 hover:text-zinc-900"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Scissors className="h-3.5 w-3.5 text-zinc-500" />
              <span>素体のはみ出しカット設定</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-zinc-200/60 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                {solvedRig.activeBodyClipMode === 'off'
                  ? 'OFF'
                  : solvedRig.activeBodyClipMode === 'strict'
                    ? '強'
                    : '標準'}
                {solvedRig.activeBodyClipMode !== 'off' &&
                  ` (${solvedRig.activeBodyClipInsetPx >= 0 ? `+${solvedRig.activeBodyClipInsetPx}` : solvedRig.activeBodyClipInsetPx}px)`}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${
                  showAdvancedClipping ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {showAdvancedClipping && (
            <div className="border-t border-zinc-200/60 p-3 pt-2.5 flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'auto', label: '自動(標準)' },
                    { id: 'strict', label: '強(完全)' },
                    { id: 'off', label: 'OFF' },
                  ] as { id: BodySilhouetteClipMode; label: string }[]
                ).map((opt) => {
                  const active = solvedRig.activeBodyClipMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setDraftAdjustments((prev) => {
                          const curBody = getLayerAdjustment(prev, 'body');
                          return {
                            ...prev,
                            body: {
                              ...curBody,
                              bodyClipMode: opt.id,
                            },
                          };
                        })
                      }
                      className={`rounded-md py-1 text-[11px] font-medium transition ${
                        active
                          ? 'bg-zinc-900 text-white shadow-sm'
                          : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {solvedRig.activeBodyClipMode !== 'off' && (
                <label className="flex items-center gap-2 text-[10px] text-zinc-600 pt-1">
                  <span className="shrink-0 text-zinc-500">食い込み幅:</span>
                  <input
                    type="range"
                    min={-4}
                    max={8}
                    step={1}
                    value={solvedRig.activeBodyClipInsetPx}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDraftAdjustments((prev) => {
                        const curBody = getLayerAdjustment(prev, 'body');
                        return {
                          ...prev,
                          body: {
                            ...curBody,
                            bodyClipInsetPx: val,
                          },
                        };
                      });
                    }}
                    className="h-1.5 w-full accent-zinc-900"
                  />
                  <span className="w-6 text-right font-mono text-[10px] text-zinc-600">
                    {solvedRig.activeBodyClipInsetPx}px
                  </span>
                </label>
              )}
            </div>
          )}
        </div>

        {/* アクションボタン群：プライマリアクションとサブアクションの明確な階層 */}
        <div className="flex flex-col gap-2 pt-1 border-t border-zinc-100">
          <button
            type="button"
            onClick={() => void handleSaveClick()}
            disabled={isSaving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            <span>{savedNotice ? '保存しました！' : saveButtonLabel}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleUnequipAll}
              disabled={!hasAnyEquipped || isSaving}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition"
            >
              <Ban className="h-3 w-3 text-zinc-400" />
              <span>すべて外す</span>
            </button>
            <button
              type="button"
              onClick={handleResetAllToSaved}
              disabled={!isDirty || isSaving}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition"
            >
              <RotateCcw className="h-3 w-3 text-zinc-400" />
              <span>保存前に戻す</span>
            </button>
          </div>
        </div>
      </section>

      {/* ==================== 右カラム：18カテゴリタブ ＆ パーツ選択・位置微調整パネル ==================== */}
      <section className="flex min-w-0 flex-col gap-5 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm sm:p-6">
        {/* 全18カテゴリ切り替えグリッド */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-900">
              部位カテゴリ
            </span>
            <div className="flex items-center gap-2.5 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" />
                <span>装着中</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>微調整</span>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 xl:grid-cols-9">
            {AVATAR_LAYERS.map((category) => {
              const Icon = CATEGORY_ICONS[category];
              const meta = CATEGORY_META[category];
              const isSelectedTab = category === activeCategory;
              const isEquipped = Boolean(draft[category]);
              const isAdjusted = hasCustomAdjustment(draftAdjustments[category]);
              const count = partsByCategory.get(category)?.length ?? 0;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`relative flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[11px] transition border ${
                    isSelectedTab
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm font-semibold'
                      : 'bg-zinc-50/70 text-zinc-600 border-zinc-200/60 hover:bg-zinc-100 hover:text-zinc-900 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[9px] font-mono ${
                        isSelectedTab ? 'text-zinc-400' : 'text-zinc-400'
                      }`}
                    >
                      {String(meta.order).padStart(2, '0')}
                    </span>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="w-full truncate text-center">{meta.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-[9px] ${
                        isSelectedTab ? 'text-zinc-400' : 'text-zinc-400'
                      }`}
                    >
                      ({count})
                    </span>
                  )}
                  <div className="absolute right-1.5 top-1.5 flex gap-1">
                    {isEquipped && (
                      <span
                        title="装着中"
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelectedTab ? 'bg-white' : 'bg-zinc-900'
                        }`}
                      />
                    )}
                    {isAdjusted && (
                      <span
                        title="位置・角度の微調整あり"
                        className="h-1.5 w-1.5 rounded-full bg-amber-400"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 配置記憶・維持コントロールバー */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-2.5 sm:p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs font-semibold text-zinc-800 mr-1">
              <BookmarkCheck className="h-3.5 w-3.5 text-zinc-600" />
              <span>配置テンプレート:</span>
            </span>
            <button
              type="button"
              onClick={handleSaveAllTemplates}
              className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 active:scale-95 transition"
              title="現在の全部位（位置・角度・サイズ）をテンプレートとしてブラウザに記憶します"
            >
              <Save className="h-3 w-3 text-zinc-500" />
              <span>全配置を記憶</span>
            </button>
            <button
              type="button"
              onClick={handleApplyTemplates}
              disabled={!hasSavedTemplate}
              className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 active:scale-95 disabled:opacity-40 transition"
              title="記憶した全パーツの位置・角度・サイズを現在のパーツへ適用します"
            >
              <RotateCcw className="h-3 w-3 text-zinc-500" />
              <span>全適用</span>
            </button>
            {hasActiveCategoryTemplate && (
              <button
                type="button"
                onClick={handleApplyActiveCategoryTemplate}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition"
                title={`記憶した「${CATEGORY_META[activeCategory].label}」の配置のみを適用します`}
              >
                <span>{CATEGORY_META[activeCategory].label}のみ適用</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleManualCloudSync}
              disabled={isCloudSyncing}
              className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 active:scale-95 disabled:opacity-50 transition"
              title="クラウドから他の端末で作成した最新パーツを取得・同期します"
            >
              {isCloudSyncing ? (
                <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
              ) : (
                <Cloud className="h-3 w-3 text-indigo-600" />
              )}
              <span>クラウド同期</span>
            </button>
          </div>

          <label className="flex cursor-pointer select-none items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 shadow-sm hover:bg-zinc-50 transition">
            <input
              type="checkbox"
              checked={autoApplyTemplate}
              onChange={(e) => handleToggleAutoApplyTemplate(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-zinc-900 text-zinc-900 focus:ring-zinc-500"
            />
            <span>パーツ変更時も配置維持</span>
          </label>
        </div>

        {/* 選択中カテゴリの操作バー ＆ 「パーツ一覧 / 位置・角度微調整」サブタブ */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-zinc-100 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-600 border border-zinc-200/60">
                Layer {String(CATEGORY_META[activeCategory].order).padStart(2, '0')}
              </span>
              <h3 className="text-sm font-bold text-zinc-900">
                {CATEGORY_META[activeCategory].label}
              </h3>
              <span className="hidden text-xs text-zinc-400 sm:inline">
                ({CATEGORY_META[activeCategory].description})
              </span>
              {actionNotice && (
                <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
                  {actionNotice}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 truncate">
              装着中:{' '}
              <span className="font-medium text-zinc-800">
                {currentEquippedInActive ? currentEquippedInActive.name : 'なし（未装着）'}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* パーツ選択 / 位置・角度微調整 / レイヤー重なり順 タブ切り替え */}
            <div className="flex rounded-lg bg-zinc-100 p-0.5 border border-zinc-200/60">
              <button
                type="button"
                onClick={() => setRightTab('parts')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition ${
                  rightTab === 'parts'
                    ? 'bg-white text-zinc-900 shadow-sm font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900 font-medium'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>パーツ選択</span>
              </button>
              <button
                type="button"
                onClick={() => setRightTab('adjust')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition ${
                  rightTab === 'adjust'
                    ? 'bg-white text-zinc-900 shadow-sm font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900 font-medium'
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>手足・位置微調整</span>
                {isCurrentAdjusted && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setRightTab('layers')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition ${
                  rightTab === 'layers'
                    ? 'bg-white text-zinc-900 shadow-sm font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900 font-medium'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>レイヤー重なり順</span>
                {draftAdjustments.layerOrder && (
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                )}
              </button>
            </div>

            {currentEquippedInActive && onEditPartInStudio && (
              <button
                type="button"
                onClick={() => onEditPartInStudio(currentEquippedInActive)}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition"
                title="現在装着中のパーツをスタジオに読み込んでサイズ・角度・透過・ソケットピンを再編集します"
              >
                <Pencil className="h-3 w-3 text-zinc-500" />
                <span>再編集</span>
              </button>
            )}

            {currentEquippedInActive && (
              <button
                type="button"
                onClick={() => setCroppingPart(currentEquippedInActive)}
                className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition"
                title="GIMP風の楕円選択ツールで、このパーツの特定部分を丸く切り抜いたり不要箇所を消去・透過します"
              >
                <Circle className="h-3 w-3 text-indigo-600" />
                <span>楕円切り抜き</span>
              </button>
            )}

            {currentEquippedInActive && oppositeSymmetryCategory && (
              <button
                type="button"
                onClick={() =>
                  void handleDuplicatePartClick(currentEquippedInActive, {
                    mirrorToOpposite: true,
                    equipCreated: true,
                  })
                }
                className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition"
                title={`左右反転して「${CATEGORY_META[oppositeSymmetryCategory].label}」へ同一サイズで複製・装着します`}
              >
                <FlipHorizontal className="h-3 w-3 text-zinc-500" />
                <span>反転複製</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleUnequipCategory(activeCategory)}
              disabled={!currentEquippedInActive}
              className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition"
            >
              <Ban className="h-3 w-3 text-zinc-400" />
              <span>外す</span>
            </button>

            {onOpenStudioForCategory && (
              <button
                type="button"
                onClick={() => onOpenStudioForCategory(activeCategory)}
                className="flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 transition"
              >
                <Plus className="h-3 w-3" />
                <span>パーツ新規作成</span>
              </button>
            )}
          </div>
        </div>


        {/* 持ち物（ステッキ・剣など）選択時の「持ち物本体の角度・サイズ・位置 ＆ 持ち方 ＆ 前後レイヤー」調整パネル */}
        {(activeCategory === 'hand_item' || (rightTab === 'adjust' && currentHandItems.length > 0)) && (
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
                持ち物の角度・位置・サイズ微調整 ＆ 上下動アニメーション
              </span>
              {/* 右手 / 左手 切り替え（アバター本人にとっての右・左） */}
              <div className="flex items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5 border border-zinc-200/80">
                {(
                  [
                    { id: 'right', label: '右手(向かって左)に持つ' },
                    { id: 'left', label: '左手(向かって右)に持つ' },
                  ] as const
                ).map((sideOpt) => {
                  const currentSide = handItemAdjustment.holdHandSide ?? 'right';
                  const active = currentSide === sideOpt.id;
                  return (
                    <button
                      key={sideOpt.id}
                      type="button"
                      onClick={() => updateHandItemAdjustment({ holdHandSide: sideOpt.id })}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                        active
                          ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                      }`}
                    >
                      {sideOpt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 複数装備中の持ち物一覧セレクター ＆ 個別はずす */}
            {currentHandItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-white p-2 border border-zinc-200/80 shadow-2xs">
                <span className="text-[11px] font-semibold text-zinc-700 shrink-0">
                  調整対象（{currentHandItems.length}個装備中）:
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentHandItems.map((item, idx) => {
                    const isSelected = (activeHandItem?.id === item.id);
                    const itemAdj = draftAdjustments.handItemAdjustments?.[item.id] ?? (idx === 0 ? draftAdjustments.hand_item : undefined);
                    const isBobbing = Boolean(itemAdj?.bobbing);
                    return (
                      <div
                        key={item.id}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition border ${
                          isSelected
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs font-medium'
                            : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedHandItemId(item.id)}
                          className="flex items-center gap-1"
                        >
                          <span className="truncate max-w-[120px]">{item.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHandItemId(item.id);
                            updateHandItemAdjustment({ bobbing: !isBobbing }, item.id);
                          }}
                          className={`rounded px-1.5 py-0.2 text-[9px] font-semibold transition active:scale-95 ${
                            isBobbing
                              ? isSelected
                                ? 'bg-zinc-700 text-zinc-100'
                                : 'bg-zinc-800 text-zinc-100'
                              : isSelected
                              ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                              : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                          }`}
                          title={isBobbing ? '上下浮遊: ON（タップでOFF）' : '上下浮遊: OFF（タップでON）'}
                        >
                          {isBobbing ? '浮遊 ON' : '固定'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDraft((prev) => {
                              const nextItems = (prev.hand_items || []).filter((p) => p.id !== item.id);
                              return {
                                ...prev,
                                hand_item: nextItems[0] ?? null,
                                hand_items: nextItems,
                              };
                            });
                          }}
                          className={`ml-0.5 rounded p-0.5 text-[10px] leading-none transition ${
                            isSelected ? 'text-zinc-400 hover:text-white' : 'text-zinc-400 hover:text-zinc-700'
                          }`}
                          title="この持ち物をはずす"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ★「上下にふわふわ動かす（浮遊アニメーション）」ON / OFF トグルスイッチ */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg bg-white p-2.5 border border-zinc-200/80 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg shrink-0">🎈</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900">
                      上下にふわふわ動かす（浮遊アニメーション）
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9px] font-semibold ${
                        handItemAdjustment.bobbing
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                      }`}
                    >
                      {handItemAdjustment.bobbing ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate">
                    {activeHandItem ? `「${activeHandItem.name}」` : '選択中の持ち物'}
                    {handItemAdjustment.bobbing ? '：上下にフワフワ浮遊します' : '：静止（固定）します'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateHandItemAdjustment({ bobbing: !Boolean(handItemAdjustment.bobbing) })
                }
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-2xs transition active:scale-95 ${
                  handItemAdjustment.bobbing
                    ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                    : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <span>{handItemAdjustment.bobbing ? '動かす (ON)' : '静止する (OFF)'}</span>
              </button>
            </div>

            {/* ★常時表示：持ち物本体（ステッキ・剣など）の角度・サイズ・位置 (X/Y)・反転コントロール */}
            <div className="flex flex-col gap-3 rounded-xl bg-white p-3 border border-zinc-200/80 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-white">
                    持ち物本体
                  </span>
                  <span className="text-xs font-semibold text-zinc-900">
                    ステッキ・持ち物の角度・サイズ・位置を微調整
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500">
                  💡 左プレビュー上でドラッグ移動 ／ Shift+ホイールで角度回転も可能
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* 左カラム：持ち物本体の角度（Rotation）＆ サイズ（Scale）＆ 反転 */}
                <div className="flex flex-col gap-2.5 rounded-lg bg-zinc-50/70 p-2.5 border border-zinc-200/60">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-zinc-900">
                      角度 (Rotation)
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[-90, -45, -20, 0, 20, 45, 90].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => updateHandItemAdjustment({ rotation: deg })}
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium transition ${
                            handItemAdjustment.rotation === deg
                              ? 'bg-zinc-900 text-white shadow-2xs'
                              : 'bg-white text-zinc-600 border border-zinc-200/80 hover:bg-zinc-100'
                          }`}
                        >
                          {deg > 0 ? `+${deg}°` : `${deg}°`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
                      <span>回転角度スライダー</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateHandItemAdjustment({
                              rotation: Math.max(-180, handItemAdjustment.rotation - 5),
                            })
                          }
                          className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                          title="反時計回りに5°回転"
                        >
                          -5°
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateHandItemAdjustment({
                              rotation: Math.max(-180, handItemAdjustment.rotation - 1),
                            })
                          }
                          className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                          title="反時計回りに1°回転"
                        >
                          -1°
                        </button>
                        <span className="min-w-[86px] text-right font-mono text-zinc-900">
                          {handItemAdjustment.rotation > 0
                            ? `+${handItemAdjustment.rotation}`
                            : handItemAdjustment.rotation}
                          ° (実角:{solvedRig.effectiveAdjustments.hand_item?.rotation ?? 0}°)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateHandItemAdjustment({
                              rotation: Math.min(180, handItemAdjustment.rotation + 1),
                            })
                          }
                          className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                          title="時計回りに1°回転"
                        >
                          +1°
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateHandItemAdjustment({
                              rotation: Math.min(180, handItemAdjustment.rotation + 5),
                            })
                          }
                          className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                          title="時計回りに5°回転"
                        >
                          +5°
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={handItemAdjustment.rotation}
                      onChange={(e) =>
                        updateHandItemAdjustment({ rotation: Number(e.target.value) })
                      }
                      className="w-full accent-zinc-900"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-medium text-zinc-600">
                      <span>サイズ倍率 (Scale)</span>
                      <span className="font-mono text-zinc-900">
                        {Math.round(handItemAdjustment.scale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.4}
                      max={2.0}
                      step={0.01}
                      value={handItemAdjustment.scale}
                      onChange={(e) =>
                        updateHandItemAdjustment({ scale: Number(e.target.value) })
                      }
                      className="w-full accent-zinc-900"
                    />
                  </label>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateHandItemAdjustment({ flipX: !handItemAdjustment.flipX })
                      }
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                        handItemAdjustment.flipX
                          ? 'bg-zinc-900 text-white'
                          : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <FlipHorizontal className="h-3 w-3" />
                      持ち物を左右反転
                    </button>
                    <button
                      type="button"
                      onClick={resetHandItemMainAdjustment}
                      className="ml-auto flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
                    >
                      <RotateCcw className="h-3 w-3" />
                      持ち物の角度・位置をリセット
                    </button>
                  </div>
                </div>

                {/* 右カラム：持ち物本体の位置（X / Y）微調整 */}
                <div className="flex flex-col gap-2.5 rounded-lg bg-zinc-50/70 p-2.5 border border-zinc-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-900">
                      位置微調整 (X / Y)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateHandItemAdjustment({ dx: handItemAdjustment.dx - 1 })
                        }
                        className="rounded bg-white p-1 text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
                        title="持ち物を左へ1px"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateHandItemAdjustment({ dy: handItemAdjustment.dy - 1 })
                        }
                        className="rounded bg-white p-1 text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
                        title="持ち物を上へ1px"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateHandItemAdjustment({ dy: handItemAdjustment.dy + 1 })
                        }
                        className="rounded bg-white p-1 text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
                        title="持ち物を下へ1px"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateHandItemAdjustment({ dx: handItemAdjustment.dx + 1 })
                        }
                        className="rounded bg-white p-1 text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
                        title="持ち物を右へ1px"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <label className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-medium text-zinc-600">
                      <span>持ち物 横位置 (X)</span>
                      <span className="font-mono text-zinc-900">
                        {handItemAdjustment.dx > 0
                          ? `+${handItemAdjustment.dx}`
                          : handItemAdjustment.dx}
                        px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={handItemAdjustment.dx}
                      onChange={(e) =>
                        updateHandItemAdjustment({ dx: Number(e.target.value) })
                      }
                      className="w-full accent-zinc-900"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-medium text-zinc-600">
                      <span>持ち物 縦位置 (Y)</span>
                      <span className="font-mono text-zinc-900">
                        {handItemAdjustment.dy > 0
                          ? `+${handItemAdjustment.dy}`
                          : handItemAdjustment.dy}
                        px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={handItemAdjustment.dy}
                      onChange={(e) =>
                        updateHandItemAdjustment({ dy: Number(e.target.value) })
                      }
                      className="w-full accent-zinc-900"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* ★【新機能】アイテムごとのレイヤー階層（前後関係・Z階層）選択 */}
            <div className="flex flex-col gap-2 rounded-xl bg-white p-3 border border-zinc-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900">
                  レイヤー位置（アバターとの前後関係）
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {activeHandItem?.name ? `「${activeHandItem.name}」` : '現在の持ち物'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-5">
                {(
                  [
                    {
                      id: 'behind_arm',
                      label: '手の奥 (握る)',
                      sub: '剣・ステッキ・ほうき',
                      badge: '推奨',
                    },
                    {
                      id: 'in_front_arm',
                      label: '手の前 (抱える)',
                      sub: '盾・ぬいぐるみ・本',
                      badge: '標準',
                    },
                    {
                      id: 'behind_body',
                      label: '体の奥 (背中)',
                      sub: '弓矢・リュック',
                      badge: null,
                    },
                    {
                      id: 'back_lowest',
                      label: '最背面 (羽・マント)',
                      sub: '大きな翼・オーラ',
                      badge: null,
                    },
                    {
                      id: 'front_highest',
                      label: '最前面 (突き出し)',
                      sub: '手前エフェクト・魔法陣',
                      badge: null,
                    },
                  ] as {
                    id: ItemLayerPlacement;
                    label: string;
                    sub: string;
                    badge: string | null;
                  }[]
                ).map((layerOpt) => {
                  const currentPlacement =
                    handItemAdjustment.layerPlacement ??
                    (handItemAdjustment.handHoldModeOverride === 'in_front'
                      ? 'in_front_arm'
                      : 'behind_arm');
                  const isActive = currentPlacement === layerOpt.id;

                  return (
                    <button
                      key={layerOpt.id}
                      type="button"
                      onClick={() =>
                        updateHandItemAdjustment({
                          layerPlacement: layerOpt.id,
                          handHoldModeOverride:
                            layerOpt.id === 'in_front_arm' ? 'in_front' : 'behind_hand',
                        })
                      }
                      className={`flex flex-col items-start rounded-lg p-2 text-left transition border ${
                        isActive
                          ? 'border-zinc-900 bg-zinc-900 text-white shadow-2xs ring-1 ring-zinc-900'
                          : 'border-zinc-200/80 bg-zinc-50/50 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <span className="text-[11px] font-bold leading-tight">
                          {layerOpt.label}
                        </span>
                        {layerOpt.badge && (
                          <span
                            className={`rounded px-1 py-0.2 text-[8px] font-semibold uppercase ${
                              isActive
                                ? 'bg-zinc-800 text-zinc-300'
                                : 'bg-zinc-200 text-zinc-600'
                            }`}
                          >
                            {layerOpt.badge}
                          </span>
                        )}
                      </div>
                      <span
                        className={`mt-0.5 text-[9px] leading-tight ${
                          isActive ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      >
                        {layerOpt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== サブタブ1：パーツ選択グリッド ==================== */}
        {rightTab === 'parts' && (
          <div className="max-h-[calc(100vh-22rem)] min-h-[260px] overflow-y-auto pr-1">
            {/* 左右の腕・脚カテゴリで反対側にパーツがある場合、ワンクリックで左右反転複製・装着できるバー */}
            {oppositeSymmetryCategory && oppositeCandidatePart && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3">
                <div className="flex items-center gap-2">
                  <FlipHorizontal className="h-4 w-4 shrink-0 text-zinc-600" />
                  <p className="text-xs font-medium text-zinc-700">
                    反対側の{CATEGORY_META[oppositeSymmetryCategory].label}「
                    <span className="font-semibold text-zinc-900">{oppositeCandidatePart.name}</span>
                    」を同じサイズ・高さで複製できます
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void handleDuplicatePartClick(oppositeCandidatePart, {
                      mirrorToOpposite: true,
                      equipCreated: true,
                    })
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 transition"
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                  <span>反転して{CATEGORY_META[activeCategory].label}に複製・装着</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {/* 先頭は必ず「なし（未装着）」 */}
              {(() => {
                const isNoneSelected =
                  activeCategory === 'hand_item'
                    ? currentHandItems.length === 0
                    : !currentEquippedInActive;
                return (
                  <button
                    type="button"
                    onClick={() => handleUnequipCategory(activeCategory)}
                    className={`flex flex-col overflow-hidden rounded-xl border transition text-left ${
                      isNoneSelected
                        ? 'border-zinc-900 ring-1 ring-zinc-900 shadow-sm bg-white'
                        : 'border-dashed border-zinc-200 hover:border-zinc-300 bg-zinc-50/40 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 text-zinc-400">
                      <Ban className="h-6 w-6" />
                      <span className="text-[11px] font-medium">未装着</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2 bg-white">
                      <span className="truncate text-xs font-medium text-zinc-600">なし</span>
                      {isNoneSelected && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-white">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })()}

              {activeCategoryParts.map((part) => {
                const isSelected =
                  activeCategory === 'hand_item'
                    ? currentHandItems.some((h) => h.id === part.id)
                    : resolvePartKey(currentEquippedInActive) === part.id;
                const oppCat = getOppositeSymmetryCategory(part.category);

                return (
                  <div
                    key={part.id}
                    className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white transition shadow-sm ${
                      isSelected
                        ? 'border-zinc-900 ring-1 ring-zinc-900'
                        : 'border-zinc-200/80 hover:border-zinc-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectPart(part)}
                      className="flex flex-1 flex-col text-left"
                    >
                      <div className="avatar-checker relative flex aspect-square w-full items-center justify-center overflow-hidden bg-zinc-50/30">
                        <img
                          src={part.src}
                          alt={part.name}
                          draggable={false}
                          className="h-full w-full object-contain transition duration-200 group-hover:scale-105"
                        />
                        {part.rig?.bounds && (
                          <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-zinc-900/70 backdrop-blur-sm px-1.5 py-0.5 font-mono text-[9px] text-zinc-200">
                            {part.rig.bounds.width}×{part.rig.bounds.height}
                          </span>
                        )}
                        {part.linkedParts && (part.linkedParts.arm_left || part.linkedParts.arm_right) && (part.linkedParts.leg_left || part.linkedParts.leg_right) ? (
                          <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-md bg-indigo-600/95 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm flex items-center gap-0.5">
                            <span>👗</span>
                            <span>手足セット</span>
                          </span>
                        ) : part.linkedParts && (part.linkedParts.arm_left || part.linkedParts.arm_right) ? (
                          <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-md bg-indigo-600/90 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                            🤝 手セット済
                          </span>
                        ) : part.linkedParts && (part.linkedParts.leg_left || part.linkedParts.leg_right) ? (
                          <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-md bg-emerald-600/90 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                            🤝 足セット済
                          </span>
                        ) : null}
                      </div>

                      {editingPartId === part.id ? (
                        <div
                          className="flex items-center gap-1 px-2 py-1.5 bg-zinc-50 border-t border-zinc-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingPartName}
                            onChange={(e) => setEditingPartName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void handleSaveRename(part);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                handleCancelRename();
                              }
                            }}
                            autoFocus
                            maxLength={30}
                            className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none"
                            placeholder="パーツ名"
                          />
                          <button
                            type="button"
                            onClick={() => void handleSaveRename(part)}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-900 text-white hover:bg-zinc-800 transition"
                            title="保存"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelRename}
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-200 text-zinc-600 hover:bg-zinc-300 transition"
                            title="キャンセル"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1 px-3 pt-2.5 pb-1.5">
                          <span className="truncate text-xs font-medium text-zinc-800" title={part.name}>
                            {part.name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartRename(part);
                              }}
                              className="rounded p-0.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition"
                              title="名前を変更"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            {isSelected && (
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-white">
                                <Check className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </button>

                    {/* カード下部の再編集・複製・左右反転複製アクションバー */}
                    <div className="flex flex-col gap-1 border-t border-zinc-100 p-2 bg-zinc-50/30">
                      <div className="grid grid-cols-2 gap-1">
                        {onEditPartInStudio && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditPartInStudio(part);
                            }}
                            className="flex items-center justify-center gap-1 rounded-md border border-zinc-200/80 bg-white px-1.5 py-1 text-[10px] font-medium text-zinc-700 hover:bg-zinc-50 transition"
                            title="スタジオに読み込んでサイズ・角度・透過・ピン位置を再編集"
                          >
                            <Pencil className="h-2.5 w-2.5 text-zinc-500" />
                            <span>再編集</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDuplicatePartClick(part, {
                              mirrorToOpposite: false,
                              equipCreated: false,
                            });
                          }}
                          className={`flex items-center justify-center gap-1 rounded-md border border-zinc-200/80 bg-white px-1.5 py-1 text-[10px] font-medium text-zinc-700 hover:bg-zinc-50 transition ${
                            onEditPartInStudio ? '' : 'col-span-2'
                          }`}
                          title="同じカテゴリ内にコピーを複製"
                        >
                          <Copy className="h-2.5 w-2.5 text-zinc-500" />
                          <span>複製</span>
                        </button>
                      </div>

                      {oppCat && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDuplicatePartClick(part, {
                              mirrorToOpposite: true,
                              equipCreated: true,
                            });
                          }}
                          className="flex items-center justify-center gap-1 rounded-md border border-zinc-200/80 bg-white px-1.5 py-1 text-[10px] font-medium text-zinc-700 hover:bg-zinc-50 transition"
                          title={`左右反転して「${CATEGORY_META[oppCat].label}」へ同一サイズで複製・装着します`}
                        >
                          <FlipHorizontal className="h-2.5 w-2.5 text-zinc-500" />
                          <span>反転して{CATEGORY_META[oppCat].label}へ複製</span>
                        </button>
                      )}
                    </div>

                    {onDeletePart && (
                      <button
                        type="button"
                        title="このパーツをカタログから削除"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`パーツ「${part.name}」を削除しますか？`)) {
                            if (isSelected) handleUnequipCategory(activeCategory);
                            void onDeletePart(part.id);
                          }
                        }}
                        className="absolute right-1.5 top-1.5 rounded-md bg-white/90 p-1 text-zinc-400 opacity-0 shadow-sm border border-zinc-200 transition hover:text-rose-600 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {activeCategoryParts.length === 0 && (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/40 p-6 text-center">
                <p className="text-xs text-zinc-500">
                  「{CATEGORY_META[activeCategory].label}」のパーツはまだ登録されていません。
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {oppositeSymmetryCategory && oppositeCandidatePart && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleDuplicatePartClick(oppositeCandidatePart, {
                          mirrorToOpposite: true,
                          equipCreated: true,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 transition"
                    >
                      <FlipHorizontal className="h-3.5 w-3.5" />
                      <span>
                        {CATEGORY_META[oppositeSymmetryCategory].label}「{oppositeCandidatePart.name}」を反転複製
                      </span>
                    </button>
                  )}
                  {onOpenStudioForCategory && (
                    <button
                      type="button"
                      onClick={() => onOpenStudioForCategory(activeCategory)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>パーツを新規作成</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== サブタブ2：服装に合わせた手足・各部位の位置・角度微調整 ==================== */}
        {rightTab === 'adjust' && (
          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  微調整: {CATEGORY_META[activeCategory].label}
                </h4>
                <p className="mt-0.5 text-xs text-zinc-500">
                  服装による位置ズレは、プレビュー直接ドラッグまたは下のスライダーで微調整できます
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveActiveTemplate}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 transition active:scale-95"
                  title={`「${CATEGORY_META[activeCategory].label}」の現在の配置をテンプレートとして記憶します`}
                >
                  <Save className="h-3.5 w-3.5 text-zinc-500" />
                  <span>配置を記憶</span>
                </button>
                {hasActiveCategoryTemplate && (
                  <button
                    type="button"
                    onClick={handleApplyActiveCategoryTemplate}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition active:scale-95"
                    title={`記憶された「${CATEGORY_META[activeCategory].label}」の配置を適用します`}
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
                    <span>記憶を適用</span>
                  </button>
                )}
                {currentEquippedInActive && onEditPartInStudio && (
                  <button
                    type="button"
                    onClick={() => onEditPartInStudio(currentEquippedInActive)}
                    className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 shadow-sm hover:bg-amber-100 transition"
                  >
                    <Pencil className="h-3.5 w-3.5 text-amber-600" />
                    <span>スタジオで編集</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetActiveAdjustment}
                  disabled={!isCurrentAdjusted}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50 disabled:opacity-40 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
                  <span>部位リセット</span>
                </button>
                <button
                  type="button"
                  onClick={resetAllAdjustments}
                  disabled={!hasAnyAdjustments}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 transition"
                >
                  <span>全レイヤー消去</span>
                </button>
              </div>
            </div>

            {/* 素早く手・足・持ち物・靴を切り替えられるショートカットバー */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-zinc-200/80 bg-white p-1.5 shadow-sm">
              <span className="px-1.5 text-[11px] font-medium text-zinc-400">クイック選択:</span>
              {(
                [
                  'arm_left',
                  'arm_right',
                  'leg_left',
                  'leg_right',
                  'hand_item',
                  'shoes',
                  'tops',
                  'bottoms',
                  'hat_glasses',
                ] as AvatarCategory[]
              ).map((cat) => {
                const isSelected = activeCategory === cat;
                const hasAdj = hasCustomAdjustment(draftAdjustments[cat]);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition ${
                      isSelected
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    <span>{CATEGORY_META[cat].label}</span>
                    {hasAdj && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-amber-500'}`}
                        title="微調整あり"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 左腕↔右腕 / 左脚↔右脚の左右サイズ感・高さ・対称角度ワンクリック統一バー */}
            {oppositeSymmetryCategory && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-800">
                  <FlipHorizontal className="h-4 w-4 text-zinc-500" />
                  <span>
                    左右統一: {CATEGORY_META[activeCategory].label} ⇔ {CATEGORY_META[oppositeSymmetryCategory].label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSyncSymmetryAdjustment('to_opposite')}
                    className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-800 hover:bg-zinc-100 transition"
                    title="現在のサイズ倍率・Y座標・対称X・対称角度を反対側の腕/脚へコピーします"
                  >
                    この値を「{CATEGORY_META[oppositeSymmetryCategory].label}」へ反映
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSyncSymmetryAdjustment('from_opposite')}
                    className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 transition"
                    title="反対側の腕/脚のサイズ倍率・Y座標・対称X・対称角度をこちらへコピーします"
                  >
                    「{CATEGORY_META[oppositeSymmetryCategory].label}」の値を反映
                  </button>
                </div>
              </div>
            )}

            {!currentEquippedInActive && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-800">
                ※現在「{CATEGORY_META[activeCategory].label}」は「なし（未装着）」です。パーツを装着するとプレビュー上で確認しながら微調整できます。
              </div>
            )}

            {/* 長袖・袖処理 ＆ はみ出し自動カッティング */}
            <div className="flex flex-col gap-2.5 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
              {(activeCategory === 'tops' ||
                activeCategory === 'arm_left' ||
                activeCategory === 'arm_right') &&
                Boolean(draft.tops) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                    <span className="text-[11px] font-medium text-zinc-600">
                      素体腕の長袖・半袖処理:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(
                        [
                          { id: undefined, label: 'パーツ設定依存' },
                          { id: 'short_or_sleeveless', label: '半袖 (表示)' },
                          { id: 'long_sleeve_mask', label: '長袖 (自動マスク)' },
                          { id: 'hide_arms', label: '腕非表示' },
                        ] as { id: TopSleeveMode | undefined; label: string }[]
                      ).map((opt) => {
                        const topsAdj = getLayerAdjustment(draftAdjustments, 'tops');
                        const isSelected = topsAdj.sleeveModeOverride === opt.id;
                        return (
                          <button
                            key={opt.id ?? 'default'}
                            type="button"
                            onClick={() =>
                              setDraftAdjustments((prev) => {
                                const cur = getLayerAdjustment(prev, 'tops');
                                return {
                                  ...prev,
                                  tops: {
                                    ...cur,
                                    sleeveModeOverride: opt.id,
                                  },
                                };
                              })
                            }
                            className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                              isSelected
                                ? 'bg-zinc-900 text-white shadow-sm'
                                : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* 方法①：服のシルエットに合わせた「素体・脚のはみ出し自動カッティング」詳細設定 */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600">
                  <Scissors className="h-3.5 w-3.5 text-zinc-400" />
                  はみ出し自動カット:
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {(
                    [
                      { id: 'auto', label: '標準カット' },
                      { id: 'strict', label: '強（首下完全カット）' },
                      { id: 'off', label: 'OFF' },
                    ] as { id: BodySilhouetteClipMode; label: string }[]
                  ).map((opt) => {
                    const isSelected = solvedRig.activeBodyClipMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setDraftAdjustments((prev) => {
                            const curBody = getLayerAdjustment(prev, 'body');
                            return {
                              ...prev,
                              body: {
                                ...curBody,
                                bodyClipMode: opt.id,
                              },
                            };
                          })
                        }
                        className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                          isSelected
                            ? 'bg-zinc-900 text-white shadow-sm'
                            : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* 十字キー＆X/Yスライダー */}
              <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700">位置オフセット</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateActiveAdjustment({ dx: currentAdjustment.dx - 1 })}
                      className="rounded border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
                      title="左へ1px"
                    >
                      <ArrowLeft className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveAdjustment({ dy: currentAdjustment.dy - 1 })}
                      className="rounded border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
                      title="上へ1px"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveAdjustment({ dy: currentAdjustment.dy + 1 })}
                      className="rounded border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
                      title="下へ1px"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveAdjustment({ dx: currentAdjustment.dx + 1 })}
                      className="rounded border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
                      title="右へ1px"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <label className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-medium text-zinc-600">
                    <span>横移動 (X)</span>
                    <span className="font-mono text-zinc-900">{currentAdjustment.dx}px</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={currentAdjustment.dx}
                    onChange={(e) => updateActiveAdjustment({ dx: Number(e.target.value) })}
                    className="w-full accent-zinc-900"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-medium text-zinc-600">
                    <span>縦移動 (Y)</span>
                    <span className="font-mono text-zinc-900">{currentAdjustment.dy}px</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={currentAdjustment.dy}
                    onChange={(e) => updateActiveAdjustment({ dy: Number(e.target.value) })}
                    className="w-full accent-zinc-900"
                  />
                </label>
              </div>

              {/* 拡大縮小・回転・反転・トップス前面表示 */}
              <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-3.5 shadow-sm">
                <label className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-medium text-zinc-600">
                    <span>サイズ倍率 (Scale)</span>
                    <span className="font-mono text-zinc-900">
                      {Math.round(currentAdjustment.scale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.4}
                    max={2.0}
                    step={0.01}
                    value={currentAdjustment.scale}
                    onChange={(e) => updateActiveAdjustment({ scale: Number(e.target.value) })}
                    className="w-full accent-zinc-900"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-medium text-zinc-600">
                    <span>回転角度 (Rotation)</span>
                    <span className="font-mono text-zinc-900">{currentAdjustment.rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={currentAdjustment.rotation}
                    onChange={(e) => updateActiveAdjustment({ rotation: Number(e.target.value) })}
                    className="w-full accent-zinc-900"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => updateActiveAdjustment({ flipX: !currentAdjustment.flipX })}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      currentAdjustment.flipX
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <FlipHorizontal className="h-3.5 w-3.5" />
                    <span>左右反転: {currentAdjustment.flipX ? 'ON' : 'OFF'}</span>
                  </button>

                  {PROMOTABLE_TO_ABOVE_TOPS.includes(activeCategory) && (
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveAdjustment({ aboveTops: !currentAdjustment.aboveTops })
                      }
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        currentAdjustment.aboveTops
                          ? 'bg-zinc-900 text-white shadow-sm'
                          : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                      }`}
                      title="ONにすると、この腕や脚パーツをトップス（服）よりも前面（手前）に描画します"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>服より前面: {currentAdjustment.aboveTops ? 'ON' : 'OFF'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== サブタブ3：全アイテムのレイヤー重なり順（前後関係ドラッグ＆ドロップ） ==================== */}
        {rightTab === 'layers' && (
          <AvatarLayerOrderPanel
            layerOrder={draftAdjustments.layerOrder ?? DEFAULT_AVATAR_LAYER_ORDER}
            equippedParts={draft}
            onLayerOrderChange={handleLayerOrderChange}
            onResetLayerOrder={handleResetLayerOrder}
            activeCategory={activeCategory}
            onSelectCategory={(cat) => setActiveCategory(cat)}
          />
        )}
      </section>

      {/* 楕円選択・切り抜きモーダル */}
      {croppingPart && (
        <EllipseCropModal
          imageSrc={croppingPart.src}
          title={`パーツの楕円切り抜き・透過: ${croppingPart.name}`}
          onApply={handleApplyCropToPart}
          onClose={() => setCroppingPart(null)}
          referenceOptions={cropReferenceOptions}
          defaultReferenceId={defaultCropReferenceId}
        />
      )}
    </div>
  );
}
