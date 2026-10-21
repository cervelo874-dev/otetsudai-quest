import type {
  AvatarCategory,
  AvatarSizePreset,
  CropRect,
  LayerAdjustment,
  ProportionGuideConfig,
  ReferenceAnchor,
} from './types';

/** すべてのパーツに共通する正規化キャンバスサイズ (512x512px) */
export const AVATAR_CANVAS_SIZE = 512;

export interface CategoryTargetSpec {
  /** 自動正規化時の目標実体幅 (px) */
  targetWidth: number;
  /** 自動正規化時の目標実体高さ (px) */
  targetHeight: number;
  /** 幅と高さのどちらを優先してスケーリングするか ('height' | 'width' | 'fit') */
  fitAxis: 'height' | 'width' | 'fit';
  /** 標準の配置中心座標 (512座標系) */
  defaultCenter: { x: number; y: number };
}

export interface CategoryMeta {
  /** レイヤー番号 (1〜18) */
  order: number;
  /** カテゴリの日本語表示名 */
  label: string;
  /** カテゴリの説明 */
  description: string;
  /** スタジオで対応するデフォルトの目安ポイントID */
  defaultAnchorId?: string;
  /** 微調整時に回転や移動の基準となるピボット座標（512座標系） */
  pivot: { x: number; y: number };
  /** 仕組み①：AI画像の実体ピクセルを3頭身比率へ自動正規化する際の目標サイズ仕様 */
  targetSpec: CategoryTargetSpec;
}

