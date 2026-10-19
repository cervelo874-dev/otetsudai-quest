/**
 * 方法①：服（トップス・ボトムス・靴・独立手足）のシルエットに合わせた
 * 「素体・脚のはみ出し自動カッティング（シルエット・クリッピング）」エンジン
 *
 * - 装着中のトップス・ボトムス・靴の不透明シルエット（輪郭）を 512x512 ワールド座標系で解析し、
 *   首元や半袖の手先・スカート裾から出る脚など「見えるべき肌」は保護しつつ、
 *   服の輪郭から外側へ突き抜けてしまう素体（肩の上・脇腹・背中・腰・太もも・足先）を自動で透明化します。
 * - <AvatarRenderer /> のリアルタイムプレビューと PNG書き出し (composeAvatar.ts) の双方で共通利用します。
 */
import { useEffect, useState } from 'react';
import type {
  AvatarCategory,
  AvatarPart,
  EquippedParts,
  LayerAdjustment,
  OpaqueBounds,
  Point2D,
} from '../types';
import { AVATAR_CANVAS_SIZE, CATEGORY_META } from '../constants';
import { getLayerAdjustment, hasCustomAdjustment, resolvePartSrc } from './parts';
import type { SolvedAvatarRigResult } from './autoRigging';

const S = AVATAR_CANVAS_SIZE; // 512
const SILHOUETTE_ALPHA_THRESHOLD = 24;

/** 画像キャッシュ（DataURL / URL の再デコードを防ぎ、リアルタイム微調整時も高速に処理） */
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const MAX_IMAGE_CACHE_SIZE = 80;

export function loadCachedAvatarImage(src: string): Promise<HTMLImageElement> {
  const existing = imageCache.get(src);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => {
      imageCache.delete(src);
      reject(new Error(`パーツ画像の読み込みに失敗しました: ${src.slice(0, 64)}`));
    };
    img.src = src;
  });

  if (imageCache.size >= MAX_IMAGE_CACHE_SIZE) {
    const oldestKey = imageCache.keys().next().value;
    if (oldestKey) imageCache.delete(oldestKey);
  }
  imageCache.set(src, promise);
  return promise;
}

export interface SilhouetteProfile {
  bounds: OpaqueBounds;
  /** 各行 y (0..511) における不透明ピクセルの左端X（存在しない行は -1） */
  rowMinX: Int16Array;
  /** 各行 y (0..511) における不透明ピクセルの右端X（存在しない行は -1） */
  rowMaxX: Int16Array;
  /** 各列 x (0..511) における不透明ピクセルの上端Y（存在しない列は -1） */
  colMinY: Int16Array;
  /** 各列 x (0..511) における不透明ピクセルの下端Y（存在しない列は -1） */
  colMaxY: Int16Array;
  /** 512x512 RGBA ピクセル配列 */
  rgba: Uint8ClampedArray;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function asPartObject(val: EquippedParts[AvatarCategory]): AvatarPart | null {
  if (!val || typeof val === 'string') return null;
  return val;
}

function isHandOnlyPart(part: AvatarPart | null): boolean {
  if (!part) return false;
  if (part.meta?.isHandOnlySprite) return true;
  const b = part.rig?.bounds;
  return Boolean(b && b.width <= 90 && b.height <= 90);
}

/**
 * 指定レイヤーの画像を solvedRig の変形（および長袖二の腕マスク）を適用した状態で
 * 512x512 のワールド座標系キャンバスに描画する
 */
export function renderLayerToWorldCanvas(
  img: HTMLImageElement,
  category: AvatarCategory,
  adjustment: LayerAdjustment | undefined,
  customPivot?: Point2D,
  sleeveMask?: { cx: number; cy: number; radius: number },
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const pivot = customPivot ?? CATEGORY_META[category].pivot;
  ctx.save();
  if (adjustment && hasCustomAdjustment(adjustment)) {
    ctx.translate(pivot.x + adjustment.dx, pivot.y + adjustment.dy);
    ctx.rotate((adjustment.rotation * Math.PI) / 180);
    ctx.scale(adjustment.scale * (adjustment.flipX ? -1 : 1), adjustment.scale);
    ctx.translate(-pivot.x, -pivot.y);
  }
  ctx.drawImage(img, 0, 0, S, S);
  ctx.restore();

  if (sleeveMask) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(
      sleeveMask.cx,
      sleeveMask.cy,
      Math.max(1, sleeveMask.radius - 5),
      sleeveMask.cx,
      sleeveMask.cy,
      sleeveMask.radius + 7,
    );
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sleeveMask.cx, sleeveMask.cy, sleeveMask.radius + 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return canvas;
}

/**
 * 512x512 ワールド座標キャンバスから服・靴のシルエット輪郭プロファイルを抽出する
 */
export function extractSilhouetteProfile(worldCanvas: HTMLCanvasElement): SilhouetteProfile | null {
  const ctx = worldCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const { data } = ctx.getImageData(0, 0, S, S);

  const rawRowMinX = new Int16Array(S).fill(-1);
  const rawRowMaxX = new Int16Array(S).fill(-1);
  const rawColMinY = new Int16Array(S).fill(-1);
  const rawColMaxY = new Int16Array(S).fill(-1);

  let minX = S;
  let minY = S;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < S; y++) {
    const rowOffset = y * S * 4;
    let rMin = S;
    let rMax = -1;
    for (let x = 0; x < S; x++) {
      const a = data[rowOffset + x * 4 + 3];
      if (a >= SILHOUETTE_ALPHA_THRESHOLD) {
        if (x < rMin) rMin = x;
        if (x > rMax) rMax = x;
        if (rawColMinY[x] === -1 || y < rawColMinY[x]) rawColMinY[x] = y;
        if (y > rawColMaxY[x]) rawColMaxY[x] = y;
      }
    }
    if (rMax >= rMin) {
      rawRowMinX[y] = rMin;
      rawRowMaxX[y] = rMax;
      if (rMin < minX) minX = rMin;
      if (rMax > maxX) maxX = rMax;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;

  // 1pxの隙間やジャギーで誤判定しないよう前後1pxで軽くスムージング
  const rowMinX = new Int16Array(S).fill(-1);
  const rowMaxX = new Int16Array(S).fill(-1);
  for (let y = minY; y <= maxY; y++) {
    let l = rawRowMinX[y];
    let r = rawRowMaxX[y];
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny >= 0 && ny < S && rawRowMinX[ny] !== -1) {
        if (l === -1 || rawRowMinX[ny] < l) l = rawRowMinX[ny];
        if (r === -1 || rawRowMaxX[ny] > r) r = rawRowMaxX[ny];
      }
    }
    rowMinX[y] = l;
    rowMaxX[y] = r;
  }

