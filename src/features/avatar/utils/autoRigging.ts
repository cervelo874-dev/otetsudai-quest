/**
 * 自動サイズ正規化・輪郭ソケット自動検出・親子ソケット自動吸着エンジン (Auto-Rigging Engine)
 *
 * 1. 仕組み①: 透過PNGの「実体ピクセル領域 (OpaqueBounds)」を計測し、余白に関わらず3頭身の標準サイズ・基準位置へ自動スケーリング
 * 2. 仕組み③: 512x512キャンバス上の不透明シルエット輪郭をスキャンし、肩・手首・腰・股関節・足首・持ち手ソケットを自動検出
 * 3. 仕組み②: 着せ替え時に「親パーツのソケット → 子パーツの付け根」を連鎖計算し、どの服・腕・脚・靴・持ち物を組み合わせても自動で位置を合わせる
 */
import { AVATAR_LAYERS } from '../types';
import type {
  AvatarCategory,
  AvatarPart,
  BodyMaskStroke,
  BodySilhouetteClipMode,
  EquippedParts,
  HandHoldMode,
  ItemLayerPlacement,
  LayerAdjustment,
  LayerAdjustmentMap,
  OpaqueBounds,
  PartColorPalette,
  PartRigMetadata,
  PartTransform,
  Point2D,
  ReferenceAnchor,
  TopSleeveMode,
} from '../types';
import {
  AVATAR_CANVAS_SIZE,
  CATEGORY_META,
  DEFAULT_LAYER_ADJUSTMENT,
  DEFAULT_REFERENCE_ANCHORS,
} from '../constants';
import { HAND_SPRITE_PRESETS, normalizeGripHandPose } from '../assets/handSprites';
import { getLayerAdjustment, resolvePartSrc } from './parts';
import { hexToRgb, rgbToHex } from './imageProcessing';

const S = AVATAR_CANVAS_SIZE; // 512
const ALPHA_THRESHOLD = 22;

const round1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** デフォルトの肌色・主線色パレット（3頭身ちびキャラ素体の淡いピーチ肌＆こげ茶主線に完全一致） */
export const DEFAULT_PART_COLOR_PALETTE: PartColorPalette = {
  skinFill: '#FCE0CC',
  skinShade: '#F2C5A8',
  outlineColor: '#582E20',
};

/**
 * 既存の保存パーツで髪色や下着のベージュが混ざってオレンジ寄りになったパレットを
 * ちびキャラ素体の自然な淡い肌色へ補正する
 */
export function sanitizeChibiPalette(palette?: PartColorPalette): PartColorPalette {
  if (!palette) return DEFAULT_PART_COLOR_PALETTE;
  const rgb = hexToRgb(palette.skinFill);
  if (!rgb) return DEFAULT_PART_COLOR_PALETTE;
  // 茶髪やベージュ下着が混ざってB値やG値が下がっている場合はクリーンな素体肌色へ補正
  if (rgb.r < 240 || rgb.g < 214 || rgb.b < 194 || rgb.r - rgb.b > 56) {
    return DEFAULT_PART_COLOR_PALETTE;
  }
  return palette;
}

/**
 * 素体（または腕パーツ）の画像データから「ベース肌色」「肌の影色」「主線（アウトライン）色」を自動スポイト抽出する
 * ※茶髪やベージュのインナーが混ざらないよう、明るい淡いピーチ肌ピクセルのみを厳選抽出します。
 */
export function extractSkinAndOutlinePalette(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bounds: OpaqueBounds,
): PartColorPalette {
  let skinRSum = 0;
  let skinGSum = 0;
  let skinBSum = 0;
  let skinCount = 0;

  let lineRSum = 0;
  let lineGSum = 0;
  let lineBSum = 0;
  let lineCount = 0;

  // 顔の下半分〜腕の高さ（0.25〜0.65）をスキャンし、純粋な明るい肌色ピクセルのみを抽出
  const yStart = Math.max(0, Math.floor(bounds.minY + bounds.height * 0.25));
  const yEnd = Math.min(height - 1, Math.ceil(bounds.minY + bounds.height * 0.65));
  const xStart = Math.max(0, bounds.minX);
  const xEnd = Math.min(width - 1, bounds.maxX);

  for (let y = yStart; y <= yEnd; y += 2) {
    const row = y * width * 4;
    for (let x = xStart; x <= xEnd; x += 2) {
      const idx = row + x * 4;
      const a = data[idx + 3];
      if (a < 220) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // 主線（こげ茶〜黒）
      if (lum < 95 && r >= g) {
        lineRSum += r;
        lineGSum += g;
        lineBSum += b;
        lineCount++;
      } else if (
        r >= 242 &&
        g >= 214 &&
        b >= 194 &&
        r > g &&
        g > b &&
        r - b <= 56
      ) {
        // 茶髪やベージュ下着を除外した、純粋な明るいピーチ肌のみをカウント
        skinRSum += r;
        skinGSum += g;
        skinBSum += b;
        skinCount++;
      }
    }
  }

  const skinR = skinCount > 12 ? Math.round(skinRSum / skinCount) : 252;
  const skinG = skinCount > 12 ? Math.round(skinGSum / skinCount) : 224;
  const skinB = skinCount > 12 ? Math.round(skinBSum / skinCount) : 204;

  const shadeR = clamp(Math.round(skinR * 0.96), 0, 255);
  const shadeG = clamp(Math.round(skinG * 0.88), 0, 255);
  const shadeB = clamp(Math.round(skinB * 0.82), 0, 255);

  const lineR = lineCount > 8 ? Math.round(lineRSum / lineCount) : 88;
  const lineG = lineCount > 8 ? Math.round(lineGSum / lineCount) : 46;
  const lineB = lineCount > 8 ? Math.round(lineBSum / lineCount) : 32;

  return {
    skinFill: rgbToHex({ r: skinR, g: skinG, b: skinB }),
    skinShade: rgbToHex({ r: shadeR, g: shadeG, b: shadeB }),
    outlineColor: rgbToHex({ r: lineR, g: lineG, b: lineB }),
  };
}

// ============================================================================
// 仕組み①：実体ピクセル領域（OpaqueBounds）の検出と自動サイズ・位置正規化
// ============================================================================

/**
 * ImageData から不透明ピクセル（alpha >= threshold）の外接矩形と中心座標を計測する
 */