/** 全18カテゴリのメタ情報（Z-index順）＋自動サイズ正規化スペック */
export const CATEGORY_META: Record<AvatarCategory, CategoryMeta> = {
  background: {
    order: 1,
    label: '背景',
    description: '最背面に配置される背景画像',
    pivot: { x: 256, y: 256 },
    targetSpec: {
      targetWidth: 512,
      targetHeight: 512,
      fitAxis: 'fit',
      defaultCenter: { x: 256, y: 256 },
    },
  },
  back_effect: {
    order: 2,
    label: '背面エフェクト',
    description: 'キャラの背後に出るオーラや後光',
    defaultAnchorId: 'chest',
    pivot: { x: 256, y: 276 },
    targetSpec: {
      targetWidth: 420,
      targetHeight: 420,
      fitAxis: 'fit',
      defaultCenter: { x: 256, y: 270 },
    },
  },
  hair_back: {
    order: 3,
    label: '後ろ髪',
    description: '素体よりも後ろに描画される髪',
    defaultAnchorId: 'head',
    pivot: { x: 256, y: 135 },
    targetSpec: {
      targetWidth: 200,
      targetHeight: 220,
      fitAxis: 'width',
      defaultCenter: { x: 256, y: 170 },
    },
  },
  leg_left: {
    order: 4,
    label: '左脚・足',
    description: 'アバターの左脚・足（向かって右側／ボトムスや素体の左股関節ソケットに自動吸着）',
    defaultAnchorId: 'leg_l',
    pivot: { x: 280, y: 340 },
    targetSpec: {
      targetWidth: 48,
      targetHeight: 122,
      fitAxis: 'height',
      defaultCenter: { x: 280, y: 400 },
    },
  },
  leg_right: {
    order: 5,
    label: '右脚・足',
    description: 'アバターの右脚・足（向かって左側／ボトムスや素体の右股関節ソケットに自動吸着）',
    defaultAnchorId: 'leg_r',
    pivot: { x: 232, y: 340 },
    targetSpec: {
      targetWidth: 48,
      targetHeight: 122,
      fitAxis: 'height',
      defaultCenter: { x: 232, y: 400 },
    },
  },
  body: {
    order: 6,
    label: '素体(全身・胴)',
    description: '3頭身キャラクターの素体ベース（全身イラストも頭・胴のみも3頭身枠へ自動フィット）',
    pivot: { x: 256, y: 256 },
    targetSpec: {
      targetWidth: 260,
      targetHeight: 420,
      fitAxis: 'height',
      defaultCenter: { x: 256, y: 258 },
    },
  },
  arm_left: {
    order: 7,
    label: '左腕・手',
    description: 'アバターの左腕・手（向かって右側／トップスの左肩・袖ソケットに自動吸着）',
    defaultAnchorId: 'hand_l',
    pivot: { x: 297, y: 245 },
    targetSpec: {
      targetWidth: 56,
      targetHeight: 102,
      fitAxis: 'height',
      defaultCenter: { x: 320, y: 290 },
    },
  },
  arm_right: {
    order: 8,
    label: '右腕・手',
    description: 'アバターの右腕・手（向かって左側／トップスの右肩・袖ソケットに自動吸着）',
    defaultAnchorId: 'hand_r',
    pivot: { x: 215, y: 245 },
    targetSpec: {
      targetWidth: 56,
      targetHeight: 102,
      fitAxis: 'height',
      defaultCenter: { x: 192, y: 290 },
    },
  },
  bottoms: {
    order: 9,
    label: 'ボトムス',
    description: 'ズボン・スカートなど（左右の脚と靴が裾ソケットに連動）',
    defaultAnchorId: 'waist',
    pivot: { x: 256, y: 340 },
    targetSpec: {
      targetWidth: 118,
      targetHeight: 82,
      fitAxis: 'width',
      defaultCenter: { x: 256, y: 356 },
    },
  },
  shoes: {
    order: 10,
    label: '靴',
    description: 'スニーカー・ブーツなど（脚の足首ソケットに自動吸着）',
    defaultAnchorId: 'feet',
    pivot: { x: 256, y: 456 },
    targetSpec: {
      targetWidth: 112,
      targetHeight: 48,
      fitAxis: 'height',
      defaultCenter: { x: 256, y: 460 },
    },
  },
  tops: {
    order: 11,
    label: 'トップス',
    description: 'シャツ・ジャケット・ワンピース（左右の肩ソケットに腕が自動吸着）',
    defaultAnchorId: 'chest',
    pivot: { x: 256, y: 276 },
    targetSpec: {
      targetWidth: 138,
      targetHeight: 122,
      fitAxis: 'height',
      defaultCenter: { x: 256, y: 286 },
    },
  },
  face_eyes: {
    order: 12,
    label: '目・顔表情',
    description: '瞳・まつげ・顔パーツ（素体の顔の中央に自動フィット）',
    defaultAnchorId: 'eyes',
    pivot: { x: 256, y: 155 },
    targetSpec: {
      targetWidth: 112,
      targetHeight: 68,
      fitAxis: 'width',
      defaultCenter: { x: 256, y: 155 },
    },
  },
  face_mouth: {
    order: 13,
    label: '口・眉・表情',
    description: '口・眉毛・チークなどの表情パーツ',
    defaultAnchorId: 'mouth',
    pivot: { x: 256, y: 185 },
    targetSpec: {
      targetWidth: 104,
      targetHeight: 64,
      fitAxis: 'width',
      defaultCenter: { x: 256, y: 168 },
    },
  },
  hair_front: {
    order: 14,
    label: '前髪',
    description: '顔の手前に描画される前髪・サイド髪',
    defaultAnchorId: 'head',
    pivot: { x: 256, y: 135 },
    targetSpec: {
      targetWidth: 192,
      targetHeight: 165,
      fitAxis: 'width',
      defaultCenter: { x: 256, y: 128 },
    },
  },
  hat_glasses: {
    order: 15,
    label: '帽子・メガネ',
    description: '帽子・メガネ・髪飾り・頭アクセ',
    defaultAnchorId: 'head_top',
    pivot: { x: 256, y: 100 },
    targetSpec: {
      targetWidth: 150,
      targetHeight: 90,
      fitAxis: 'width',
      defaultCenter: { x: 256, y: 82 },
    },
  },
  hand_item: {
    order: 16,
    label: '持ち物',
    description: '剣・ステッキ・バッグなど（アバターの右腕・右手ソケット［向かって左］に自動吸着）',
    defaultAnchorId: 'hand_r',
    pivot: { x: 184, y: 315 },
    targetSpec: {
      targetWidth: 85,
      targetHeight: 150,
      fitAxis: 'height',
      defaultCenter: { x: 172, y: 280 },
    },
  },
  pet: {
    order: 17,
    label: 'ペット',
    description: '足元や肩の横に配置する相棒ペット',
    defaultAnchorId: 'pet',
    pivot: { x: 108, y: 425 },
    targetSpec: {
      targetWidth: 105,
      targetHeight: 105,
      fitAxis: 'fit',
      defaultCenter: { x: 108, y: 425 },
    },
  },
  front_effect: {
    order: 18,
    label: '前面エフェクト',
    description: '最前面に重なるキラキラやフレーム枠',
    pivot: { x: 256, y: 256 },
    targetSpec: {
      targetWidth: 480,
      targetHeight: 480,
      fitAxis: 'fit',
      defaultCenter: { x: 256, y: 256 },
    },
  },
};

/** レイヤー微調整のデフォルト値 */
export const DEFAULT_LAYER_ADJUSTMENT: LayerAdjustment = {
  dx: 0,
  dy: 0,
  scale: 1,
  rotation: 0,
  flipX: false,
  aboveTops: false,
};

/** サイズプリセットのピクセル値 */
export const SIZE_PRESET_PX: Record<Exclude<AvatarSizePreset, 'full'>, number> = {
  sm: 48,
  md: 128,
  lg: 256,
};