  const colMinY = new Int16Array(S).fill(-1);
  const colMaxY = new Int16Array(S).fill(-1);
  for (let x = minX; x <= maxX; x++) {
    let t = rawColMinY[x];
    let b = rawColMaxY[x];
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      if (nx >= 0 && nx < S && rawColMinY[nx] !== -1) {
        if (t === -1 || rawColMinY[nx] < t) t = rawColMinY[nx];
        if (b === -1 || rawColMaxY[nx] > b) b = rawColMaxY[nx];
      }
    }
    colMinY[x] = t;
    colMaxY[x] = b;
  }

  const width = Math.max(1, maxX - minX + 1);
  const height = Math.max(1, maxY - minY + 1);

  return {
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      centerX: Math.round(minX + width / 2),
      centerY: Math.round(minY + height / 2),
    },
    rowMinX,
    rowMaxX,
    colMinY,
    colMaxY,
    rgba: data,
  };
}

/**
 * 素体画像の首周辺の最小横幅（首の左端X・右端X）を実測する
 * （首と肩の境界を正確に判別し、肩の上側のはみ出しだけをカットして首は100%保護するため）
 */
/**
 * 素体画像の頭部・顎ライン・首のくびれ・肩の開始位置を正確に検出する
 * - 頭部〜顎先〜頬の輪郭 (y <= shoulderStartY) は一切削らず 100% 保護する
 * - 首のくびれ位置 (chinBottomY) および肩の開始位置 (shoulderStartY) を実測する
 */
export interface HeadNeckAnatomy {
  chinBottomY: number;
  shoulderStartY: number;
  neckLeftX: number;
  neckRightX: number;
  neckMidX: number;
}

export function detectHeadAndChinAnatomy(
  bodyData: Uint8ClampedArray,
  neckX: number,
  neckY: number,
  leftShoulderY: number,
  rightShoulderY: number,
): HeadNeckAnatomy {
  const avgShoulderY = Math.round((leftShoulderY + rightShoulderY) / 2);

  // 1. 各行で中心 (neckX) 付近から左右に繋がっている頭・首・胴体の幅を実測
  const minSearchY = clamp(Math.round(neckY - 30), 0, S - 1);
  const maxSearchY = clamp(Math.round(avgShoulderY + 24), minSearchY + 10, S - 1);

  let minNeckWidth = 999;
  let minNeckRowY = Math.round(neckY);
  let bestNeckL = Math.round(neckX - 22);
  let bestNeckR = Math.round(neckX + 22);

  for (let y = minSearchY; y <= maxSearchY; y++) {
    const rowOffset = y * S * 4;
    let l = neckX;
    let r = neckX;

    // neckX から左へ走査（2px までの微細な隙間は許容）
    let gap = 0;
    for (let x = neckX; x >= Math.max(0, neckX - 140); x--) {
      if (bodyData[rowOffset + x * 4 + 3] >= SILHOUETTE_ALPHA_THRESHOLD) {
        l = x;
        gap = 0;
      } else {
        gap++;
        if (gap > 2) break;
      }
    }

    // neckX から右へ走査
    gap = 0;
    for (let x = neckX; x <= Math.min(S - 1, neckX + 140); x++) {
      if (bodyData[rowOffset + x * 4 + 3] >= SILHOUETTE_ALPHA_THRESHOLD) {
        r = x;
        gap = 0;
      } else {
        gap++;
        if (gap > 2) break;
      }
    }

    const width = r - l;
    if (width >= 16 && width < minNeckWidth) {
      minNeckWidth = width;
      minNeckRowY = y;
      bestNeckL = l;
      bestNeckR = r;
    }
  }

  // 顎の下端（chinBottomY）：首の最狭部から少し上、または顎の丸みライン
  // 肩の開始位置（shoulderStartY）：首のくびれが終わり、肩幅へと急激に広がり始めるY座標
  const chinBottomY = clamp(
    Math.max(minNeckRowY - 2, Math.round(neckY + 4), Math.round(avgShoulderY - 14)),
    minSearchY,
    maxSearchY,
  );
  const shoulderStartY = clamp(
    Math.max(minNeckRowY + 4, chinBottomY + 2, Math.round(avgShoulderY - 8)),
    chinBottomY + 1,
    S - 1,
  );

  return {
    chinBottomY,
    shoulderStartY,
    neckLeftX: clamp(bestNeckL, Math.round(neckX - 34), Math.round(neckX - 8)),
    neckRightX: clamp(bestNeckR, Math.round(neckX + 8), Math.round(neckX + 34)),
    neckMidX: Math.round((bestNeckL + bestNeckR) / 2),
  };
}

