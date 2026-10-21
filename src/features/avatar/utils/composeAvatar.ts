/**
 * アバター合成状態を1枚の透過PNG（DataURL / Blob）として出力するヘルパー関数群
 * 親子ソケット自動吸着 (Auto-Rigging)、長袖の二の腕マスク、および手動微調整をすべて完全再現します。
 */
import type {
  AvatarCategory,
  CropRect,
  EquippedParts,
  LayerAdjustment,
  LayerAdjustmentMap,
} from '../types';
import {
  AVATAR_CANVAS_SIZE,
  CATEGORY_META,
  FACE_CROP,
  FULL_CROP,
} from '../constants';
import {
  getEffectivePairAdjustment,
  getLayerAdjustment,
  getOrderedCharacterBodyLayers,
  hasCustomAdjustment,
  resolvePartSrc,
} from './parts';
import {
  solveAutoRigAdjustments,
} from './autoRigging';
import { buildClippedWorldCanvasesFromImages } from './silhouetteMasking';

export interface AvatarExportOptions {
  /** 出力画像のピクセルサイズ（正方形）。デフォルト: 512 */
  size?: number;
  /** 顔〜胸元にズームした顔アイコンモードで出力するか */
  faceOnly?: boolean;
  /** 円形にクリッピングするか（faceOnly=true の時はデフォルトで true） */
  circleClip?: boolean;
  /** 除外するレイヤー（例: 背景を除外したい場合は ['background']） */
  excludeLayers?: AvatarCategory[];
  /** カスタム切り抜き範囲（512座標系） */
  crop?: CropRect;
  /** クローゼットで設定した各レイヤーの位置・角度・サイズ微調整データ */
  adjustments?: LayerAdjustmentMap;
  /** 親子ソケットによる自動位置合わせを有効にするか（デフォルト: true） */
  autoRig?: boolean;
}

/** HTMLImageElementとして画像を読み込む（CORS匿名対応） */
export function loadAvatarImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`パーツ画像の読み込みに失敗しました: ${src.slice(0, 64)}`));
    img.src = src;
  });
}

/** Canvas 2D コンテキスト上に3層サンドイッチ用の「小さな指先チップ」を描画する */


/**
 * 現在のアバター合成状態を描画した HTMLCanvasElement を生成する
 */
