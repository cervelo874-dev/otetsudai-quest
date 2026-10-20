import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  X,
  RotateCcw,
  Undo2,
  Redo2,
  Download,
  Check,
  Circle,
  Scissors,
  Eraser,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Maximize,
  Move,
  Layers,
  Sparkles,
  Info,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import {
  useEllipseSelection,
  getHandlePositions,
  isPointInsideEllipse,
  type EllipseBounds,
  type EllipseGeometry,
  type ResizeHandle,
} from '../hooks/useEllipseSelection';
import { toast } from '../../../components/ui';

export interface EllipseCropResult {
  /** 透過処理済み画像のDataURL */
  dataUrl: string;
  /** 透過処理済み画像のBlob */
  blob: Blob;
  /** 最終出力幅 */
  width: number;
  /** 最終出力高さ */
  height: number;
  /** 余白をトリミングして切り出したか */
  isTrimmed: boolean;
}

export interface EllipseCropReferenceOption {
  /** 識別用ID (例: 'body', 'full', 'head') */
  id: string;
  /** ラベル (例: '素体（首・鎖骨・体）') */
  label: string;
  /** 参照画像のURL / DataURL */
  src: string;
  /** カテゴリ情報（任意） */
  category?: string;
}

export interface EllipseCropModalProps {
  /** 編集対象の画像（URL文字列、DataURL、またはHTMLCanvasElement） */
  imageSrc: string;
  /** パーツまたは画像のタイトル（表示用） */
  title?: string;
  /** 編集反映時のコールバック */
  onApply: (result: EllipseCropResult) => void | Promise<void>;
  /** 閉じる / キャンセル時のコールバック */
  onClose: () => void;
  /** 初期境界ぼかし（px、0〜10、デフォルト: 0） */
  initialFeather?: number;
  /** 初期正円固定フラグ（デフォルト: false） */
  initialCircleLock?: boolean;
  /** 他パーツ照らし合わせ用 参照ガイド画像リスト（素体、全身、髪など） */
  referenceOptions?: EllipseCropReferenceOption[];
  /** 初期選択の参照ガイドID（'none' で非表示、未指定時は先頭の参照ガイド） */
  defaultReferenceId?: string;
}

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

/**
 * GIMP風「楕円選択ツール」画像透過・円形切り抜きモーダルコンポーネント
 * - Canvasベースのインタラクティブな楕円・正円選択枠
 * - 移動・8方向ハンドルリサイズ・Shift/トグル正円固定
 * - 「選択範囲内を消去 (destination-out)」＆「選択範囲外を消去 (destination-in)」
 * - アバター座標維持（元キャンバスサイズ維持）＆ 余白トリミングオプション
 * - アンチエイリアス ＆ 境界ぼかし（Feather: 0〜10px）
 * - Undo / Redo 履歴機能
 */
