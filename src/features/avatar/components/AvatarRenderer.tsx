import { memo, useMemo, Fragment, type CSSProperties, type MouseEventHandler } from 'react';
import { AVATAR_LAYERS } from '../types';
import type {
  AvatarCategory,
  AvatarSize,
  BodyMaskStroke,
  CropRect,
  EquippedParts,
  ItemLayerPlacement,
  LayerAdjustment,
  LayerAdjustmentMap,
} from '../types';
import { DEFAULT_LAYER_ADJUSTMENT, FACE_CROP, FULL_CROP, SIZE_PRESET_PX } from '../constants';
import {
  adjustmentToLayerStyle,
  createBodyMaskStrokesStyle,
  cropToStageStyle,
  getEffectivePairAdjustment,
  getOrderedCharacterBodyLayers,
  resolveAvatarLayerOrder,
  resolvePartSrc,
} from '../utils/parts';
import { solveAutoRigAdjustments } from '../utils/autoRigging';
import { useSilhouetteClippedSources } from '../utils/silhouetteMasking';
import '../avatar.css';

export interface AvatarRendererProps {
  /** 各カテゴリに装着中のパーツ画像URLまたはパーツオブジェクトのマップ */
  equippedParts: EquippedParts;
  /** クローゼットで設定した各レイヤーの位置・角度・サイズ・前後順の微調整マップ */
  adjustments?: LayerAdjustmentMap;
  /** レイヤーの前後描画順序（指定時は最優先。配列の先頭インデックス0が最背面、末尾が最前面） */
  layerOrder?: AvatarCategory[];
  /** 親子ソケットによる自動位置・腕・足・持ち物吸着を有効にするか（デフォルト: true） */
  autoRig?: boolean;
  /** 表示サイズ: 'sm'(48px) | 'md'(128px) | 'lg'(256px) | 'full'(親要素100%) | 数値(px) */
  size?: AvatarSize;
  /** ONの時、背景以外のキャラ全身が呼吸するように上下し、ペットやエフェクトが揺れるCSSアニメーションを適用 */
  animate?: boolean;
  /** ONの時、顔〜胸元あたりにズームして丸型アイコンとして切り抜いて表示するモード */
  faceOnly?: boolean;
  /** 任意の切り抜き範囲（512x512座標系）。指定時は faceOnly のデフォルト範囲より優先 */
  crop?: CropRect;
  /** 非表示にするレイヤー一覧 */
  hiddenLayers?: AvatarCategory[];
  /** 全パーツが未装着（なし）の時に空状態のガイド枠を表示するか */
  showEmptyPlaceholder?: boolean;
  /** 現在微調整中のレイヤーを視覚的にハイライトする（クローゼット用） */
  highlightLayer?: AvatarCategory | null;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

const DEFAULT_FACE_HIDDEN_LAYERS: AvatarCategory[] = ['pet', 'front_effect'];

function computeContainerSizeStyle(size: AvatarSize): CSSProperties {
  if (size === 'full') {
    return { width: '100%', aspectRatio: '1 / 1' };
  }
  const px = typeof size === 'number' ? size : SIZE_PRESET_PX[size];
  return { width: px, height: px };
}



function LayerImg({
  src,
  category,
  adjustment,
  customPivot,
  sleeveMask,
  bodyMaskStrokes,
  highlighted,
}: {
  src: string;
  category: AvatarCategory;
  adjustment?: LayerAdjustment;
  customPivot?: { x: number; y: number };
  sleeveMask?: { cx: number; cy: number; radius: number };
  bodyMaskStrokes?: BodyMaskStroke[];
  highlighted?: boolean;
}) {
  const adjStyle = adjustmentToLayerStyle(category, adjustment, customPivot);
  const maskStyle = createBodyMaskStrokesStyle(bodyMaskStrokes, sleeveMask);

  const imgNode = (
    <img
      src={src}
      alt=""
      draggable={false}
      decoding="async"
      data-avatar-layer={category}
      style={adjStyle}
      className={`pointer-events-none absolute inset-0 h-full w-full select-none object-contain ${
        highlighted ? 'drop-shadow-[0_0_6px_rgba(79,70,229,0.55)]' : ''
      }`}
    />
  );

  if (maskStyle) {
    return (
      <div className="pointer-events-none absolute inset-0" style={maskStyle}>
        {imgNode}
      </div>
    );
  }

  return imgNode;
}

/**
 * 既存アプリ組み込み用：アバター描画コンポーネント (<AvatarRenderer />)
 *
 * - 512x512px の共通座標系に正規化された全18レイヤーを下から順に重ねて表示します。
 * - `autoRig`（デフォルトON）により、服（トップス・ボトムス）の肩・袖・股関節ソケットに合わせて
 *   腕・手・脚・靴・持ち物の位置を自動計算して吸着させ、長袖着用時の二の腕マスクや3層サンドイッチ指先チップも適用します。
 */
export const AvatarRenderer = memo(function AvatarRenderer({
  equippedParts,
  adjustments,
  layerOrder,
  autoRig = false,
  size = 'md',
  animate = false,
  faceOnly = false,
  crop,
  hiddenLayers,
  showEmptyPlaceholder = false,
  highlightLayer = null,
  alt = 'アバター',
  className = '',
  style,
  onClick,
}: AvatarRendererProps) {
  // 親子ソケット自動吸着＋長袖マスク＋3層サンドイッチ指先チップの解決
  const solvedRig = useMemo(
    () => solveAutoRigAdjustments(equippedParts, adjustments, autoRig),
    [equippedParts, adjustments, autoRig],
  );

  const hiddenSet = useMemo(
    () =>
      new Set<AvatarCategory>([
        ...(hiddenLayers ?? (faceOnly ? DEFAULT_FACE_HIDDEN_LAYERS : [])),
        ...Array.from(solvedRig.autoHiddenLayers),
      ]),
    [faceOnly, hiddenLayers, solvedRig.autoHiddenLayers],
  );

  // 方法①：服（トップス・ボトムス・靴・独立手足）のシルエットに合わせた素体・脚のはみ出し自動カッティング
  const clippedSources = useSilhouetteClippedSources(equippedParts, solvedRig, hiddenSet);

  const getLayerSrc = (category: AvatarCategory): string | null => {
    if (hiddenSet.has(category)) return null;
    return resolvePartSrc(equippedParts[category]);
  };

  const renderSingleLayer = (category: AvatarCategory) => {
    const rawSrc = getLayerSrc(category);
    if (!rawSrc) return null;

    // 靴カテゴリかつ左右ペア分割パーツ (pairParts) を持つ場合、左右別々に描画
    if (category === 'shoes') {
      const partVal = equippedParts.shoes;
      const partObj = typeof partVal === 'object' && partVal !== null ? partVal : null;
      if (partObj && partObj.pairParts) {
        const baseAdj = solvedRig.effectiveAdjustments.shoes ?? { ...DEFAULT_LAYER_ADJUSTMENT };
        const leftAdj = getEffectivePairAdjustment(baseAdj, 'left');
        const rightAdj = getEffectivePairAdjustment(baseAdj, 'right');

        return (
          <Fragment key="shoes-pair">
            {/* 右足（向かって左） */}
            <LayerImg
              key="shoes-pair-right"
              src={partObj.pairParts.rightSrc}
              category="shoes"
              adjustment={rightAdj}
              customPivot={solvedRig.customPivots.shoes}
              highlighted={highlightLayer === 'shoes'}
            />
            {/* 左足（向かって右） */}
            <LayerImg
              key="shoes-pair-left"
              src={partObj.pairParts.leftSrc}
              category="shoes"
              adjustment={leftAdj}
              customPivot={solvedRig.customPivots.shoes}
              highlighted={highlightLayer === 'shoes'}
            />
          </Fragment>
        );
      }
    }

    // シルエット自動カッティング済みの 512x512 ワールド座標画像がある場合は（変形適用済みのため adjustment=undefined で）描画
    const clippedWorldSrc =
      category === 'body' || category === 'leg_left' || category === 'leg_right'
        ? clippedSources[category]
        : undefined;

    const sleeveMask =
      category === 'arm_left' || category === 'arm_right'
        ? solvedRig.armSleeveMasks[category]
        : undefined;
    const bodyMaskStrokes =
      category === 'body' ||
      category === 'leg_left' ||
      category === 'leg_right' ||
      category === 'arm_left' ||
      category === 'arm_right'
        ? solvedRig.activeBodyMaskStrokes
        : undefined;
    return (
      <LayerImg
        key={category}
        src={clippedWorldSrc ?? rawSrc}
        category={category}
        adjustment={clippedWorldSrc ? undefined : solvedRig.effectiveAdjustments[category]}
        customPivot={clippedWorldSrc ? undefined : solvedRig.customPivots[category]}
        sleeveMask={sleeveMask}
        bodyMaskStrokes={bodyMaskStrokes}
        highlighted={highlightLayer === category}
      />
    );
  };

  const targetLayerOrder =
    layerOrder ?? adjustments?.layerOrder ?? solvedRig.effectiveAdjustments?.layerOrder;
  const hasCustomLayerOrder = Boolean(targetLayerOrder && targetLayerOrder.length > 0);
  const activeLayerOrder = useMemo(
    () => resolveAvatarLayerOrder(adjustments ?? solvedRig.effectiveAdjustments, targetLayerOrder),
    [adjustments, solvedRig.effectiveAdjustments, targetLayerOrder],
  );

  const orderedBodyLayers = getOrderedCharacterBodyLayers(
    solvedRig.effectiveAdjustments,
    solvedRig.activeHandHoldMode,
  );
  const hasAnyVisibleLayer =
    AVATAR_LAYERS.some((cat) => Boolean(getLayerSrc(cat))) ||
    Boolean(solvedRig.solvedHandItems && solvedRig.solvedHandItems.length > 0);
  const activeCrop = crop ?? (faceOnly ? FACE_CROP : FULL_CROP);

  // 全持ち物アイテムを描画（カスタムレイヤー順序用）
  const renderAllHandItems = () => {
    if (hiddenSet.has('hand_item')) return null;

    const items =
      solvedRig.solvedHandItems && solvedRig.solvedHandItems.length > 0
        ? solvedRig.solvedHandItems
        : [];

    if (items.length === 0) {
      const handSrc = getLayerSrc('hand_item');
      if (!handSrc) return null;
      const isBobbing = Boolean(solvedRig.effectiveAdjustments.hand_item?.bobbing);
      return (
        <div
          key="hand_item_single_custom"
          className={`avatar-hand-item-layer absolute inset-0 ${
            isBobbing ? 'avatar-item-bobbing' : 'avatar-item-static'
          }`}
        >
          <LayerImg
            src={handSrc}
            category="hand_item"
            adjustment={solvedRig.effectiveAdjustments.hand_item}
            customPivot={solvedRig.customPivots.hand_item}
            highlighted={highlightLayer === 'hand_item'}
          />
        </div>
      );
    }

    return (
      <div
        key="hand_items_all_custom"
        className="avatar-hand-items-group absolute inset-0 pointer-events-none"
      >
        {items.map((item, idx) => {
          const itemSrc = resolvePartSrc(item.part);
          if (!itemSrc) return null;
          const isBobbing = Boolean(item.isBobbing);
          return (
            <div
              key={`hand_item_${item.part.id || idx}`}
              className={`avatar-hand-item-layer absolute inset-0 ${
                isBobbing ? 'avatar-item-bobbing' : 'avatar-item-static'
              }`}
              style={
                isBobbing && items.length > 1
                  ? { animationDelay: `${(idx % 3) * -0.7}s` }
                  : undefined
              }
            >
              <LayerImg
                src={itemSrc}
                category="hand_item"
                adjustment={item.effectiveAdjustment}
                customPivot={item.customPivot}
                highlighted={highlightLayer === 'hand_item'}
              />
            </div>
          );
        })}
      </div>
    );
  };

  // 持ち物アイテムを各レイヤースロット（Z階層）ごとに振り分けて描画（従来モード用）
  const renderHandItemsForPlacement = (targetPlacement: ItemLayerPlacement) => {
    if (hiddenSet.has('hand_item')) return null;

    const items =
      solvedRig.solvedHandItems && solvedRig.solvedHandItems.length > 0
        ? solvedRig.solvedHandItems.filter(
            (item) => (item.layerPlacement ?? 'behind_arm') === targetPlacement,
          )
        : [];

    // 単一持ち物のフォールバック（手動微調整からの解決）
    if (items.length === 0 && (!solvedRig.solvedHandItems || solvedRig.solvedHandItems.length === 0)) {
      const fallbackPlacement =
        solvedRig.effectiveAdjustments.hand_item?.layerPlacement ??
        (solvedRig.activeHandHoldMode === 'in_front' ? 'in_front_arm' : 'behind_arm');
      if (fallbackPlacement === targetPlacement) {
        const handSrc = getLayerSrc('hand_item');
        if (!handSrc) return null;
        const isBobbing = Boolean(solvedRig.effectiveAdjustments.hand_item?.bobbing);
        return (
          <div
            key={`hand_item_single_${targetPlacement}`}
            className={`avatar-hand-item-layer absolute inset-0 ${
              isBobbing ? 'avatar-item-bobbing' : 'avatar-item-static'
            }`}
          >
            <LayerImg
              src={handSrc}
              category="hand_item"
              adjustment={solvedRig.effectiveAdjustments.hand_item}
              customPivot={solvedRig.customPivots.hand_item}
              highlighted={highlightLayer === 'hand_item'}
            />
          </div>
        );
      }
      return null;
    }

    if (items.length === 0) return null;

    return (
      <div
        key={`hand_items_slot_${targetPlacement}`}
        className="avatar-hand-items-group absolute inset-0 pointer-events-none"
      >
        {items.map((item, idx) => {
          const itemSrc = resolvePartSrc(item.part);
          if (!itemSrc) return null;
          const isBobbing = Boolean(item.isBobbing);
          return (
            <div
              key={`hand_item_${item.part.id || idx}`}
              className={`avatar-hand-item-layer absolute inset-0 ${
                isBobbing ? 'avatar-item-bobbing' : 'avatar-item-static'
              }`}
              style={
                isBobbing && items.length > 1
                  ? { animationDelay: `${(idx % 3) * -0.7}s` }
                  : undefined
              }
            >
              <LayerImg
                src={itemSrc}
                category="hand_item"
                adjustment={item.effectiveAdjustment}
                customPivot={item.customPivot}
                highlighted={highlightLayer === 'hand_item'}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      role="img"
      aria-label={alt}
      onClick={onClick}
      className={[
        'avatar-renderer-root relative shrink-0 overflow-hidden select-none',
        faceOnly ? 'rounded-full' : '',
        animate ? 'avatar-animated' : '',
        onClick ? 'cursor-pointer' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ ...computeContainerSizeStyle(size), ...style }}
    >
      <div className="absolute" style={cropToStageStyle(activeCrop)}>
        {hasCustomLayerOrder ? (
          /* ===== カスタムレイヤー順序レンダリング（全18レイヤーの前後順を完全制御） ===== */
          activeLayerOrder.map((category) => {
            if (hiddenSet.has(category)) return null;

            if (category === 'background') {
              return renderSingleLayer('background');
            }

            if (category === 'back_effect') {
              return getLayerSrc('back_effect') ? (
                <div key="back_effect" className="avatar-back-fx-layer absolute inset-0">
                  {renderSingleLayer('back_effect')}
                </div>
              ) : null;
            }

            if (category === 'front_effect') {
              return getLayerSrc('front_effect') ? (
                <div key="front_effect" className="avatar-front-fx-layer absolute inset-0">
                  {renderSingleLayer('front_effect')}
                </div>
              ) : null;
            }

            if (category === 'pet') {
              return getLayerSrc('pet') ? (
                <div key="pet" className="avatar-pet-layer absolute inset-0">
                  {renderSingleLayer('pet')}
                </div>
              ) : null;
            }

            if (category === 'hand_item') {
              return renderAllHandItems();
            }

            // キャラクター本体の各レイヤー（個別レイヤーごとに呼吸アニメーション連動）
            return (
              <div
                key={category}
                data-layer-id={category}
                className="avatar-body-layer absolute inset-0 pointer-events-none"
              >
                {renderSingleLayer(category)}
              </div>
            );
          })
        ) : (
          /* ===== 標準レンダリング（腕はデフォルトで服の後ろ） ===== */
          <>
            {/* 1. 背景 */}
            {renderSingleLayer('background')}

            {/* 2. 背面オーラ・エフェクト */}
            {getLayerSrc('back_effect') && (
              <div className="avatar-back-fx-layer absolute inset-0">
                {renderSingleLayer('back_effect')}
              </div>
            )}

            {/* 2.5 持ち物：最背面 (back_lowest: 大きな翼・マント・背後エフェクト) */}
            {renderHandItemsForPlacement('back_lowest')}

            {/* 3〜16. キャラクター全身グループ */}
            <div className="avatar-body-group absolute inset-0">
              {/* 3. 後ろ髪 */}
              {renderSingleLayer('hair_back')}

              {/* 3.5 持ち物：体の奥 (behind_body: 背中の弓矢・リュック・後ろ手) */}
              {renderHandItemsForPlacement('behind_body')}

              {/* 4. 素体（胴体） */}
              {renderSingleLayer('body')}

              {/* 4.5 脚・足（素体の手前に配置され、ワンピースやスカートの下から自然に伸びる） */}
              {renderSingleLayer('leg_left')}
              {renderSingleLayer('leg_right')}

              {/* 5.5 持ち物：手の奥 (behind_arm: 剣・ステッキ・ほうき・釣り竿などを自然に握る位置) */}
              {renderHandItemsForPlacement('behind_arm')}

              {/* 6. 腕・顔・衣装グループ（orderedBodyLayers のうち手持ち・個別処理カテゴリを除く） */}
              {orderedBodyLayers.map((category) => {
                if (
                  category === 'hand_item' ||
                  category === 'hair_back' ||
                  category === 'leg_left' ||
                  category === 'leg_right' ||
                  category === 'body'
                ) {
                  return null;
                }
                return renderSingleLayer(category);
              })}

              {/* 12.5 持ち物：手の前 (in_front_arm: 盾・ぬいぐるみ・花束・本などを胸や手前に抱える位置) */}
              {renderHandItemsForPlacement('in_front_arm')}

              {/* 13. 前髪 */}
              {renderSingleLayer('hair_front')}

              {/* 14. 帽子・メガネ */}
              {renderSingleLayer('hat_glasses')}

              {/* 15. ペット */}
              {renderSingleLayer('pet')}

              {/* 15.5 持ち物：最前面 (front_highest: 突き出しアイテム・前面エフェクト) */}
              {renderHandItemsForPlacement('front_highest')}
            </div>

            {/* 16. 前面エフェクト・フレーム */}
            {getLayerSrc('front_effect') && (
              <div className="avatar-front-fx-layer absolute inset-0">
                {renderSingleLayer('front_effect')}
              </div>
            )}
          </>
        )}
      </div>

      {/* 全パーツが「なし（未装着）」の場合の控えめなプレースホルダー */}
      {!hasAnyVisibleLayer && showEmptyPlaceholder && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <div className="rounded-xl bg-slate-900/5 px-3 py-2 text-xs font-semibold text-slate-400">
            パーツ未装着（すべて「なし」）
          </div>
        </div>
      )}
    </div>
  );
});