export async function renderAvatarToCanvas(
  equippedParts: EquippedParts,
  options: AvatarExportOptions = {},
): Promise<HTMLCanvasElement> {
  const outputSize = options.size ?? AVATAR_CANVAS_SIZE;
  const faceOnly = Boolean(options.faceOnly);
  const activeCrop = options.crop ?? (faceOnly ? FACE_CROP : FULL_CROP);

  // 自動ソケット吸着の解決
  const solved = solveAutoRigAdjustments(
    equippedParts,
    options.adjustments,
    options.autoRig ?? true,
  );

  const excluded = new Set<AvatarCategory>([
    ...(options.excludeLayers ?? (faceOnly ? ['pet', 'front_effect'] : [])),
    ...Array.from(solved.autoHiddenLayers),
  ]);

  const orderedCategories: AvatarCategory[] =
    options.adjustments?.layerOrder ?? [
      'background',
      'back_effect',
      ...getOrderedCharacterBodyLayers(solved.effectiveAdjustments, solved.activeHandHoldMode),
      'pet',
      'front_effect',
    ];

  const activeLayers: { category: AvatarCategory; src: string }[] = [];
  for (const cat of orderedCategories) {
    if (excluded.has(cat)) continue;
    const src = resolvePartSrc(equippedParts[cat]);
    if (src) {
      activeLayers.push({ category: cat, src });
    }
  }

  const shoesPartVal = equippedParts.shoes;
  const shoesPartObj = typeof shoesPartVal === 'object' && shoesPartVal !== null ? shoesPartVal : null;
  const shoesPairData = !excluded.has('shoes') ? shoesPartObj?.pairParts : undefined;

  const [loadedImages, pairShoesImages] = await Promise.all([
    Promise.all(
      activeLayers.map(async (item) => ({
        category: item.category,
        img: await loadAvatarImage(item.src),
      })),
    ),
    shoesPairData
      ? Promise.all([
          loadAvatarImage(shoesPairData.leftSrc),
          loadAvatarImage(shoesPairData.rightSrc),
        ]).then(([left, right]) => ({ left, right }))
      : Promise.resolve(null),
  ]);

  const imageMap: Partial<Record<AvatarCategory, HTMLImageElement>> = {};
  for (const { category, img } of loadedImages) {
    imageMap[category] = img;
  }

  // 方法①：服・靴・独立手足のシルエットに合わせた素体 (body) と脚 (leg_left / leg_right) のはみ出し自動カッティング
  const clippedWorldCanvases = buildClippedWorldCanvasesFromImages(
    imageMap,
    equippedParts,
    solved,
    excluded,
  );

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context の取得に失敗しました');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const shouldCircleClip = options.circleClip ?? faceOnly;
  if (shouldCircleClip) {
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  const ratio = outputSize / activeCrop.size;
  ctx.setTransform(ratio, 0, 0, ratio, -activeCrop.x * ratio, -activeCrop.y * ratio);

  for (const { category, img } of loadedImages) {
    const clippedCanvas =
      category === 'body' || category === 'leg_left' || category === 'leg_right'
        ? clippedWorldCanvases[category]
        : undefined;

    if (clippedCanvas) {
      // すでにワールド座標系で変形＆シルエットカッティング済みのキャンバスをそのまま描画
      ctx.drawImage(clippedCanvas, 0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);
      continue;
    }

    const adj = getLayerAdjustment(solved.effectiveAdjustments, category);
    const pivot = solved.customPivots[category] ?? CATEGORY_META[category].pivot;

    // 靴カテゴリかつ左右ペア分割パーツ (pairParts) を持つ場合、左右別々に描画
    if (category === 'shoes' && pairShoesImages) {
      const rightAdj = getEffectivePairAdjustment(adj, 'right');
      const leftAdj = getEffectivePairAdjustment(adj, 'left');

      const drawShoe = (shoeImg: HTMLImageElement, shoeAdj: LayerAdjustment) => {
        ctx.save();
        ctx.translate(pivot.x + shoeAdj.dx, pivot.y + shoeAdj.dy);
        ctx.rotate((shoeAdj.rotation * Math.PI) / 180);
        ctx.scale(shoeAdj.scale * (shoeAdj.flipX ? -1 : 1), shoeAdj.scale);
        ctx.translate(-pivot.x, -pivot.y);
        ctx.drawImage(shoeImg, 0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);
        ctx.restore();
      };

      // 右足（向かって左）
      drawShoe(pairShoesImages.right, rightAdj);
      // 左足（向かって右）
      drawShoe(pairShoesImages.left, leftAdj);
      continue;
    }
    const sleeveMask =
      category === 'arm_left' || category === 'arm_right'
        ? solved.armSleeveMasks[category]
        : undefined;

    if (sleeveMask) {
      const off = document.createElement('canvas');
      off.width = AVATAR_CANVAS_SIZE;
      off.height = AVATAR_CANVAS_SIZE;
      const offCtx = off.getContext('2d');
      if (offCtx) {
        offCtx.save();
        offCtx.translate(pivot.x + adj.dx, pivot.y + adj.dy);
        offCtx.rotate((adj.rotation * Math.PI) / 180);
        offCtx.scale(adj.scale * (adj.flipX ? -1 : 1), adj.scale);
        offCtx.translate(-pivot.x, -pivot.y);
        offCtx.drawImage(img, 0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);
        offCtx.restore();

        offCtx.globalCompositeOperation = 'destination-out';
        const grad = offCtx.createRadialGradient(
          sleeveMask.cx,
          sleeveMask.cy,
          Math.max(1, sleeveMask.radius - 5),
          sleeveMask.cx,
          sleeveMask.cy,
          sleeveMask.radius + 7,
        );
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        offCtx.fillStyle = grad;
        offCtx.beginPath();
        offCtx.arc(sleeveMask.cx, sleeveMask.cy, sleeveMask.radius + 7, 0, Math.PI * 2);
        offCtx.fill();

        ctx.drawImage(off, 0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);
      }
    } else if (!hasCustomAdjustment(adj)) {
      ctx.drawImage(img, 0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);
    } else {
      ctx.save();
      ctx.translate(pivot.x + adj.dx, pivot.y + adj.dy);
      ctx.rotate((adj.rotation * Math.PI) / 180);
      ctx.scale(adj.scale * (adj.flipX ? -1 : 1), adj.scale);
      ctx.translate(-pivot.x, -pivot.y);
      ctx.drawImage(img, 0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);
      ctx.restore();
    }
  }

  return canvas;
}

/**
 * 現在のアバター合成状態を透過PNGの DataURL (string) として書き出す
 */
export async function exportAvatarAsDataURL(
  equippedParts: EquippedParts,
  options: AvatarExportOptions = {},
): Promise<string> {
  const canvas = await renderAvatarToCanvas(equippedParts, options);
  return canvas.toDataURL('image/png');
}

/**
 * 現在のアバター合成状態を透過PNGの Blob として書き出す（Supabase Storage へのアップロード等に最適）
 */
export async function exportAvatarAsBlob(
  equippedParts: EquippedParts,
  options: AvatarExportOptions = {},
): Promise<Blob> {
  const canvas = await renderAvatarToCanvas(equippedParts, options);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG Blob の生成に失敗しました'));
    }, 'image/png');
  });
}

/** DataURL をファイルとしてブラウザダウンロードする */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Blob をファイルとしてブラウザダウンロードする */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