export function detectOpaqueBounds(
  imageData: ImageData,
  alphaThreshold = ALPHA_THRESHOLD,
): OpaqueBounds | null {
  const { width, height, data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const a = data[rowOffset + x * 4 + 3];
      if (a >= alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  const w = Math.max(1, maxX - minX + 1);
  const h = Math.max(1, maxY - minY + 1);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: w,
    height: h,
    centerX: round1(minX + w / 2),
    centerY: round1(minY + h / 2),
  };
}

/**
 * 透過処理後のパーツキャンバスから「実体ピクセルのサイズと中心」を計測し、
 * カテゴリごとの3頭身ターゲットサイズおよび目安ポイント（アンカー）へ
 * 自動でピタッと合わせる PartTransform を算出する
 */
export function computeAutoNormalizedTransform(
  compositedCanvas: HTMLCanvasElement,
  category: AvatarCategory,
  anchors: ReferenceAnchor[] = DEFAULT_REFERENCE_ANCHORS,
): PartTransform {
  const ctx = compositedCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { x: S / 2, y: S / 2, scale: 1, rotation: 0, flipX: false, flipY: false };
  }

  const imgData = ctx.getImageData(0, 0, compositedCanvas.width, compositedCanvas.height);
  const bounds = detectOpaqueBounds(imgData);
  const meta = CATEGORY_META[category];
  const spec = meta.targetSpec;

  // カテゴリの推奨アンカーがあればその座標、なければ defaultCenter を目標中心にする
  const matchedAnchor = meta.defaultAnchorId
    ? anchors.find((a) => a.id === meta.defaultAnchorId)
    : undefined;
  const targetCenterX = matchedAnchor ? matchedAnchor.x : spec.defaultCenter.x;
  const targetCenterY = matchedAnchor ? matchedAnchor.y : spec.defaultCenter.y;

  if (!bounds) {
    const fallbackScale = Math.min(S / compositedCanvas.width, S / compositedCanvas.height) * 0.75;
    return {
      x: targetCenterX,
      y: targetCenterY,
      scale: Number(fallbackScale.toFixed(3)),
      rotation: 0,
      flipX: false,
      flipY: false,
    };
  }

  // カテゴリ別の優先軸（幅・高さ・フィット）から最適な拡大縮小率を算出
  let scale = 1;
  if (spec.fitAxis === 'height') {
    scale = spec.targetHeight / bounds.height;
    // 横幅がキャンバスからはみ出しすぎる場合は上限を抑える
    if (bounds.width * scale > S * 0.92) {
      scale = (S * 0.92) / bounds.width;
    }
  } else if (spec.fitAxis === 'width') {
    scale = spec.targetWidth / bounds.width;
    if (bounds.height * scale > S * 0.92) {
      scale = (S * 0.92) / bounds.height;
    }
  } else {
    scale = Math.min(spec.targetWidth / bounds.width, spec.targetHeight / bounds.height);
  }

  scale = clamp(Number(scale.toFixed(4)), 0.05, 6);

  // 元画像の中心 (width/2, height/2) と、実体ピクセルの中心 (bounds.centerX, bounds.centerY) のズレを補正し、
  // 実体ピクセルの中心が targetCenter に一致するように transform.x, transform.y を決定する
  const imgCenterX = compositedCanvas.width / 2;
  const imgCenterY = compositedCanvas.height / 2;
  const offsetXFromImgCenter = (bounds.centerX - imgCenterX) * scale;
  const offsetYFromImgCenter = (bounds.centerY - imgCenterY) * scale;

  return {
    x: round1(targetCenterX - offsetXFromImgCenter),
    y: round1(targetCenterY - offsetYFromImgCenter),
    scale,
    rotation: 0,
    flipX: false,
    flipY: false,
  };
}

// ============================================================================
// 仕組み③：輪郭シルエット解析による「関節ソケット（接続ピン）」の自動検出
// ============================================================================

/**
 * 指定されたY範囲 [yStart, yEnd] における不透明ピクセルの左端・右端・中央Xを計測する
 */
function scanBandHorizontalExtents(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  yStart: number,
  yEnd: number,
): { leftX: number; leftY: number; rightX: number; rightY: number; midX: number } | null {
  const y0 = clamp(Math.floor(yStart), 0, height - 1);
  const y1 = clamp(Math.ceil(yEnd), y0, height - 1);

  let minX = width;
  let minYAtMinX = Math.round((y0 + y1) / 2);
  let maxX = -1;
  let maxYAtMaxX = Math.round((y0 + y1) / 2);

  for (let y = y0; y <= y1; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[row + x * 4 + 3] >= ALPHA_THRESHOLD) {
        if (x < minX) {
          minX = x;
          minYAtMinX = y;
        }
        if (x > maxX) {
          maxX = x;
          maxYAtMaxX = y;
        }
      }
    }
  }

  if (maxX < minX) return null;
  return {
    leftX: minX,
    leftY: minYAtMinX,
    rightX: maxX,
    rightY: maxYAtMaxX,
    midX: Math.round((minX + maxX) / 2),
  };
}

/**
 * 512x512 正規化済みパーツキャンバスを解析し、
 * カテゴリに応じた「自身の付け根 (attachPoint)」と「子パーツ接続ソケット (sockets)」を自動検出する
 */