/**
 * カット境界の1px内側をなめらかにフェザー減衰させ、切り口のジャギーを防ぐ
 */
function softenCutBoundaries(data: Uint8ClampedArray, erasedMask: Uint8Array, yStart: number): void {
  const y0 = clamp(yStart, 1, S - 2);
  for (let y = y0; y < S - 1; y++) {
    const row = y * S;
    for (let x = 1; x < S - 1; x++) {
      const idx = row + x;
      if (erasedMask[idx]) continue;
      const aIdx = idx * 4 + 3;
      const alpha = data[aIdx];
      if (alpha === 0) continue;

      const erasedNeighbors =
        erasedMask[idx - 1] +
        erasedMask[idx + 1] +
        erasedMask[idx - S] +
        erasedMask[idx + S];
      if (erasedNeighbors >= 2) {
        data[aIdx] = Math.round(alpha * 0.45);
      } else if (erasedNeighbors === 1) {
        data[aIdx] = Math.round(alpha * 0.75);
      }
    }
  }
}

export interface ClippedWorldCanvases {
  body?: HTMLCanvasElement;
  leg_left?: HTMLCanvasElement;
  leg_right?: HTMLCanvasElement;
}

/**
 * 読み込み済みの画像マップと SolvedAvatarRigResult から、
 * 服（tops / bottoms / shoes）および独立手足のシルエットに合わせて
 * 素体 (body) と脚 (leg_left / leg_right) のはみ出しピクセルを自動カッティングした
 * 512x512 ワールド座標キャンバスを生成する
 */
