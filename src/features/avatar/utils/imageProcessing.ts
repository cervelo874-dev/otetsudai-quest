/**
 * スタジオ用：HTML5 Canvas ImageData によるクロマキー背景透過＆トランスフォーム計算
 */
import type { PartTransform } from '../types';
import { AVATAR_CANVAS_SIZE } from '../constants';

export interface ChromaKeyColor {
  r: number;
  g: number;
  b: number;
  /** 元画像上でスポイト取得したピクセル座標（繋がった領域のみ透過時のシード点） */
  seedX?: number;
  seedY?: number;
}

export interface ChromaKeySettings {
  /** 許容値 (0〜100) */
  tolerance: number;
  /** 境界ぼかし・フェザー (0〜50) */
  feather: number;
  /** 外周またはクリック地点から連続する背景領域のみを透過するか（白目などを保護） */
  contiguous: boolean;
  /** 境界の半透明ピクセルから背景色のにじみ（色かぶり）を除去するか */
  despill: boolean;
}

const MAX_RGB_DISTANCE = Math.sqrt(255 * 255 * 3); // 約441.67

export function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * 指定されたキー色リスト・許容値・フェザーに基づいて背景を透明化した新しい ImageData を返す
 */
export function processChromaKeyImageData(
  sourceData: ImageData,
  keyColors: ChromaKeyColor[],
  settings: ChromaKeySettings,
): ImageData {
  const { width, height } = sourceData;
  const output = new ImageData(new Uint8ClampedArray(sourceData.data), width, height);
  if (keyColors.length === 0) return output;

  const data = output.data;
  const totalPixels = width * height;
  const tolDist = (settings.tolerance / 100) * MAX_RGB_DISTANCE;
  const featherDist = Math.max(0.0001, (settings.feather / 100) * MAX_RGB_DISTANCE);
  const cutoffDist = tolDist + featherDist;

  // キー色の中に鮮やかなグリーンバック (#00FF00系) が含まれているか判定
  const hasPureGreenKey = keyColors.some((k) => k.g > 170 && k.g - Math.max(k.r, k.b) > 80);

  // 各ピクセルについて最も近いキー色との色空間距離を計算
  const minDistances = new Float32Array(totalPixels);
  const nearestKeyIndices = new Uint8Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];

    let bestDistSq = Infinity;
    let bestIndex = 0;
    for (let k = 0; k < keyColors.length; k++) {
      const key = keyColors[k];
      const dr = r - key.r;
      const dg = g - key.g;
      const db = b - key.b;
      const dSq = dr * dr + dg * dg + db * db;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIndex = k;
      }
    }
    let dist = Math.sqrt(bestDistSq);

    // JPEG圧縮やAI生成特有のグリーンバック色ムラ（少し暗めの緑や黄緑のモスキートノイズ）も綺麗に抜く補正
    if (hasPureGreenKey) {
      const greenDominance = g - Math.max(r, b);
      if (g > 110 && greenDominance > 55) {
        const chromaBoost = Math.min(45, (greenDominance - 55) * 0.45);
        dist = Math.max(0, dist - chromaBoost);
      }
    }

    minDistances[i] = dist;
    nearestKeyIndices[i] = bestIndex;
  }

  // 連続領域（Flood Fill）モードの場合、画像の四辺およびクリックしたシード点から繋がっている背景のみ対象にする
  let reachableMask: Uint8Array | null = null;
  if (settings.contiguous) {
    reachableMask = new Uint8Array(totalPixels);
    const stack = new Int32Array(totalPixels);
    let ptr = 0;

    const tryPush = (idx: number) => {
      if (reachableMask![idx] === 0 && minDistances[idx] < cutoffDist) {
        reachableMask![idx] = 1;
        stack[ptr++] = idx;
      }
    };

    // スポイトでクリックした座標をシードに追加
    for (const key of keyColors) {
      if (
        key.seedX !== undefined &&
        key.seedY !== undefined &&
        key.seedX >= 0 &&
        key.seedY >= 0 &&
        key.seedX < width &&
        key.seedY < height
      ) {
        tryPush(key.seedY * width + key.seedX);
      }
    }

    // 画像の外周ピクセルをシードに追加
    for (let x = 0; x < width; x++) {
      tryPush(x);
      tryPush((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
      tryPush(y * width);
      tryPush(y * width + (width - 1));
    }

    while (ptr > 0) {
      const curr = stack[--ptr];
      const cx = curr % width;
      if (cx > 0) tryPush(curr - 1);
      if (cx < width - 1) tryPush(curr + 1);
      if (curr >= width) tryPush(curr - width);
      if (curr < totalPixels - width) tryPush(curr + width);
    }
  }

  // アルファ値の減衰と境界のDespill（背景色かぶり除去）
  for (let i = 0; i < totalPixels; i++) {
    if (reachableMask && reachableMask[i] === 0) continue;

    const dist = minDistances[i];
    const offset = i * 4;

    if (dist >= cutoffDist) {
      // 完全不透明として残る境界付近のピクセルでも、グリーンバックの緑にじみがあれば抑える
      if (settings.despill && hasPureGreenKey && dist < cutoffDist + 45) {
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const maxRB = Math.max(r, b);
        if (g > maxRB + 12) {
          data[offset + 1] = Math.round(maxRB + 8);
        }
      }
      continue;
    }

    const alphaFactor = dist <= tolDist ? 0 : (dist - tolDist) / featherDist;

    if (alphaFactor <= 0) {
      data[offset + 3] = 0;
      continue;
    }

    if (settings.despill && alphaFactor > 0.05) {
      const key = keyColors[nearestKeyIndices[i]];
      data[offset] = Math.min(255, Math.max(0, (data[offset] - (1 - alphaFactor) * key.r) / alphaFactor));
      data[offset + 1] = Math.min(255, Math.max(0, (data[offset + 1] - (1 - alphaFactor) * key.g) / alphaFactor));
      data[offset + 2] = Math.min(255, Math.max(0, (data[offset + 2] - (1 - alphaFactor) * key.b) / alphaFactor));

      if (hasPureGreenKey) {
        const maxRB = Math.max(data[offset], data[offset + 2]);
        if (data[offset + 1] > maxRB) {
          data[offset + 1] = maxRB;
        }
      }
    }

    data[offset + 3] = Math.round(data[offset + 3] * alphaFactor);
  }

  return output;
}

/** 画像の四隅から背景色を自動推定する */
export function detectCornerBackgroundColors(imageData: ImageData): ChromaKeyColor[] {
  const { width, height, data } = imageData;
  if (width <= 0 || height <= 0) return [];
  const sampleSize = Math.max(1, Math.min(6, Math.floor(Math.min(width, height) / 20)));
  const corners: [number, number][] = [
    [0, 0],
    [Math.max(0, width - sampleSize), 0],
    [0, Math.max(0, height - sampleSize)],
    [Math.max(0, width - sampleSize), Math.max(0, height - sampleSize)],
  ];

  const detected: ChromaKeyColor[] = [];

  for (const [startX, startY] of corners) {
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let aSum = 0;
    let count = 0;

    for (let y = startY; y < Math.min(height, startY + sampleSize); y++) {
      for (let x = startX; x < Math.min(width, startX + sampleSize); x++) {
        const idx = (y * width + x) * 4;
        rSum += data[idx];
        gSum += data[idx + 1];
        bSum += data[idx + 2];
        aSum += data[idx + 3];
        count++;
      }
    }

    if (count === 0 || aSum / count < 20) continue; // すでに透明な隅はスキップ

    const candidate: ChromaKeyColor = {
      r: Math.round(rSum / count),
      g: Math.round(gSum / count),
      b: Math.round(bSum / count),
      seedX: startX,
      seedY: startY,
    };

    const isDuplicate = detected.some(
      (existing) =>
        Math.hypot(existing.r - candidate.r, existing.g - candidate.g, existing.b - candidate.b) < 32,
    );
    if (!isDuplicate) {
      detected.push(candidate);
    }
  }

  return detected;
}

export function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return { r: 0, g: 0, b: 0 };
  }
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/** 読み込んだ画像を512x512キャンバスへ程よく収める初期トランスフォームを計算 */
export function createInitialFitTransform(
  imageWidth: number,
  imageHeight: number,
  targetX = AVATAR_CANVAS_SIZE / 2,
  targetY = AVATAR_CANVAS_SIZE / 2,
  marginFactor = 0.75,
): PartTransform {
  const maxDim = Math.max(imageWidth, imageHeight, 1);
  const scale = Number(((AVATAR_CANVAS_SIZE / maxDim) * marginFactor).toFixed(3));
  return {
    x: targetX,
    y: targetY,
    scale: Math.max(0.05, Math.min(4, scale)),
    rotation: 0,
    flipX: false,
    flipY: false,
  };
}

