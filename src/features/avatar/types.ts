/**
 * モバゲー風3頭身2Dアバター描画モジュール 型定義
 *
 * すべてのパーツ画像は 512x512px の正方形キャンバスの共通座標系に正規化され、
 * AVATAR_LAYERS の順（Z-index昇順：先頭が最背面、末尾が最前面）に重ねて描画されます。
 *
 * さらに以下の3段階の自動調整機構（Auto-Rigging）を備えています：
 * 1. 実体ピクセル検出による「サイズ感・余白の自動正規化」
 * 2. 輪郭解析による「関節ソケット（肩・手・股関節・足首・持ち手）の自動検出」
 * 3. 着せ替え時の「親子ソケット自動吸着＆長袖二の腕マスク処理」
 */

/** 全18レイヤー定義（下から順に重なる基本Z-index順） */
export const AVATAR_LAYERS = [
  'background', // 1. 背景
  'back_effect', // 2. 背面オーラ・エフェクト
  'hair_back', // 3. 後ろ髪
  'leg_left', // 4. 左脚・足（素体から独立）
  'leg_right', // 5. 右脚・足（素体から独立）
  'body', // 6. 3頭身の素体（頭・胴体）
  'arm_left', // 7. 左腕・手（素体から独立・設定でトップス前面へ移動可）
  'arm_right', // 8. 右腕・手（素体から独立・設定でトップス前面へ移動可）
  'face_eyes', // 9. 目
  'face_mouth', // 10. 口・眉・表情
  'bottoms', // 11. ボトムス
  'shoes', // 12. 靴
  'tops', // 13. トップス・ワンピース
  'hair_front', // 14. 前髪
  'hat_glasses', // 15. 帽子・メガネ・頭アクセ
  'hand_item', // 16. 持ち物（剣・ステッキ等）
  'pet', // 17. ペット（足元や肩の横に配置）
  'front_effect', // 18. 前面エフェクト・フレーム
] as const;

/** レイヤーカテゴリ型 */
export type AvatarCategory = (typeof AVATAR_LAYERS)[number];

/** 512x512座標系上の2Dポイント */
export interface Point2D {
  x: number;
  y: number;
}

/** 不透明ピクセル（実体部分）のバウンディングボックス */
export interface OpaqueBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * トップス（服）着用時の袖・腕の扱いモード
 * - 'short_or_sleeveless': 半袖・ノースリーブ（肩ソケットに腕パーツ全体を接続）
 * - 'long_sleeve_mask': 長袖・二の腕マスク（服と重なる二の腕〜肩の素肌を自動で隠して袖先から手・前腕を出す）
 * - 'long_sleeve_cuff': 長袖・袖口接続（服の袖口ソケットに手・腕パーツの付け根を接続）
 * - 'hide_arms': 腕パーツ非表示（すでに服の画像に腕〜手先まで描かれている場合やマント着用時）
 */
export type TopSleeveMode =
  | 'short_or_sleeveless'
  | 'long_sleeve_mask'
  | 'long_sleeve_cuff'
  | 'hide_arms';

/**
/**
 * 持ち物・アイテムの配置レイヤー（Z階層・描画順）
 * - 'back_lowest': 【最背面】キャラクター全身の奥（大きな翼・マント・背後エフェクトなど）
 * - 'behind_body': 【体の奥】背中・胴体の奥（背負った弓矢・リュック・後ろ手）
 * - 'behind_arm': 【手の奥（握る）】腕・手・服の奥（剣・ステッキ・ほうき・釣り竿などを自然に握る推奨配置）
 * - 'in_front_arm': 【手の前（抱える）】腕・手・服の手前（盾・ぬいぐるみ・花束・本などを胸や手前に抱える配置）
 * - 'front_highest': 【最前面】アバターの最も手前（前面エフェクト・突き出しアイテム・UI風アイテム）
 */
export type ItemLayerPlacement =
  | 'back_lowest'
  | 'behind_body'
  | 'behind_arm'
  | 'in_front_arm'
  | 'front_highest';

/**
 * 持ち物（ステッキ・剣・バッグ等）の持ち方モード（後方互換用）
 */
export type HandHoldMode = 'grip_fist' | 'behind_hand' | 'in_front';