export function buildClippedWorldCanvasesFromImages(
  images: Partial<Record<AvatarCategory, HTMLImageElement>>,
  equippedParts: EquippedParts,
  solved: SolvedAvatarRigResult,
  excludedLayers: Set<AvatarCategory> = new Set(),
): ClippedWorldCanvases {
  const clipMode = solved.activeBodyClipMode;
  if (clipMode === 'off') return {};

  const insetPx = solved.activeBodyClipInsetPx;
  const hasTops = Boolean(images.tops && !excludedLayers.has('tops'));
  const hasBottoms = Boolean(images.bottoms && !excludedLayers.has('bottoms'));
  const hasShoes = Boolean(images.shoes && !excludedLayers.has('shoes'));

  const armLPart = asPartObject(equippedParts.arm_left);
  const armRPart = asPartObject(equippedParts.arm_right);
  const hasFullArmLeft = Boolean(
    equippedParts.arm_left &&
      !excludedLayers.has('arm_left') &&
      !solved.autoHiddenLayers.has('arm_left') &&
      !isHandOnlyPart(armLPart),
  );
  const hasFullArmRight = Boolean(
    equippedParts.arm_right &&
      !excludedLayers.has('arm_right') &&
      !solved.autoHiddenLayers.has('arm_right') &&
      !isHandOnlyPart(armRPart),
  );
  const hasLegLeft = Boolean(equippedParts.leg_left && !excludedLayers.has('leg_left'));
  const hasLegRight = Boolean(equippedParts.leg_right && !excludedLayers.has('leg_right'));

  const topsProfile =
    hasTops && images.tops
      ? extractSilhouetteProfile(
          renderLayerToWorldCanvas(
            images.tops,
            'tops',
            getLayerAdjustment(solved.effectiveAdjustments, 'tops'),
            solved.customPivots.tops,
          ),
        )
      : null;

  const bottomsProfile =
    hasBottoms && images.bottoms
      ? extractSilhouetteProfile(
          renderLayerToWorldCanvas(
            images.bottoms,
            'bottoms',
            getLayerAdjustment(solved.effectiveAdjustments, 'bottoms'),
            solved.customPivots.bottoms,
          ),
        )
      : null;

  const shoesProfile =
    hasShoes && images.shoes
      ? extractSilhouetteProfile(
          renderLayerToWorldCanvas(
            images.shoes,
            'shoes',
            getLayerAdjustment(solved.effectiveAdjustments, 'shoes'),
            solved.customPivots.shoes,
          ),
        )
      : null;

  const result: ClippedWorldCanvases = {};
  const sockets = solved.worldBodySockets;
  const neckX = Math.round(sockets.neck.x);
  const neckY = Math.round(sockets.neck.y);

  // ==========================================================================
  // 1. 素体 (body) のはみ出し自動カッティング処理
  // ==========================================================================
  if (images.body && !excludedLayers.has('body')) {
    const bodyCanvas = renderLayerToWorldCanvas(
      images.body,
      'body',
      getLayerAdjustment(solved.effectiveAdjustments, 'body'),
      solved.customPivots.body,
    );
    const ctx = bodyCanvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      const imgData = ctx.getImageData(0, 0, S, S);
      const { data } = imgData;
      const erasedMask = new Uint8Array(S * S);

      // 頭部・顎・首・肩の解剖学的境界を正確に計測
      const anatomy = detectHeadAndChinAnatomy(
        data,
        neckX,
        neckY,
        sockets.leftShoulder.y,
        sockets.rightShoulder.y,
      );

      // 頭部・顔の輪郭・顎先の保護絶対ライン（これより上は一切削らない）
      const headProtectY = anatomy.chinBottomY;

          const isLongOrHiddenSleeves =
            clipMode === 'strict' ||
            solved.activeSleeveMode === 'hide_arms' ||
            solved.activeSleeveMode === 'long_sleeve_mask';

          const rightArmpitY = Math.round(sockets.rightShoulder.y + 24);
          const leftArmpitY = Math.round(sockets.leftShoulder.y + 24);
          const torsoRightCorridorMinX = Math.round(
            Math.min(
              sockets.rightShoulder.x - 14,
              (sockets.rightShoulder.x + sockets.rightHandGrip.x) * 0.52,
            ),
          );
          const torsoLeftCorridorMaxX = Math.round(
            Math.max(
              sockets.leftShoulder.x + 14,
              (sockets.leftShoulder.x + sockets.leftHandGrip.x) * 0.52,
            ),
          );

      // 素体の各行 y において、中心軸 (neckX) から左右に連続して繋がっている胴体（体幹・脇腹）の境界を実測
      // これにより「細い服を着せた際に服の細さ（tL / tR）より外側へはみ出た脇腹・胴体」を 100% 確実に特定し、
      // 隙間の外側にある「素体の腕」を傷つけることなく安全に保護できる
      const bodyTorsoL = new Int16Array(S).fill(-1);
      const bodyTorsoR = new Int16Array(S).fill(-1);

      // 腕と胴体の境界の安全上限（肩関節の内外ライン）
      const armSafetyOuterMinX = Math.round(
        Math.min(
          sockets.rightShoulder.x - 16,
          (sockets.rightShoulder.x + sockets.rightHandGrip.x) * 0.5,
        ),
      );
      const armSafetyOuterMaxX = Math.round(
        Math.max(
          sockets.leftShoulder.x + 16,
          (sockets.leftShoulder.x + sockets.leftHandGrip.x) * 0.5,
        ),
      );

      for (let y = headProtectY + 1; y < S; y++) {
        const rowOffset = y * S * 4;

        // 中心 neckX 付近の体幹アンカーピクセルを探索
        let anchorX = neckX;
        let hasAnchor = false;
        if (data[rowOffset + neckX * 4 + 3] >= SILHOUETTE_ALPHA_THRESHOLD) {
          hasAnchor = true;
        } else {
          for (let dx = 1; dx <= 24; dx++) {
            if (neckX - dx >= 0 && data[rowOffset + (neckX - dx) * 4 + 3] >= SILHOUETTE_ALPHA_THRESHOLD) {
              anchorX = neckX - dx;
              hasAnchor = true;
              break;
            }
            if (neckX + dx < S && data[rowOffset + (neckX + dx) * 4 + 3] >= SILHOUETTE_ALPHA_THRESHOLD) {
              anchorX = neckX + dx;
              hasAnchor = true;
              break;
            }
          }
        }

        if (!hasAnchor) continue;

        // 胴体左端（アバターの右脇腹）探索：anchorX から左へ
        let leftEdge = anchorX;
        let gap = 0;
        for (let x = anchorX; x >= 0; x--) {
          if (data[rowOffset + x * 4 + 3] >= SILHOUETTE_ALPHA_THRESHOLD) {
            leftEdge = x;
            gap = 0;
          } else {
            gap++;
            // 2px 以上の透明ギャップ（腕との間の空間）に到達したら胴体終了
            if (gap >= 2) break;
          }
        }
        // 腕と隙間なく繋がっている肩上部でのオーバーラン防止（腕の安全限界でクリップ）
        if (!hasFullArmRight && !isLongOrHiddenSleeves && y <= rightArmpitY) {
          leftEdge = Math.max(leftEdge, armSafetyOuterMinX);
        }
        bodyTorsoL[y] = leftEdge;

        // 胴体右端（アバターの左脇腹）探索：anchorX から右へ
        let rightEdge = anchorX;
        gap = 0;
        for (let x = anchorX; x < S; x++) {
          if (data[rowOffset + x * 4 + 3] >= SILHOUETTE_ALPHA_THRESHOLD) {
            rightEdge = x;
            gap = 0;
          } else {
            gap++;
            if (gap >= 2) break;
          }
        }
        if (!hasFullArmLeft && !isLongOrHiddenSleeves && y <= leftArmpitY) {
          rightEdge = Math.min(rightEdge, armSafetyOuterMaxX);
        }
        bodyTorsoR[y] = rightEdge;
      }

      // トップスの各行 y において、中心軸 (neckX) から左右に連続する「身頃（胴体）」の境界を実測
      // 袖（バルーンスリーブ・長袖・広がり袖）と身頃の間に透明な隙間（背景）がある服でも、
      // 身頃の細さ（ウエストの絞り）から横へはみ出た素体の脇腹・お腹・背中を確実に特定してカットする
      const topsTorsoL = new Int16Array(S).fill(-1);
      const topsTorsoR = new Int16Array(S).fill(-1);

      if (topsProfile) {
        const topsRgba = topsProfile.rgba;
        const tBounds = topsProfile.bounds;

        for (let y = tBounds.minY; y <= tBounds.maxY; y++) {
          const rowOffset = y * S * 4;

          // 中心 neckX 付近の身頃アンカーピクセルを探索
          let anchorX = neckX;
          let hasAnchor = false;
          if (topsRgba[rowOffset + neckX * 4 + 3] >= SILHOUETTE_ALPHA_THRESHOLD) {
            hasAnchor = true;
          } else {
            // Vネックや前開きなどに備え、左右 ±36px 探索
            for (let dx = 1; dx <= 36; dx++) {
              if (neckX - dx >= 0 && topsRgba[rowOffset + (neckX - dx) * 4 + 3] >= SILHOUETTE_ALPHA_THRESHOLD) {
                anchorX = neckX - dx;
                hasAnchor = true;
                break;
              }
              if (neckX + dx < S && topsRgba[rowOffset + (neckX + dx) * 4 + 3] >= SILHOUETTE_ALPHA_THRESHOLD) {
                anchorX = neckX + dx;
                hasAnchor = true;
                break;
              }
            }
          }

          if (!hasAnchor) {
            // 身頃アンカーが見つからない行は rowMinX / rowMaxX をフォールバック
            topsTorsoL[y] = topsProfile.rowMinX[y];
            topsTorsoR[y] = topsProfile.rowMaxX[y];
            continue;
          }

          // anchorX から左へ走査：身頃が途切れる（透明になる）位置を探索
          let leftEdge = anchorX;
          let gap = 0;
          for (let x = anchorX; x >= 0; x--) {
            if (topsRgba[rowOffset + x * 4 + 3] >= SILHOUETTE_ALPHA_THRESHOLD) {
              leftEdge = x;
              gap = 0;
            } else {
              gap++;
              // 3px 以上の透明ギャップ（身頃と袖の間の空間）に到達したら身頃終了
              if (gap >= 3) break;
            }
          }
          topsTorsoL[y] = leftEdge;

          // anchorX から右へ走査：身頃が途切れる（透明になる）位置を探索
          let rightEdge = anchorX;
          gap = 0;
          for (let x = anchorX; x < S; x++) {
            if (topsRgba[rowOffset + x * 4 + 3] >= SILHOUETTE_ALPHA_THRESHOLD) {
              rightEdge = x;
              gap = 0;
            } else {
              gap++;
              if (gap >= 3) break;
            }
          }
          topsTorsoR[y] = rightEdge;
        }
      }

          const erasePixel = (x: number, y: number) => {
            const idx = y * S + x;
            const aIdx = idx * 4 + 3;
            if (data[aIdx] > 0) {
              data[aIdx] = 0;
              erasedMask[idx] = 1;
            }
          };

          // (B) トップス着用時の素体（肩・胴体）はみ出しカッティング
          //     ※ y <= headProtectY（頭部・顔・顎・首の上端）は絶対に削らない
          if (topsProfile) {
            const tBounds = topsProfile.bounds;
            const yStart = Math.max(headProtectY + 1, tBounds.minY);
            const yEnd = tBounds.maxY;

            for (let y = yStart; y <= yEnd; y++) {
              const tL = topsProfile.rowMinX[y];
              const tR = topsProfile.rowMaxX[y];
              const torsoTL = topsTorsoL[y] !== -1 ? topsTorsoL[y] : tL;
              const torsoTR = topsTorsoR[y] !== -1 ? topsTorsoR[y] : tR;

              // スキャン範囲の設定：
              // 素体の胴体（体幹）が服の身頃の細さ（torsoTL / torsoTR）より外側にはみ出ている場合、
              // 胴体の端 (bodyTorsoL / bodyTorsoR) まで確実にスキャンして消去する。
              let scanMinX = 0;
              let scanMaxX = S - 1;

              if (!isLongOrHiddenSleeves) {
                if (!hasFullArmRight) {
                  const btl = bodyTorsoL[y];
                  scanMinX =
                    btl !== -1
                      ? btl
                      : y <= rightArmpitY
                        ? Math.max(0, (torsoTL !== -1 ? torsoTL : tBounds.minX) - 32)
                        : Math.min(torsoRightCorridorMinX, (torsoTL !== -1 ? torsoTL : tBounds.minX) - 48);
                }
                if (!hasFullArmLeft) {
                  const btr = bodyTorsoR[y];
                  scanMaxX =
                    btr !== -1
                      ? btr
                      : y <= leftArmpitY
                        ? Math.min(S - 1, (torsoTR !== -1 ? torsoTR : tBounds.maxX) + 32)
                        : Math.max(torsoLeftCorridorMaxX, (torsoTR !== -1 ? torsoTR : tBounds.maxX) + 48);
                }
              }

              for (let x = scanMinX; x <= scanMaxX; x++) {
                if (data[(y * S + x) * 4 + 3] === 0) continue;

                // 首元・胸元の中央コリドーは肌を残す（Vネック・襟元・鎖骨の抜けを防ぐ）
                const isInsideNeckColumn =
                  x >= anatomy.neckLeftX - 6 && x <= anatomy.neckRightX + 6;
                if (isInsideNeckColumn) {
                  continue;
                }

                // 1. 肩の傾斜ラインより上へ飛び出している素体の肩のみカット（空中の誤消去を防ぐため肩近傍に限定）
                const colTopY = topsProfile.colMinY[x];
                if (y <= Math.max(rightArmpitY, leftArmpitY)) {
                  if (colTopY !== -1 && y >= colTopY - 14 && y < colTopY + insetPx) {
                    erasePixel(x, y);
                    continue;
                  }
                }

                // 2. 身頃の細さに合わせたカット（袖と身頃の間に隙間がある服でも、身頃の細さに合わせて脇腹・お腹をカット）
                if (torsoTL !== -1 && torsoTR !== -1) {
                  const allowedTorsoL = torsoTL + insetPx;
                  const allowedTorsoR = torsoTR - insetPx;
                  const isBodyTorsoPixel =
                    bodyTorsoL[y] !== -1 &&
                    bodyTorsoR[y] !== -1 &&
                    x >= bodyTorsoL[y] &&
                    x <= bodyTorsoR[y];

                  if (isBodyTorsoPixel && (x < allowedTorsoL || x > allowedTorsoR)) {
                    erasePixel(x, y);
                    continue;
                  }
                }

                // 3. トップス全体の左右輪郭 [tL + insetPx, tR - insetPx] より外側へはみ出している素体をカット
                if (tL === -1 || tR === -1) {
                  continue;
                }

                const allowedL = tL + insetPx;
                const allowedR = tR - insetPx;
                if (x < allowedL || x > allowedR) {
                  erasePixel(x, y);
                }
              }
            }
          }

          // (C) 独立した腕パーツ装着時：素体自身の腕を消去（顔・顎にかかる上部は消去しない）
          if (hasFullArmRight) {
            const y0 = clamp(
              Math.max(headProtectY + 4, Math.round(sockets.rightShoulder.y - 2)),
              0,
              S - 1,
            );
            const y1 = clamp(
              Math.round(Math.max(sockets.rightHandGrip.y + 42, sockets.rightHip.y + 10)),
              y0,
              S - 1,
            );
            const xMax = clamp(Math.round(sockets.rightShoulder.x + 2), 0, S - 1);
            for (let y = y0; y <= y1; y++) {
              for (let x = 0; x <= xMax; x++) {
                erasePixel(x, y);
              }
            }
          }
          if (hasFullArmLeft) {
            const y0 = clamp(
              Math.max(headProtectY + 4, Math.round(sockets.leftShoulder.y - 2)),
              0,
              S - 1,
            );
            const y1 = clamp(
              Math.round(Math.max(sockets.leftHandGrip.y + 42, sockets.leftHip.y + 10)),
              y0,
              S - 1,
            );
            const xMin = clamp(Math.round(sockets.leftShoulder.x - 2), 0, S - 1);
            for (let y = y0; y <= y1; y++) {
              for (let x = xMin; x < S; x++) {
                erasePixel(x, y);
              }
            }
          }

          // (D) ボトムス着用時の素体（腰・お尻・太もも・股下）はみ出しカッティング
          if (bottomsProfile) {
            const bBounds = bottomsProfile.bounds;
            const yStart = clamp(
              topsProfile
                ? Math.min(bBounds.minY, topsProfile.bounds.maxY - 8)
                : Math.max(headProtectY + 24, bBounds.minY - 12),
              headProtectY + 1,
              S - 1,
            );
            const isLongBottoms =
              clipMode === 'strict' ||
              bBounds.maxY >= 420 ||
              (shoesProfile !== null && bBounds.maxY >= shoesProfile.bounds.minY - 8);
            const yEnd = isLongBottoms
              ? shoesProfile
                ? shoesProfile.bounds.minY + 12
                : S - 1
              : bBounds.maxY;

            for (let y = yStart; y <= yEnd; y++) {
              const bL = bottomsProfile.rowMinX[y];
              const bR = bottomsProfile.rowMaxX[y];
              const tL = topsTorsoL[y] !== -1 ? topsTorsoL[y] : (topsProfile ? topsProfile.rowMinX[y] : -1);
              const tR = topsTorsoR[y] !== -1 ? topsTorsoR[y] : (topsProfile ? topsProfile.rowMaxX[y] : -1);

              let rowL = bL;
              let rowR = bR;
              if (tL !== -1 && (rowL === -1 || tL < rowL)) rowL = tL;
              if (tR !== -1 && (rowR === -1 || tR > rowR)) rowR = tR;

              let scanMinX = 0;
              let scanMaxX = S - 1;
              if (clipMode !== 'strict' && !hasFullArmRight) {
                const btl = bodyTorsoL[y];
                scanMinX =
                  btl !== -1 ? btl : Math.min(torsoRightCorridorMinX, bBounds.minX - 48);
              }
              if (clipMode !== 'strict' && !hasFullArmLeft) {
                const btr = bodyTorsoR[y];
                scanMaxX =
                  btr !== -1 ? btr : Math.max(torsoLeftCorridorMaxX, bBounds.maxX + 48);
              }

              for (let x = Math.max(0, scanMinX); x <= Math.min(S - 1, scanMaxX); x++) {
                if (data[(y * S + x) * 4 + 3] === 0) continue;

                if (rowL === -1 || rowR === -1) {
                  erasePixel(x, y);
                  continue;
                }

                const allowedL = rowL + insetPx;
                const allowedR = rowR - insetPx;
                if (x < allowedL || x > allowedR) {
                  erasePixel(x, y);
                }
              }
            }
          }

      // (D) 独立した脚パーツ（leg_right / leg_left）装着時は、素体自身の脚が二重に見えないよう股関節から下を消去
      if (hasLegRight) {
        const hipCutY = clamp(
          Math.round(
            Math.min(
              sockets.rightHip.y - 6,
              bottomsProfile ? bottomsProfile.bounds.maxY - 12 : sockets.rightHip.y - 6,
            ),
          ),
          headProtectY,
          S - 1,
        );
        const xLimit = clamp(neckX + 6, 0, S - 1);
        for (let y = hipCutY; y < S; y++) {
          for (let x = 0; x <= xLimit; x++) {
            erasePixel(x, y);
          }
        }
      }
      if (hasLegLeft) {
        const hipCutY = clamp(
          Math.round(
            Math.min(
              sockets.leftHip.y - 6,
              bottomsProfile ? bottomsProfile.bounds.maxY - 12 : sockets.leftHip.y - 6,
            ),
          ),
          headProtectY,
          S - 1,
        );
        const xLimit = clamp(neckX - 6, 0, S - 1);
        for (let y = hipCutY; y < S; y++) {
          for (let x = xLimit; x < S; x++) {
            erasePixel(x, y);
          }
        }
      }

      // (E) 靴 (shoes) 着用時の素体足先のはみ出しカッティング
      if (shoesProfile) {
        const sBounds = shoesProfile.bounds;
        const yStart = clamp(sBounds.minY + 6, headProtectY, S - 1);
        for (let y = yStart; y < S; y++) {
          const sL = shoesProfile.rowMinX[y];
          const sR = shoesProfile.rowMaxX[y];
          for (let x = 0; x < S; x++) {
            if (data[(y * S + x) * 4 + 3] === 0) continue;
            if (y > sBounds.maxY - Math.max(1, insetPx) || sL === -1 || sR === -1) {
              erasePixel(x, y);
              continue;
            }
            if (x < sL + insetPx || x > sR - insetPx) {
              erasePixel(x, y);
              continue;
            }
            if (y >= sBounds.minY + 12) {
              const shoeAlpha = shoesProfile.rgba[(y * S + x) * 4 + 3];
              if (shoeAlpha < 180) {
                erasePixel(x, y);
              }
            }
          }
        }
      }

        softenCutBoundaries(data, erasedMask, headProtectY);
        ctx.putImageData(imgData, 0, 0);
        result.body = bodyCanvas;
      }
    }

  // ==========================================================================
  // 2. 独立脚パーツ (leg_left / leg_right) のボトムス・靴に対するはみ出しカッティング
  // ==========================================================================
  for (const legCat of ['leg_left', 'leg_right'] as const) {
    const legImg = images[legCat];
    if (!legImg || excludedLayers.has(legCat) || (!bottomsProfile && !shoesProfile)) {
      continue;
    }

    const legCanvas = renderLayerToWorldCanvas(
      legImg,
      legCat,
      getLayerAdjustment(solved.effectiveAdjustments, legCat),
      solved.customPivots[legCat],
    );
    const ctx = legCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;

    const imgData = ctx.getImageData(0, 0, S, S);
    const { data } = imgData;
    const erasedMask = new Uint8Array(S * S);

    const eraseLegPixel = (x: number, y: number) => {
      const idx = y * S + x;
      const aIdx = idx * 4 + 3;
      if (data[aIdx] > 0) {
        data[aIdx] = 0;
        erasedMask[idx] = 1;
      }
    };

    // ボトムスのウエストより上、またはボトムス上部からはみ出る脚の付け根をカット
    if (bottomsProfile) {
      const bBounds = bottomsProfile.bounds;
      const hipClipEndY = Math.round(bBounds.minY + bBounds.height * 0.78);
      for (let y = 0; y <= hipClipEndY; y++) {
        const bL = bottomsProfile.rowMinX[y];
        const bR = bottomsProfile.rowMaxX[y];
        for (let x = 0; x < S; x++) {
          if (data[(y * S + x) * 4 + 3] === 0) continue;
          if (y < bBounds.minY + 6 || bL === -1 || bR === -1) {
            eraseLegPixel(x, y);
            continue;
          }
          if (x < bL + insetPx || x > bR - insetPx) {
            eraseLegPixel(x, y);
          }
        }
      }
    }

    // 靴からはみ出る足先・かかと・足底をカット
    if (shoesProfile) {
      const sBounds = shoesProfile.bounds;
      const yStart = clamp(sBounds.minY + 6, 0, S - 1);
      for (let y = yStart; y < S; y++) {
        const sL = shoesProfile.rowMinX[y];
        const sR = shoesProfile.rowMaxX[y];
        for (let x = 0; x < S; x++) {
          if (data[(y * S + x) * 4 + 3] === 0) continue;
          if (y > sBounds.maxY - Math.max(1, insetPx) || sL === -1 || sR === -1) {
            eraseLegPixel(x, y);
            continue;
          }
          if (x < sL + insetPx || x > sR - insetPx) {
            eraseLegPixel(x, y);
            continue;
          }
          if (y >= sBounds.minY + 12) {
            const shoeAlpha = shoesProfile.rgba[(y * S + x) * 4 + 3];
            if (shoeAlpha < 180) {
              eraseLegPixel(x, y);
            }
          }
        }
      }
    }

    softenCutBoundaries(data, erasedMask, 1);
    ctx.putImageData(imgData, 0, 0);
    result[legCat] = legCanvas;
  }

  return result;
}