export function analyzeNormalizedCanvasRig(
  normalized512Canvas: HTMLCanvasElement,
  category: AvatarCategory,
  existingSleeveMode?: TopSleeveMode,
): PartRigMetadata {
  const ctx = normalized512Canvas.getContext('2d', { willReadFrequently: true })!;
  const imgData = ctx.getImageData(0, 0, S, S);
  const bounds = detectOpaqueBounds(imgData) ?? {
    minX: 192,
    minY: 192,
    maxX: 320,
    maxY: 320,
    width: 128,
    height: 128,
    centerX: 256,
    centerY: 256,
  };

  const { data } = imgData;
  const rig: PartRigMetadata = {
    bounds,
    sockets: {},
  };

  switch (category) {
    case 'body': {
      // 素体（全身または頭＋胴体）：3頭身プロポーションに基づき首・肩・腰・股関節・左右の手のひらソケットを輪郭から自動検出
      const isFullBodyHeight = bounds.height >= 330;
      const neckRatio = isFullBodyHeight ? 0.42 : 0.54;
      const shoulderTopRatio = isFullBodyHeight ? 0.43 : 0.54;
      const shoulderBottomRatio = isFullBodyHeight ? 0.53 : 0.72;
      const hipRatio = isFullBodyHeight ? 0.68 : 0.92;

      const neckY = Math.round(bounds.minY + bounds.height * neckRatio);
      const shoulderY = Math.round(
        bounds.minY + bounds.height * ((shoulderTopRatio + shoulderBottomRatio) / 2),
      );
      const hipY = Math.round(bounds.minY + bounds.height * hipRatio);

      const neckBand = scanBandHorizontalExtents(
        data,
        S,
        S,
        bounds.minY + bounds.height * (neckRatio - 0.02),
        bounds.minY + bounds.height * (neckRatio + 0.05),
      );
      const hipBand = scanBandHorizontalExtents(
        data,
        S,
        S,
        hipY - 12,
        hipY + 12,
      );

      // 全身素体（腕が横に広がっているイラスト）の手のひら位置を自動検出
      const handsBand = scanBandHorizontalExtents(
        data,
        S,
        S,
        bounds.minY + bounds.height * 0.5,
        bounds.minY + bounds.height * 0.72,
      );

      const torsoHalfW = neckBand
        ? Math.max(28, Math.min(54, (neckBand.rightX - neckBand.leftX) * 0.68))
        : 38;

      const hasOutstretchedHands =
        handsBand !== null && handsBand.rightX - handsBand.leftX >= torsoHalfW * 2 + 45;

      // アバターにとっての右手（向かって左 X<256）と左手（向かって右 X>256）
      const rightHandGrip: Point2D = hasOutstretchedHands
        ? {
            x: Math.round(handsBand.leftX + 18),
            y: Math.round(handsBand.leftY - 2),
          }
        : {
            x: Math.round(bounds.centerX - torsoHalfW - 36),
            y: Math.round(shoulderY + 56),
          };

      const leftHandGrip: Point2D = hasOutstretchedHands
        ? {
            x: Math.round(handsBand.rightX - 18),
            y: Math.round(handsBand.rightY - 2),
          }
        : {
            x: Math.round(bounds.centerX + torsoHalfW + 36),
            y: Math.round(shoulderY + 56),
          };

      // 足首・足元の検出（靴や足先とのスナップ用）
      const ankleRatio = isFullBodyHeight ? 0.9 : 0.94;
      const ankleY = Math.round(bounds.minY + bounds.height * ankleRatio);
      const ankleBand = isFullBodyHeight
        ? scanBandHorizontalExtents(
            data,
            S,
            S,
            ankleY - 8,
            ankleY + 8,
          )
        : null;

      const rightAnkle: Point2D = ankleBand
        ? {
            x: Math.round(ankleBand.midX - Math.min(32, (ankleBand.rightX - ankleBand.leftX) * 0.28)),
            y: ankleY,
          }
        : {
            x: Math.round(bounds.centerX - 22),
            y: ankleY,
          };

      const leftAnkle: Point2D = ankleBand
        ? {
            x: Math.round(ankleBand.midX + Math.min(32, (ankleBand.rightX - ankleBand.leftX) * 0.28)),
            y: ankleY,
          }
        : {
            x: Math.round(bounds.centerX + 22),
            y: ankleY,
          };

      const feet: Point2D = {
        x: Math.round(bounds.centerX),
        y: Math.round(bounds.maxY - 6),
      };

      rig.colorPalette = extractSkinAndOutlinePalette(data, S, S, bounds);
      rig.sockets = {
        neck: { x: Math.round(bounds.centerX), y: neckY },
        rightShoulder: {
          x: Math.round(bounds.centerX - torsoHalfW),
          y: shoulderY,
        },
        leftShoulder: {
          x: Math.round(bounds.centerX + torsoHalfW),
          y: shoulderY,
        },
        waist: { x: Math.round(bounds.centerX), y: hipY - 10 },
        rightHip: {
          x: hipBand
            ? Math.round(hipBand.midX - Math.min(34, (hipBand.rightX - hipBand.leftX) * 0.24))
            : Math.round(bounds.centerX - 24),
          y: hipY,
        },
        leftHip: {
          x: hipBand
            ? Math.round(hipBand.midX + Math.min(34, (hipBand.rightX - hipBand.leftX) * 0.24))
            : Math.round(bounds.centerX + 24),
          y: hipY,
        },
        leftHandGrip,
        rightHandGrip,
        handGrip: rightHandGrip,
        rightAnkle,
        leftAnkle,
        feet,
      };
      break;
    }

    case 'tops': {
      // トップス：襟元 (attachPoint/neck)、肩ソケット(向かって左: rightShoulder, 向かって右: leftShoulder)、袖口(rightCuff, leftCuff)、腰ソケットを輪郭から自動検出
      const topBand = scanBandHorizontalExtents(
        data,
        S,
        S,
        bounds.minY,
        bounds.minY + bounds.height * 0.18,
      );
      const sleeveBand = scanBandHorizontalExtents(
        data,
        S,
        S,
        bounds.minY + bounds.height * 0.12,
        bounds.minY + bounds.height * 0.58,
      );

      // 横幅が広い（袖が左右に大きく広がっている）場合は自動で長袖マスクモードを推奨
      const autoSleeveMode: TopSleeveMode =
        existingSleeveMode ??
        (bounds.width >= 158 ? 'long_sleeve_mask' : 'short_or_sleeveless');

      rig.sleeveMode = autoSleeveMode;
      rig.sleeveMaskRadius = 54;
      rig.attachPoint = {
        x: topBand ? topBand.midX : Math.round(bounds.centerX),
        y: Math.round(bounds.minY + 10),
      };

      // 服の肩ソケットは、袖先ではなく胴体幅の目安（素体の肩幅にフィットする適正位置）
      const approxShoulderHalfW = Math.max(26, Math.min(52, bounds.width * 0.28));
      const shoulderY = Math.round(bounds.minY + bounds.height * 0.24);

      rig.sockets = {
        neck: { ...rig.attachPoint },
        rightShoulder: {
          x: Math.round(bounds.centerX - approxShoulderHalfW),
          y: shoulderY,
        },
        leftShoulder: {
          x: Math.round(bounds.centerX + approxShoulderHalfW),
          y: shoulderY,
        },
        rightCuff: {
          x: sleeveBand ? sleeveBand.leftX + 10 : Math.round(bounds.minX + 12),
          y: sleeveBand ? sleeveBand.leftY : shoulderY + 24,
        },
        leftCuff: {
          x: sleeveBand ? sleeveBand.rightX - 10 : Math.round(bounds.maxX - 12),
          y: sleeveBand ? sleeveBand.rightY : shoulderY + 24,
        },
        waist: {
          x: Math.round(bounds.centerX),
          y: Math.round(bounds.maxY - 12),
        },
      };
      break;
    }

    case 'arm_left': {
      // 手首のみの小パーツ（ハンドスプライト単体）の場合は中心を接続点・回転軸にする
      if (bounds.height <= 90 && bounds.width <= 90) {
        const cx = Math.round(bounds.centerX);
        const cy = Math.round(bounds.centerY);
        rig.colorPalette = extractSkinAndOutlinePalette(data, S, S, bounds);
        rig.attachPoint = { x: cx, y: cy };
        rig.sockets = { handGrip: { x: cx, y: cy } };
        break;
      }
      // アバターの左腕・手（向かって右側）：上端の体側（画面左寄り）を肩の付け根 attachPoint、下端（先端側）を手のひら handGrip として自動検出
      const upperBand = scanBandHorizontalExtents(
        data,
        S,
        S,
        bounds.minY,
        bounds.minY + bounds.height * 0.28,
      );
      const lowerBand = scanBandHorizontalExtents(
        data,
        S,
        S,
        bounds.maxY - bounds.height * 0.28,
        bounds.maxY,
      );
      rig.colorPalette = extractSkinAndOutlinePalette(data, S, S, bounds);
      rig.attachPoint = {
        x: upperBand ? Math.round((upperBand.midX + upperBand.leftX) / 2) : Math.round(bounds.minX + 10),
        y: Math.round(bounds.minY + 12),
      };
      rig.sockets = {
        handGrip: {
          x: lowerBand ? lowerBand.midX : Math.round(bounds.maxX - 14),
          y: Math.round(bounds.maxY - 14),
        },
      };
      break;
    }

    case 'arm_right': {
      // 手首のみの小パーツ（ハンドスプライト単体）の場合は中心を接続点・回転軸にする
      if (bounds.height <= 90 && bounds.width <= 90) {
        const cx = Math.round(bounds.centerX);
        const cy = Math.round(bounds.centerY);
        rig.colorPalette = extractSkinAndOutlinePalette(data, S, S, bounds);
        rig.attachPoint = { x: cx, y: cy };
        rig.sockets = { handGrip: { x: cx, y: cy } };
        break;
      }
      // アバターの右腕・手（向かって左側）：上端の体側（画面右寄り）を肩の付け根 attachPoint、下端（先端側）を手のひら handGrip として自動検出
      const upperBand = scanBandHorizontalExtents(
        data,
        S,
        S,
        bounds.minY,
        bounds.minY + bounds.height * 0.28,
      );
      const lowerBand = scanBandHorizontalExtents(
        data,
        S,
        S,
        bounds.maxY - bounds.height * 0.28,
        bounds.maxY,
      );
      rig.colorPalette = extractSkinAndOutlinePalette(data, S, S, bounds);
      rig.attachPoint = {
        x: upperBand ? Math.round((upperBand.midX + upperBand.rightX) / 2) : Math.round(bounds.maxX - 10),
        y: Math.round(bounds.minY + 12),
      };
      rig.sockets = {
        handGrip: {
          x: lowerBand ? lowerBand.midX : Math.round(bounds.minX + 14),
          y: Math.round(bounds.maxY - 14),
        },
      };
      break;
    }

    case 'bottoms': {
      // ボトムス：上端中心を腰 attachPoint/waist、下端左右を裾口 (rightCuff, leftCuff) として自動検出（ヒップ関節ではない！）
      const bottomBand = scanBandHorizontalExtents(
        data,
        S,
        S,
        bounds.maxY - bounds.height * 0.3,
        bounds.maxY,
      );
      const span = bottomBand ? bottomBand.rightX - bottomBand.leftX : bounds.width;
      const midX = bottomBand ? bottomBand.midX : bounds.centerX;
      rig.attachPoint = {
        x: Math.round(bounds.centerX),
        y: Math.round(bounds.minY + 10),
      };
      rig.sockets = {
        waist: { ...rig.attachPoint },
        rightCuff: {
          x: Math.round(midX - Math.max(16, span * 0.24)),
          y: Math.round(bounds.maxY - 10),
        },
        leftCuff: {
          x: Math.round(midX + Math.max(16, span * 0.24)),
          y: Math.round(bounds.maxY - 10),
        },
      };
      break;
    }

    case 'leg_left':
    case 'leg_right': {
      // 左脚・右脚：上端中心を股関節 attachPoint、下端中心を足首 ankle ソケットとして自動検出
      const topBand = scanBandHorizontalExtents(
        data,
        S,
        S,
        bounds.minY,
        bounds.minY + bounds.height * 0.25,
      );
      const ankleBand = scanBandHorizontalExtents(
        data,
        S,
        S,
        bounds.maxY - bounds.height * 0.25,
        bounds.maxY,
      );
      rig.attachPoint = {
        x: topBand ? topBand.midX : Math.round(bounds.centerX),
        y: Math.round(bounds.minY + 10),
      };
      rig.sockets = {
        ankle: {
          x: ankleBand ? ankleBand.midX : Math.round(bounds.centerX),
          y: Math.round(bounds.maxY - 10),
        },
      };
      break;
    }

    case 'shoes': {
      // 靴：上端中心を履き口 attachPoint として検出
      rig.attachPoint = {
        x: Math.round(bounds.centerX),
        y: Math.round(bounds.minY + 10),
      };
      break;
    }

    case 'hand_item': {
      // 持ち物（剣・ステッキ等）：下部 65% 付近の実体中心を持ち手（グリップ attachPoint）として自動検出
      const gripY = Math.round(bounds.minY + bounds.height * 0.65);
      const gripBand = scanBandHorizontalExtents(
        data,
        S,
        S,
        gripY - bounds.height * 0.1,
        gripY + bounds.height * 0.1,
      );
      rig.attachPoint = {
        x: gripBand ? gripBand.midX : Math.round(bounds.centerX),
        y: gripY,
      };
      rig.handHoldMode = 'grip_fist';
      rig.naturalTiltDeg = 18;
      break;
    }

    default: {
      rig.attachPoint = {
        x: Math.round(bounds.centerX),
        y: Math.round(bounds.centerY),
      };
      break;
    }
  }

  return rig;
}