/**
 * 服（トップス・ボトムス・靴）着用時の「素体・脚のはみ出し自動カッティング（シルエット・クリッピング）」モード
 * - 'auto': 【推奨】トップス・ボトムス・靴の不透明シルエットを解析し、首元や半袖の手先・裾から出る脚を残しつつ、服の外側へ突き抜ける素体（肩・脇腹・腰・太もも・足先）を自動カット（デフォルト）
 * - 'strict': 【強（完全カット）】首より下の領域で、服・靴のシルエットからはみ出す素体ピクセル（素体の腕や脚を含む）をすべて服の輪郭内に完全クリッピング
 * - 'off': 【OFF（露出服・水着など）】素体の自動カッティングを行わない
 */
export type BodySilhouetteClipMode = 'auto' | 'strict' | 'off';

/**
 * 持ち物着用時にステッキ等の柄の手前に重ねる「小さな指先チップ（3層サンドイッチ用）」の種類
 * - 'chibi_single': ちび丸指チップ（1つ丸・手首側の主線なしで素体の手に溶け込む標準チップ）
 * - 'chibi_double': ちょこんと2つ指チップ（小さな2つの丸指で柄を軽く押さえるチップ）
 * - 'body_clone': 素体の手先ピクセル直接コピー（素体画像の指先領域をそのまま柄の手前に複製）
 * ※後方互換のため旧ポーズ識別子も型として許容し、実行時に normalizeGripHandPose で上記3種へ正規化します。
 */
export type GripHandPose =
  | 'chibi_single'
  | 'chibi_double'
  | 'body_clone'
  | 'fist_front'
  | 'grip_c'
  | 'fist_back'
  | 'pointing'
  | 'open';

/**
 * 素体や腕パーツから自動スポイト抽出した肌色・主線色パレット
 */
export interface PartColorPalette {
  /** ベース肌色 (HEX, 例: '#FAD5C0') */
  skinFill: string;
  /** 肌の影・ハイライト境界色 (HEX, 例: '#F0BC9E') */
  skinShade: string;
  /** 輪郭線（主線）の色 (HEX, 例: '#452216') */
  outlineColor: string;
}

/**
 * パーツが持つ自動吸着ソケット＆輪郭メタデータ
 * スタジオで透過PNGを書き出す際に自動解析して付与され、手動でピン位置を微調整することも可能です。
 */
export interface PartRigMetadata {
  /** 512x512上での不透明ピクセル（実体）の範囲 */
  bounds: OpaqueBounds;
  /**
   * このパーツが親パーツのソケットに吸い付くための「自身の付け根（アタッチメント点）」
   * - arm_left / arm_right: 肩の付け根（または手首の付け根）
   * - leg_left / leg_right: 股関節の付け根
   * - shoes: 靴の履き口の中心
   * - hand_item: 剣やステッキの柄（グリップ位置）
   * - tops / bottoms: 首の付け根 / 腰の中心
   */
  attachPoint?: Point2D;
  /**
   * このパーツが子パーツを吸着させるための「出力ソケット」
   */
  sockets?: {
    /** 首・襟元（bodyが持ち、topsが参照可能） */
    neck?: Point2D;
    /** 腰中心（body / topsが持ち、bottomsが参照可能） */
    waist?: Point2D;
    /** 左肩または左袖口（body / topsが持ち、arm_leftが吸着） */
    leftShoulder?: Point2D;
    /** 右肩または右袖口（body / topsが持ち、arm_rightが吸着） */
    rightShoulder?: Point2D;
    /** 左股関節または左裾（body / bottomsが持ち、leg_leftが吸着） */
    leftHip?: Point2D;
    /** 右股関節または右裾（body / bottomsが持ち、leg_rightが吸着） */
    rightHip?: Point2D;
    /** 手のひら・グリップ（body / arm_left / arm_rightが持ち、hand_itemが吸着） */
    handGrip?: Point2D;
    /** 全身素体(body)における左手のひらソケット（画面左側） */
    leftHandGrip?: Point2D;
    /** 全身素体(body)における右手のひらソケット（画面右側） */
    rightHandGrip?: Point2D;
    /** 足首（leg_left / leg_rightが持ち、shoesが吸着） */
    ankle?: Point2D;
    /** 素体(body)における左足首（アバターの左＝向かって右） */
    leftAnkle?: Point2D;
    /** 素体(body)における右足首（アバターの右＝向かって左） */
    rightAnkle?: Point2D;
    /** 素体(body)における足底/接地位置（靴の吸着ターゲット） */
    feet?: Point2D;
    /** 左袖口または左裾（トップス・ボトムス） */
    leftCuff?: Point2D;
    /** 右袖口または右裾（トップス・ボトムス） */
    rightCuff?: Point2D;
  };
  /** 素体・腕から自動抽出した肌色・主線色パレット */
  colorPalette?: PartColorPalette;
  /** トップス専用の袖モード（長袖・半袖の自動制御用） */
  sleeveMode?: TopSleeveMode;
  /** 長袖マスク時に肩ソケット中心から半径何px分の二の腕を隠すか（デフォルト 52） */
  sleeveMaskRadius?: number;
  /** 持ち物（hand_item）専用の持ち方モード（デフォルト: 'grip_fist'） */
  handHoldMode?: HandHoldMode;
  /** 持ち物（hand_item）専用の初期指先チップ種類（デフォルト: 'chibi_single'） */
  gripHandPose?: GripHandPose;
  /** 持ち物（hand_item）を手に持たせた時の推奨傾き角度（デフォルト: 18度） */
  naturalTiltDeg?: number;
}