/**
 * <AvatarRenderer /> 用のリアルタイム・シルエットカッティング Hook
 * 装備パーツや位置・角度微調整が変わると、素体 (body) や脚 (leg_left / leg_right) の
 * はみ出し部分を自動カットした 512x512 DataURL を生成して返す
 */
export function useSilhouetteClippedSources(
  equippedParts: EquippedParts,
  solvedRig: SolvedAvatarRigResult,
  hiddenSet: Set<AvatarCategory>,
): Partial<Record<'body' | 'leg_left' | 'leg_right', string>> {
  const [clippedUrls, setClippedUrls] = useState<
    Partial<Record<'body' | 'leg_left' | 'leg_right', string>>
  >({});

  const bodySrc = hiddenSet.has('body') ? null : resolvePartSrc(equippedParts.body);
  const legLSrc = hiddenSet.has('leg_left') ? null : resolvePartSrc(equippedParts.leg_left);
  const legRSrc = hiddenSet.has('leg_right') ? null : resolvePartSrc(equippedParts.leg_right);
  const topsSrc = hiddenSet.has('tops') ? null : resolvePartSrc(equippedParts.tops);
  const bottomsSrc = hiddenSet.has('bottoms') ? null : resolvePartSrc(equippedParts.bottoms);
  const shoesSrc = hiddenSet.has('shoes') ? null : resolvePartSrc(equippedParts.shoes);
  const armLSrc = hiddenSet.has('arm_left') ? null : resolvePartSrc(equippedParts.arm_left);
  const armRSrc = hiddenSet.has('arm_right') ? null : resolvePartSrc(equippedParts.arm_right);

  const clipMode = solvedRig.activeBodyClipMode;
  const insetPx = solvedRig.activeBodyClipInsetPx;
  const activeSleeveMode = solvedRig.activeSleeveMode;

  const adjSignature = (['body', 'leg_left', 'leg_right', 'tops', 'bottoms', 'shoes'] as const)
    .map((cat) => {
      const a = getLayerAdjustment(solvedRig.effectiveAdjustments, cat);
      return `${cat}:${a.dx},${a.dy},${a.scale},${a.rotation},${a.flipX ? 1 : 0}`;
    })
    .join('|');

  useEffect(() => {
    if (clipMode === 'off') {
      setClippedUrls({});
      return;
    }
    if (!bodySrc && !legLSrc && !legRSrc) {
      setClippedUrls({});
      return;
    }
    if (!topsSrc && !bottomsSrc && !shoesSrc && !armLSrc && !armRSrc && !legLSrc && !legRSrc) {
      setClippedUrls({});
      return;
    }

    let cancelled = false;
    const timerId = window.setTimeout(async () => {
      try {
        const entriesToLoad: [AvatarCategory, string][] = [];
        if (bodySrc) entriesToLoad.push(['body', bodySrc]);
        if (legLSrc) entriesToLoad.push(['leg_left', legLSrc]);
        if (legRSrc) entriesToLoad.push(['leg_right', legRSrc]);
        if (topsSrc) entriesToLoad.push(['tops', topsSrc]);
        if (bottomsSrc) entriesToLoad.push(['bottoms', bottomsSrc]);
        if (shoesSrc) entriesToLoad.push(['shoes', shoesSrc]);

        const loadedPairs = await Promise.all(
          entriesToLoad.map(async ([cat, src]) => [cat, await loadCachedAvatarImage(src)] as const),
        );
        if (cancelled) return;

        const imageMap: Partial<Record<AvatarCategory, HTMLImageElement>> = {};
        for (const [cat, img] of loadedPairs) {
          imageMap[cat] = img;
        }

        const canvases = buildClippedWorldCanvasesFromImages(
          imageMap,
          equippedParts,
          solvedRig,
          hiddenSet,
        );
        if (cancelled) return;

        const nextUrls: Partial<Record<'body' | 'leg_left' | 'leg_right', string>> = {};
        if (canvases.body) nextUrls.body = canvases.body.toDataURL('image/png');
        if (canvases.leg_left) nextUrls.leg_left = canvases.leg_left.toDataURL('image/png');
        if (canvases.leg_right) nextUrls.leg_right = canvases.leg_right.toDataURL('image/png');
        setClippedUrls(nextUrls);
      } catch {
        if (!cancelled) {
          setClippedUrls({});
        }
      }
    }, 12);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [
    bodySrc,
    legLSrc,
    legRSrc,
    topsSrc,
    bottomsSrc,
    shoesSrc,
    armLSrc,
    armRSrc,
    clipMode,
    insetPx,
    activeSleeveMode,
    adjSignature,
    equippedParts,
    solvedRig,
    hiddenSet,
  ]);

  return clippedUrls;
}