// ============================================================================
// 仕組み②：着せ替え時の「親子ソケット自動吸着＆自動握り手＆長袖二の腕マスク」解決エンジン
// ============================================================================

export interface SolvedHandGripFist {
  /** 512座標系での指先チップの中心X */
  x: number;
  /** 512座標系での指先チップの中心Y */
  y: number;
  /** 指先チップの回転角度（度） */
  rotation: number;
  /** 指先チップのスケール倍率 */
  scale: number;
  /** 指先チップの基準描画サイズ（512座標系でのpx。ちびキャラの指先サイズに合わせた22px） */
  baseSize: number;
  /** 左右反転 */
  flipX: boolean;
  /** 上下反転 */
  flipY: boolean;
  /** 右手（画面右）か左手（画面左）か */
  side: 'right' | 'left';
  /** 選択中の指先チップ種別 */
  pose: 'chibi_single' | 'chibi_double' | 'body_clone';
  /** 素体から自動抽出した肌色・主線色パレット */
  palette: PartColorPalette;
  /** body_clone（素体の手先ピクセル直接コピー）用の元画像URL */
  sourceHandSrc: string | null;
  /** body_clone用の元レイヤーカテゴリ */
  sourceHandCategory: 'body' | 'arm_left' | 'arm_right';
}

