/**
 * 3層サンドイッチ（「素体の手のひら → ステッキ → 小さな指先チップ」）用の
 * 指先チップ定義＆SVGベクターパス定義
 *
 * - 素体の元の手は一切切り抜かず（手首の継ぎ目ゼロ）、
 *   ステッキ等の細い柄（幅8〜12px）の手前だけを、素体から抽出した肌色・主線色の
 *   小さな指先チップ（または素体の手先ピクセル直接コピー）でそっと押さえます。
 */
import type { GripHandPose } from '../types';

export type FingerChipPose = 'chibi_single' | 'chibi_double' | 'body_clone';

export interface HandSpritePair {
  pose: FingerChipPose;
  label: string;
  description: string;
  /** アバターの右手（向かって左側）保持時の推奨初期角度（度） */
  defaultRotationRight: number;
  /** アバターの左手（向かって右側）保持時の推奨初期角度（度） */
  defaultRotationLeft: number;
  /** アバターの右手（向かって左側）保持時の手のひら中心からの初期オフセット (px) */
  defaultOffsetRight: { dx: number; dy: number };
  /** アバターの左手（向かって右側）保持時の手のひら中心からの初期オフセット (px) */
  defaultOffsetLeft: { dx: number; dy: number };
}

/**
 * AvatarRenderer (SVG) と composeAvatar (Canvas Path2D) で共通利用する
 * 指先チップのベクターパス定義（Single Source of Truth）
 */
export const FINGER_CHIP_SVG_PATHS = {
  chibi_single: {
    fill: 'M -6.0,-4.3 C -1.2,-4.9 6.4,-4.0 6.4,0 C 6.4,4.0 -1.2,4.9 -6.0,4.3 Z',
    shade: 'M -2.8,2.2 C 1.5,3.2 5.0,2.2 5.8,0.2 C 5.4,3.3 1.0,4.4 -4.0,3.8 Z',
    outline: 'M -2.8,-4.4 C 2.0,-4.7 6.4,-3.5 6.4,0 C 6.4,3.5 2.0,4.7 -2.8,4.4',
    strokeWidth: 2.2,
  },
  chibi_double: {
    lower: {
      fill: 'M -5.2,0.2 C -1.0,-0.4 5.8,0.2 5.8,3.5 C 5.8,6.6 -1.0,7.2 -5.2,6.4 Z',
      shade: 'M -2.5,4.8 C 1.2,5.6 4.6,4.8 5.2,3.0 C 4.8,5.6 0.8,6.6 -3.5,6.0 Z',
      outline: 'M -2.6,0.1 C 1.8,-0.2 5.8,0.6 5.8,3.5 C 5.8,6.4 1.6,7.0 -3.2,6.3',
    },
    upper: {
      fill: 'M -5.0,-6.2 C -0.8,-6.8 6.2,-6.0 6.2,-2.6 C 6.2,0.6 -0.8,1.2 -5.0,0.6 Z',
      shade: 'M -2.2,-1.2 C 1.6,-0.4 5.0,-1.0 5.6,-2.8 C 5.2,0.0 1.2,0.9 -3.2,0.3 Z',
      outline: 'M -2.4,-6.3 C 2.0,-6.6 6.2,-5.6 6.2,-2.6 C 6.2,0.4 1.8,1.0 -2.8,0.4',
    },
    strokeWidth: 2.1,
  },
} as const;

export const GRIP_HAND_POSE_LIST: FingerChipPose[] = [
  'chibi_single',
  'chibi_double',
  'body_clone',
];

export const HAND_SPRITE_PRESETS: Record<FingerChipPose, HandSpritePair> = {
  chibi_single: {
    pose: 'chibi_single',
    label: '① ちび丸指チップ（標準・1つ丸）',
    description:
      '素体の手と同じ肌色・主線色の小さな丸指（約13px・手首側の主線なし）で柄の手前だけをそっと押さえます',
    defaultRotationRight: -18,
    defaultRotationLeft: 18,
    defaultOffsetRight: { dx: 2, dy: 1 },
    defaultOffsetLeft: { dx: -2, dy: 1 },
  },
  chibi_double: {
    pose: 'chibi_double',
    label: '② ちょこんと2つ指チップ',
    description:
      '小さな2つの丸指（約15px・手首側の主線なし）でステッキや剣の柄を前から包み込みます',
    defaultRotationRight: -18,
    defaultRotationLeft: 18,
    defaultOffsetRight: { dx: 2, dy: 2 },
    defaultOffsetLeft: { dx: -2, dy: 2 },
  },
  body_clone: {
    pose: 'body_clone',
    label: '③ 素体の手先ピクセル直接コピー',
    description:
      '素体イラスト自身の指先ピクセルをそのまま切り出してステッキの手前に重ねます（塗りと線が100%一致）',
    defaultRotationRight: 0,
    defaultRotationLeft: 0,
    defaultOffsetRight: { dx: -4, dy: 2 },
    defaultOffsetLeft: { dx: 4, dy: 2 },
  },
};

/** 旧保存データのポーズ指定も安全に最新の3種へ変換する */
export function normalizeGripHandPose(pose?: GripHandPose): FingerChipPose {
  if (pose === 'chibi_double' || pose === 'body_clone') return pose;
  return 'chibi_single';
}