/** 全体表示時の切り抜き範囲 */
export const FULL_CROP: CropRect = {
  x: 0,
  y: 0,
  size: AVATAR_CANVAS_SIZE,
};

/** faceOnly（丸型顔アイコン）表示時の切り抜き範囲（顔〜胸元） */
export const FACE_CROP: CropRect = {
  x: 126,
  y: 36,
  size: 260,
};

/**
 * 2Dアバターの標準レイヤー描画順（配列の先頭インデックス0が最背面、末尾が最前面）
 * 腕 (arm_left / arm_right) は服 (tops) の後ろ（奥）に配置されます。
 */
export const DEFAULT_AVATAR_LAYER_ORDER: AvatarCategory[] = [
  'background', // 1. 背景（最奥）
  'back_effect', // 2. 背面オーラ・エフェクト
  'hair_back', // 3. 後ろ髪
  'body', // 4. 素体
  'leg_left', // 5. 左脚
  'leg_right', // 6. 右脚
  'arm_left', // 7. 左腕（服の後ろ）
  'arm_right', // 8. 右腕（服の後ろ）
  'bottoms', // 9. ズボン・ボトムス
  'shoes', // 10. 靴
  'tops', // 11. 服・トップス
  'face_eyes', // 12. 目
  'face_mouth', // 13. 口・表情
  'hair_front', // 14. 前髪
  'hat_glasses', // 15. 帽子・メガネ
  'hand_item', // 16. 持ち物
  'pet', // 17. ペット
  'front_effect', // 18. 前面エフェクト（最前面）
];

/** 呼吸アニメーションで一体となって上下するキャラクター本体レイヤー群 */
export const CHARACTER_BODY_LAYERS: AvatarCategory[] = [
  'hair_back',
  'leg_left',
  'leg_right',
  'body',
  'arm_left',
  'arm_right',
  'bottoms',
  'shoes',
  'tops',
  'face_eyes',
  'face_mouth',
  'hair_front',
  'hat_glasses',
  'hand_item',
];

/**
 * スタジオの初期「目安ポイント（基準点）」リスト
 * （左右はアバター本人にとっての右・左：右手・右脚＝向かって左、左手・左脚＝向かって右）
 */
export const DEFAULT_REFERENCE_ANCHORS: ReferenceAnchor[] = [
  { id: 'head_top', label: '頭頂・帽子', x: 256, y: 68, color: '#f59e0b' },
  { id: 'head', label: '頭の中心', x: 256, y: 135, color: '#ec4899' },
  { id: 'eyes', label: '目のライン', x: 256, y: 155, color: '#3b82f6' },
  { id: 'mouth', label: '口・表情', x: 256, y: 192, color: '#f43f5e' },
  { id: 'chest', label: '胸・トップス', x: 256, y: 276, color: '#8b5cf6' },
  { id: 'hand_r', label: '右腕・右手(向かって左)', x: 188, y: 305, color: '#06b6d4' },
  { id: 'hand_l', label: '左腕・左手(向かって右)', x: 324, y: 305, color: '#06b6d4' },
  { id: 'waist', label: '腰・ボトムス', x: 256, y: 340, color: '#10b981' },
  { id: 'leg_r', label: '右脚(向かって左)', x: 232, y: 405, color: '#0ea5e9' },
  { id: 'leg_l', label: '左脚(向かって右)', x: 280, y: 405, color: '#0ea5e9' },
  { id: 'feet', label: '足元・靴中心', x: 256, y: 456, color: '#6366f1' },
  { id: 'pet', label: 'ペット位置', x: 108, y: 425, color: '#14b8a6' },
];

/** 3頭身プロポーションガイドの初期設定 */
export const DEFAULT_PROPORTION_GUIDE: ProportionGuideConfig = {
  showSilhouette: true,
  showHeadLines: true,
  topY: 48,
  bottomY: 468,
  centerX: 256,
};

/**
 * UI表示用の自然な着せ替えカテゴリ並び順（頭・顔 → お洋服 → 小物 → 背景）
 * （Z-index順の AVATAR_LAYERS とは異なり、ユーザーの思考順に最適化）
 */
export const AVATAR_UI_ORDER: AvatarCategory[] = [
  // 1. 顔・髪（頭周り）
  'hair_front',
  'hair_back',
  'face_eyes',
  'body',
  // 2. お洋服（服・ズボン・くつ・手足）
  'tops',
  'bottoms',
  'shoes',
  'arm_left',
  'arm_right',
  'leg_left',
  'leg_right',
  // 3. 小物（あたま・もちもの・ペット）
  'hat_glasses',
  'hand_item',
  'pet',
  // 4. 背景・エフェクト
  'background',
  'front_effect',
  'back_effect',
];
