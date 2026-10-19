import { useState, useCallback, useRef } from 'react';

export type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';

export interface EllipseBounds {
  /** 選択枠の左端座標 (px) */
  x: number;
  /** 選択枠の上端座標 (px) */
  y: number;
  /** 選択枠の幅 (px) */
  width: number;
  /** 選択枠の高さ (px) */
  height: number;
}

export interface EllipseGeometry {
  /** 中心X座標 */
  cx: number;
  /** 中心Y座標 */
  cy: number;
  /** X方向半径 */
  rx: number;
  /** Y方向半径 */
  ry: number;
}

export interface UseEllipseSelectionOptions {
  /** キャンバスの実幅 */
  canvasWidth: number;
  /** キャンバスの実高さ */
  canvasHeight: number;
  /** 正円（1:1）に固定するかどうか */
  lockCircle?: boolean;
  /** 最小許容半径 (px) */
  minRadius?: number;
}

/**
 * 境界ボックス (x, y, w, h) を中心と半径 (cx, cy, rx, ry) に変換
 */
export function boundsToGeometry(bounds: EllipseBounds): EllipseGeometry {
  const normX = bounds.width >= 0 ? bounds.x : bounds.x + bounds.width;
  const normY = bounds.height >= 0 ? bounds.y : bounds.y + bounds.height;
  const normW = Math.abs(bounds.width);
  const normH = Math.abs(bounds.height);

  return {
    cx: normX + normW / 2,
    cy: normY + normH / 2,
    rx: normW / 2,
    ry: normH / 2,
  };
}

/**
 * 中心と半径 (cx, cy, rx, ry) を境界ボックス (x, y, w, h) に変換
 */
export function geometryToBounds(geom: EllipseGeometry): EllipseBounds {
  return {
    x: geom.cx - geom.rx,
    y: geom.cy - geom.ry,
    width: geom.rx * 2,
    height: geom.ry * 2,
  };
}

/**
 * 指定した点 (px, py) が楕円の内側にあるかどうかを判定
 */
export function isPointInsideEllipse(px: number, py: number, geom: EllipseGeometry): boolean {
  if (geom.rx <= 0 || geom.ry <= 0) return false;
  const dx = px - geom.cx;
  const dy = py - geom.cy;
  return (dx * dx) / (geom.rx * geom.rx) + (dy * dy) / (geom.ry * geom.ry) <= 1;
}

/**
 * 各リサイズハンドルの位置を計算（境界ボックス基準）
 */
export function getHandlePositions(bounds: EllipseBounds): Record<ResizeHandle, { x: number; y: number }> {
  const normX = bounds.width >= 0 ? bounds.x : bounds.x + bounds.width;
  const normY = bounds.height >= 0 ? bounds.y : bounds.y + bounds.height;
  const normW = Math.abs(bounds.width);
  const normH = Math.abs(bounds.height);

  const left = normX;
  const midX = normX + normW / 2;
  const right = normX + normW;

  const top = normY;
  const midY = normY + normH / 2;
  const bottom = normY + normH;

  return {
    nw: { x: left, y: top },
    n: { x: midX, y: top },
    ne: { x: right, y: top },
    e: { x: right, y: midY },
    se: { x: right, y: bottom },
    s: { x: midX, y: bottom },
    sw: { x: left, y: bottom },
    w: { x: left, y: midY },
  };
}

/**
 * GIMP風の楕円選択ツール用カスタムフック
 * - ドラッグで新規楕円作成
 * - 内部ドラッグで位置移動
 * - 8方向のハンドルでサイズ・縦横比変更
 * - Shiftキーまたは lockCircle による1:1正円固定
 */