/** パーツ1点のデータ構造 */
export interface AvatarPart {
  /** 一意なパーツID（Supabase等に保存する識別子） */
  id: string;
  /** 所属するレイヤーカテゴリ */
  category: AvatarCategory;
  /** 表示名 */
  name: string;
  /** 512x512px 正規化済み透過PNG画像のURLまたはDataURL */
  src: string;
  /** 素材の出所 ('preset' | 'custom' 等) */
  source?: 'preset' | 'custom' | string;
  /** 自動サイズ・関節ソケット吸着用のリグメタデータ */
  rig?: PartRigMetadata;
  /** 作成日時（ミリ秒） */
  createdAt?: number;
  /** 更新日時（ミリ秒・手足セット登録や名称変更時） */
  updatedAt?: number;
  /** 親アプリ側で自由に利用できるメタデータ */
  meta?: Record<string, unknown>;
  /**
   * このパーツを着用した際に自動で連動して一緒に装着するパーツID群 ＆ 手足の位置・前面調整
   * - tops（服）: { arm_left?: string | null, arm_right?: string | null, leg_left?: string | null, ... }
   * - adjustments: 手足の服に対する前面表示（aboveTops: true）や位置・サイズ微調整
   */
  linkedParts?: Partial<Record<AvatarCategory, string | null>> & {
    adjustments?: Partial<Record<AvatarCategory, LayerAdjustment>>;
    /** このトップスがワンピース・ドレスであるか（trueの場合のみズボンを自動で非装着にする） */
    isOnePiece?: boolean;
  };
}

/**
 * クローゼット（着せ替え時）でのレイヤーごとの位置・サイズ・角度・前後順の微調整データ
 * 自動吸着の結果に対して、さらにユーザーが手動でオフセットを加えたい場合にも使用します。
 */
export interface LayerAdjustment {
  /** X方向の移動オフセット（512px座標系でのpx単位。初期値 0） */
  dx: number;
  /** Y方向の移動オフセット（512px座標系でのpx単位。初期値 0） */
  dy: number;
  /** 拡大縮小率（1 = 100%。初期値 1） */
  scale: number;
  /** 回転角度（度数法 -180〜180。初期値 0） */
  rotation: number;
  /** 左右反転（初期値 false） */
  flipX: boolean;
  /** トップス（服）よりも前面に描画するか（主に左腕・右腕・脚・ボトムス等を服の上に出したい時に使用） */
  aboveTops?: boolean;
  /** トップス着用時の袖モードをクローゼット側から上書きする場合の指定 */
  sleeveModeOverride?: TopSleeveMode;
  /** 持ち物（hand_item）の持ち方モードをクローゼット側から上書きする場合の指定（後方互換） */
  handHoldModeOverride?: HandHoldMode;
  /** 持ち物・アイテムの配置レイヤー（Z階層・描画順） */
  layerPlacement?: ItemLayerPlacement;
  /** 持ち物を右手（画面右）と左手（画面左）のどちらに持たせるか（デフォルト: 'right'） */
  holdHandSide?: 'right' | 'left';
  /** 指先チップ（3層サンドイッチの前面レイヤー）の種類（デフォルト: 'chibi_single'） */
  gripHandPose?: GripHandPose;
  /** 指先チップのX位置微調整オフセット（512px座標系、初期値 0） */
  gripDx?: number;
  /** 指先チップのY位置微調整オフセット（512px座標系、初期値 0） */
  gripDy?: number;
  /** 指先チップの拡大縮小率（1 = 100%、初期値 1） */
  gripScale?: number;
  /** 指先チップの回転角度（度数法 -180〜180、初期値 0） */
  gripRotation?: number;
  /** 指先チップの左右反転（初期値 false） */
  gripFlipX?: boolean;
  /** 指先チップの上下反転（初期値 false） */
  gripFlipY?: boolean;
  /** 服着用時の「素体・脚のはみ出し自動カッティング」モード（bodyレイヤーで保持、デフォルト: 'auto'） */
  bodyClipMode?: BodySilhouetteClipMode;
  /** 素体カッティング時の服輪郭からの内側食い込み幅（px単位、-4〜+8、デフォルト: 2） */
  bodyClipInsetPx?: number;
  /** 上下にふわふわ浮遊動（ボビング）アニメーションを行うか（初期値 false） */
  bobbing?: boolean;
}