/** 解決された持ち物（単数・複数対応） */
export interface SolvedHandItem {
  part: AvatarPart;
  effectiveAdjustment: LayerAdjustment;
  customPivot?: Point2D;
  handGripFist: SolvedHandGripFist | null;
  /** 上下にふわふわ浮遊動（ボビング）するか */
  isBobbing: boolean;
  /** アイテムごとのレイヤー階層（前後順） */
  layerPlacement: ItemLayerPlacement;
}

export interface SolvedWorldBodySockets {
  neck: Point2D;
  waist: Point2D;
  rightShoulder: Point2D;
  leftShoulder: Point2D;
  rightHip: Point2D;
  leftHip: Point2D;
  rightHandGrip: Point2D;
  leftHandGrip: Point2D;
  rightAnkle?: Point2D;
  leftAnkle?: Point2D;
  feet?: Point2D;
}

export interface SolvedAvatarRigResult {
  /** 自動吸着＋手動微調整を合成した最終的な各レイヤーの変形マップ */
  effectiveAdjustments: LayerAdjustmentMap;
  /** 自動吸着によって算出された純粋な自動オフセット量（UI表示用） */
  autoOffsets: Partial<Record<AvatarCategory, { dx: number; dy: number; connectedTo: string }>>;
  /** 各レイヤーのカスタム回転ピボット座標（手首単体パーツなどをその場で回転させるため） */
  customPivots: Partial<Record<AvatarCategory, Point2D>>;
  /** 長袖モード（hide_arms）によって自動非表示になったレイヤー集合 */
  autoHiddenLayers: Set<AvatarCategory>;
  /**
   * 長袖マスクモード（long_sleeve_mask）時に、素肌の二の腕が長袖の上にはみ出ないよう
   * 肩ソケット周辺を切り抜くマスク円（512座標系）
   */
  armSleeveMasks: Partial<
    Record<'arm_left' | 'arm_right', { cx: number; cy: number; radius: number }>
  >;
  /**
   * 持ち物の柄の手前に重ねる「小さな指先チップ（3層サンドイッチ用）」の解決パラメータ（単一・メイン用）
   */
  handGripFist: SolvedHandGripFist | null;
  /** 複数持ち物の解決済みリスト */
  solvedHandItems: SolvedHandItem[];
  /** 解決された現在の持ち方モード */
  activeHandHoldMode: HandHoldMode;
  /** 解決された現在のトップスの袖モード */
  activeSleeveMode: TopSleeveMode;
  /** 解決された「素体・脚のはみ出し自動カッティング」モード */
  activeBodyClipMode: BodySilhouetteClipMode;
  /** 素体カッティング時の服輪郭からの内側食い込み幅 (px) */
  activeBodyClipInsetPx: number;
  /** 手描きで追加された素体マスク（消しゴム・復元ブラシ）ストローク配列 */
  activeBodyMaskStrokes: BodyMaskStroke[];
  /** 素体のワールドソケット座標（シルエットカッティング用） */
  worldBodySockets: SolvedWorldBodySockets;
}

function asPartObject(val: EquippedParts[AvatarCategory]): AvatarPart | null {
  if (!val) return null;
  if (typeof val === 'string') {
    return {
      id: val,
      category: 'hand_item',
      name: '持ち物',
      src: val,
    };
  }
  return val;
}

function isHandOnlyPart(part: AvatarPart | null): boolean {
  if (!part) return false;
  if (part.meta?.isHandOnlySprite) return true;
  const b = part.rig?.bounds;
  return Boolean(b && b.width <= 90 && b.height <= 90);
}

/**
 * 旧バージョン（画面向かって左＝left、向かって右＝right）で保存されたパーツのソケット座標を
 * アバター本人基準（アバターの右＝向かって左 X<256、アバターの左＝向かって右 X>256）へ自動補正する
 */
export function normalizeAnatomicalSockets(
  sockets?: PartRigMetadata['sockets'],
): PartRigMetadata['sockets'] | undefined {
  if (!sockets) return undefined;
  const normalized: NonNullable<PartRigMetadata['sockets']> = { ...sockets };

  if (
    normalized.leftShoulder &&
    normalized.rightShoulder &&
    normalized.leftShoulder.x < normalized.rightShoulder.x
  ) {
    const tmp = normalized.leftShoulder;
    normalized.leftShoulder = normalized.rightShoulder;
    normalized.rightShoulder = tmp;
  }

  if (
    normalized.leftHip &&
    normalized.rightHip &&
    normalized.leftHip.x < normalized.rightHip.x
  ) {
    const tmp = normalized.leftHip;
    normalized.leftHip = normalized.rightHip;
    normalized.rightHip = tmp;
  }

  if (
    normalized.leftHandGrip &&
    normalized.rightHandGrip &&
    normalized.leftHandGrip.x < normalized.rightHandGrip.x
  ) {
    const tmp = normalized.leftHandGrip;
    normalized.leftHandGrip = normalized.rightHandGrip;
    normalized.rightHandGrip = tmp;
    normalized.handGrip = normalized.rightHandGrip;
  }

  if (
    normalized.leftAnkle &&
    normalized.rightAnkle &&
    normalized.leftAnkle.x < normalized.rightAnkle.x
  ) {
    const tmp = normalized.leftAnkle;
    normalized.leftAnkle = normalized.rightAnkle;
    normalized.rightAnkle = tmp;
  }

  if (
    normalized.leftCuff &&
    normalized.rightCuff &&
    normalized.leftCuff.x < normalized.rightCuff.x
  ) {
    const tmp = normalized.leftCuff;
    normalized.leftCuff = normalized.rightCuff;
    normalized.rightCuff = tmp;
  }

  return normalized;
}