export function EllipseCropModal({
  imageSrc,
  title = '画像の円形・楕円切り抜き＆透過',
  onApply,
  onClose,
  initialFeather = 0,
  initialCircleLock = false,
  referenceOptions = [],
  defaultReferenceId,
}: EllipseCropModalProps) {
  // 元画像・作業キャンバス
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({
    width: 512,
    height: 512,
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // 編集設定
  const [feather, setFeather] = useState<number>(initialFeather);
  const [circleLock, setCircleLock] = useState<boolean>(initialCircleLock);
  const [tightTrim, setTightTrim] = useState<boolean>(false);

  // 参照ガイド（他パーツ下敷きオニオンスキン）設定
  const [selectedRefId, setSelectedRefId] = useState<string>(() => {
    if (defaultReferenceId !== undefined) return defaultReferenceId;
    return referenceOptions.length > 0 ? referenceOptions[0].id : 'none';
  });
  const [showReference, setShowReference] = useState<boolean>(true);
  const [refOpacity, setRefOpacity] = useState<number>(0.5);
  const [refPosition, setRefPosition] = useState<'behind' | 'front'>('behind');

  // ズーム・表示倍率
  const [zoom, setZoom] = useState<number>(1);
  const [hoverCursor, setHoverCursor] = useState<string>('crosshair');

  // キャンバス参照
  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const referenceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Undo / Redo 履歴スタック（ImageData形式）
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const [historyVersion, setHistoryVersion] = useState<number>(0);

  // カット対象素材のサイズ（拡大縮小）・位置微調整
  const [materialScale, setMaterialScale] = useState<number>(1);
  const [materialOffsetX, setMaterialOffsetX] = useState<number>(0);
  const [materialOffsetY, setMaterialOffsetY] = useState<number>(0);
  const rawImageElementRef = useRef<HTMLImageElement | null>(null);

  // 素材画像のサイズ・位置を変更してキャンバスを再描画
  const handleUpdateMaterialTransform = useCallback(
    (nextScale: number, nextOffX: number, nextOffY: number) => {
      const roundedScale = Math.round(nextScale * 100) / 100;
      const roundedOffX = Math.round(nextOffX);
      const roundedOffY = Math.round(nextOffY);

      setMaterialScale(roundedScale);
      setMaterialOffsetX(roundedOffX);
      setMaterialOffsetY(roundedOffY);

      const rawImg = rawImageElementRef.current;
      const canvas = imageCanvasRef.current;
      if (!rawImg || !canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      // キャンバスの中心を基準にオフセットとスケールを適用
      ctx.translate(w / 2 + roundedOffX, h / 2 + roundedOffY);
      ctx.scale(roundedScale, roundedScale);
      ctx.drawImage(rawImg, -rawImg.naturalWidth / 2, -rawImg.naturalHeight / 2);
      ctx.restore();

      // Undoスタックの先頭（初期画像）を更新
      const initialData = ctx.getImageData(0, 0, w, h);
      undoStackRef.current = [initialData];
      redoStackRef.current = [];
      setHistoryVersion((v) => v + 1);
    },
    []
  );

  // 素材のサイズ・位置をリセット
  const handleResetMaterialTransform = useCallback(() => {
    handleUpdateMaterialTransform(1, 0, 0);
    toast('素材のサイズと位置を初期状態に戻しました', '🔄');
  }, [handleUpdateMaterialTransform]);

  // 参照画像の読み込みと参照キャンバスへの描画（アスペクト比維持・中央基準描画）
  useEffect(() => {
    const canvas = referenceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageSize.width;
    canvas.height = imageSize.height;
    ctx.clearRect(0, 0, imageSize.width, imageSize.height);

    if (!showReference || selectedRefId === 'none') {
      return;
    }

    const currentOpt = referenceOptions.find((opt) => opt.id === selectedRefId);
    if (!currentOpt?.src) return;

    let isCancelled = false;
    const refImg = new Image();
    refImg.crossOrigin = 'anonymous';
    refImg.onload = () => {
      if (isCancelled) return;
      ctx.clearRect(0, 0, imageSize.width, imageSize.height);

      const canvasW = imageSize.width;
      const canvasH = imageSize.height;
      const nw = refImg.naturalWidth || 512;
      const nh = refImg.naturalHeight || 512;

      // アスペクト比を維持してキャンバス中央に contain 描画（縦伸び・横伸びを完全に防止）
      const canvasAspect = canvasW / canvasH;
      const imgAspect = nw / nh;

      let drawW = canvasW;
      let drawH = canvasH;
      let drawX = 0;
      let drawY = 0;

      if (canvasAspect > imgAspect) {
        // キャンバスが横長 -> 高さに合わせて左右にセンタリング
        drawH = canvasH;
        drawW = canvasH * imgAspect;
        drawX = (canvasW - drawW) / 2;
      } else {
        // キャンバスが縦長 -> 幅に合わせて上下にセンタリング
        drawW = canvasW;
        drawH = canvasW / imgAspect;
        drawY = (canvasH - drawH) / 2;
      }

      ctx.drawImage(refImg, drawX, drawY, drawW, drawH);
    };
    refImg.src = currentOpt.src;

    return () => {
      isCancelled = true;
    };
  }, [selectedRefId, showReference, referenceOptions, imageSize]);

  // 楕円選択フック
  const {
    bounds,
    geometry,
    isDragging,
    dragMode,
    activeHandle,
    setBounds,
    startInteraction,
    updateInteraction,
    endInteraction,
    hitTestHandle,
    selectAll,
    clearSelection,
  } = useEllipseSelection({
    canvasWidth: imageSize.width,
    canvasHeight: imageSize.height,
    lockCircle: circleLock,
    minRadius: 4,
  });

  // 画像読み込みとキャンバス初期化
  useEffect(() => {
    let isCancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (isCancelled) return;
      rawImageElementRef.current = img;
      setMaterialScale(1);
      setMaterialOffsetX(0);
      setMaterialOffsetY(0);
      const w = img.naturalWidth || 512;
      const h = img.naturalHeight || 512;
      setImageSize({ width: w, height: h });

      // 作業キャンバス初期化
      const canvas = imageCanvasRef.current;
      if (canvas) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0);

          // 初回スナップショットをUndoスタックに保存
          const initialData = ctx.getImageData(0, 0, w, h);
          undoStackRef.current = [initialData];
          redoStackRef.current = [];
          setHistoryVersion(1);
        }
      }

      // 初期選択枠：画像の中央に半径40%の楕円を配置
      const initRx = Math.round(w * 0.35);
      const initRy = Math.round(h * 0.35);
      setBounds({
        x: Math.round(w / 2 - initRx),
        y: Math.round(h / 2 - initRy),
        width: initRx * 2,
        height: initRy * 2,
      });

      setIsLoaded(true);
    };

    img.onerror = () => {
      if (!isCancelled) {
        toast('画像の読み込みに失敗しました', '❌');
      }
    };

    img.src = imageSrc;

    return () => {
      isCancelled = true;
    };
  }, [imageSrc, setBounds]);

  // 現在の作業キャンバスの状態をUndo履歴に保存
  const pushUndoSnapshot = useCallback(() => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStackRef.current.push(snap);
    // 最大25ステップに制限
    if (undoStackRef.current.length > 25) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setHistoryVersion((v) => v + 1);
  }, []);

  // Undo (元に戻す)
  const handleUndo = useCallback(() => {
    const canvas = imageCanvasRef.current;
    if (!canvas || undoStackRef.current.length <= 1) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // 現在の状態をRedoへ
    const current = undoStackRef.current.pop()!;
    redoStackRef.current.push(current);

    // 1つ前の状態を復元
    const previous = undoStackRef.current[undoStackRef.current.length - 1];
    ctx.putImageData(previous, 0, 0);
    setHistoryVersion((v) => v + 1);
    toast('操作を元に戻しました', '↩️');
  }, []);

  // Redo (やり直す)
  const handleRedo = useCallback(() => {
    const canvas = imageCanvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(next);
    ctx.putImageData(next, 0, 0);
    setHistoryVersion((v) => v + 1);
    toast('操作をやり直しました', '↪️');
  }, []);

  // キーボードショートカット (Ctrl+Z / Ctrl+Y / Shift / Delete / Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, onClose]);

  // マウス/タッチ座標をキャンバス画像座標系へ変換
  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const overlay = overlayCanvasRef.current;
      if (!overlay) return null;
      const rect = overlay.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      const scaleX = overlay.width / rect.width;
      const scaleY = overlay.height / rect.height;

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      return { x, y };
    },
    []
  );

  // オーバーレイ（選択枠、暗幕、ハンドル、破線）の描画
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    const { width, height } = imageSize;
    overlay.width = width;
    overlay.height = height;
    ctx.clearRect(0, 0, width, height);

    if (!bounds || !geometry || geometry.rx <= 0 || geometry.ry <= 0) {
      return;
    }

    const { cx, cy, rx, ry } = geometry;

    // 1. 選択範囲外を半透明で暗くする（GIMP/Photoshop風マスク）
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    // 全体を矩形で描く
    ctx.rect(0, 0, width, height);
    // 楕円をくり抜く（evenoddルール）
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill('evenodd');
    ctx.restore();

    // 2. 楕円の輪郭線（白と黒の二重破線：どんな背景でも視認可能）
    ctx.save();
    // 黒い実線（ベース）
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    // 白い点線（マーチングアンツ風）
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();

    // 3. 境界ボックスの外枠（薄いガイド線）
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.restore();

    // 4. 中心十字マーカー
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    const crossSize = 6;
    ctx.beginPath();
    ctx.moveTo(cx - crossSize, cy);
    ctx.lineTo(cx + crossSize, cy);
    ctx.moveTo(cx, cy - crossSize);
    ctx.lineTo(cx, cy + crossSize);
    ctx.stroke();
    ctx.restore();

    // 5. 8方向のリサイズハンドル描画
    const handles = getHandlePositions(bounds);
    const handleRadius = 4.5;

    for (const hKey of Object.keys(handles) as ResizeHandle[]) {
      const pt = handles[hKey];
      ctx.save();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, handleRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#18181b';
      ctx.stroke();
      ctx.restore();
    }
  }, [bounds, geometry, imageSize]);

  // ポインターダウン
  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getCanvasCoords(e.clientX, e.clientY);
    if (!pt) return;

    // ハンドル当たり判定の閾値（拡大縮小率に合わせて調整）
    const tolerance = Math.max(8, 12 / zoom);
    startInteraction(pt.x, pt.y, e.shiftKey, tolerance);
  };

  // ポインター移動
  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasCoords(e.clientX, e.clientY);
    if (!pt) return;

    if (isDragging) {
      updateInteraction(pt.x, pt.y, e.shiftKey);
      return;
    }

    // ホバー時のカーソル変更
    if (bounds) {
      const tolerance = Math.max(8, 12 / zoom);
      const hitHandle = hitTestHandle(pt.x, pt.y, tolerance);
      if (hitHandle) {
        setHoverCursor(HANDLE_CURSORS[hitHandle]);
        return;
      }
      if (geometry && isPointInsideEllipse(pt.x, pt.y, geometry)) {
        setHoverCursor('move');
        return;
      }
    }
    setHoverCursor('crosshair');
  };

  // ポインターアップ
  const handlePointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    endInteraction();
  };

  // ホイールズーム
  const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setZoom((z) => Math.min(3, Math.max(0.3, Math.round((z + delta) * 100) / 100)));
    }
  };

  // ========================================================
  // アクション①：「選択範囲内を消去 (Delete Inside)」
  // Canvas の globalCompositeOperation = 'destination-out' を使用
  // ========================================================
  const handleDeleteInside = () => {
    if (!geometry) {
      toast('楕円の選択範囲を作成してください', '⚠️');
      return;
    }

    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // 現在の状態をUndoへ保存
    pushUndoSnapshot();

    ctx.save();
    // 境界のぼかし（Feather）
    if (feather > 0) {
      ctx.filter = `blur(${feather}px)`;
    }

    // destination-out: 既存の画像から、新しく描いた図形の内側を消去（透明化）
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(
      geometry.cx,
      geometry.cy,
      Math.max(0.1, geometry.rx),
      Math.max(0.1, geometry.ry),
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    setHistoryVersion((v) => v + 1);
    toast('選択範囲の内側を透明に消去しました', '✂️');
  };

  // ========================================================
  // アクション②：「選択範囲外を消去 (Crop to Circle)」
  // Canvas の globalCompositeOperation = 'destination-in' を使用
  // ========================================================
  const handleCropToCircle = () => {
    if (!geometry) {
      toast('楕円の選択範囲を作成してください', '⚠️');
      return;
    }

    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // 現在の状態をUndoへ保存
    pushUndoSnapshot();

    if (!tightTrim) {
      // 【デフォルト】アバターの座標と元キャンバスサイズ（512x512等）を100%維持したまま外側を透過
      ctx.save();
      if (feather > 0) {
        ctx.filter = `blur(${feather}px)`;
      }

      // destination-in: 新しく描いた楕円の内側だけを残し、外側の全ピクセルを透明にする
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(
        geometry.cx,
        geometry.cy,
        Math.max(0.1, geometry.rx),
        Math.max(0.1, geometry.ry),
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      setHistoryVersion((v) => v + 1);
      toast('選択した円の外側を透明にしました（座標維持）', '✨');
    } else {
      // 【オプション】余白をトリミングして、楕円のバウンディングボックスサイズにキャンバスを縮小
      const temp = document.createElement('canvas');
      temp.width = canvas.width;
      temp.height = canvas.height;
      const tCtx = temp.getContext('2d')!;
      tCtx.drawImage(canvas, 0, 0);

      tCtx.save();
      if (feather > 0) {
        tCtx.filter = `blur(${feather}px)`;
      }
      tCtx.globalCompositeOperation = 'destination-in';
      tCtx.fillStyle = '#000000';
      tCtx.beginPath();
      tCtx.ellipse(
        geometry.cx,
        geometry.cy,
        Math.max(0.1, geometry.rx),
        Math.max(0.1, geometry.ry),
        0,
        0,
        Math.PI * 2
      );
      tCtx.fill();
      tCtx.restore();

      // 切り出し矩形
      const minX = Math.max(0, Math.floor(geometry.cx - geometry.rx));
      const minY = Math.max(0, Math.floor(geometry.cy - geometry.ry));
      const maxX = Math.min(canvas.width, Math.ceil(geometry.cx + geometry.rx));
      const maxY = Math.min(canvas.height, Math.ceil(geometry.cy + geometry.ry));
      const cropW = Math.max(1, maxX - minX);
      const cropH = Math.max(1, maxY - minY);

      canvas.width = cropW;
      canvas.height = cropH;
      setImageSize({ width: cropW, height: cropH });

      ctx.clearRect(0, 0, cropW, cropH);
      ctx.drawImage(temp, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

      // 選択枠をリセット
      setBounds({
        x: 0,
        y: 0,
        width: cropW,
        height: cropH,
      });

      setHistoryVersion((v) => v + 1);
      toast(`選択した円の外側を消去し、${cropW}x${cropH}pxに切り出しました`, '✨');
    }
  };

  // 決定（編集結果を親コンポーネントへ渡す）
  const handleConfirmApply = async () => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;

    setIsApplying(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Blob生成に失敗しました'));
        }, 'image/png');
      });

      await onApply({
        dataUrl,
        blob,
        width: canvas.width,
        height: canvas.height,
        isTrimmed: tightTrim,
      });
      toast('円形切り抜き処理を適用しました！', '✅');
      onClose();
    } catch (err) {
      console.error('Failed to export cropped image:', err);
      toast('画像の適用に失敗しました', '❌');
    } finally {
      setIsApplying(false);
    }
  };

  // 編集後の画像を単体ダウンロード
  const handleDownloadPng = () => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `ellipse_cropped_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast('PNG画像をダウンロードしました', '💾');
  };

  const isUndoAvailable = undoStackRef.current.length > 1;
  const isRedoAvailable = redoStackRef.current.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-1 sm:p-4 animate-in fade-in duration-150">
      <div className="flex h-[96vh] sm:h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl text-zinc-100">
        {/* ===== モーダルヘッダー ===== */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5 sm:px-5 sm:py-3.5 bg-zinc-950/70">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 shrink-0">
              <Circle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">{title}</h3>
              <p className="hidden sm:block text-[11px] text-zinc-400">
                GIMP風楕円選択ツール：ドラッグで範囲指定し、内側消去または外側消去を実行できます
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo / Redo */}
            <div className="flex items-center rounded-lg bg-zinc-800/80 p-0.5 border border-zinc-700/60">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!isUndoAvailable}
                className={`flex h-7 w-7 items-center justify-center rounded transition ${
                  isUndoAvailable
                    ? 'text-zinc-200 hover:bg-zinc-700 hover:text-white'
                    : 'text-zinc-600 cursor-not-allowed'
                }`}
                title="元に戻す (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!isRedoAvailable}
                className={`flex h-7 w-7 items-center justify-center rounded transition ${
                  isRedoAvailable
                    ? 'text-zinc-200 hover:bg-zinc-700 hover:text-white'
                    : 'text-zinc-600 cursor-not-allowed'
                }`}
                title="やり直す (Ctrl+Y)"
              >
                <Redo2 className="h-4 w-4" />
              </button>
            </div>

            {/* ダウンロード */}
            <button
              type="button"
              onClick={handleDownloadPng}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition"
              title="編集後のPNG画像をダウンロード"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PNG保存</span>
            </button>

            {/* 閉じる */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ===== メイン作業領域 ===== */}
        <div className="flex flex-1 flex-col md:flex-row min-h-0 overflow-hidden">
          {/* 左側：Canvasプレビュー＆選択操作ステージ */}
          <div
            ref={containerRef}
            onWheel={handleWheel}
            className="relative flex flex-1 items-center justify-center overflow-hidden bg-zinc-950 p-4 select-none"
          >
            {/* 市松模様背景（透過確認用） */}
            <div
              className="relative shadow-2xl transition-transform duration-75 ease-out rounded-lg overflow-hidden border border-zinc-700/80"
              style={{
                width: imageSize.width * zoom,
                height: imageSize.height * zoom,
              }}
            >
              {/* 市松チェッカーボード */}
              <div className="absolute inset-0 avatar-checker-dark pointer-events-none z-0" />

              {/* 参照ガイドキャンバス（他パーツ下敷きオニオンスキン） */}
              <canvas
                ref={referenceCanvasRef}
                style={{
                  opacity: showReference && selectedRefId !== 'none' ? refOpacity : 0,
                  zIndex: refPosition === 'behind' ? 5 : 15,
                }}
                className="absolute inset-0 h-full w-full object-contain pointer-events-none transition-opacity duration-150"
              />

              {/* 作業用画像キャンバス（編集対象パーツ） */}
              <canvas
                ref={imageCanvasRef}
                style={{ zIndex: 10 }}
                className="absolute inset-0 h-full w-full object-contain pointer-events-none"
              />

              {/* インタラクティブ選択枠オーバーレイCanvas */}
              <canvas
                ref={overlayCanvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ cursor: hoverCursor, zIndex: 20 }}
                className="absolute inset-0 h-full w-full touch-none"
              />
            </div>

            {/* ズームコントローラー浮動バー */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg bg-zinc-900/90 backdrop-blur-md px-2 py-1 border border-zinc-700 text-xs text-zinc-300 shadow-md">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.3, Math.round((z - 0.2) * 10) / 10))}
                className="p-1 hover:text-white"
                title="縮小"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="w-12 text-center font-mono font-medium">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.2) * 10) / 10))}
                className="p-1 hover:text-white"
                title="拡大"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="ml-1 px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] hover:bg-zinc-700"
                title="100%等倍表示"
              >
                100%
              </button>
            </div>

            {/* 選択範囲サイズ情報バッジ */}
            {geometry && (
              <div className="absolute top-3 left-3 flex items-center gap-2 rounded-lg bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 border border-zinc-700 text-xs text-zinc-200 shadow-md">
                <span className="font-semibold text-zinc-100">
                  {Math.round(geometry.rx * 2)} × {Math.round(geometry.ry * 2)} px
                </span>
                <span className="text-[10px] text-zinc-400">
                  (中心: {Math.round(geometry.cx)}, {Math.round(geometry.cy)})
                </span>
                {Math.abs(geometry.rx - geometry.ry) < 0.5 && (
                  <span className="rounded bg-indigo-500/20 px-1 text-[10px] font-medium text-indigo-300">
                    正円
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 右側：コントロールパネル */}
          <div className="flex w-full md:w-80 flex-col gap-4 border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-900/90 p-5 overflow-y-auto">
            {/* ===== アクションボタングループ ===== */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                切り取りアクション
              </span>

              {/* アクション1: 選択範囲内を消去 */}
              <button
                type="button"
                onClick={handleDeleteInside}
                disabled={!geometry}
                className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition ${
                  geometry
                    ? 'border-rose-900/60 bg-rose-950/20 text-rose-200 hover:bg-rose-950/40 hover:border-rose-700 shadow-sm'
                    : 'border-zinc-800 bg-zinc-800/40 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-900/40 text-rose-300 border border-rose-800/60">
                    <Eraser className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-100">選択範囲内を消去</div>
                    <div className="text-[10px] text-zinc-400">
                      円の内側だけを透明にくり抜く
                    </div>
                  </div>
                </div>
              </button>

              {/* アクション2: 選択範囲外を消去 */}
              <button
                type="button"
                onClick={handleCropToCircle}
                disabled={!geometry}
                className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition ${
                  geometry
                    ? 'border-indigo-900/60 bg-indigo-950/30 text-indigo-200 hover:bg-indigo-950/50 hover:border-indigo-700 shadow-sm'
                    : 'border-zinc-800 bg-zinc-800/40 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-900/40 text-indigo-300 border border-indigo-800/60">
                    <Scissors className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-indigo-100">選択範囲外を消去</div>
                    <div className="text-[10px] text-zinc-400">
                      円の内側を残し外側をすべて透明化
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* ===== 参照下敷きガイド（他パーツ照らし合わせ） ===== */}
            {referenceOptions.length > 0 && (
              <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                    <Layers className="h-3.5 w-3.5 text-indigo-400" />
                    <span>参照ガイド（下敷き）</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReference((prev) => !prev)}
                    className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                      showReference && selectedRefId !== 'none'
                        ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 hover:bg-indigo-900/80'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
                    }`}
                    title={showReference ? '参照ガイドを一時的に非表示' : '参照ガイドを表示'}
                  >
                    {showReference && selectedRefId !== 'none' ? (
                      <>
                        <Eye className="h-3 w-3 text-indigo-400" />
                        <span>表示中</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3" />
                        <span>非表示</span>
                      </>
                    )}
                  </button>
                </div>

                {/* ガイドパーツ選択 */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-zinc-400">
                    照らし合わせるパーツ
                  </label>
                  <select
                    value={selectedRefId}
                    onChange={(e) => {
                      setSelectedRefId(e.target.value);
                      if (e.target.value !== 'none') {
                        setShowReference(true);
                      }
                    }}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="none">なし（参照ガイドを非表示）</option>
                    {referenceOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ガイドが有効な場合の設定 */}
                {selectedRefId !== 'none' && showReference && (
                  <div className="flex flex-col gap-2.5 pt-2 border-t border-zinc-800/80">
                    {/* 重なり順: 背面に敷く / 前面に透かす */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-zinc-400">表示レイヤー位置</span>
                      <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-900 p-0.5 border border-zinc-800 text-xs">
                        <button
                          type="button"
                          onClick={() => setRefPosition('behind')}
                          className={`rounded py-1 text-[11px] font-medium transition ${
                            refPosition === 'behind'
                              ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          背面に敷く
                        </button>
                        <button
                          type="button"
                          onClick={() => setRefPosition('front')}
                          className={`rounded py-1 text-[11px] font-medium transition ${
                            refPosition === 'front'
                              ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-xs'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          前面に透かす
                        </button>
                      </div>
                    </div>

                    {/* 不透明度スライダー */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">ガイド不透明度</span>
                        <span className="font-mono text-zinc-300 font-semibold">
                          {Math.round(refOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1.0}
                        step={0.05}
                        value={refOpacity}
                        onChange={(e) => setRefOpacity(Number(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-zinc-500 leading-relaxed">
                  素体の首元や頭の輪郭を見ながら楕円を合わせ、「選択範囲内を消去」するとぴったりくり抜けます。
                </div>
              </div>
            )}

            {/* ===== 素材のサイズ・位置調整 ===== */}
            <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                  <Sliders className="h-3.5 w-3.5 text-amber-400" />
                  <span>素材のサイズ・位置調整</span>
                </div>
                {(materialScale !== 1 || materialOffsetX !== 0 || materialOffsetY !== 0) && (
                  <button
                    type="button"
                    onClick={handleResetMaterialTransform}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-amber-300 transition"
                    title="サイズと位置を初期状態に戻す"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>リセット</span>
                  </button>
                )}
              </div>

              {/* サイズ（拡大縮小）スライダー */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">サイズ（拡大縮小）</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-zinc-300 font-semibold">
                      {Math.round(materialScale * 100)}%
                    </span>
                    {materialScale !== 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateMaterialTransform(1, materialOffsetX, materialOffsetY)
                        }
                        className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                        title="等倍 (100%) に戻す"
                      >
                        100%
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.01}
                  value={materialScale}
                  onChange={(e) =>
                    handleUpdateMaterialTransform(
                      Number(e.target.value),
                      materialOffsetX,
                      materialOffsetY,
                    )
                  }
                  className="w-full accent-amber-500"
                />
              </div>

              {/* 位置微調整 (X, Y) */}
              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span>位置微調整</span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    X: {materialOffsetX > 0 ? `+${materialOffsetX}` : materialOffsetX}px / Y:{' '}
                    {materialOffsetY > 0 ? `+${materialOffsetY}` : materialOffsetY}px
                  </span>
                </div>

                {/* X方向スライダー */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-3 font-mono text-[11px] text-zinc-500">X</span>
                  <input
                    type="range"
                    min={-200}
                    max={200}
                    step={1}
                    value={materialOffsetX}
                    onChange={(e) =>
                      handleUpdateMaterialTransform(
                        materialScale,
                        Number(e.target.value),
                        materialOffsetY,
                      )
                    }
                    className="flex-1 accent-amber-500"
                  />
                </div>

                {/* Y方向スライダー */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-3 font-mono text-[11px] text-zinc-500">Y</span>
                  <input
                    type="range"
                    min={-200}
                    max={200}
                    step={1}
                    value={materialOffsetY}
                    onChange={(e) =>
                      handleUpdateMaterialTransform(
                        materialScale,
                        materialOffsetX,
                        Number(e.target.value),
                      )
                    }
                    className="flex-1 accent-amber-500"
                  />
                </div>

                {/* 十字方向微調整ボタン */}
                <div className="flex items-center justify-center gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateMaterialTransform(
                        materialScale,
                        materialOffsetX - 1,
                        materialOffsetY,
                      )
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                    title="左に1px移動"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateMaterialTransform(
                          materialScale,
                          materialOffsetX,
                          materialOffsetY - 1,
                        )
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                      title="上に1px移動"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateMaterialTransform(
                          materialScale,
                          materialOffsetX,
                          materialOffsetY + 1,
                        )
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                      title="下に1px移動"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateMaterialTransform(
                        materialScale,
                        materialOffsetX + 1,
                        materialOffsetY,
                      )
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                    title="右に1px移動"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 leading-relaxed">
                素体の首元や頭の大きさに合わせて素材を配置してから、楕円ツールでカットできます。
              </div>
            </div>

            {/* ===== 選択枠＆境界オプション ===== */}
            <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5">
              <span className="text-xs font-semibold text-zinc-300">選択・境界設定</span>

              {/* 正円固定トグル */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-zinc-300">正円（1:1）に固定</span>
                <input
                  type="checkbox"
                  checked={circleLock}
                  onChange={(e) => setCircleLock(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              {/* 境界のぼかし（Feather）スライダー */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">境界のぼかし (Feather)</span>
                  <span className="font-mono text-zinc-400 font-semibold">{feather} px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={feather}
                  onChange={(e) => setFeather(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <span className="text-[10px] text-zinc-500">
                  {feather === 0
                    ? '0px: アンチエイリアスが効いた鮮明なエッジ'
                    : `${feather}px: 切り口が自然にフェードアウトする柔らかいエッジ`}
                </span>
              </div>

              {/* 余白トリミング（Tight Crop）トグル */}
              <label className="flex items-start gap-2.5 pt-2 border-t border-zinc-800/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tightTrim}
                  onChange={(e) => setTightTrim(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-zinc-200">
                    余白をトリミングして切り出す
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-0.5">
                    {tightTrim
                      ? 'ON: 選択範囲の大きさにキャンバスを縮小'
                      : 'OFF (推奨): アバター重ね合わせ座標（512x512）を完全維持'}
                  </span>
                </div>
              </label>
            </div>

            {/* ===== 選択枠のクイック操作 ===== */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/70 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
              >
                画像全体を選択
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/70 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
              >
                選択枠をクリア
              </button>
            </div>

            {/* 操作ガイドヒント */}
            <div className="mt-auto flex items-start gap-2 rounded-xl bg-zinc-950/60 p-3 border border-zinc-800/80 text-[11px] text-zinc-400">
              <Info className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
              <div>
                ドラッグで楕円作成、内側ドラッグで位置移動、周囲の白丸ハンドルでサイズ調整が可能です（Shiftキーで正円維持）。
              </div>
            </div>

            {/* ===== フッターアクション（決定 / キャンセル） ===== */}
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isApplying}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                disabled={isApplying}
                className="flex-[1.5] flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 active:scale-[0.98] transition disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isApplying ? '適用中...' : '切り抜きを反映'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