/** 全レイヤーの微調整マップ */
export type LayerAdjustmentMap = Partial<Record<AvatarCategory, LayerAdjustment>> & {
  /** 持ち物ごとの個別微調整（キーはパーツID） */
  handItemAdjustments?: Record<string, LayerAdjustment>;
  /** カスタムレイヤー並び順（配列先頭インデックス0が最背面、末尾が最前面） */
  layerOrder?: AvatarCategory[];
};

/** 各カテゴリに装着可能な値（パーツオブジェクト / 画像URL文字列 / 未装着） */
export type EquippedValue = AvatarPart | string | null | undefined;

/** 描画コンポーネントへ渡す装備マップ（未指定のキーは未装着扱い） */
export type EquippedParts = Partial<Record<AvatarCategory, EquippedValue>> & {
  /** 複数選択された持ち物パーツ一覧（未指定時は hand_item の単一パーツを使用） */
  hand_items?: (AvatarPart | string)[];
};

/** 全カテゴリが明示的に揃った正規化済み装備マップ（onSaveコールバック等で返却） */
export type EquippedPartMap = Record<AvatarCategory, AvatarPart | null> & {
  /** 複数選択された持ち物パーツ一覧 */
  hand_items?: AvatarPart[];
};

/** 表示サイズプリセット */
export type AvatarSizePreset = 'sm' | 'md' | 'lg' | 'full';

/** 表示サイズ指定（プリセット文字列 または px数値） */
export type AvatarSize = AvatarSizePreset | number;

/** 512x512座標系における正方形切り抜き領域 */
export interface CropRect {
  x: number;
  y: number;
  size: number;
}

/** スタジオでのパーツ位置合わせ・変形パラメータ（512x512座標系） */
export interface PartTransform {
  /** 配置中心のX座標 (px) */
  x: number;
  /** 配置中心のY座標 (px) */
  y: number;
  /** 拡大縮小率 (1 = 100%) */
  scale: number;
  /** 回転角度（度数法 -180〜180） */
  rotation: number;
  /** 左右反転 */
  flipX: boolean;
  /** 上下反転 */
  flipY: boolean;
}

/** スタジオ上でユーザーが自由に移動・編集できる目安ポイント（アンカー） */
export interface ReferenceAnchor {
  /** 一意なID */
  id: string;
  /** ポイントの表示名（例：「頭の中心」「右手」「左足」など） */
  label: string;
  /** 512座標系でのX座標 (0〜512) */
  x: number;
  /** 512座標系でのY座標 (0〜512) */
  y: number;
  /** マーカー色（HEX） */
  color: string;
}

/** 3頭身ガイドラインの設定（ユーザーがスタジオ上で微調整可能） */
export interface ProportionGuideConfig {
  /** ガイドシルエット（3頭身マネキン枠線）を表示するか */
  showSilhouette: boolean;
  /** 3頭身の分割ラインを表示するか */
  showHeadLines: boolean;
  /** 頭頂部のY座標 */
  topY: number;
  /** 足底のY座標 */
  bottomY: number;
  /** 中心線のX座標 */
  centerX: number;
}