/**
 * 装備中の全パーツの `rig`（ソケット＆付け根座標）を読み取り、
 * どの服・どの腕・どの脚・どの靴・どの持ち物を組み合わせても
 * 自動的に位置が吸い付く `SolvedAvatarRigResult` を計算する
 */
export function solveAutoRigAdjustments(
  equippedParts: EquippedParts,
  manualAdjustments: LayerAdjustmentMap = {},
  enableAutoRig = true,
): SolvedAvatarRigResult {
  const effectiveAdjustments: LayerAdjustmentMap = {};
  const autoOffsets: Partial<
    Record<AvatarCategory, { dx: number; dy: number; connectedTo: string }>
  > = {};
  const customPivots: Partial<Record<AvatarCategory, Point2D>> = {};
  const autoHiddenLayers = new Set<AvatarCategory>();
  const armSleeveMasks: Partial<
    Record<'arm_left' | 'arm_right', { cx: number; cy: number; radius: number }>
  > = {};

  for (const cat of AVATAR_LAYERS) {
    effectiveAdjustments[cat] = getLayerAdjustment(manualAdjustments, cat);
  }
  if (manualAdjustments.layerOrder) {
    effectiveAdjustments.layerOrder = [...manualAdjustments.layerOrder];
  }

  // 複数持ち物リストの正規化抽出
  const handItemParts: AvatarPart[] = [];
  if (Array.isArray(equippedParts.hand_items) && equippedParts.hand_items.length > 0) {
    for (const item of equippedParts.hand_items) {
      const p = asPartObject(item);
      if (p) handItemParts.push(p);
    }
  } else if (equippedParts.hand_item) {
    const p = asPartObject(equippedParts.hand_item);
    if (p) handItemParts.push(p);
  }

  const handItemPart = handItemParts[0] ?? null;
  const handItemManual = getLayerAdjustment(manualAdjustments, 'hand_item');
  const activeHandHoldMode: HandHoldMode =
    handItemManual.handHoldModeOverride ?? handItemPart?.rig?.handHoldMode ?? 'grip_fist';

  const bodyPart = asPartObject(equippedParts.body);
  const topsPart = asPartObject(equippedParts.tops);
  const bottomsPart = asPartObject(equippedParts.bottoms);
  const armLPart = asPartObject(equippedParts.arm_left);
  const armRPart = asPartObject(equippedParts.arm_right);

  const isHandOnlyL = isHandOnlyPart(armLPart);
  const isHandOnlyR = isHandOnlyPart(armRPart);

  if (isHandOnlyL && armLPart?.rig?.attachPoint) {
    customPivots.arm_left = armLPart.rig.attachPoint;
  }
  if (isHandOnlyR && armRPart?.rig?.attachPoint) {
    customPivots.arm_right = armRPart.rig.attachPoint;
  }
  if (handItemPart?.rig?.attachPoint) {
    customPivots.hand_item = handItemPart.rig.attachPoint;
  }

  const bodyAdj = effectiveAdjustments.body ?? DEFAULT_LAYER_ADJUSTMENT;
  const topsManual = getLayerAdjustment(manualAdjustments, 'tops');
  const bottomsManual = getLayerAdjustment(manualAdjustments, 'bottoms');

  const activeBodyClipMode: BodySilhouetteClipMode =
    topsManual.bodyClipMode ??
    bodyAdj.bodyClipMode ??
    topsPart?.defaultAdjustment?.bodyClipMode ??
    bodyPart?.defaultAdjustment?.bodyClipMode ??
    'auto';
  const rawClipInsetPx =
    topsManual.bodyClipInsetPx ??
    bodyAdj.bodyClipInsetPx ??
    topsPart?.defaultAdjustment?.bodyClipInsetPx ??
    bodyPart?.defaultAdjustment?.bodyClipInsetPx ??
    2;
  const activeBodyClipInsetPx: number = clamp(rawClipInsetPx, -4, 14);

  // 素体(body)・トップス(tops)・ボトムス(bottoms) に保存されている手描きマスクストロークを順番に統合
  const activeBodyMaskStrokes: BodyMaskStroke[] = [
    ...(bodyAdj.bodyMaskStrokes ?? bodyPart?.defaultAdjustment?.bodyMaskStrokes ?? []),
    ...(topsManual.bodyMaskStrokes ?? topsPart?.defaultAdjustment?.bodyMaskStrokes ?? []),
    ...(bottomsManual.bodyMaskStrokes ?? bottomsPart?.defaultAdjustment?.bodyMaskStrokes ?? []),
  ];

  const activeSleeveMode: TopSleeveMode =
    topsManual.sleeveModeOverride ??
    topsPart?.defaultAdjustment?.sleeveModeOverride ??
    topsPart?.rig?.sleeveMode ??
    'short_or_sleeveless';

  // 1. 素体 (body) のワールドソケット座標（アバターの右＝向かって左 X<256、アバターの左＝向かって右 X>256）
  const bodySockets = normalizeAnatomicalSockets(bodyPart?.rig?.sockets);

  const worldBodyNeck: Point2D = {
    x: (bodySockets?.neck?.x ?? bodyPart?.rig?.bounds?.centerX ?? 256) + bodyAdj.dx,
    y: (bodySockets?.neck?.y ?? 224) + bodyAdj.dy,
  };
  const worldBodyWaist: Point2D = {
    x: (bodySockets?.waist?.x ?? bodySockets?.neck?.x ?? 256) + bodyAdj.dx,
    y: (bodySockets?.waist?.y ?? 324) + bodyAdj.dy,
  };
  const worldBodyRightShoulder: Point2D = {
    x: (bodySockets?.rightShoulder?.x ?? 215) + bodyAdj.dx,
    y: (bodySockets?.rightShoulder?.y ?? 245) + bodyAdj.dy,
  };
  const worldBodyLeftShoulder: Point2D = {
    x: (bodySockets?.leftShoulder?.x ?? 297) + bodyAdj.dx,
    y: (bodySockets?.leftShoulder?.y ?? 245) + bodyAdj.dy,
  };
  const worldBodyRightHip: Point2D = {
    x: (bodySockets?.rightHip?.x ?? 232) + bodyAdj.dx,
    y: (bodySockets?.rightHip?.y ?? 340) + bodyAdj.dy,
  };
  const worldBodyLeftHip: Point2D = {
    x: (bodySockets?.leftHip?.x ?? 280) + bodyAdj.dx,
    y: (bodySockets?.leftHip?.y ?? 340) + bodyAdj.dy,
  };
  // 全身一体型素体の右手（向かって左）・左手（向かって右）ソケット
  const bodyBounds = bodyPart?.rig?.bounds;
  const fallbackBodyRightHandX =
    bodyBounds && bodyBounds.width >= 150 ? Math.round(bodyBounds.minX + 18) : 154;
  const fallbackBodyLeftHandX =
    bodyBounds && bodyBounds.width >= 150 ? Math.round(bodyBounds.maxX - 18) : 358;
  const fallbackBodyHandY =
    bodyBounds && bodyBounds.height >= 260
      ? Math.round(bodyBounds.minY + bodyBounds.height * 0.59)
      : 302;

  const worldBodyRightHandGrip: Point2D = {
    x: (bodySockets?.rightHandGrip?.x ?? fallbackBodyRightHandX) + bodyAdj.dx,
    y: (bodySockets?.rightHandGrip?.y ?? fallbackBodyHandY) + bodyAdj.dy,
  };
  const worldBodyLeftHandGrip: Point2D = {
    x: (bodySockets?.leftHandGrip?.x ?? fallbackBodyLeftHandX) + bodyAdj.dx,
    y: (bodySockets?.leftHandGrip?.y ?? fallbackBodyHandY) + bodyAdj.dy,
  };

  // 全身素体の足元・足首ソケット
  const worldBodyFeet: Point2D = {
    x: (bodySockets?.feet?.x !== undefined ? bodySockets.feet.x : (bodySockets?.waist?.x ?? 256)) + bodyAdj.dx,
    y: (bodySockets?.feet?.y !== undefined ? bodySockets.feet.y : Math.round(bodySockets?.waist?.y ? bodySockets.waist.y + 110 : 440)) + bodyAdj.dy,
  };
  const worldBodyRightAnkle: Point2D = {
    x: bodySockets?.rightAnkle?.x !== undefined
      ? bodySockets.rightAnkle.x + bodyAdj.dx
      : worldBodyRightHip.x - 2,
    y: bodySockets?.rightAnkle?.y !== undefined
      ? bodySockets.rightAnkle.y + bodyAdj.dy
      : worldBodyFeet.y - 12,
  };
  const worldBodyLeftAnkle: Point2D = {
    x: bodySockets?.leftAnkle?.x !== undefined
      ? bodySockets.leftAnkle.x + bodyAdj.dx
      : worldBodyLeftHip.x + 2,
    y: bodySockets?.leftAnkle?.y !== undefined
      ? bodySockets.leftAnkle.y + bodyAdj.dy
      : worldBodyFeet.y - 12,
  };

  const worldBodySockets: SolvedWorldBodySockets = {
    neck: worldBodyNeck,
    waist: worldBodyWaist,
    rightShoulder: worldBodyRightShoulder,
    leftShoulder: worldBodyLeftShoulder,
    rightHip: worldBodyRightHip,
    leftHip: worldBodyLeftHip,
    rightHandGrip: worldBodyRightHandGrip,
    leftHandGrip: worldBodyLeftHandGrip,
    rightAnkle: worldBodyRightAnkle,
    leftAnkle: worldBodyLeftAnkle,
    feet: worldBodyFeet,
  };

  if (topsPart) {
    if (activeSleeveMode === 'hide_arms') {
      autoHiddenLayers.add('arm_left');
      autoHiddenLayers.add('arm_right');
    } else if (activeSleeveMode === 'long_sleeve_mask') {
      const maskRadius = topsPart.rig?.sleeveMaskRadius ?? 54;
      armSleeveMasks.arm_right = {
        cx: worldBodyRightShoulder.x,
        cy: worldBodyRightShoulder.y,
        radius: maskRadius,
      };
      armSleeveMasks.arm_left = {
        cx: worldBodyLeftShoulder.x,
        cy: worldBodyLeftShoulder.y,
        radius: maskRadius,
      };
    }
  }

  // ★ユーザー要望により関節吸着（自動スナップ）を完全廃止。常にユーザーの手動調整値をそのまま100%反映
  const manualSolvedHandItems: SolvedHandItem[] = [];
    let manualGripFist: SolvedHandGripFist | null = null;

    for (let idx = 0; idx < handItemParts.length; idx++) {
      const itemPart = handItemParts[idx];
      const itemManual =
        manualAdjustments.handItemAdjustments?.[itemPart.id] ??
        (idx === 0
          ? handItemManual
          : {
              ...DEFAULT_LAYER_ADJUSTMENT,
              holdHandSide: idx % 2 === 1 ? 'left' : 'right',
            });

      // アイテムごとのレイヤー階層（前後順）の決定
      let placement: ItemLayerPlacement = itemManual.layerPlacement ?? 'behind_arm';
      if (!itemManual.layerPlacement) {
        const legacyMode = itemManual.handHoldModeOverride ?? itemPart.rig?.handHoldMode;
        if (legacyMode === 'in_front') {
          placement = 'in_front_arm';
        } else {
          placement = 'behind_arm';
        }
      }

      manualSolvedHandItems.push({
        part: itemPart,
        effectiveAdjustment: itemManual,
        customPivot: itemPart.rig?.attachPoint ?? CATEGORY_META.hand_item.pivot,
        handGripFist: null,
        isBobbing: Boolean(itemManual.bobbing),
        layerPlacement: placement,
      });
    }

    return {
      effectiveAdjustments,
      autoOffsets,
      customPivots,
      autoHiddenLayers,
      armSleeveMasks,
      handGripFist: manualGripFist,
      solvedHandItems: manualSolvedHandItems,
      activeHandHoldMode,
      activeSleeveMode,
      activeBodyClipMode,
      activeBodyClipInsetPx,
      activeBodyMaskStrokes,
      worldBodySockets,
  };
}
/**
 * 左右対称ペアとなるカテゴリ（左腕↔右腕、左脚↔右脚）を返す
 */
