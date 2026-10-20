import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Circle,
  Copy,
  Crosshair,
  Download,
  Eraser,
  Eye,
  FlipHorizontal,
  FlipVertical,
  ImagePlus,
  Layers,
  Maximize,
  Minus,
  Move,
  Palette,
  Pencil,
  Pipette,
  Plus,
  RotateCcw,
  Save,
  Shirt,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  User,
  Wand2,
  X,
} from 'lucide-react';
import { AVATAR_LAYERS } from '../types';
import type {
  AvatarCategory,
  AvatarPart,
  EquippedParts,
  HandHoldMode,
  LayerAdjustmentMap,
  PartRigMetadata,
  PartTransform,
  Point2D,
  TopSleeveMode,
} from '../types';
import { AVATAR_CANVAS_SIZE, CATEGORY_META } from '../constants';
import {
  createInitialFitTransform,
  createOffscreenCanvas,
  detectCornerBackgroundColors,
  drawPartWithTransform,
  getTransformedBoundingCorners,
  hexToRgb,
  processChromaKeyImageData,
  rgbToHex,
  stagePointToSourcePixel,
  type ChromaKeyColor,
} from '../utils/imageProcessing';
import {
  analyzeNormalizedCanvasRig,
  computeAutoNormalizedTransform,
  computeTransformMatchingReferenceBounds,
  getOppositeSymmetryCategory,
} from '../utils/autoRigging';
import {
  adjustmentToLayerStyle,
  resolvePartSrc,
  sanitizeFileName,
} from '../utils/parts';
import { downloadDataUrl, loadAvatarImage } from '../utils/composeAvatar';
import { duplicateCatalogPart, saveCatalogPart } from '../storage/partCatalog';
import { usePartCatalog } from '../hooks/usePartCatalog';
import { useReferenceAnchors } from '../hooks/useReferenceAnchors';
import { PRESET_BODY, PRESET_BODY_SRC } from '../presets/svgParts';
import {
  EllipseCropModal,
  type EllipseCropResult,
  type EllipseCropReferenceOption,
} from './EllipseCropModal';
import '../avatar.css';

export interface PartCalibrationStudioProps {
  /** 現在クローゼットで装着中のパーツ群（ガイド重ね合わせ用） */
  guideParts?: EquippedParts;
  /** クローゼットで設定済みの各レイヤー位置・角度微調整（ガイド重ね合わせにも反映） */
  guideAdjustments?: LayerAdjustmentMap;
  /** 初期選択カテゴリ */
  defaultCategory?: AvatarCategory;
  /** クローゼットから「スタジオで再編集」が指定された既存パーツ */
  initialEditPart?: AvatarPart | null;
  /** initialEditPart の読み込み完了後に親側状態をクリアするコールバック */
  onClearInitialEditPart?: () => void;
  /** カタログへパーツ登録・更新が完了した際のコールバック */
  onPartRegistered?: (part: AvatarPart, options: { openClosetToTryOn: boolean }) => void;
  className?: string;
}

type StudioTool = 'move' | 'pick' | 'erase';
type StudioPanelTab = 'source' | 'chroma' | 'transform' | 'catalog';
type StageBackgroundMode = 'checker' | 'dark' | 'white' | 'green';
type SocketPinKey =
  | 'attachPoint'
  | 'leftShoulder'
  | 'rightShoulder'
  | 'neck'
  | 'waist'
  | 'leftHip'
  | 'rightHip'
  | 'handGrip'
  | 'leftHandGrip'
  | 'rightHandGrip'
  | 'ankle';

const S = AVATAR_CANVAS_SIZE; // 512
const MAX_SOURCE_DIMENSION = 1024;
const MAX_UNDO_STACK = 15;

const IDENTITY_TRANSFORM: PartTransform = {
  x: S / 2,
  y: S / 2,
  scale: 1,
  rotation: 0,
  flipX: false,
  flipY: false,
};

const PRESET_KEY_COLORS = [
  { label: '白 (#FFF)', hex: '#FFFFFF' },
  { label: 'グリーン (#0F0)', hex: '#00FF00' },
  { label: 'マゼンタ (#F0F)', hex: '#FF00FF' },
  { label: '黒 (#000)', hex: '#000000' },
];

const SOCKET_LABELS: Record<SocketPinKey, { label: string; color: string }> = {
  attachPoint: { label: '★付け根/グリップ(親へ吸着)', color: '#e11d48' },
  leftShoulder: { label: '●左肩/左袖ソケット(向かって右)', color: '#2563eb' },
  rightShoulder: { label: '●右肩/右袖ソケット(向かって左)', color: '#2563eb' },
  neck: { label: '●首ソケット', color: '#9333ea' },
  waist: { label: '●腰ソケット', color: '#059669' },
  leftHip: { label: '●左股関節ソケット(向かって右)', color: '#0284c7' },
  rightHip: { label: '●右股関節ソケット(向かって左)', color: '#0284c7' },
  handGrip: { label: '●手のひら(持ち物吸着)', color: '#d97706' },
  leftHandGrip: { label: '●左手グリップ(向かって右)', color: '#d97706' },
  rightHandGrip: { label: '●右手グリップ(向かって左)', color: '#ea580c' },
  ankle: { label: '●足首(靴吸着)', color: '#4f46e5' },
};

const round1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const normalizeDegree = (deg: number) => {
  let d = ((((deg + 180) % 360) + 360) % 360) - 180;
  if (d === -180) d = 180;
  return round1(d);
};

async function decodeImageBlobToCanvas(
  blob: Blob,
  maxDimension: number,
  alreadyNormalized?: boolean,
): Promise<HTMLCanvasElement> {
  // 1. まず createImageBitmap で高速デコードを試行
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      const scaleRatio = alreadyNormalized
        ? 1
        : Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height, 1));
      const w = Math.max(1, Math.round(bitmap.width * scaleRatio));
      const h = Math.max(1, Math.round(bitmap.height * scaleRatio));
      const canvas = createOffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();
      return canvas;
    } catch {
      // createImageBitmap 非対応形式の場合は Image + DataURL フォールバックへ
    }
  }

  // 2. FileReader (DataURL) + HTMLImageElement による確実なデコード
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('画像データの読み取りに失敗しました'));
    };
    reader.onerror = () => reject(new Error('画像ファイルの読み取りに失敗しました'));
    reader.readAsDataURL(blob);
  });

  const img = await loadAvatarImage(dataUrl);
  const scaleRatio = alreadyNormalized
    ? 1
    : Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight, 1));
  const w = Math.max(1, Math.round(img.naturalWidth * scaleRatio));
  const h = Math.max(1, Math.round(img.naturalHeight * scaleRatio));
  const canvas = createOffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/**
 * クリップボードやドラッグ＆ドロップされた HTML 断片から安全に <img> の src 属性を抽出する
 * （正規表現ではなく DOMParser を使用し、許可されたスキームのみ返す）
 */