export function useEllipseSelection({
  canvasWidth,
  canvasHeight,
  lockCircle = false,
  minRadius = 4,
}: UseEllipseSelectionOptions) {
  const [bounds, setBounds] = useState<EllipseBounds | null>(null);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragMode, setDragMode] = useState<'create' | 'move' | 'resize' | null>(null);

  // ドラッグ追跡用参照
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialBounds: EllipseBounds | null;
    anchorX: number;
    anchorY: number;
  }>({
    startX: 0,
    startY: 0,
    initialBounds: null,
    anchorX: 0,
    anchorY: 0,
  });

  const geometry: EllipseGeometry | null = bounds ? boundsToGeometry(bounds) : null;

  // 指定座標がハンドルにヒットするか判定（許容誤差 tolerance: 画像座標系でのpx）
  const hitTestHandle = useCallback(
    (px: number, py: number, tolerance = 10): ResizeHandle | null => {
      if (!bounds) return null;
      const handles = getHandlePositions(bounds);
      const handleKeys = Object.keys(handles) as ResizeHandle[];

      for (const h of handleKeys) {
        const pt = handles[h];
        const dist = Math.hypot(px - pt.x, py - pt.y);
        if (dist <= tolerance) {
          return h;
        }
      }
      return null;
    },
    [bounds]
  );

  // マウス/タッチ開始時のハンドラ
  const startInteraction = useCallback(
    (px: number, py: number, shiftPressed = false, tolerance = 10) => {
      const isShiftOrLocked = shiftPressed || lockCircle;

      // 1. 既存のハンドルにヒットしたか？
      if (bounds) {
        const handle = hitTestHandle(px, py, tolerance);
        if (handle) {
          setActiveHandle(handle);
          setDragMode('resize');
          setIsDragging(true);

          // アンカー点（対角の固定点）の計算
          const normX = bounds.width >= 0 ? bounds.x : bounds.x + bounds.width;
          const normY = bounds.height >= 0 ? bounds.y : bounds.y + bounds.height;
          const normW = Math.abs(bounds.width);
          const normH = Math.abs(bounds.height);

          let anchorX = normX;
          let anchorY = normY;
          if (handle.includes('w')) anchorX = normX + normW;
          if (handle.includes('e')) anchorX = normX;
          if (handle.includes('n')) anchorY = normY + normH;
          if (handle.includes('s')) anchorY = normY;

          dragStartRef.current = {
            startX: px,
            startY: py,
            initialBounds: { ...bounds },
            anchorX,
            anchorY,
          };
          return;
        }

        // 2. 楕円の内側をクリックしたか？ -> 移動モード
        if (geometry && isPointInsideEllipse(px, py, geometry)) {
          setDragMode('move');
          setIsDragging(true);
          dragStartRef.current = {
            startX: px,
            startY: py,
            initialBounds: { ...bounds },
            anchorX: 0,
            anchorY: 0,
          };
          return;
        }
      }

      // 3. 選択枠の外側 -> 新規作成モード
      setDragMode('create');
      setIsDragging(true);
      setActiveHandle(null);
      dragStartRef.current = {
        startX: px,
        startY: py,
        initialBounds: null,
        anchorX: px,
        anchorY: py,
      };

      setBounds({
        x: px,
        y: py,
        width: 0,
        height: 0,
      });
    },
    [bounds, geometry, hitTestHandle, lockCircle]
  );

  // マウス/タッチ移動時のハンドラ
  const updateInteraction = useCallback(
    (px: number, py: number, shiftPressed = false) => {
      if (!isDragging || !dragMode) return;
      const isShiftOrLocked = shiftPressed || lockCircle;
      const { startX, startY, initialBounds, anchorX, anchorY } = dragStartRef.current;

      if (dragMode === 'create') {
        // 新規作成
        let dx = px - startX;
        let dy = py - startY;

        if (isShiftOrLocked) {
          const side = Math.max(Math.abs(dx), Math.abs(dy));
          dx = side * (dx >= 0 ? 1 : -1);
          dy = side * (dy >= 0 ? 1 : -1);
        }

        const left = dx >= 0 ? startX : startX + dx;
        const top = dy >= 0 ? startY : startY + dy;
        const w = Math.abs(dx);
        const h = Math.abs(dy);

        setBounds({
          x: left,
          y: top,
          width: w,
          height: h,
        });
      } else if (dragMode === 'move' && initialBounds) {
        // 移動
        const dx = px - startX;
        const dy = py - startY;

        let nextX = initialBounds.x + dx;
        let nextY = initialBounds.y + dy;

        // キャンバス境界内に優しくクランプ
        const w = initialBounds.width;
        const h = initialBounds.height;
        nextX = Math.max(-w / 2, Math.min(canvasWidth - w / 2, nextX));
        nextY = Math.max(-h / 2, Math.min(canvasHeight - h / 2, nextY));

        setBounds({
          x: nextX,
          y: nextY,
          width: w,
          height: h,
        });
      } else if (dragMode === 'resize' && activeHandle && initialBounds) {
        // リサイズ
        let left = Math.min(anchorX, px);
        let top = Math.min(anchorY, py);
        let width = Math.abs(px - anchorX);
        let height = Math.abs(py - anchorY);

        // 辺ハンドル（上下・左右）の場合は固定軸を維持
        if (activeHandle === 'n' || activeHandle === 's') {
          left = initialBounds.x;
          width = initialBounds.width;
        } else if (activeHandle === 'e' || activeHandle === 'w') {
          top = initialBounds.y;
          height = initialBounds.height;
        }

        if (isShiftOrLocked) {
          const side = Math.max(width, height);
          width = side;
          height = side;
          if (activeHandle.includes('w')) left = anchorX - side;
          if (activeHandle.includes('n')) top = anchorY - side;
        }

        width = Math.max(minRadius * 2, width);
        height = Math.max(minRadius * 2, height);

        setBounds({
          x: left,
          y: top,
          width,
          height,
        });
      }
    },
    [isDragging, dragMode, activeHandle, lockCircle, canvasWidth, canvasHeight, minRadius]
  );

  // マウス/タッチ終了時のハンドラ
  const endInteraction = useCallback(() => {
    setIsDragging(false);
    setDragMode(null);
    setActiveHandle(null);

    // 最小サイズ未満の場合はクリア
    setBounds((prev) => {
      if (!prev) return null;
      if (Math.abs(prev.width) < minRadius * 2 || Math.abs(prev.height) < minRadius * 2) {
        return null;
      }
      // 幅・高さを正の値に正規化
      const normX = prev.width >= 0 ? prev.x : prev.x + prev.width;
      const normY = prev.height >= 0 ? prev.y : prev.y + prev.height;
      return {
        x: normX,
        y: normY,
        width: Math.abs(prev.width),
        height: Math.abs(prev.height),
      };
    });
  }, [minRadius]);

  // 選択枠の全選択（画像全体をカバーする楕円）
  const selectAll = useCallback(() => {
    setBounds({
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
    });
  }, [canvasWidth, canvasHeight]);

  // 選択枠クリア
  const clearSelection = useCallback(() => {
    setBounds(null);
  }, []);

  return {
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
  };
}