export function getOppositeSymmetryCategory(category: AvatarCategory): AvatarCategory | null {
  switch (category) {
    case 'arm_left':
      return 'arm_right';
    case 'arm_right':
      return 'arm_left';
    case 'leg_left':
      return 'leg_right';
    case 'leg_right':
      return 'leg_left';
    default:
      return null;
  }
}

/**
 * 左右反転複製時のパーツ名を自動生成する
 */
export function buildMirroredPartName(
  originalName: string,
  sourceCategory: AvatarCategory,
  targetCategory: AvatarCategory,
): string {
  const trimmed = originalName.trim();
  if (sourceCategory === 'arm_left' && targetCategory === 'arm_right') {
    if (/左腕|左手|left/i.test(trimmed)) {
      return trimmed
        .replace(/左腕/g, '右腕')
        .replace(/左手/g, '右手')
        .replace(/left/gi, 'right');
    }
    return `${trimmed} (右腕)`;
  }
  if (sourceCategory === 'arm_right' && targetCategory === 'arm_left') {
    if (/右腕|右手|right/i.test(trimmed)) {
      return trimmed
        .replace(/右腕/g, '左腕')
        .replace(/右手/g, '左手')
        .replace(/right/gi, 'left');
    }
    return `${trimmed} (左腕)`;
  }
  if (sourceCategory === 'leg_left' && targetCategory === 'leg_right') {
    if (/左脚|左足|left/i.test(trimmed)) {
      return trimmed
        .replace(/左脚/g, '右脚')
        .replace(/左足/g, '右足')
        .replace(/left/gi, 'right');
    }
    return `${trimmed} (右脚)`;
  }
  if (sourceCategory === 'leg_right' && targetCategory === 'leg_left') {
    if (/右脚|右足|right/i.test(trimmed)) {
      return trimmed
        .replace(/右脚/g, '左脚')
        .replace(/右足/g, '左足')
        .replace(/right/gi, 'left');
    }
    return `${trimmed} (左脚)`;
  }
  return `${trimmed} (左右反転)`;
}