function extractImageSrcFromHtml(html: string): string | null {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const src = doc.querySelector('img')?.getAttribute('src')?.trim();
    if (!src) return null;
    if (
      src.startsWith('data:image/') ||
      src.startsWith('blob:') ||
      src.startsWith('http://') ||
      src.startsWith('https://')
    ) {
      return src;
    }
    return null;
  } catch {
    return null;
  }
}

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  format?: (val: number) => string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
        <span>{label}</span>
        <span className="font-mono text-slate-800">{format ? format(value) : value}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={(e) => {
            e.preventDefault();
            onChange(Math.max(min, Math.round((value - step) * 1000) / 1000));
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-30 transition"
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={(e) => {
            e.preventDefault();
            onChange(Math.min(max, Math.round((value + step) * 1000) / 1000));
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-30 transition"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </label>
  );
}

/**
 * 開発者用：AI画像の位置合わせ＆背景透過スタジオ (<PartCalibrationStudio />)
 *
 * - 仕組み①：実体ピクセル領域（不透明部分）を検出し、余白に関わらず3頭身の標準サイズ・基準位置へ自動フィット
 * - 仕組み③：シルエット輪郭から関節ソケット（肩・手・股関節・足首・持ち手）を自動検出し、ステージ上でピン表示・ドラッグ微調整可能
 * - 仕組み②：保存時にソケット情報 (PartRigMetadata) を付与し、クローゼットでどのパーツを組み合わせても自動吸着を実現
 */
export function PartCalibrationStudio({
  guideParts = {},
  guideAdjustments = {},
  defaultCategory = 'body',
  initialEditPart = null,
  onClearInitialEditPart,
  onPartRegistered,
  className = '',
}: PartCalibrationStudioProps) {
  const { customParts, deletePart } = usePartCatalog();
  const { anchors } = useReferenceAnchors();

  const [category, setCategory] = useState<AvatarCategory>(
    initialEditPart?.category ?? defaultCategory,
  );
  const [partName, setPartName] = useState<string>(initialEditPart?.name ?? '');
  const [editingPart, setEditingPart] = useState<AvatarPart | null>(null);
  const [panelTab, setPanelTab] = useState<StudioPanelTab>('source');
  const [sourceInfo, setSourceInfo] = useState<{
    name: string;
    width: number;
    height: number;
    version: number;
  } | null>(null);

  useEffect(() => {
    if (!initialEditPart) {
      setCategory(defaultCategory);
    }
  }, [defaultCategory, initialEditPart]);

  // キャンバス参照
  const originalImageDataRef = useRef<ImageData | null>(null);
  const chromaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const eraserMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositedPartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stagePartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const customBodyGuideInputRef = useRef<HTMLInputElement | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);

  // ドラッグ状態管理（移動または消しゴムのみ）
  const activeDragRef = useRef<
    | { mode: 'move'; startX: number; startY: number; origX: number; origY: number }
    | { mode: 'erase'; lastPt: { x: number; y: number } }
    | null
  >(null);

  const [undoCount, setUndoCount] = useState<number>(0);
  const [renderTick, setRenderTick] = useState<number>(0);

  // クロマキー透過パラメータ
  const [keyColors, setKeyColors] = useState<ChromaKeyColor[]>([]);
  const [tolerance, setTolerance] = useState<number>(15);
  const [feather, setFeather] = useState<number>(8);
  const [contiguous, setContiguous] = useState<boolean>(false);
  const [despill, setDespill] = useState<boolean>(true);

  // 自動サイズ正規化 ＆ 自動ソケット検出の状態
  const [autoSizeOnChange, setAutoSizeOnChange] = useState<boolean>(true);
  const [userManuallyMovedPart, setUserManuallyMovedPart] = useState<boolean>(false);
  const [detectedRig, setDetectedRig] = useState<PartRigMetadata | null>(null);
  const [customSocketOverrides, setCustomSocketOverrides] = useState<
    Partial<Record<SocketPinKey, Point2D>>
  >({});
  const [sleeveMode, setSleeveMode] = useState<TopSleeveMode>('short_or_sleeveless');
  const [sleeveMaskRadius, setSleeveMaskRadius] = useState<number>(52);
  const [handHoldMode, setHandHoldMode] = useState<HandHoldMode>('grip_fist');
  const [naturalTiltDeg, setNaturalTiltDeg] = useState<number>(18);

  // トランスフォーム＆ツール状態
  const [transform, setTransform] = useState<PartTransform>(IDENTITY_TRANSFORM);
  const [tool, setTool] = useState<StudioTool>('move');
  const [brushSize, setBrushSize] = useState<number>(24);

  // ガイド表示設定
  const [customBodyGuideUrl, setCustomBodyGuideUrl] = useState<string | null>(null);
  const [bodyGuideOpacity, setBodyGuideOpacity] = useState<number>(0.55);
  const [otherPartsOpacity, setOtherPartsOpacity] = useState<number>(0.45);
  const [showOtherEquippedParts, setShowOtherEquippedParts] = useState<boolean>(true);
  const [stageBg, setStageBg] = useState<StageBackgroundMode>('checker');
  // 素体のみ表示モード（他のパーツや余計なガイド線をすべて非表示にし、素体と編集パーツのみ表示）
  const [bodyOnlyMode, setBodyOnlyMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mobage_avatar_studio_body_only_mode') === 'true';
    } catch {
      return false;
    }
  });

  const toggleBodyOnlyMode = useCallback(() => {
    setBodyOnlyMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('mobage_avatar_studio_body_only_mode', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // 楕円選択・切り抜きモーダルの開閉状態
  const [isEllipseCropOpen, setIsEllipseCropOpen] = useState<boolean>(false);

  const transformRef = useRef(transform);
  transformRef.current = transform;

  const toastTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
      toastTimerRef.current = null;
    }, 3000);
  }, []);

  const handleToggleTool = useCallback((targetTool: StudioTool) => {
    setTool((prevTool) => {
      const next = targetTool === 'move' ? 'move' : prevTool === targetTool ? 'move' : targetTool;
      if (next === 'pick' || next === 'erase') {
        setPanelTab('chroma');
      }
      return next;
    });
  }, []);

  // 左右対称カテゴリ（左腕↔右腕、左脚↔右脚）の反対側パーツを検出（サイズ感統一用）
  const oppositeCategory = useMemo(() => getOppositeSymmetryCategory(category), [category]);
  const oppositeReferencePart = useMemo(() => {
    if (!oppositeCategory) return null;
    const equippedOpp = guideParts?.[oppositeCategory];
    if (equippedOpp && typeof equippedOpp === 'object' && 'src' in equippedOpp) {
      return equippedOpp as AvatarPart;
    }
    return customParts.find((p) => p.category === oppositeCategory) ?? null;
  }, [customParts, guideParts, oppositeCategory]);

  // 仕組み①：現在の透過済みキャンバスから実体サイズを計測し、3頭身の標準サイズ・基準位置へ自動フィットさせる
  const applyAutoSizeAndPosition = useCallback(
    (targetCategory: AvatarCategory = category, showNotification = false) => {
      const finalCanvas = compositedPartCanvasRef.current;
      if (!finalCanvas) return;
      const autoTransform = computeAutoNormalizedTransform(
        finalCanvas,
        targetCategory,
        anchors,
      );
      setTransform(autoTransform);
      setUserManuallyMovedPart(false);
      setCustomSocketOverrides({});
      if (showNotification) {
        showToast(
          'ok',
          `「${CATEGORY_META[targetCategory].label}」の3頭身標準サイズ・基準位置へ自動正規化しました`,
        );
      }
    },
    [anchors, category, showToast],
  );

  // 反対側の腕・脚の実体サイズ・高さと100%統一するハンドラ
  const handleMatchOppositeLimbSize = useCallback(() => {
    const finalCanvas = compositedPartCanvasRef.current;
    if (!finalCanvas || !oppositeReferencePart?.rig?.bounds || !oppositeCategory) return;
    const matchedTransform = computeTransformMatchingReferenceBounds(
      finalCanvas,
      oppositeReferencePart.rig.bounds,
      {
        mirrorCenterX: true,
        preserveFlipX: transform.flipX,
        preserveFlipY: transform.flipY,
      },
    );
    setTransform(matchedTransform);
    setUserManuallyMovedPart(true);
    setCustomSocketOverrides({});
    showToast(
      'ok',
      `反対側の${CATEGORY_META[oppositeCategory].label}「${oppositeReferencePart.name}」と実体サイズ・高さを統一しました！`,
    );
  }, [oppositeCategory, oppositeReferencePart, showToast, transform.flipX, transform.flipY]);

  // ==================== 画像の読み込み ====================
  const loadPartSource = useCallback(
    async (
      blob: Blob,
      fileNameStr: string,
      options?: {
        alreadyNormalized?: boolean;
        category?: AvatarCategory;
        customName?: string;
        existingRig?: PartRigMetadata;
        editingTargetPart?: AvatarPart | null;
      },
    ) => {
      try {
        const tempCanvas = await decodeImageBlobToCanvas(
          blob,
          MAX_SOURCE_DIMENSION,
          options?.alreadyNormalized,
        );
        const w = tempCanvas.width;
        const h = tempCanvas.height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;

        const origData = tempCtx.getImageData(0, 0, w, h);
        originalImageDataRef.current = origData;
        chromaCanvasRef.current = createOffscreenCanvas(w, h);
        eraserMaskCanvasRef.current = createOffscreenCanvas(w, h);
        compositedPartCanvasRef.current = createOffscreenCanvas(w, h);
        undoStackRef.current = [];
        setUndoCount(0);
        setEditingPart(options?.editingTargetPart ?? null);

        const initialSocketOverrides: Partial<Record<SocketPinKey, Point2D>> = {};
        if (options?.existingRig) {
          if (options.existingRig.attachPoint) {
            initialSocketOverrides.attachPoint = options.existingRig.attachPoint;
          }
          const s = options.existingRig.sockets;
          if (s) {
            if (s.leftShoulder) initialSocketOverrides.leftShoulder = s.leftShoulder;
            if (s.rightShoulder) initialSocketOverrides.rightShoulder = s.rightShoulder;
            if (s.neck) initialSocketOverrides.neck = s.neck;
            if (s.waist) initialSocketOverrides.waist = s.waist;
            if (s.leftHip) initialSocketOverrides.leftHip = s.leftHip;
            if (s.rightHip) initialSocketOverrides.rightHip = s.rightHip;
            if (s.handGrip) initialSocketOverrides.handGrip = s.handGrip;
            if (s.leftHandGrip) initialSocketOverrides.leftHandGrip = s.leftHandGrip;
            if (s.rightHandGrip) initialSocketOverrides.rightHandGrip = s.rightHandGrip;
            if (s.ankle) initialSocketOverrides.ankle = s.ankle;
          }
        }
        setCustomSocketOverrides(initialSocketOverrides);
        setUserManuallyMovedPart(Boolean(options?.alreadyNormalized));

        const targetCat = options?.category ?? category;
        if (options?.category) setCategory(options.category);

        // 四隅に背景色がある場合は読み込み時に自動検出して透過する（すでに正規化済みのパーツは除く）
        const autoKeys = options?.alreadyNormalized
          ? []
          : detectCornerBackgroundColors(origData);
        setKeyColors(autoKeys);

        // グリーンバック（#00FF00系）が検出された場合はJPEGノイズも綺麗に抜けるよう許容値を最適化
        const hasGreenScreen = autoKeys.some((k) => k.g > 170 && k.g - Math.max(k.r, k.b) > 80);
        const activeTolerance = hasGreenScreen ? Math.max(tolerance, 24) : tolerance;
        if (hasGreenScreen && tolerance < 24) {
          setTolerance(24);
        }

        // 初回合成を作成して自動サイズ正規化を計算
        const initialProcessed =
          autoKeys.length > 0
            ? processChromaKeyImageData(origData, autoKeys, {
                tolerance: activeTolerance,
                feather,
                contiguous,
                despill,
              })
            : origData;
        chromaCanvasRef.current.getContext('2d')!.putImageData(initialProcessed, 0, 0);
        const compCtx = compositedPartCanvasRef.current.getContext('2d')!;
        compCtx.clearRect(0, 0, w, h);
        compCtx.drawImage(chromaCanvasRef.current, 0, 0);

        if (options?.alreadyNormalized) {
          setTransform(IDENTITY_TRANSFORM);
        } else {
          const autoT = computeAutoNormalizedTransform(
            compositedPartCanvasRef.current,
            targetCat,
            anchors,
          );
          setTransform(autoT);
        }

        if (options?.existingRig?.sleeveMode) {
          setSleeveMode(options.existingRig.sleeveMode);
        }
        if (options?.existingRig?.sleeveMaskRadius) {
          setSleeveMaskRadius(options.existingRig.sleeveMaskRadius);
        }
        if (options?.existingRig?.handHoldMode) {
          setHandHoldMode(options.existingRig.handHoldMode);
        }
        if (typeof options?.existingRig?.naturalTiltDeg === 'number') {
          setNaturalTiltDeg(options.existingRig.naturalTiltDeg);
        }

        const baseName =
          options?.customName ?? sanitizeFileName(fileNameStr.replace(/\.[^.]+$/, ''));
        setPartName(baseName);
        setTool('move');
        setSourceInfo((prev) => ({
          name: fileNameStr,
          width: w,
          height: h,
          version: (prev?.version ?? 0) + 1,
        }));

        if (!options?.alreadyNormalized) {
          showToast(
            'ok',
            autoKeys.length > 0
              ? '背景を自動透過し、3頭身サイズ・ソケット位置を自動設定しました'
              : '3頭身サイズ・ソケット位置を自動設定しました',
          );
        }
      } catch (err) {
        showToast('err', err instanceof Error ? err.message : '画像の読み込みに失敗しました');
      }
    },
    [anchors, category, contiguous, despill, feather, showToast, tolerance],
  );

  // URL文字列（data:image/..., blob:..., http...）から画像を読み込むヘルパー
  const loadPartFromUrlString = useCallback(
    async (rawUrl: string, defaultName = 'pasted_image.png') => {
      const trimmed = rawUrl.trim();
      if (!trimmed) return false;
      try {
        if (trimmed.startsWith('data:image/')) {
          const res = await fetch(trimmed);
          const blob = await res.blob();
          await loadPartSource(blob, defaultName);
          return true;
        }
        if (
          trimmed.startsWith('blob:') ||
          trimmed.startsWith('http://') ||
          trimmed.startsWith('https://')
        ) {
          try {
            const res = await fetch(trimmed);
            const blob = await res.blob();
            if (blob.type.startsWith('image/') || blob.size > 0) {
              await loadPartSource(blob, defaultName);
              return true;
            }
          } catch {
            // CORS等でfetchできない場合はImage要素経由で描画を試みる
            const img = await loadAvatarImage(trimmed);
            const c = createOffscreenCanvas(img.naturalWidth || 512, img.naturalHeight || 512);
            c.getContext('2d')!.drawImage(img, 0, 0);
            const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
            if (blob) {
              await loadPartSource(blob, defaultName);
              return true;
            }
          }
        }
      } catch {
        // ignore and return false
      }
      return false;
    },
    [loadPartSource],
  );

  // 楕円選択モーダルに渡す現在の画像ソース（作業中キャンバスまたは元画像）
  const currentStudioImageSrc = useMemo(() => {
    if (compositedPartCanvasRef.current && compositedPartCanvasRef.current.width > 0) {
      try {
        return compositedPartCanvasRef.current.toDataURL('image/png');
      } catch {
        // ignore
      }
    }
    if (chromaCanvasRef.current && chromaCanvasRef.current.width > 0) {
      try {
        return chromaCanvasRef.current.toDataURL('image/png');
      } catch {
        // ignore
      }
    }
    return initialEditPart?.src ?? '';
  }, [renderTick, initialEditPart]);

  const handleApplyEllipseCrop = async (result: EllipseCropResult) => {
    await loadPartFromUrlString(result.dataUrl, sourceInfo?.name ?? 'ellipse_cropped.png');
    showToast('ok', '楕円切り抜きを反映しました！');
  };

  // クリップボードAPIから直接画像を読み取るボタン用ハンドラ
  const handleReadClipboardButton = useCallback(async () => {
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            await loadPartSource(blob, 'clipboard_part.png');
            return;
          }
          if (item.types.includes('text/html')) {
            const htmlBlob = await item.getType('text/html');
            const htmlText = await htmlBlob.text();
            const extractedSrc = extractImageSrcFromHtml(htmlText);
            if (extractedSrc) {
              const ok = await loadPartFromUrlString(extractedSrc, 'clipboard_html.png');
              if (ok) return;
            }
          }
        }
      }
      showToast(
        'err',
        'クリップボード内に画像が見つかりません。画像を右クリックして「画像をコピー」してから貼り付けてください',
      );
    } catch {
      showToast(
        'err',
        'ブラウザの権限によりクリップボードへアクセスできませんでした。画面上で Ctrl+V を押すかファイルを選択してください',
      );
    }
  }, [loadPartFromUrlString, loadPartSource, showToast]);

  // カテゴリを変更した時、まだ手動移動していなければ新しいカテゴリの標準サイズ・位置に自動フィット
  const handleCategoryChange = (nextCat: AvatarCategory) => {
    setCategory(nextCat);
    setCustomSocketOverrides({});
    if (sourceInfo && autoSizeOnChange && !userManuallyMovedPart) {
      applyAutoSizeAndPosition(nextCat, false);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isImg =
        file.type.startsWith('image/') ||
        /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(file.name);
      if (!isImg) {
        showToast('err', '画像ファイル（PNG, JPEG, WebP等）を選択してください');
      } else {
        void loadPartSource(file, file.name);
      }
    }
    e.target.value = '';
  };

  const handleCustomBodyGuideChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImg =
      file.type.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(file.name);
    if (!isImg) {
      showToast('err', '画像ファイル（PNG, JPEG, WebP等）を選択してください');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomBodyGuideUrl(reader.result);
        showToast('ok', '基準素体ガイド画像を読み込みました');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleStageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    // 1. ローカル画像ファイルのドロップ（MIMEタイプが空の拡張子も含め柔軟に判定）
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(
      (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(f.name),
    );
    if (imageFile) {
      void loadPartSource(imageFile, imageFile.name);
      return;
    }

    // 2. ブラウザ上の別タブやチャット画面から直接ドラッグ＆ドロップされた画像要素
    const htmlData = e.dataTransfer.getData('text/html');
    if (htmlData) {
      const extractedSrc = extractImageSrcFromHtml(htmlData);
      if (extractedSrc) {
        void loadPartFromUrlString(extractedSrc, 'dropped_image.png');
        return;
      }
    }
    const uriData = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (uriData) {
      void loadPartFromUrlString(uriData.split('\n')[0], 'dropped_url.png');
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      // テキスト入力欄にフォーカス中でも、クリップボードの中身が「画像」であればパーツとして読み込む
      const dt = e.clipboardData;
      if (!dt) return;

      // 1. clipboardData.files を最優先でチェック（エクスプローラーでファイルをCtrl+Cした場合など）
      if (dt.files && dt.files.length > 0) {
        const file = Array.from(dt.files).find(
          (f) =>
            f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(f.name),
        );
        if (file) {
          e.preventDefault();
          void loadPartSource(file, file.name || 'pasted_file.png');
          return;
        }
      }

      // 2. clipboardData.items から image/* をチェック（スクショや「画像をコピー」した場合）
      if (dt.items) {
        for (const item of Array.from(dt.items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              void loadPartSource(file, 'pasted_part.png');
              return;
            }
          }
        }
      }

      // テキスト入力中にテキストをペーストした場合は邪魔しない
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      // 3. HTML形式（Webページ上の画像をコピーした場合の <img src="...">）をチェック
      const html = dt.getData('text/html');
      if (html) {
        const extractedSrc = extractImageSrcFromHtml(html);
        if (extractedSrc) {
          e.preventDefault();
          void loadPartFromUrlString(extractedSrc, 'pasted_html_img.png');
          return;
        }
      }

      // 4. プレーンテキストとして data:image/... URL が貼られた場合
      const text = dt.getData('text/plain');
      if (text && (text.trim().startsWith('data:image/') || text.trim().startsWith('blob:'))) {
        e.preventDefault();
        void loadPartFromUrlString(text, 'pasted_data_url.png');
        return;
      }

      showToast(
        'err',
        'クリップボードに画像データがありません。画像を右クリックして「画像をコピー」するか、「画像を選択する」ボタンから読み込んでください',
      );
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [loadPartFromUrlString, loadPartSource, showToast]);

  // ==================== クロマキー透過＆消しゴムマスク合成 ====================
  const updateCompositedPartCanvas = useCallback(() => {
    const chromaCanvas = chromaCanvasRef.current;
    const maskCanvas = eraserMaskCanvasRef.current;
    const finalCanvas = compositedPartCanvasRef.current;
    if (!chromaCanvas || !maskCanvas || !finalCanvas) return;

    const ctx = finalCanvas.getContext('2d')!;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.drawImage(chromaCanvas, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    setRenderTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!sourceInfo || !originalImageDataRef.current) return;
    const timerId = window.setTimeout(() => {
      const origData = originalImageDataRef.current;
      const chromaCanvas = chromaCanvasRef.current;
      const finalCanvas = compositedPartCanvasRef.current;
      if (!origData || !chromaCanvas || !finalCanvas) return;

      const processed =
        keyColors.length > 0
          ? processChromaKeyImageData(origData, keyColors, {
              tolerance,
              feather,
              contiguous,
              despill,
            })
          : origData;

      chromaCanvas.getContext('2d')!.putImageData(processed, 0, 0);
      updateCompositedPartCanvas();

      // 背景透過によって余白が透明化されたら、実体領域に合わせて自動サイズ正規化を再適用
      if (autoSizeOnChange && !userManuallyMovedPart) {
        const autoT = computeAutoNormalizedTransform(finalCanvas, category, anchors);
        setTransform(autoT);
      }
    }, 25);

    return () => window.clearTimeout(timerId);
  }, [
    sourceInfo,
    keyColors,
    tolerance,
    feather,
    contiguous,
    despill,
    autoSizeOnChange,
    userManuallyMovedPart,
    category,
    anchors,
    updateCompositedPartCanvas,
  ]);

  const customSocketOverridesRef = useRef(customSocketOverrides);
  customSocketOverridesRef.current = customSocketOverrides;

  // ステージ上のパーツ描画（即時 60fps） ＆ 仕組み③（輪郭からの関節ソケット自動検出：32msデバウンス）
  useEffect(() => {
    const stageCanvas = stagePartCanvasRef.current;
    if (!stageCanvas) return;
    const ctx = stageCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, S, S);
    const finalCanvas = compositedPartCanvasRef.current;
    if (!sourceInfo || !finalCanvas) {
      setDetectedRig(null);
      return;
    }

    // キャンバス描画自体は遅延ゼロで即時反映
    drawPartWithTransform(ctx, finalCanvas, transform);

    // 262,144ピクセルの走査を伴う輪郭ソケット解析は短時間デバウンスしてドラッグ中のフレーム落ちを防ぐ
    const timerId = window.setTimeout(() => {
      const rig = analyzeNormalizedCanvasRig(stageCanvas, category);
      setDetectedRig(rig);
      if (
        category === 'tops' &&
        rig.sleeveMode &&
        Object.keys(customSocketOverridesRef.current).length === 0
      ) {
        setSleeveMode(rig.sleeveMode);
      }
    }, 32);

    return () => window.clearTimeout(timerId);
  }, [renderTick, transform, sourceInfo, category]);

  // 現在のパーツの最終的な Rig メタデータ（自動検出値 ＋ ユーザーのピン移動上書き）を構築
  const buildFinalRigMetadata = useCallback((): PartRigMetadata | undefined => {
    if (!detectedRig) return undefined;
    const mergedSockets = { ...detectedRig.sockets };
    if (customSocketOverrides.leftShoulder)
      mergedSockets.leftShoulder = customSocketOverrides.leftShoulder;
    if (customSocketOverrides.rightShoulder)
      mergedSockets.rightShoulder = customSocketOverrides.rightShoulder;
    if (customSocketOverrides.neck) mergedSockets.neck = customSocketOverrides.neck;
    if (customSocketOverrides.waist) mergedSockets.waist = customSocketOverrides.waist;
    if (customSocketOverrides.leftHip) mergedSockets.leftHip = customSocketOverrides.leftHip;
    if (customSocketOverrides.rightHip) mergedSockets.rightHip = customSocketOverrides.rightHip;
    if (customSocketOverrides.handGrip) mergedSockets.handGrip = customSocketOverrides.handGrip;
    if (customSocketOverrides.leftHandGrip)
      mergedSockets.leftHandGrip = customSocketOverrides.leftHandGrip;
    if (customSocketOverrides.rightHandGrip)
      mergedSockets.rightHandGrip = customSocketOverrides.rightHandGrip;
    if (customSocketOverrides.ankle) mergedSockets.ankle = customSocketOverrides.ankle;

    return {
      bounds: detectedRig.bounds,
      attachPoint: customSocketOverrides.attachPoint ?? detectedRig.attachPoint,
      sockets: mergedSockets,
      sleeveMode: category === 'tops' ? sleeveMode : undefined,
      sleeveMaskRadius: category === 'tops' ? sleeveMaskRadius : undefined,
      colorPalette: detectedRig.colorPalette,
      handHoldMode: category === 'hand_item' ? handHoldMode : undefined,
      naturalTiltDeg: category === 'hand_item' ? naturalTiltDeg : undefined,
    };
  }, [
    category,
    customSocketOverrides,
    detectedRig,
    handHoldMode,
    naturalTiltDeg,
    sleeveMaskRadius,
    sleeveMode,
  ]);

  const currentFinalRig = useMemo(() => buildFinalRigMetadata(), [buildFinalRigMetadata]);

  // ステージ上に描画する有効なソケットピン一覧（マウスカーソル移動時に再生成しないようメモ化）
  const activeSocketPins = useMemo(() => {
    if (!currentFinalRig) return [] as { key: SocketPinKey; point: Point2D }[];
    const list: { key: SocketPinKey; point: Point2D }[] = [];
    if (
      currentFinalRig.attachPoint &&
      ['arm_left', 'arm_right', 'leg_left', 'leg_right', 'shoes', 'hand_item', 'tops', 'bottoms'].includes(
        category,
      )
    ) {
      list.push({ key: 'attachPoint', point: currentFinalRig.attachPoint });
    }
    const s = currentFinalRig.sockets;
    if (s) {
      if (s.leftShoulder) list.push({ key: 'leftShoulder', point: s.leftShoulder });
      if (s.rightShoulder) list.push({ key: 'rightShoulder', point: s.rightShoulder });
      if (s.leftHip) list.push({ key: 'leftHip', point: s.leftHip });
      if (s.rightHip) list.push({ key: 'rightHip', point: s.rightHip });
      if (s.handGrip) list.push({ key: 'handGrip', point: s.handGrip });
      if (s.leftHandGrip) list.push({ key: 'leftHandGrip', point: s.leftHandGrip });
      if (s.rightHandGrip) list.push({ key: 'rightHandGrip', point: s.rightHandGrip });
      if (s.ankle) list.push({ key: 'ankle', point: s.ankle });
    }
    return list;
  }, [category, currentFinalRig]);

  const handleAutoDetectBg = () => {
    const orig = originalImageDataRef.current;
    if (!orig) return;
    const found = detectCornerBackgroundColors(orig);
    if (found.length === 0) {
      showToast('err', '画像の四隅はすでに透明です');
    } else {
      setKeyColors((prev) => [...prev, ...found]);
      showToast('ok', `四隅から背景色を ${found.length} 色検出して透過しました`);
    }
  };

  // ==================== 消しゴム処理 ====================
  const pushUndoSnapshot = () => {
    const maskCanvas = eraserMaskCanvasRef.current;
    if (!maskCanvas) return;
    const snap = maskCanvas
      .getContext('2d', { willReadFrequently: true })!
      .getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    undoStackRef.current.push(snap);
    if (undoStackRef.current.length > MAX_UNDO_STACK) {
      undoStackRef.current.shift();
    }
    setUndoCount(undoStackRef.current.length);
  };

  const handleUndoErase = useCallback(() => {
    const maskCanvas = eraserMaskCanvasRef.current;
    const snap = undoStackRef.current.pop();
    if (!maskCanvas || !snap) return;
    maskCanvas.getContext('2d')!.putImageData(snap, 0, 0);
    setUndoCount(undoStackRef.current.length);
    updateCompositedPartCanvas();
  }, [updateCompositedPartCanvas]);

  const handleClearEraserMask = () => {
    const maskCanvas = eraserMaskCanvasRef.current;
    if (!maskCanvas) return;
    pushUndoSnapshot();
    maskCanvas.getContext('2d')!.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    updateCompositedPartCanvas();
    showToast('ok', '消しゴムで消した箇所をすべて復元しました');
  };

  const eraseStrokeSegment = (
    fromStage: { x: number; y: number },
    toStage: { x: number; y: number },
  ) => {
    const maskCanvas = eraserMaskCanvasRef.current;
    const orig = originalImageDataRef.current;
    if (!maskCanvas || !orig) return;

    const currentTransform = transformRef.current;
    const ptA = stagePointToSourcePixel(
      fromStage.x,
      fromStage.y,
      currentTransform,
      orig.width,
      orig.height,
    );
    const ptB = stagePointToSourcePixel(
      toStage.x,
      toStage.y,
      currentTransform,
      orig.width,
      orig.height,
    );
    const radiusInSource = Math.max(1, brushSize / Math.max(0.05, currentTransform.scale) / 2);

    const ctx = maskCanvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = radiusInSource * 2;

    ctx.beginPath();
    ctx.arc(ptB.x, ptB.y, radiusInSource, 0, Math.PI * 2);
    ctx.fill();

    if (ptA.x !== ptB.x || ptA.y !== ptB.y) {
      ctx.beginPath();
      ctx.moveTo(ptA.x, ptA.y);
      ctx.lineTo(ptB.x, ptB.y);
      ctx.stroke();
    }

    updateCompositedPartCanvas();
  };

  // ==================== ステージ上のポインタ＆キーボード操作 ====================
  const getStagePoint = (e: { clientX: number; clientY: number }) => {
    const el = stageContainerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * S,
      y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * S,
    };
  };

  const handleStagePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    stageContainerRef.current?.focus();
    const pt = getStagePoint(e);

    if (!sourceInfo) return;

    // 1. スポイトモード
    if (tool === 'pick') {
      const orig = originalImageDataRef.current!;
      const srcPt = stagePointToSourcePixel(pt.x, pt.y, transform, orig.width, orig.height);
      const px = Math.floor(srcPt.x);
      const py = Math.floor(srcPt.y);
      if (px < 0 || py < 0 || px >= orig.width || py >= orig.height) {
        showToast('err', 'パーツ画像の範囲外です');
        return;
      }
      const idx = (py * orig.width + px) * 4;
      const picked: ChromaKeyColor = {
        r: orig.data[idx],
        g: orig.data[idx + 1],
        b: orig.data[idx + 2],
        seedX: px,
        seedY: py,
      };
      setKeyColors((prev) => [...prev, picked]);
      showToast('ok', `背景色 ${rgbToHex(picked)} を透過色に追加しました`);
      return;
    }

    // 2. 消しゴムモード
    if (tool === 'erase') {
      e.currentTarget.setPointerCapture(e.pointerId);
      pushUndoSnapshot();
      eraseStrokeSegment(pt, pt);
      activeDragRef.current = { mode: 'erase', lastPt: pt };
      return;
    }

    // 3. パーツ全体の直接移動ドラッグ（どこをクリックしても直感的にパーツを移動）
    e.currentTarget.setPointerCapture(e.pointerId);
    setUserManuallyMovedPart(true);
    activeDragRef.current = {
      mode: 'move',
      startX: pt.x,
      startY: pt.y,
      origX: transform.x,
      origY: transform.y,
    };
  };

  const handleStagePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const pt = getStagePoint(e);
    setCursorPos(pt);
    const drag = activeDragRef.current;
    if (!drag) return;

    if (drag.mode === 'move') {
      let dx = pt.x - drag.startX;
      let dy = pt.y - drag.startY;
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      setTransform((prev) => ({
        ...prev,
        x: round1(drag.origX + dx),
        y: round1(drag.origY + dy),
      }));
    } else if (drag.mode === 'erase') {
      eraseStrokeSegment(drag.lastPt, pt);
      drag.lastPt = pt;
    }
  };

  const handleStagePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    activeDragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  useEffect(() => {
    const stageEl = stageContainerRef.current;
    if (!stageEl) return;
    const handleWheel = (e: WheelEvent) => {
      if (!originalImageDataRef.current) return;
      e.preventDefault();
      setUserManuallyMovedPart(true);
      setCustomSocketOverrides({});
      const delta = e.deltaY || e.deltaX;
      const dir = delta > 0 ? -1 : 1;
      if (e.shiftKey) {
        setTransform((prev) => ({
          ...prev,
          rotation: normalizeDegree(prev.rotation + dir * (e.altKey ? 0.2 : 1.5)),
        }));
      } else {
        setTransform((prev) => ({
          ...prev,
          scale: clamp(
            Number((prev.scale * Math.pow(1.035, dir * (e.altKey ? 0.25 : 1))).toFixed(4)),
            0.02,
            8,
          ),
        }));
      }
    };
    stageEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => stageEl.removeEventListener('wheel', handleWheel);
  }, []);

  const handleStageKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setTool('move');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      handleUndoErase();
      return;
    }
    const step = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    const nudge = (dx: number, dy: number) => {
      e.preventDefault();
      setUserManuallyMovedPart(true);
      setCustomSocketOverrides({});
      setTransform((prev) => ({
        ...prev,
        x: round1(prev.x + dx),
        y: round1(prev.y + dy),
      }));
    };
    switch (e.key) {
      case 'ArrowLeft':
        return nudge(-step, 0);
      case 'ArrowRight':
        return nudge(step, 0);
      case 'ArrowUp':
        return nudge(0, -step);
      case 'ArrowDown':
        return nudge(0, step);
    }
  };

  // ==================== 512x512 正規化書き出し ＆ カタログ登録 ====================
  const renderNormalized512Canvas = (): HTMLCanvasElement | null => {
    const finalCanvas = compositedPartCanvasRef.current;
    if (!finalCanvas || !sourceInfo) return null;
    const outCanvas = createOffscreenCanvas(S, S);
    const ctx = outCanvas.getContext('2d')!;
    drawPartWithTransform(ctx, finalCanvas, transform);
    return outCanvas;
  };

  const exportFileName = `${category}_${sanitizeFileName(partName || 'part')}.png`;

  const handleExportAndRegister = async (opts: {
    downloadFile: boolean;
    registerCatalog: boolean;
    openClosetToTryOn?: boolean;
    overwriteExisting?: boolean;
    mirrorToOpposite?: boolean;
  }) => {
    const normalizedCanvas = renderNormalized512Canvas();
    if (!normalizedCanvas) {
      showToast('err', '先にパーツ画像を読み込んでください');
      return;
    }

    const dataUrl = normalizedCanvas.toDataURL('image/png');
    const finalRig = buildFinalRigMetadata();

    if (opts.downloadFile) {
      downloadDataUrl(dataUrl, exportFileName);
    }

    if (opts.registerCatalog) {
      const randSuffix = Math.random().toString(36).slice(2, 6);
      const isOverwriting = Boolean(opts.overwriteExisting && editingPart);
      const basePart: AvatarPart = {
        id: isOverwriting
          ? editingPart!.id
          : `part_${category}_${Date.now().toString(36)}_${randSuffix}`,
        category,
        name: partName.trim() || `${CATEGORY_META[category].label}パーツ`,
        src: dataUrl,
        rig: finalRig,
        createdAt: isOverwriting ? (editingPart!.createdAt ?? Date.now()) : Date.now(),
      };
      try {
        if (opts.mirrorToOpposite) {
          const mirroredPart = await duplicateCatalogPart(basePart, {
            mirrorToOpposite: true,
          });
          onPartRegistered?.(mirroredPart, {
            openClosetToTryOn: Boolean(opts.openClosetToTryOn),
          });
          showToast(
            'ok',
            `左右反転して${CATEGORY_META[mirroredPart.category].label}「${mirroredPart.name}」として複製登録しました！`,
          );
          return;
        }

        const savedPart = await saveCatalogPart(basePart);
        if (isOverwriting) {
          setEditingPart(savedPart);
        }
        onPartRegistered?.(savedPart, {
          openClosetToTryOn: Boolean(opts.openClosetToTryOn),
        });
        showToast(
          'ok',
          isOverwriting
            ? `「${savedPart.name}」を上書き保存して更新しました！`
            : `「${savedPart.name}」をソケット情報付きでカタログに登録しました！`,
        );
      } catch (err) {
        showToast(
          'err',
          `カタログ登録に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else {
      showToast('ok', `${exportFileName} をダウンロードしました`);
    }
  };

  const handleReEditCatalogPart = useCallback(
    async (part: AvatarPart) => {
      try {
        const res = await fetch(part.src);
        const blob = await res.blob();
        await loadPartSource(blob, `${part.name}.png`, {
          alreadyNormalized: true,
          category: part.category,
          customName: part.name,
          existingRig: part.rig,
          editingTargetPart: part,
        });
        setPanelTab('source');
        showToast('ok', `「${part.name}」を再編集モードで読み込みました`);
      } catch (err) {
        showToast(
          'err',
          `パーツの読み込みに失敗しました: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    [loadPartSource, showToast],
  );

  // クローゼットから「スタジオで再編集」で遷移してきた場合に自動で読み込む
  const lastLoadedEditPartIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialEditPart) {
      lastLoadedEditPartIdRef.current = null;
      return;
    }
    if (lastLoadedEditPartIdRef.current === initialEditPart.id) return;
    lastLoadedEditPartIdRef.current = initialEditPart.id;
    void handleReEditCatalogPart(initialEditPart).then(() => {
      onClearInitialEditPart?.();
    });
  }, [handleReEditCatalogPart, initialEditPart, onClearInitialEditPart]);

  // カタログ内のパーツを複製（同カテゴリ複製 または 左右反転して反対側へ複製）
  const handleDuplicateCatalogPartInStudio = async (
    part: AvatarPart,
    options?: { mirrorToOpposite?: boolean; openClosetToTryOn?: boolean },
  ) => {
    try {
      const created = await duplicateCatalogPart(part, {
        mirrorToOpposite: options?.mirrorToOpposite,
      });
      if (options?.openClosetToTryOn) {
        onPartRegistered?.(created, { openClosetToTryOn: true });
      }
      showToast(
        'ok',
        options?.mirrorToOpposite
          ? `「${part.name}」を左右反転し、${CATEGORY_META[created.category].label}「${created.name}」として複製しました！`
          : `「${created.name}」を複製しました！`,
      );
    } catch (err) {
      showToast(
        'err',
        `複製に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  // 既存カタログパーツに対して一括でソケット自動解析を付与するヘルパー
  const handleBatchAnalyzeCatalogRigs = async () => {
    if (customParts.length === 0) return;
    let updated = 0;
    for (const part of customParts) {
      try {
        const img = await loadAvatarImage(part.src);
        const c = createOffscreenCanvas(S, S);
        c.getContext('2d')!.drawImage(img, 0, 0, S, S);
        const rig = analyzeNormalizedCanvasRig(c, part.category, part.rig?.sleeveMode);
        await saveCatalogPart({ ...part, rig });
        updated++;
      } catch {
        // skip error
      }
    }
    showToast('ok', `登録済み ${updated} 件のパーツのソケット情報を自動解析・更新しました`);
  };

  const activeBodyGuideSrc =
    customBodyGuideUrl ??
    resolvePartSrc(guideParts?.body) ??
    customParts.find((p) => p.category === 'body')?.src ??
    PRESET_BODY.src;

  // 楕円選択モーダルに渡す参照ガイドオプション（素体・他パーツ下敷きオニオンスキン）
  const studioCropReferenceOptions = useMemo<EllipseCropReferenceOption[]>(() => {
    const res: EllipseCropReferenceOption[] = [];

    // 1. 素体（頭・首・鎖骨・ボディライン）
    const bodySrc = activeBodyGuideSrc || PRESET_BODY_SRC;
    if (bodySrc) {
      res.push({
        id: 'body',
        label: '素体（頭・首・鎖骨・ボディライン）',
        src: bodySrc,
        category: 'body',
      });
    }

    // 2. 前髪
    if (guideParts?.hair_front) {
      const src = resolvePartSrc(guideParts.hair_front);
      if (src && category !== 'hair_front') {
        res.push({
          id: 'hair_front',
          label: '前髪 (Hair Front)',
          src,
          category: 'hair_front',
        });
      }
    }

    // 3. 帽子・メガネ・頭アクセ
    if (guideParts?.hat_glasses) {
      const src = resolvePartSrc(guideParts.hat_glasses);
      if (src && category !== 'hat_glasses') {
        res.push({
          id: 'hat_glasses',
          label: '帽子・頭アクセ (Hat/Glasses)',
          src,
          category: 'hat_glasses',
        });
      }
    }

    // 4. トップス（服）
    if (guideParts?.tops) {
      const src = resolvePartSrc(guideParts.tops);
      if (src && category !== 'tops') {
        res.push({
          id: 'tops',
          label: 'トップス・服 (Tops)',
          src,
          category: 'tops',
        });
      }
    }

    // 5. ボトムス（ズボン）
    if (guideParts?.bottoms) {
      const src = resolvePartSrc(guideParts.bottoms);
      if (src && category !== 'bottoms') {
        res.push({
          id: 'bottoms',
          label: 'ボトムス・ズボン (Bottoms)',
          src,
          category: 'bottoms',
        });
      }
    }

    return res;
  }, [activeBodyGuideSrc, guideParts, category]);

  const boundingCorners = sourceInfo
    ? getTransformedBoundingCorners(sourceInfo.width, sourceInfo.height, transform)
    : null;
  const hasPartLoaded = Boolean(sourceInfo);

  const stageCursor =
    tool === 'erase'
      ? 'none'
      : tool === 'pick'
        ? 'crosshair'
        : hasPartLoaded
          ? activeDragRef.current
            ? 'grabbing'
            : 'grab'
          : 'default';

  return (
    <div
      className={`flex flex-col lg:grid items-start gap-3 sm:gap-4 lg:gap-6 lg:grid-cols-[minmax(0,540px)_minmax(0,1fr)] xl:grid-cols-[560px_minmax(0,1fr)] ${className}`}
    >
      {/* ==================== 左カラム：画面常時固定（Sticky）512x512 アバターステージ ==================== */}
      <div className="w-full relative lg:sticky lg:top-16 lg:z-20 flex flex-col gap-2 sm:gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3 sm:p-4 shadow-sm">
        {/* 上部ツールバー */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => handleToggleTool('move')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium transition ${
              tool === 'move'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            <Move className="h-3.5 w-3.5" />
            <span>移動</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleTool('pick')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium transition ${
              tool === 'pick'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
            title="もう一度クリックすると解除して移動モードに戻ります"
          >
            <Pipette className="h-3.5 w-3.5" />
            <span>{tool === 'pick' ? 'スポイト中' : 'スポイト'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleTool('erase')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium transition ${
              tool === 'erase'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
            title="もう一度クリックすると消しゴムを解除して移動モードに戻ります"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span>{tool === 'erase' ? '消しゴム中' : '消しゴム'}</span>
          </button>

          <button
            type="button"
            disabled={!hasPartLoaded}
            onClick={() => setIsEllipseCropOpen(true)}
            className="inline-flex items-center gap-1 sm:gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-40 transition"
            title="GIMP風の楕円選択ツールで、円形に切り抜いたり不要箇所を消去・透過します"
          >
            <Circle className="h-3.5 w-3.5 text-indigo-600" />
            <span>楕円切り抜き</span>
          </button>

          <button
            type="button"
            disabled={!hasPartLoaded}
            onClick={() => applyAutoSizeAndPosition(category, true)}
            className="inline-flex items-center gap-1 sm:gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-100 disabled:opacity-40 transition"
            title="実体ピクセル領域を計測し、3頭身の標準サイズ・基準位置へ一発で自動正規化します"
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
            <span>自動正規化</span>
          </button>

          <button
            type="button"
            onClick={handleUndoErase}
            disabled={undoCount === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition"
            title="消しゴムを1つ戻す (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
            {undoCount > 0 && <span className="text-[11px] font-mono">{undoCount}</span>}
          </button>

          {/* 素体のみ表示（シンプル表示モード）トグルボタン */}
          <button
            type="button"
            onClick={toggleBodyOnlyMode}
            className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold transition shadow-xs ${
              bodyOnlyMode
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500'
                : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
            title="他の服や余計なガイド線・ピンをすべて隠し、編集中のパーツと素体のみをシンプルに表示します"
          >
            <User className="h-3.5 w-3.5" />
            <span>{bodyOnlyMode ? '素体のみ' : '素体のみ'}</span>
          </button>

          {/* ステージ背景切り替え */}
          <div className="ml-auto flex items-center gap-1">
            {(
              [
                { id: 'checker', label: '透過市松', cls: 'avatar-checker' },
                { id: 'dark', label: '暗色', cls: 'bg-zinc-800' },
                { id: 'white', label: '白', cls: 'bg-white border border-zinc-300' },
                { id: 'green', label: '緑', cls: 'bg-emerald-600' },
              ] as { id: StageBackgroundMode; label: string; cls: string }[]
            ).map((b) => (
              <button
                key={b.id}
                type="button"
                title={`背景確認: ${b.label}`}
                onClick={() => setStageBg(b.id)}
                className={`h-4 w-4 sm:h-5 sm:w-5 rounded-md transition ${b.cls} ${
                  stageBg === b.id ? 'ring-2 ring-zinc-900 scale-105' : 'ring-1 ring-zinc-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* サブツール選択中の分かりやすい解除バー */}
        {tool !== 'move' && (
          <div
            className={`flex items-center justify-between gap-2 rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold text-white shadow-sm ${
              tool === 'erase'
                ? 'bg-rose-600'
                : 'bg-amber-500'
            }`}
          >
            <span className="truncate">
              {tool === 'erase' && '【消しゴム中】ドラッグで消去。再クリックで解除'}
              {tool === 'pick' && '【スポイト中】透明にしたい色をクリック'}
            </span>
            <button
              type="button"
              onClick={() => setTool('move')}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-white/20 px-2 py-0.5 text-[11px] font-extrabold text-white hover:bg-white/30"
            >
              <Check className="h-3 w-3" />
              解除
            </button>
          </div>
        )}
        {/* 512x512 ステージ本体 */}
        <div className="mx-auto w-full max-w-[210px] sm:max-w-[280px] lg:max-w-[min(100%,calc(100vh-14.5rem))]">
          <div
            ref={stageContainerRef}
            tabIndex={0}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerCancel={handleStagePointerUp}
            onPointerLeave={() => setCursorPos(null)}
            onKeyDown={handleStageKeyDown}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleStageDrop}
            className={`relative aspect-square w-full touch-none select-none overflow-hidden rounded-2xl shadow-inner outline-none ring-2 focus-visible:ring-indigo-500 ${
              isDragOver ? 'ring-indigo-600' : 'ring-slate-200'
            } ${stageBg === 'checker' ? 'avatar-checker' : ''}`}
            style={{
              cursor: stageCursor,
              backgroundColor:
                stageBg === 'dark'
                  ? '#1e293b'
                  : stageBg === 'white'
                    ? '#ffffff'
                    : stageBg === 'green'
                      ? '#16a34a'
                      : undefined,
            }}
          >
            {/* 装着中パーツ＆基準素体画像＆現在編集中のパーツをZ-index順に重ね合わせ */}
            {AVATAR_LAYERS.map((layer) => {
              const elements: ReactNode[] = [];

              if (
                layer === 'body' &&
                activeBodyGuideSrc &&
                (category !== 'body' || !hasPartLoaded)
              ) {
                elements.push(
                  <img
                    key="guide-body-img"
                    src={activeBodyGuideSrc}
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                    style={{
                      opacity:
                        category === 'body'
                          ? 0.95
                          : bodyOnlyMode
                            ? 0.95
                            : bodyGuideOpacity,
                      ...adjustmentToLayerStyle('body', guideAdjustments?.body),
                    }}
                  />,
                );
              } else if (
                !bodyOnlyMode &&
                layer !== category &&
                showOtherEquippedParts &&
                layer !== 'background' &&
                layer !== 'front_effect'
              ) {
                const otherSrc = resolvePartSrc(guideParts?.[layer]);
                if (otherSrc) {
                  elements.push(
                    <img
                      key={`guide-${layer}`}
                      src={otherSrc}
                      alt=""
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                      style={{
                        opacity: otherPartsOpacity,
                        ...adjustmentToLayerStyle(layer, guideAdjustments?.[layer]),
                      }}
                    />,
                  );
                }
              }

              if (layer === category) {
                elements.push(
                  <canvas
                    key="editing-part-canvas"
                    ref={stagePartCanvasRef}
                    width={S}
                    height={S}
                    className="pointer-events-none absolute inset-0 h-full w-full"
                  />,
                );
              }

              return <Fragment key={layer}>{elements}</Fragment>;
            })}

            {/* 消しゴムブラシのカーソルプレビュー */}
            {tool === 'erase' && cursorPos && hasPartLoaded && (
              <div
                className="pointer-events-none absolute rounded-full border-2 border-rose-500 bg-rose-500/15 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
                style={{
                  width: `${(brushSize / S) * 100}%`,
                  height: `${(brushSize / S) * 100}%`,
                  left: `${(cursorPos.x / S) * 100}%`,
                  top: `${(cursorPos.y / S) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )}

            {/* 画像未読み込み時のドロップ案内 */}
            {!hasPartLoaded && (
              <div className="pointer-events-none absolute inset-x-5 bottom-5 flex flex-col items-center gap-1.5 rounded-2xl bg-white/95 p-3.5 text-center shadow-md ring-1 ring-slate-200 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
                  <ImagePlus className="h-4 w-4 text-indigo-600" />
                  <span>
                    パーツ画像をドロップ または Ctrl+V（3頭身サイズへ自動で配置します）
                  </span>
                </div>
                <div className="pointer-events-auto mt-1 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    画像を選択する
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReadClipboardButton()}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    クリップボードから貼り付け
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>
            緑枠＝自動検出した実体サイズ / 色ピン＝自動吸着ソケット（直接ドラッグで微調整可）
          </span>
          {toast && (
            <span
              className={`rounded-full px-2.5 py-0.5 font-extrabold text-white ${
                toast.type === 'ok' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {toast.text}
            </span>
          )}
        </div>
      </div>

      {/* ==================== 右カラム：タブ切り替え＋独立スクロールの調整パネル ==================== */}
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />
        <input
          ref={customBodyGuideInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCustomBodyGuideChange}
        />

        {/* 右パネル上部の4タブ切り替えバー */}
        <div className="grid grid-cols-4 gap-1 rounded-xl border border-zinc-200/70 bg-zinc-100/70 p-1">
          {(
            [
              { id: 'source', label: '① 読込', fullLabel: '① 読込・保存', icon: Sparkles },
              { id: 'chroma', label: '② 透過', fullLabel: '② 透過・消去', icon: Wand2 },
              { id: 'transform', label: '③ 調整', fullLabel: '③ 位置・サイズ', icon: Move },
              { id: 'catalog', label: `④ 一覧`, fullLabel: `④ 一覧(${customParts.length})`, icon: Layers },
            ] as { id: StudioPanelTab; label: string; fullLabel: string; icon: typeof Save }[]
          ).map((t) => {
            const Icon = t.icon;
            const active = panelTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setPanelTab(t.id)}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-bold transition sm:flex-row sm:justify-center sm:gap-1.5 sm:text-xs ${
                  active
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">{t.label}</span>
                <span className="hidden sm:inline truncate">{t.fullLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="max-h-none lg:max-h-[calc(100vh-14.5rem)] lg:overflow-y-auto pr-0 sm:pr-1">
          {/* ---------- タブ1: 素材読み込み ＆ 自動サイズ・関節ソケット設定 ＆ 保存 ---------- */}
          {panelTab === 'source' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    AIパーツ読み込み ＆ 自動設定
                  </h3>
                  <p className="hidden sm:block text-xs text-slate-500">
                    画像を読み込むと自動で背景透過・3頭身サイズ正規化・関節ソケット検出を行います。
                  </p>
                </div>
                <div className="flex w-full sm:w-auto items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                  >
                    <Upload className="h-4 w-4" />
                    画像・写真を選択
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReadClipboardButton()}
                    className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <ImagePlus className="h-4 w-4" />
                    貼り付け
                  </button>
                </div>
              </div>

              {/* 登録済みパーツの再編集ステータスバナー ＆ クイック呼び出しバー */}
              {editingPart ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 ring-2 ring-amber-300">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                      <Pencil className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-xs font-extrabold text-amber-950">
                        登録済みパーツ「{editingPart.name}」（
                        {CATEGORY_META[editingPart.category].label}）を再編集中
                      </p>
                      <p className="text-[11px] text-amber-800">
                        位置・サイズ・角度・消しゴム・ソケットピンを調整して「上書き保存」または「別名で複製登録」できます
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingPart(null)}
                    className="rounded-xl bg-white px-2.5 py-1 text-[11px] font-bold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100"
                  >
                    新規登録モードへ切替
                  </button>
                </div>
              ) : (
                customParts.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Pencil className="h-3.5 w-3.5 text-indigo-600" />
                      一度登録したパーツを呼び出して再編集・複製:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        value=""
                        onChange={(e) => {
                          const target = customParts.find((p) => p.id === e.target.value);
                          if (target) {
                            void handleReEditCatalogPart(target);
                          }
                        }}
                        className="max-w-[260px] rounded-xl bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 outline-none focus:ring-indigo-500"
                      >
                        <option value="">登録済みパーツを選択して読み込む ({customParts.length}件)...</option>
                        {customParts.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{CATEGORY_META[p.category].label}] {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-600">
                    対象カテゴリ（全18レイヤー）
                  </span>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as AvatarCategory)}
                    className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 ring-1 ring-slate-200 outline-none focus:ring-indigo-500"
                  >
                    {AVATAR_LAYERS.map((cat) => (
                      <option key={cat} value={cat}>
                        {String(CATEGORY_META[cat].order).padStart(2, '0')}.{' '}
                        {CATEGORY_META[cat].label} ({cat})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-600">パーツ名</span>
                  <input
                    type="text"
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    placeholder="例: blue_jacket"
                    className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 ring-1 ring-slate-200 outline-none focus:ring-indigo-500"
                  />
                </label>
              </div>

              {/* 仕組み①＆③の自動解析ステータスカード */}
              <div className="flex flex-col gap-2.5 rounded-2xl bg-violet-50/70 p-3.5 ring-1 ring-violet-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-violet-900">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    自動サイズ正規化 ＆ 関節ソケット検出
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAutoSizeOnChange((v) => !v)}
                      className={`rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                        autoSizeOnChange
                          ? 'bg-violet-600 text-white'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200'
                      }`}
                    >
                      読込時の自動サイズ合わせ: {autoSizeOnChange ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {currentFinalRig && hasPartLoaded ? (
                  <div className="flex flex-col gap-2 rounded-xl bg-white p-2.5 text-xs text-slate-600 ring-1 ring-violet-100">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        実体ピクセル領域:{' '}
                        <strong className="font-mono text-emerald-700">
                          {currentFinalRig.bounds.width}×{currentFinalRig.bounds.height}px
                        </strong>{' '}
                        (目標: {CATEGORY_META[category].targetSpec.targetWidth}×
                        {CATEGORY_META[category].targetSpec.targetHeight}px)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyAutoSizeAndPosition(category, true)}
                          className="rounded-lg bg-violet-100 px-2.5 py-1 text-[11px] font-extrabold text-violet-700 hover:bg-violet-200"
                        >
                          サイズ・位置を再自動フィット
                        </button>
                        {oppositeCategory && oppositeReferencePart?.rig?.bounds && (
                          <button
                            type="button"
                            onClick={handleMatchOppositeLimbSize}
                            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-sm hover:bg-indigo-700"
                            title="反対側の腕・脚の実体サイズ（ピクセル長）および縦位置（Y座標）にピタリと揃えます"
                          >
                            <Maximize className="h-3 w-3" />
                            反対側の{CATEGORY_META[oppositeCategory].label}「
                            {oppositeReferencePart.name}」(
                            {oppositeReferencePart.rig.bounds.width}×
                            {oppositeReferencePart.rig.bounds.height}px)とサイズ・高さを統一
                          </button>
                        )}
                        {Object.keys(customSocketOverrides).length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCustomSocketOverrides({})}
                            className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
                          >
                            ピン位置を自動検出に戻す
                          </button>
                        )}
                      </div>
                    </div>

                    {activeSocketPins.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
                        {activeSocketPins.map(({ key, point }) => (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 ring-1 ring-slate-200"
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: SOCKET_LABELS[key].color }}
                            />
                            {SOCKET_LABELS[key].label}: ({point.x},{point.y})
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 素体・腕から自動抽出した肌色＆主線色パレット表示 */}
                    {currentFinalRig.colorPalette && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-[11px]">
                        <span className="font-bold text-slate-600">
                          自動抽出した握り手カラー（持ち物を握る時に使用）:
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 ring-1 ring-slate-200">
                          <span
                            className="h-3 w-3 rounded-full ring-1 ring-slate-300"
                            style={{ backgroundColor: currentFinalRig.colorPalette.skinFill }}
                          />
                          肌色 {currentFinalRig.colorPalette.skinFill}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 ring-1 ring-slate-200">
                          <span
                            className="h-3 w-3 rounded-full ring-1 ring-slate-300"
                            style={{ backgroundColor: currentFinalRig.colorPalette.outlineColor }}
                          />
                          主線 {currentFinalRig.colorPalette.outlineColor}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-violet-700">
                    パーツ画像を読み込むと、余白を除いた実体サイズと関節ソケット座標がここに自動表示されます。
                  </p>
                )}

                {/* 持ち物（ステッキ・武器等）の場合の「自動握り手＆持ち方3モード切り替え」設定 */}
                {category === 'hand_item' && (
                  <div className="rounded-xl bg-white p-2.5 ring-1 ring-amber-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-amber-900">
                        持ち物（ステッキ・剣・バッグ等）の初期持ち方モード
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        追加イラスト不要
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      ステージ上の赤いピン（★付け根/グリップ）をステッキの握らせたい位置にドラッグして合わせられます。
                    </p>
                    <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                      {(
                        [
                          {
                            id: 'grip_fist',
                            label: '① しっかり握る【推奨】',
                            desc: '素体の肌色・主線色で丸い握りこぶしを自動合成',
                          },
                          {
                            id: 'behind_hand',
                            label: '② 手の後ろに持つ',
                            desc: '素体・手の奥のレイヤーに回り込ませる',
                          },
                          {
                            id: 'in_front',
                            label: '③ 手の上に重ねる',
                            desc: 'こぶしを重ねず手の手前にそのまま配置',
                          },
                        ] as { id: HandHoldMode; label: string; desc: string }[]
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setHandHoldMode(m.id)}
                          className={`flex flex-col rounded-lg p-2 text-left transition ${
                            handHoldMode === m.id
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-amber-50'
                          }`}
                        >
                          <span className="text-xs font-extrabold">{m.label}</span>
                          <span
                            className={`text-[10px] ${
                              handHoldMode === m.id ? 'text-amber-100' : 'text-slate-400'
                            }`}
                          >
                            {m.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <RangeControl
                        label="腕の角度になじむ自動傾き角度 (初期値: 18°)"
                        value={naturalTiltDeg}
                        min={-45}
                        max={45}
                        step={1}
                        onChange={setNaturalTiltDeg}
                        format={(v) => `${v > 0 ? `+${v}` : v}°`}
                      />
                    </div>
                  </div>
                )}

                {/* トップスの場合の「長袖・半袖モード」設定 */}
                {category === 'tops' && (
                  <div className="rounded-xl bg-white p-2.5 ring-1 ring-violet-100">
                    <span className="text-xs font-extrabold text-slate-700">
                      トップス着用時の袖・腕の自動処理モード
                    </span>
                    <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                      {(
                        [
                          {
                            id: 'short_or_sleeveless',
                            label: '半袖・ノースリーブ',
                            desc: '肩ソケットに腕パーツ全体を接続',
                          },
                          {
                            id: 'long_sleeve_mask',
                            label: '長袖（二の腕自動消去）',
                            desc: '袖と重なる二の腕の素肌を自動で隠す',
                          },
                          {
                            id: 'hide_arms',
                            label: '腕パーツ自動非表示',
                            desc: '服自体に手まで描かれている場合',
                          },
                        ] as { id: TopSleeveMode; label: string; desc: string }[]
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSleeveMode(m.id)}
                          className={`flex flex-col rounded-lg p-2 text-left transition ${
                            sleeveMode === m.id
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-indigo-50'
                          }`}
                        >
                          <span className="text-xs font-extrabold">{m.label}</span>
                          <span
                            className={`text-[10px] ${
                              sleeveMode === m.id ? 'text-indigo-100' : 'text-slate-400'
                            }`}
                          >
                            {m.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                    {sleeveMode === 'long_sleeve_mask' && (
                      <div className="mt-2">
                        <RangeControl
                          label="長袖の二の腕マスク半径（赤点線円）"
                          value={sleeveMaskRadius}
                          min={20}
                          max={120}
                          onChange={setSleeveMaskRadius}
                          format={(v) => `${v}px`}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {editingPart ? (
                  <>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        disabled={!hasPartLoaded}
                        onClick={() =>
                          void handleExportAndRegister({
                            downloadFile: true,
                            registerCatalog: false,
                          })
                        }
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                      >
                        <Download className="h-4 w-4" />
                        PNGダウンロード
                      </button>

                      <button
                        type="button"
                        disabled={!hasPartLoaded}
                        onClick={() =>
                          void handleExportAndRegister({
                            downloadFile: false,
                            registerCatalog: true,
                            overwriteExisting: true,
                          })
                        }
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-extrabold text-amber-800 ring-1 ring-amber-300 hover:bg-amber-100 disabled:opacity-40"
                      >
                        <Save className="h-4 w-4" />
                        上書き保存のみ
                      </button>

                      <button
                        type="button"
                        disabled={!hasPartLoaded}
                        onClick={() =>
                          void handleExportAndRegister({
                            downloadFile: false,
                            registerCatalog: true,
                            overwriteExisting: false,
                          })
                        }
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100 disabled:opacity-40"
                      >
                        <Copy className="h-4 w-4" />
                        別パーツとして複製登録
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!hasPartLoaded}
                      onClick={() =>
                        void handleExportAndRegister({
                          downloadFile: false,
                          registerCatalog: true,
                          overwriteExisting: true,
                          openClosetToTryOn: true,
                        })
                      }
                      className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-40"
                    >
                      <Check className="h-4 w-4" />
                      「{editingPart.name}」を上書き保存してクローゼットで確認する
                    </button>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={!hasPartLoaded}
                        onClick={() =>
                          void handleExportAndRegister({
                            downloadFile: true,
                            registerCatalog: false,
                          })
                        }
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                      >
                        <Download className="h-4 w-4" />
                        PNGダウンロードのみ
                      </button>

                      <button
                        type="button"
                        disabled={!hasPartLoaded}
                        onClick={() =>
                          void handleExportAndRegister({
                            downloadFile: false,
                            registerCatalog: true,
                          })
                        }
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100 disabled:opacity-40"
                      >
                        <Save className="h-4 w-4" />
                        カタログに登録のみ
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!hasPartLoaded}
                      onClick={() =>
                        void handleExportAndRegister({
                          downloadFile: false,
                          registerCatalog: true,
                          openClosetToTryOn: true,
                        })
                      }
                      className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-40"
                    >
                      <Shirt className="h-4 w-4" />
                      ソケット情報付きで登録してクローゼットで試着する
                    </button>
                  </>
                )}

                {/* 腕・脚カテゴリの場合は「左右反転して反対側の腕/脚へ複製登録（サイズ感統一）」ボタンを常時表示 */}
                {oppositeCategory && (
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-violet-50 p-2.5 ring-1 ring-violet-200">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-violet-900">
                      <FlipHorizontal className="h-4 w-4 text-violet-600" />
                      <span>
                        左右のサイズ感を100%統一：反対側の「
                        {CATEGORY_META[oppositeCategory].label}」へ反転複製
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={!hasPartLoaded}
                        onClick={() =>
                          void handleExportAndRegister({
                            downloadFile: false,
                            registerCatalog: true,
                            mirrorToOpposite: true,
                            openClosetToTryOn: false,
                          })
                        }
                        className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold text-violet-700 shadow-sm ring-1 ring-violet-300 hover:bg-violet-100 disabled:opacity-40"
                      >
                        <FlipHorizontal className="h-3.5 w-3.5" />
                        左右反転して「{CATEGORY_META[oppositeCategory].label}」にも登録
                      </button>
                      <button
                        type="button"
                        disabled={!hasPartLoaded}
                        onClick={() =>
                          void handleExportAndRegister({
                            downloadFile: false,
                            registerCatalog: true,
                            mirrorToOpposite: true,
                            openClosetToTryOn: true,
                          })
                        }
                        className="flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-violet-700 disabled:opacity-40"
                      >
                        <Shirt className="h-3.5 w-3.5" />
                        反転登録して試着
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------- タブ2: クロマキー透過 ＆ 手動消しゴム ---------- */}
          {panelTab === 'chroma' && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">
                  クロマキー背景透過（色指定・スポイト）
                </h3>
                <p className="text-xs text-slate-500">
                  背景が透明化されると、自動的に余白を除いた実体サイズが再計算されます。
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PRESET_KEY_COLORS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setKeyColors((prev) => [...prev, hexToRgb(preset.hex)])}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    <span
                      className="h-3 w-3 rounded-sm ring-1 ring-slate-300"
                      style={{ backgroundColor: preset.hex }}
                    />
                    {preset.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleAutoDetectBg}
                  disabled={!hasPartLoaded}
                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  四隅から自動検出
                </button>

                <label className="flex cursor-pointer items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200">
                  <Palette className="h-3.5 w-3.5" />
                  色選択
                  <input
                    type="color"
                    className="h-0 w-0 opacity-0"
                    onChange={(e) => setKeyColors((prev) => [...prev, hexToRgb(e.target.value)])}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => handleToggleTool('pick')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    tool === 'pick'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Pipette className="h-3.5 w-3.5" />
                  {tool === 'pick' ? 'スポイト解除' : '画像からスポイト'}
                </button>
              </div>

              <div className="flex min-h-[36px] flex-wrap items-center gap-1.5 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200/60">
                {keyColors.length === 0 ? (
                  <span className="text-xs text-slate-400">透過色が未設定です</span>
                ) : (
                  <>
                    {keyColors.map((k, idx) => (
                      <span
                        key={idx}
                        className="flex items-center gap-1 rounded-md bg-white py-0.5 pl-1.5 pr-1 font-mono text-[11px] font-bold text-slate-700 shadow-sm ring-1 ring-slate-200"
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-sm ring-1 ring-slate-300"
                          style={{ backgroundColor: rgbToHex(k) }}
                        />
                        {rgbToHex(k)}
                        <button
                          type="button"
                          onClick={() => setKeyColors((prev) => prev.filter((_, i) => i !== idx))}
                          className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setKeyColors([])}
                      className="ml-auto text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      すべてクリア
                    </button>
                  </>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <RangeControl
                  label="許容値 (Tolerance)"
                  value={tolerance}
                  min={0}
                  max={100}
                  onChange={setTolerance}
                  format={(v) => `${v}%`}
                />
                <RangeControl
                  label="境界ぼかし (Feather)"
                  value={feather}
                  min={0}
                  max={50}
                  onChange={setFeather}
                  format={(v) => `${v}%`}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setContiguous((v) => !v)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    contiguous
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  外周と繋がった背景のみ透過: {contiguous ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => setDespill((v) => !v)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    despill
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  フチの色かぶり除去: {despill ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* 消しゴムセクション */}
              <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">手動消しゴムツール</span>
                  <span className="text-[11px] text-slate-500">
                    ※もう一度押すと解除して移動モードに戻ります
                  </span>
                </div>
                <RangeControl
                  label="消しゴムブラシサイズ"
                  value={brushSize}
                  min={2}
                  max={180}
                  onChange={setBrushSize}
                  format={(v) => `${v}px`}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleTool('erase')}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                      tool === 'erase'
                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-200'
                        : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Eraser className="h-4 w-4" />
                    {tool === 'erase'
                      ? '消しゴム選択中（もう一度押すと解除）'
                      : '消しゴムを使う'}
                  </button>

                  <button
                    type="button"
                    onClick={handleUndoErase}
                    disabled={undoCount === 0}
                    className="flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    1つ戻す
                  </button>

                  <button
                    type="button"
                    onClick={handleClearEraserMask}
                    disabled={!hasPartLoaded}
                    className="flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    消した箇所をすべて復元
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---------- タブ3: 位置・サイズ・回転・反転 ---------- */}
          {panelTab === 'transform' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    トランスフォーム（手動での微調整）
                  </h3>
                  <p className="text-xs text-slate-500">
                    自動サイズ正規化の結果をさらに手動で微調整したい場合に使用します。
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!hasPartLoaded}
                  onClick={() => applyAutoSizeAndPosition(category, true)}
                  className="flex items-center gap-1 rounded-xl bg-violet-100 px-3 py-1.5 text-xs font-extrabold text-violet-700 hover:bg-violet-200 disabled:opacity-40"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  自動サイズに再フィット
                </button>
              </div>

              <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-2.5 sm:p-3 ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">位置オフセット微調整</span>
                  {/* スマホでも直感的に押せる十字ボタン */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!hasPartLoaded}
                      onClick={() => {
                        setUserManuallyMovedPart(true);
                        setTransform((prev) => ({ ...prev, x: prev.x - 2 }));
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95 disabled:opacity-40"
                      title="左へ2px"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!hasPartLoaded}
                      onClick={() => {
                        setUserManuallyMovedPart(true);
                        setTransform((prev) => ({ ...prev, y: prev.y - 2 }));
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95 disabled:opacity-40"
                      title="上へ2px"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!hasPartLoaded}
                      onClick={() => {
                        setUserManuallyMovedPart(true);
                        setTransform((prev) => ({ ...prev, y: prev.y + 2 }));
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95 disabled:opacity-40"
                      title="下へ2px"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!hasPartLoaded}
                      onClick={() => {
                        setUserManuallyMovedPart(true);
                        setTransform((prev) => ({ ...prev, x: prev.x + 2 }));
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95 disabled:opacity-40"
                      title="右へ2px"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
                    <span className="text-xs font-bold text-slate-500">X:</span>
                    <input
                      type="number"
                      value={Math.round(transform.x)}
                      disabled={!hasPartLoaded}
                      onChange={(e) => {
                        setUserManuallyMovedPart(true);
                        setTransform((prev) => ({ ...prev, x: Number(e.target.value) || 0 }));
                      }}
                      className="w-full font-mono text-xs font-bold text-slate-800 outline-none"
                    />
                    <span className="text-[10px] text-slate-400">px</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
                    <span className="text-xs font-bold text-slate-500">Y:</span>
                    <input
                      type="number"
                      value={Math.round(transform.y)}
                      disabled={!hasPartLoaded}
                      onChange={(e) => {
                        setUserManuallyMovedPart(true);
                        setTransform((prev) => ({ ...prev, y: Number(e.target.value) || 0 }));
                      }}
                      className="w-full font-mono text-xs font-bold text-slate-800 outline-none"
                    />
                    <span className="text-[10px] text-slate-400">px</span>
                  </div>
                </div>
              </div>

              <RangeControl
                label="拡大縮小 (Scale)"
                value={transform.scale}
                min={0.05}
                max={4}
                step={0.005}
                disabled={!hasPartLoaded}
                onChange={(scale) => {
                  setUserManuallyMovedPart(true);
                  setTransform((prev) => ({ ...prev, scale }));
                }}
                format={(v) => `${(v * 100).toFixed(1)}%`}
              />

              <RangeControl
                label="回転角度 (Rotation)"
                value={transform.rotation}
                min={-180}
                max={180}
                step={0.5}
                disabled={!hasPartLoaded}
                onChange={(rotation) => {
                  setUserManuallyMovedPart(true);
                  setTransform((prev) => ({ ...prev, rotation }));
                }}
                format={(v) => `${v.toFixed(1)}°`}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!hasPartLoaded}
                  onClick={() => setTransform((prev) => ({ ...prev, flipX: !prev.flipX }))}
                  className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-40 ${
                    transform.flipX
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                  左右反転
                </button>

                <button
                  type="button"
                  disabled={!hasPartLoaded}
                  onClick={() => setTransform((prev) => ({ ...prev, flipY: !prev.flipY }))}
                  className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-40 ${
                    transform.flipY
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <FlipVertical className="h-3.5 w-3.5" />
                  上下反転
                </button>

                <button
                  type="button"
                  disabled={!hasPartLoaded}
                  onClick={() =>
                    sourceInfo &&
                    setTransform(createInitialFitTransform(sourceInfo.width, sourceInfo.height))
                  }
                  className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
                >
                  <Maximize className="h-3.5 w-3.5" />
                  キャンバス全体フィット
                </button>
              </div>

              {/* ガイド素体・他パーツの重ね合わせ表示不透明度 */}
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
                    <Eye className="h-3.5 w-3.5 text-indigo-600" />
                    素体・他パーツの表示濃度
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowOtherEquippedParts((v) => !v)}
                      className={`rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                        showOtherEquippedParts
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      他パーツ: {showOtherEquippedParts ? 'ON' : 'OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={toggleBodyOnlyMode}
                      className={`rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                        bodyOnlyMode
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      素体のみ: {bodyOnlyMode ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <RangeControl
                    label="素体ガイド不透明度"
                    value={bodyGuideOpacity}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={setBodyGuideOpacity}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                  <RangeControl
                    label="他パーツ不透明度"
                    value={otherPartsOpacity}
                    min={0}
                    max={1}
                    step={0.05}
                    disabled={!showOtherEquippedParts}
                    onChange={setOtherPartsOpacity}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ---------- タブ5: カタログ登録済みパーツ一覧 ---------- */}
          {panelTab === 'catalog' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    登録済みパーツカタログ ({customParts.length}件)
                  </h3>
                  <p className="text-xs text-slate-500">
                    各パーツのソケット情報はクローゼットでの自動吸着に使われます。
                  </p>
                </div>
                {customParts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleBatchAnalyzeCatalogRigs()}
                    className="flex items-center gap-1 rounded-xl bg-violet-100 px-3 py-1.5 text-xs font-extrabold text-violet-700 hover:bg-violet-200"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    全パーツのソケットを再自動解析
                  </button>
                )}
              </div>

              {customParts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400">
                  まだ登録されたパーツはありません。「① 自動調整・保存」タブから登録するとここに追加されます。
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {customParts.map((part) => {
                    const oppCat = getOppositeSymmetryCategory(part.category);
                    const isEditingThis = editingPart?.id === part.id;
                    return (
                      <div
                        key={part.id}
                        className={`group relative flex flex-col overflow-hidden rounded-xl bg-white ring-2 transition ${
                          isEditingThis
                            ? 'ring-amber-500 shadow-md'
                            : 'ring-slate-200 hover:ring-indigo-300'
                        }`}
                      >
                        <div className="avatar-checker relative aspect-square w-full overflow-hidden">
                          <img
                            src={part.src}
                            alt={part.name}
                            className="h-full w-full object-contain"
                          />
                          {isEditingThis && (
                            <span className="absolute left-1.5 top-1.5 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow">
                              再編集中
                            </span>
                          )}
                          <button
                            type="button"
                            title="このパーツを削除"
                            onClick={() => {
                              if (window.confirm(`「${part.name}」を削除しますか？`)) {
                                if (isEditingThis) setEditingPart(null);
                                void deletePart(part.id);
                              }
                            }}
                            className="absolute right-1.5 top-1.5 rounded-md bg-white/90 p-1 text-slate-400 shadow ring-1 ring-slate-200 transition hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-1 flex-col justify-between gap-2 p-2">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <p className="truncate text-xs font-bold text-slate-800">
                                {part.name}
                              </p>
                              {part.rig && (
                                <span
                                  title="ソケット自動解析済み"
                                  className="shrink-0 rounded bg-emerald-50 px-1 py-0.5 text-[9px] font-bold text-emerald-700"
                                >
                                  {part.rig.bounds.width}×{part.rig.bounds.height}
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[10px] font-semibold text-slate-400">
                              {CATEGORY_META[part.category].label}
                            </p>
                          </div>

                          <div className="flex flex-col gap-1 border-t border-slate-100 pt-1.5">
                            <div className="grid grid-cols-2 gap-1">
                              <button
                                type="button"
                                onClick={() => void handleReEditCatalogPart(part)}
                                className="flex items-center justify-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-extrabold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100"
                                title="スタジオに読み込んで再編集・上書き保存"
                              >
                                <Pencil className="h-3 w-3" />
                                再編集
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDuplicateCatalogPartInStudio(part)}
                                className="flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                                title="同じカテゴリ内にコピーを複製"
                              >
                                <Copy className="h-3 w-3" />
                                複製
                              </button>
                            </div>

                            {oppCat && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDuplicateCatalogPartInStudio(part, {
                                    mirrorToOpposite: true,
                                  })
                                }
                                className="flex items-center justify-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-extrabold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100"
                                title={`左右反転して「${CATEGORY_META[oppCat].label}」へ同一サイズで複製します`}
                              >
                                <FlipHorizontal className="h-3 w-3" />
                                反転して{CATEGORY_META[oppCat].label}へ複製
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 楕円切り抜き＆透過モーダル */}
      {isEllipseCropOpen && currentStudioImageSrc && (
        <EllipseCropModal
          imageSrc={currentStudioImageSrc}
          title={`パーツの楕円切り抜き・透過: ${partName || CATEGORY_META[category].label}`}
          onApply={handleApplyEllipseCrop}
          onClose={() => setIsEllipseCropOpen(false)}
          referenceOptions={studioCropReferenceOptions}
          defaultReferenceId="body"
        />
      )}
    </div>
  );
}