/** 512x512 コンテキスト上に PartTransform を適用して画像を描画 */
export function drawPartWithTransform(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource & { width: number; height: number },
  transform: PartTransform,
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(transform.x, transform.y);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(
    transform.scale * (transform.flipX ? -1 : 1),
    transform.scale * (transform.flipY ? -1 : 1),
  );
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  ctx.restore();
}

/** 512x512 ステージ上の座標 (stageX, stageY) を元画像のピクセル座標へ逆変換 */
export function stagePointToSourcePixel(
  stageX: number,
  stageY: number,
  transform: PartTransform,
  sourceWidth: number,
  sourceHeight: number,
): { x: number; y: number } {
  const rad = (transform.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = stageX - transform.x;
  const dy = stageY - transform.y;

  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;

  const safeScale = Math.abs(transform.scale) < 1e-5 ? 1e-5 : transform.scale;
  const scaleX = safeScale * (transform.flipX ? -1 : 1);
  const scaleY = safeScale * (transform.flipY ? -1 : 1);

  return {
    x: localX / scaleX + sourceWidth / 2,
    y: localY / scaleY + sourceHeight / 2,
  };
}

/** 変形後のパーツ画像の四隅のステージ座標を取得（バウンディング枠描画用） */
export function getTransformedBoundingCorners(
  sourceWidth: number,
  sourceHeight: number,
  transform: PartTransform,
): { x: number; y: number }[] {
  const rad = (transform.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sx = transform.scale * (transform.flipX ? -1 : 1);
  const sy = transform.scale * (transform.flipY ? -1 : 1);

  const halfW = sourceWidth / 2;
  const halfH = sourceHeight / 2;

  const corners: [number, number][] = [
    [-halfW, -halfH],
    [halfW, -halfH],
    [halfW, halfH],
    [-halfW, halfH],
  ];

  return corners.map(([lx, ly]) => {
    const px = lx * sx;
    const py = ly * sy;
    return {
      x: px * cos - py * sin + transform.x,
      y: px * sin + py * cos + transform.y,
    };
  });
}