/**
 * 512x512 キャンバスを左右反転した際のソケット・Rigメタデータを対称変換する
 */
export function mirrorPartRigHorizontally(
  sourceRig: PartRigMetadata | undefined,
  targetCategory: AvatarCategory,
  mirroredCanvas: HTMLCanvasElement,
): PartRigMetadata {
  const analyzed = analyzeNormalizedCanvasRig(
    mirroredCanvas,
    targetCategory,
    sourceRig?.sleeveMode,
  );
  if (!sourceRig) return analyzed;

  const mirrorPt = (pt?: Point2D): Point2D | undefined =>
    pt ? { x: clamp(Math.round(S - pt.x), 0, S), y: clamp(Math.round(pt.y), 0, S) } : undefined;

  const srcSockets = sourceRig.sockets;
  const mirroredSockets: PartRigMetadata['sockets'] = {
    ...analyzed.sockets,
  };

  if (srcSockets) {
    if (srcSockets.neck) mirroredSockets.neck = mirrorPt(srcSockets.neck);
    if (srcSockets.waist) mirroredSockets.waist = mirrorPt(srcSockets.waist);
    if (srcSockets.handGrip) mirroredSockets.handGrip = mirrorPt(srcSockets.handGrip);
    if (srcSockets.ankle) mirroredSockets.ankle = mirrorPt(srcSockets.ankle);
    if (srcSockets.leftShoulder || srcSockets.rightShoulder) {
      mirroredSockets.leftShoulder = mirrorPt(srcSockets.rightShoulder);
      mirroredSockets.rightShoulder = mirrorPt(srcSockets.leftShoulder);
    }
    if (srcSockets.leftHip || srcSockets.rightHip) {
      mirroredSockets.leftHip = mirrorPt(srcSockets.rightHip);
      mirroredSockets.rightHip = mirrorPt(srcSockets.leftHip);
    }
    if (srcSockets.leftHandGrip || srcSockets.rightHandGrip) {
      mirroredSockets.leftHandGrip = mirrorPt(srcSockets.rightHandGrip);
      mirroredSockets.rightHandGrip = mirrorPt(srcSockets.leftHandGrip);
    }
  }

  return {
    bounds: analyzed.bounds,
    attachPoint: mirrorPt(sourceRig.attachPoint) ?? analyzed.attachPoint,
    sockets: mirroredSockets,
    sleeveMode: sourceRig.sleeveMode ?? analyzed.sleeveMode,
    sleeveMaskRadius: sourceRig.sleeveMaskRadius ?? analyzed.sleeveMaskRadius,
    colorPalette: sourceRig.colorPalette ?? analyzed.colorPalette,
    handHoldMode: sourceRig.handHoldMode,
    naturalTiltDeg:
      typeof sourceRig.naturalTiltDeg === 'number' ? -sourceRig.naturalTiltDeg : undefined,
  };
}

/**
 * 反対側の腕・脚などの基準パーツの「実体サイズ (bounds)」と「高さ (centerY)」に
 * 現在編集中のパーツをピタリと揃える PartTransform を計算する
 */
export function computeTransformMatchingReferenceBounds(
  sourceCanvas: HTMLCanvasElement,
  referenceBounds: OpaqueBounds,
  options?: {
    mirrorCenterX?: boolean;
    preserveFlipX?: boolean;
    preserveFlipY?: boolean;
  },
): PartTransform {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  if (!ctx || srcW === 0 || srcH === 0) {
    return { x: S / 2, y: S / 2, scale: 1, rotation: 0, flipX: false, flipY: false };
  }

  const imgData = ctx.getImageData(0, 0, srcW, srcH);
  const srcBounds = detectOpaqueBounds(imgData);
  if (!srcBounds) {
    return { x: S / 2, y: S / 2, scale: 1, rotation: 0, flipX: false, flipY: false };
  }

  // 高さを最優先で揃えつつ、極端に横幅が広い素材でも破綻しないようにスケールを算出
  const scaleH = referenceBounds.height / Math.max(1, srcBounds.height);
  const scaleW = referenceBounds.width / Math.max(1, srcBounds.width);
  const rawScale = scaleH * 0.8 + scaleW * 0.2;
  const scale = clamp(Number(rawScale.toFixed(4)), 0.05, 6);

  const flipX = Boolean(options?.preserveFlipX);
  const flipY = Boolean(options?.preserveFlipY);
  const offsetXFromCenter = (srcBounds.centerX - srcW / 2) * (flipX ? -1 : 1);
  const offsetYFromCenter = (srcBounds.centerY - srcH / 2) * (flipY ? -1 : 1);

  const targetCenterX = options?.mirrorCenterX
    ? S - referenceBounds.centerX
    : referenceBounds.centerX;
  const targetCenterY = referenceBounds.centerY;

  const x = round1(targetCenterX - offsetXFromCenter * scale);
  const y = round1(targetCenterY - offsetYFromCenter * scale);

  return {
    x,
    y,
    scale,
    rotation: 0,
    flipX,
    flipY,
  };
}

