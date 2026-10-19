import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Child } from '../types';
import { updateChildAvatarStudio } from '../actions';
import { sound } from '../sound';
import { burst } from '../effects';
import { toast } from './ui';
import {
  AvatarRenderer,
  getLayerAdjustment,
  isDressOrOnePiecePart,
  resolveChildEquippedParts,
  resolvePartKey,
  resolvePartSrc,
  usePartCatalog,
  type AvatarCategory,
  type AvatarPart,
  type EquippedParts,
  type EquippedPartMap,
  type LayerAdjustmentMap,
} from '../features/avatar';
import {
  X,
  Sparkles,
  Check,
  RotateCcw,
  Ban,
  Lock,
  Heart,
  Shirt,
  Scissors,
  Footprints,
  Waves,
  Crown,
  Sword,
  Cat,
  Smile,
  Image as ImageIcon,
  type LucideIcon,
} from 'lucide-react';

/** 子ども向けに親しみやすく整理した大カテゴリ定義 */
interface ChildCategoryTab {
  id: string;
  label: string;
  icon: LucideIcon;
  emoji: string;
  color: string;
  bgLight: string;
  categories: AvatarCategory[];
  subTabs?: { category: AvatarCategory; label: string }[];
}

const CHILD_CATEGORIES: ChildCategoryTab[] = [
  {
    id: 'tops',
    label: 'ふく',
    icon: Shirt,
    emoji: '👕',
    color: 'text-sky-600',
    bgLight: 'bg-sky-50',
    categories: ['tops'],
  },
  {
    id: 'bottoms',
    label: 'ズボン',
    icon: Scissors,
    emoji: '👖',
    color: 'text-indigo-600',
    bgLight: 'bg-indigo-50',
    categories: ['bottoms'],
  },
  {
    id: 'shoes',
    label: 'くつ',
    icon: Footprints,
    emoji: '👟',
    color: 'text-emerald-600',
    bgLight: 'bg-emerald-50',
    categories: ['shoes'],
  },
  {
    id: 'hair',
    label: 'かみがた',
    icon: Waves,
    emoji: '💇',
    color: 'text-amber-600',
    bgLight: 'bg-amber-50',
    categories: ['hair_front', 'hair_back'],
    subTabs: [
      { category: 'hair_front', label: 'まえがみ' },
      { category: 'hair_back', label: 'うしろがみ' },
    ],
  },
  {
    id: 'hat_glasses',
    label: 'あたま',
    icon: Crown,
    emoji: '👑',
    color: 'text-rose-600',
    bgLight: 'bg-rose-50',
    categories: ['hat_glasses'],
  },
  {
    id: 'hand_item',
    label: 'もちもの',
    icon: Sword,
    emoji: '🗡️',
    color: 'text-purple-600',
    bgLight: 'bg-purple-50',
    categories: ['hand_item'],
  },
  {
    id: 'pet',
    label: 'ペット',
    icon: Cat,
    emoji: '🐾',
    color: 'text-orange-600',
    bgLight: 'bg-orange-50',
    categories: ['pet'],
  },
  {
    id: 'face',
    label: 'おかお',
    icon: Smile,
    emoji: '😊',
    color: 'text-pink-600',
    bgLight: 'bg-pink-50',
    categories: ['face_eyes'],
  },
  {
    id: 'bg',
    label: 'はいけい',
    icon: ImageIcon,
    emoji: '🌈',
    color: 'text-teal-600',
    bgLight: 'bg-teal-50',
    categories: ['background', 'front_effect', 'back_effect'],
    subTabs: [
      { category: 'background', label: 'はいけい' },
      { category: 'front_effect', label: 'エフェクト' },
    ],
  },
];

import { memo } from 'react';

/** パーツごとにクローズアップ表示するためのサムネイルコンポーネント (高速化のためmemo化) */
const PartThumbnail = memo(function PartThumbnail({ part }: { part: AvatarPart }) {
  const bounds = part.rig?.bounds;

  // バウンディングボックスまたはカテゴリからズーム＆パンを算出
  let scale = 1.3;
  let translateX = 0;
  let translateY = 0;

  if (
    bounds &&
    typeof bounds.width === 'number' &&
    typeof bounds.height === 'number' &&
    bounds.width > 0 &&
    bounds.height > 0
  ) {
    const maxDim = Math.max(bounds.width, bounds.height);
    if (Number.isFinite(maxDim) && maxDim > 0) {
      scale = Math.min(3.2, Math.max(1.1, (512 * 0.72) / maxDim));
      translateX = ((256 - bounds.centerX) / 512) * 100;
      translateY = ((256 - bounds.centerY) / 512) * 100;
      if (!Number.isFinite(translateX)) translateX = 0;
      if (!Number.isFinite(translateY)) translateY = 0;
    }
  } else {
    // カテゴリ別のセンタリング位置
    switch (part.category) {
      case 'tops':
        scale = 1.9;
        translateY = -8;
        break;
      case 'bottoms':
        scale = 2.4;
        translateY = -28;
        break;
      case 'shoes':
        scale = 2.8;
        translateY = -42;
        break;
      case 'hair_front':
      case 'hair_back':
        scale = 2.0;
        translateY = 22;
        break;
      case 'hat_glasses':
        scale = 2.2;
        translateY = 28;
        break;
      case 'hand_item':
        scale = 2.2;
        translateX = -14;
        translateY = -14;
        break;
      case 'pet':
        scale = 2.0;
        translateX = 22;
        translateY = -28;
        break;
      case 'face_eyes':
      case 'face_mouth':
        scale = 3.0;
        translateY = 18;
        break;
      case 'body':
        scale = 1.3;
        translateY = 0;
        break;
      default:
        scale = 1.0;
        break;
    }
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-white/80 p-1">
      <img
        src={part.src}
        alt={part.name}
        className="pointer-events-none select-none h-full w-full object-contain transition-transform duration-200 group-hover:scale-110"
        style={{
          transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`,
          transformOrigin: 'center center',
        }}
        loading="lazy"
      />
    </div>
  );
});

export function AvatarMaker({
  child,
  onClose,
  onOpenGacha,
}: {
  child: Child;
  onClose: () => void;
  onOpenGacha?: () => void;
}) {
  // 親がアバター工房で登録した自作パーツを含む全パーツ一覧を購読
  const { parts: catalogParts } = usePartCatalog();

  // 現在選択中の大カテゴリタブ
  const [activeTabId, setActiveTabId] = useState<string>('tops');
  const activeTab = useMemo(
    () => CHILD_CATEGORIES.find((t) => t.id === activeTabId) ?? CHILD_CATEGORIES[0],
    [activeTabId],
  );

  // サブタブがある場合の選択中カテゴリ
  const [activeSubCategory, setActiveSubCategory] = useState<AvatarCategory | null>(null);
  const currentCategory: AvatarCategory = useMemo(() => {
    if (activeTab.subTabs && activeSubCategory && activeTab.categories.includes(activeSubCategory)) {
      return activeSubCategory;
    }
    return activeTab.categories[0];
  }, [activeTab, activeSubCategory]);

  // 初期装備状態を解決
  const initialEquippedParts: EquippedParts = useMemo(() => {
    return resolveChildEquippedParts(child.avatarStudio ?? undefined, catalogParts);
  }, [child.avatarStudio, catalogParts]);

  // 子どもがリアルタイムで試着中の装備状態
  const [draftEquipped, setDraftEquipped] = useState<EquippedParts>(initialEquippedParts);
  const [draftAdjustments, setDraftAdjustments] = useState<LayerAdjustmentMap>(
    () => ({ ...(child.avatarStudio?.adjustments || {}) }),
  );
  // ユーザーが手動でパーツを試着選択したかどうかのフラグ
  const hasUserInteractedRef = useRef(false);

  const [sparkleCount, setSparkleCount] = useState(0);
  const [jumping, setJumping] = useState(false);

  // 複数持ち物リスト
  const currentHandItems: (AvatarPart | string)[] = useMemo(() => {
    if (Array.isArray(draftEquipped.hand_items) && draftEquipped.hand_items.length > 0) {
      return draftEquipped.hand_items.filter((p): p is AvatarPart | string => Boolean(p));
    }
    if (draftEquipped.hand_item) {
      return [draftEquipped.hand_item];
    }
    return [];
  }, [draftEquipped.hand_items, draftEquipped.hand_item]);

  const currentHandItemIds = useMemo(() => {
    return currentHandItems.map((p) => (typeof p === 'string' ? p : p.id));
  }, [currentHandItems]);

  // カタログ（IndexedDB）の非同期ロード完了時や、保存済み装備の確実な初期同期
  useEffect(() => {
    if (!hasUserInteractedRef.current) {
      // ユーザーが手動操作する前は、IndexedDBカタログがロード完了して解決された最新の initialEquippedParts をそのまま 100% 反映！
      setDraftEquipped(initialEquippedParts);
      setDraftAdjustments({ ...(child.avatarStudio?.adjustments || {}) });
      return;
    }

    // 手動操作後も、素体の更新や脱げてしまっている部位の安全フォールバックは確実に追従
    setDraftEquipped((prev) => {
      let changed = false;
      const next = { ...prev };

      // 素体の追従
      const prevBodyId = resolvePartKey(prev.body);
      const prevBodySrc = resolvePartSrc(prev.body);
      const initBodyId = resolvePartKey(initialEquippedParts.body);
      if (initialEquippedParts.body && (!prev.body || prevBodyId !== initBodyId || !prevBodySrc)) {
        next.body = initialEquippedParts.body;
        changed = true;
      }

      // 未設定部位のフォールバック
      const requiredCategories: AvatarCategory[] = [
        'tops',
        'bottoms',
        'shoes',
        'hair_front',
        'hair_back',
        'face_eyes',
      ];
      for (const cat of requiredCategories) {
        if (prev[cat] === undefined && initialEquippedParts[cat]) {
          next[cat] = initialEquippedParts[cat];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [initialEquippedParts, child.avatarStudio?.adjustments]);

  // カテゴリ変更時にサブカテゴリを初期化
  const handleSelectTab = (tabId: string) => {

    sound.tap();
    setActiveTabId(tabId);
    const target = CHILD_CATEGORIES.find((t) => t.id === tabId);
    if (target?.subTabs && target.subTabs.length > 0) {
      setActiveSubCategory(target.subTabs[0].category);
    } else if (target) {
      setActiveSubCategory(target.categories[0]);
    }
  };

  // 現在のカテゴリに該当するパーツを抽出
  const categoryParts = useMemo(() => {
    if (activeTabId === 'face') {
      // 「おかお」タブの場合：親の自作顔パーツ（face_eyes / face_mouth / face）を最優先抽出し、
      // プリセットからは代表的な表情パーツを表示
      return catalogParts.filter((p) => {
        if (p.source === 'custom' || !p.id.startsWith('preset_')) {
          return p.category === 'face_eyes' || p.category === 'face_mouth';
        }
        return p.category === 'face_eyes';
      });
    }
    return catalogParts.filter((p) => p.category === currentCategory);
  }, [catalogParts, currentCategory, activeTabId]);

  // 親が作った「てづくりパーツ」を先頭にソート
  const sortedParts = useMemo(() => {
    const parentMade: AvatarPart[] = [];
    const presets: AvatarPart[] = [];

    categoryParts.forEach((p) => {
      // sourceがcustom、またはメタデータにカスタムフラグがある場合は親作
      if (p.source === 'custom' || !p.id.startsWith('preset_')) {
        parentMade.push(p);
      } else {
        presets.push(p);
      }
    });

    return [...parentMade, ...presets];
  }, [categoryParts]);

  // パーツを選択（即時試着＆自動セット連動）
  const handleSelectPart = (part: AvatarPart | null) => {
    hasUserInteractedRef.current = true;
    sound.pop();
    setSparkleCount((c) => c + 1);

    setDraftEquipped((prev) => {
      const next = { ...prev };

      // === 1. おかお（表情全体）の選択処理 ===
      if (activeTabId === 'face' || currentCategory === 'face_eyes' || currentCategory === 'face_mouth') {
        if (!part) {
          // 「はずす」：目も口もクリア（旧SVGを残さない）
          next.face_eyes = null;
          next.face_mouth = null;
        } else {
          // 表情パーツ（目・眉・口・チークが一体のイラスト表情）：
          // 装着し、旧SVGの口や残骸を完全にクリア！
          next.face_eyes = part;
          next.face_mouth = null;
        }
        return next;
      }


      // === 2. トップス（服・ワンピース）の選択処理 ＆ 手・腕・足・ボトムスの自動連動 ===
      if (currentCategory === 'tops') {
        if (!part) {
          next.tops = null;
          // 服をはずした場合、セットされていた腕もはずす（素体の腕に戻す）
          next.arm_left = null;
          next.arm_right = null;
        } else {
          next.tops = part;
          const isOnePiece = isDressOrOnePiecePart(part);

          // ワンピース・ドレスの場合のみズボンを外す。
          // ワンピース以外の通常の服（Tシャツ・パーカー等）では絶対にズボンを外さない！
          if (isOnePiece) {
            next.bottoms = null;
          } else if (!next.bottoms) {
            // 直前までワンピースを着ていてズボンが脱げていた場合、ズボンを自動復元！
            next.bottoms =
              initialEquippedParts.bottoms ??
              catalogParts.find((p) => p.category === 'bottoms') ??
              null;
          }

          // トップスにセット記憶された手・腕・足（linkedParts）があれば自動で一緒に連動
          if (part.linkedParts) {
            if (part.linkedParts.arm_left !== undefined) {
              const armLeft = part.linkedParts.arm_left
                ? catalogParts.find((p) => p.id === part.linkedParts!.arm_left) ?? null
                : null;
              next.arm_left = armLeft;
            }
            if (part.linkedParts.arm_right !== undefined) {
              const armRight = part.linkedParts.arm_right
                ? catalogParts.find((p) => p.id === part.linkedParts!.arm_right) ?? null
                : null;
              next.arm_right = armRight;
            }
            // ワンピース・ドレス用の足（脚）連動
            if (part.linkedParts.leg_left !== undefined) {
              const legLeft = part.linkedParts.leg_left
                ? catalogParts.find((p) => p.id === part.linkedParts!.leg_left) ?? null
                : null;
              next.leg_left = legLeft;
            }
            if (part.linkedParts.leg_right !== undefined) {
              const legRight = part.linkedParts.leg_right
                ? catalogParts.find((p) => p.id === part.linkedParts!.leg_right) ?? null
                : null;
              next.leg_right = legRight;
            }
            // ボトムス連動はワンピース・ドレスの場合のみ適用（通常の服では外さない）
            if (isOnePiece && part.linkedParts.bottoms !== undefined) {
              const bottomsPart = part.linkedParts.bottoms
                ? catalogParts.find((p) => p.id === part.linkedParts!.bottoms) ?? null
                : null;
              next.bottoms = bottomsPart;
            }
          }
        }
        return next;
      }

      // === 3. ボトムス（ズボン）の選択処理 ＆ 脚・足の自動セット連動 ===
      if (currentCategory === 'bottoms') {
        if (!part) {
          next.bottoms = null;
          next.leg_left = null;
          next.leg_right = null;
        } else {
          next.bottoms = part;
          // ボトムスにセット記憶された脚・足（linkedParts）があれば自動で一緒に装備
          if (part.linkedParts) {
            if (part.linkedParts.leg_left !== undefined) {
              const legLeft = part.linkedParts.leg_left
                ? catalogParts.find((p) => p.id === part.linkedParts!.leg_left) ?? null
                : null;
              next.leg_left = legLeft;
            }
            if (part.linkedParts.leg_right !== undefined) {
              const legRight = part.linkedParts.leg_right
                ? catalogParts.find((p) => p.id === part.linkedParts!.leg_right) ?? null
                : null;
              next.leg_right = legRight;
            }
          }
        }
        return next;
      }

      // === 4. もちもの（複数選択・トグル） ===
      if (currentCategory === 'hand_item') {
        const currentList = Array.isArray(prev.hand_items)
          ? [...prev.hand_items]
          : prev.hand_item
          ? [prev.hand_item]
          : [];
        if (!part) {
          // 「はずす」：全持ち物をはずす
          next.hand_item = null;
          next.hand_items = [];
        } else {
          const existsIdx = currentList.findIndex(
            (p) => (typeof p === 'string' ? p : p?.id) === part.id,
          );
          if (existsIdx >= 0) {
            // すでに装備中の場合は外す（トグル）
            const filtered = currentList.filter(
              (p) => (typeof p === 'string' ? p : p?.id) !== part.id,
            );
            next.hand_items = filtered;
            next.hand_item = filtered[0] ?? null;
          } else {
            // 新しく追加（何個でも可能）
            const added = [...currentList, part];
            next.hand_items = added;
            next.hand_item = added[0];
          }
        }
        return next;
      }

      // その他の通常パーツ
      next[currentCategory] = part;
      return next;
    });

    // セット記憶された手足の配置（位置情報など）があれば反映
    if (part?.linkedParts?.adjustments) {
      setDraftAdjustments((prev) => ({
        ...prev,
        ...part.linkedParts!.adjustments,
      }));
    }
  };

  // 持ち物ごとの上下動（ボビング・浮遊）トグル
  const handleToggleHandItemBobbing = (partId: string) => {
    sound.tap();
    setDraftAdjustments((prev) => {
      const currentMap = prev.handItemAdjustments || {};
      const isFirstItem = Boolean(
        currentHandItems[0] &&
          (typeof currentHandItems[0] === 'string'
            ? currentHandItems[0] === partId
            : currentHandItems[0].id === partId),
      );

      // 現在のボビング状態（handItemAdjustments または hand_item から判定）
      const currentBobbing = Boolean(
        currentMap[partId]?.bobbing ??
          (isFirstItem ? prev.hand_item?.bobbing : false),
      );
      const nextBobbing = !currentBobbing;

      const existingAdj =
        currentMap[partId] ??
        (isFirstItem && prev.hand_item ? prev.hand_item : undefined);

      const baseAdj = existingAdj || {
        dx: 0,
        dy: 0,
        scale: 1,
        rotation: 0,
        flipX: false,
      };

      const updatedItemAdj: import('../features/avatar').LayerAdjustment = {
        ...baseAdj,
        bobbing: nextBobbing,
      };

      return {
        ...prev,
        handItemAdjustments: {
          ...currentMap,
          [partId]: updatedItemAdj,
        },
        // 最初の持ち物なら hand_item の bobbing も確実に同期
        ...(isFirstItem
          ? {
              hand_item: {
                ...(prev.hand_item || baseAdj),
                bobbing: nextBobbing,
              },
            }
          : {}),
      };
    });
  };

  // 全身アバターをタップしたときのジャンプ演出
  const handleTapAvatar = () => {
    if (jumping) return;
    sound.pop();
    setJumping(true);
    window.setTimeout(() => setJumping(false), 550);
  };

  // 元の装備にもどす
  const handleResetToCurrent = () => {
    hasUserInteractedRef.current = false;
    sound.tap();
    setDraftEquipped(initialEquippedParts);
    setDraftAdjustments({ ...(child.avatarStudio?.adjustments || {}) });
    toast('着せ替えをもとに戻したよ', '🔄');
  };

  // 「これにする！✨」保存して決定
  const handleSaveAndConfirm = useCallback(() => {
    sound.fanfare();
    burst();

    // IDマップへ変換
    const idMap: Partial<Record<AvatarCategory, string | null>> = {};
    for (const [cat, part] of Object.entries(draftEquipped)) {
      if (cat === 'hand_items') continue;
      if (!part) {
        idMap[cat as AvatarCategory] = null;
      } else if (typeof part === 'string') {
        idMap[cat as AvatarCategory] = part;
      } else if (!Array.isArray(part)) {
        idMap[cat as AvatarCategory] = (part as AvatarPart).id;
      }
    }

    // 素体（body）が未選択またはnullになるのを防ぐ安全ガード
    if (!idMap.body) {
      idMap.body =
        resolvePartKey(draftEquipped.body) ??
        resolvePartKey(initialEquippedParts.body) ??
        'preset_body_default';
    }

    // 複数持ち物IDリスト
    const handItemIds: string[] = [];
    if (Array.isArray(draftEquipped.hand_items)) {
      for (const item of draftEquipped.hand_items) {
        if (!item) continue;
        const id = typeof item === 'string' ? item : item.id;
        if (id && !handItemIds.includes(id)) {
          handItemIds.push(id);
        }
      }
    } else if (draftEquipped.hand_item) {
      const id =
        typeof draftEquipped.hand_item === 'string'
          ? draftEquipped.hand_item
          : draftEquipped.hand_item.id;
      if (id) handItemIds.push(id);
    }

    // 最初の持ち物を idMap.hand_item に設定
    idMap.hand_item = handItemIds[0] ?? null;

    updateChildAvatarStudio(child.id, idMap, draftAdjustments, handItemIds);
    toast('アバターをきせかえたよ！かっこいいね！✨', '🎉');
    onClose();
  }, [child.id, draftEquipped, draftAdjustments, initialEquippedParts.body, onClose]);

  // 現在装着中のパーツ（おかおの場合は face_eyes または face_mouth を参照）
  const currentEquippedPart =
    activeTabId === 'face'
      ? draftEquipped.face_eyes ?? draftEquipped.face_mouth
      : draftEquipped[currentCategory];
  const currentEquippedId =
    typeof currentEquippedPart === 'string'
      ? currentEquippedPart
      : (currentEquippedPart as AvatarPart | null)?.id ?? null;

  return (
    <div className="relative flex flex-col max-h-[88vh] select-none text-slate-800">
      {/* ==================== 1. ヘッダーバー ==================== */}
      <div className="flex items-center justify-between border-b-2 border-amber-100/80 pb-3 px-1 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-md shadow-amber-200">
            <Sparkles size={22} className="animate-spin-slow" />
          </span>
          <div>
            <h3 className="text-base sm:text-xl font-black tracking-wide text-slate-800">
              {child.name} の きせかえルーム ✨
            </h3>
            <p className="text-[11px] sm:text-xs font-bold text-slate-400">
              タップして すきな服やパーツに着がえよう！
            </p>
          </div>
        </div>

        {/* 単一の押しやすい×ボタン（モーダル側と重複なし） */}
        <button
          type="button"
          onClick={onClose}
          className="btn-pop flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
          title="とじる"
          aria-label="とじる"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* ==================== 2. メインコンテンツ（スクロール可能エリア） ==================== */}
      <div className="flex-1 overflow-y-auto pt-3 pb-24 pr-1">
        {/* レスポンシブコンテナ: モバイルでは上下2段、PC（lg以上）では左右2段 */}
        <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-4 items-start">
          {/* ----- 上部（モバイル） / 左側（大画面）: アバタープレビュー ----- */}
          <div className="w-full flex flex-col items-center gap-2 rounded-3xl bg-gradient-to-b from-amber-50/80 via-white to-sky-50/60 p-3 sm:p-4 border-2 border-amber-200/70 shadow-sm shrink-0">
            <div className="relative flex items-center justify-center w-full">
              {/* 全身アバタープレビュー（コンパクト＆高さ抑制） */}
              <div
                onClick={handleTapAvatar}
                className={`group relative flex aspect-square w-48 sm:w-56 lg:w-60 cursor-pointer items-center justify-center overflow-hidden rounded-3xl bg-white shadow-md border-4 border-white transition-transform ${
                  jumping ? 'animate-rpg-jump' : 'hover:scale-[1.02] active:scale-95'
                }`}
                title="タップしてジャンプ！"
              >
                {/* キラキラ演出 */}
                {sparkleCount > 0 && (
                  <span className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                    <span className="animate-ping text-3xl">✨</span>
                  </span>
                )}

                <AvatarRenderer
                  equippedParts={draftEquipped}
                  adjustments={draftAdjustments}
                  size="full"
                  animate={true}
                />

                <span className="absolute bottom-2 left-2 rounded-full bg-slate-900/40 px-2.5 py-0.5 text-[10px] font-black text-white backdrop-blur-sm">
                  タップしてジャンプ！🦘
                </span>
              </div>

              {/* さいしょにもどすボタン（プレビュー枠の右上にコンパクト配置） */}
              <button
                type="button"
                onClick={handleResetToCurrent}
                className="btn-pop absolute top-1 right-1 flex items-center gap-1 rounded-xl bg-white/90 backdrop-blur-sm border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm hover:bg-slate-100"
                title="さいしょの状態にもどす"
              >
                <RotateCcw size={12} />
                <span>もどす</span>
              </button>
            </div>
          </div>

          {/* ----- 下部（モバイル） / 右側（大画面）: カテゴリタブ ＆ アイテムグリッド ----- */}
          <div className="w-full flex flex-col gap-3 min-w-0">
            {/* 大カテゴリタブバー（横スクロール可能・Nintendo Switch / あつ森風ピル型） */}
            <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
              {CHILD_CATEGORIES.map((tab) => {
                const isActive = activeTabId === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectTab(tab.id)}
                    className={`btn-pop flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs sm:text-sm font-black transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-200 ring-2 ring-amber-300 ring-offset-1 scale-105'
                        : 'bg-white text-slate-700 hover:bg-amber-50 border-2 border-slate-200/90 shadow-sm'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{tab.emoji}</span>
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* サブタブがある場合（まえがみ・うしろがみ 等） */}
            {activeTab.subTabs && (
              <div className="flex items-center gap-1.5 rounded-2xl bg-amber-100/60 p-1 w-fit border border-amber-200/60">
                {activeTab.subTabs.map((sub) => {
                  const isSubActive = currentCategory === sub.category;
                  return (
                    <button
                      key={sub.category}
                      type="button"
                      onClick={() => {
                        sound.tap();
                        setActiveSubCategory(sub.category);
                      }}
                      className={`rounded-xl px-3 py-1 text-xs font-bold transition whitespace-nowrap ${
                        isSubActive
                          ? 'bg-white text-amber-950 shadow-sm font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* もちものタブ専用：いま持っているアイテム一覧 ＆ ふわふわ上下動ON/OFFトグル */}
            {activeTabId === 'hand_item' && currentHandItems.length > 0 && (
              <div className="flex flex-col gap-2 rounded-2xl bg-purple-50/90 p-3 border-2 border-purple-200/80 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                    <span>🗡️</span>
                    <span>そうび中のもちもの（{currentHandItems.length}こ）</span>
                  </span>
                  <span className="text-[10px] font-bold text-purple-600">
                    タップで上下のアニメーションをきりかえられるよ！
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentHandItems.map((item) => {
                    const partId = typeof item === 'string' ? item : item.id;
                    const partName = typeof item === 'string' ? '持ち物' : item.name;
                    const isBobbing =
                      draftAdjustments.handItemAdjustments?.[partId]?.bobbing ??
                      (currentHandItems[0] && (typeof currentHandItems[0] === 'string' ? currentHandItems[0] : currentHandItems[0].id) === partId
                        ? draftAdjustments.hand_item?.bobbing
                        : false);
                    return (
                      <div
                        key={partId}
                        className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 shadow-sm border border-purple-200"
                      >
                        <span className="text-xs font-bold text-slate-800 truncate max-w-[100px] sm:max-w-[130px]">
                          {partName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleHandItemBobbing(partId)}
                          className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black transition active:scale-95 ${
                            isBobbing
                              ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm ring-1 ring-amber-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title="上下に動かすかどうか"
                        >
                          <span>{isBobbing ? '🎈 ふわふわ ON' : 'じっと OFF'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const partObj =
                              typeof item === 'string'
                                ? catalogParts.find((p) => p.id === item) ?? null
                                : item;
                            handleSelectPart(partObj);
                          }}
                          className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                          title="はずす"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* アイテム一覧グリッド（絶対に潰れない正方形カード群） */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3 p-1">
              {/* 「はずす」カード（素体以外） */}
              {currentCategory !== 'body' && (() => {
                const isNone =
                  currentCategory === 'hand_item'
                    ? currentHandItems.length === 0
                    : currentEquippedId === null;
                return (
                  <button
                    type="button"
                    onClick={() => handleSelectPart(null)}
                    className={`btn-pop group relative flex flex-col items-center justify-between rounded-2xl p-2.5 border-2 transition-all aspect-[4/5] min-h-[110px] sm:min-h-[125px] ${
                      isNone
                        ? 'border-amber-400 bg-amber-50/90 shadow-md ring-2 ring-amber-400 shadow-[0_4px_0_#f59e0b]'
                        : 'border-dashed border-slate-300 bg-slate-50/80 hover:bg-slate-100 text-slate-500 shadow-sm'
                    }`}
                  >
                    {isNone && (
                      <span className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-md">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}

                    <div className="my-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white shadow-inner border border-slate-200">
                      <Ban size={26} className="text-slate-400 group-hover:scale-110 transition-transform" />
                    </div>

                    <span className="mt-1 w-full text-center text-[11px] sm:text-xs font-black text-slate-600 truncate whitespace-nowrap px-1">
                      {currentCategory === 'hand_item' ? 'ぜんぶはずす' : 'はずす'}
                    </span>
                  </button>
                );
              })()}

              {/* パーツ一覧 */}
              {sortedParts.map((part) => {
                const isSelected =
                  currentCategory === 'hand_item'
                    ? currentHandItemIds.includes(part.id)
                    : currentEquippedId === part.id;
                const isParentMade = part.source === 'custom' || !part.id.startsWith('preset_');

                const meta = (part.meta ?? {}) as {
                  isGachaOnly?: boolean;
                  isShopOnly?: boolean;
                  rarity?: 1 | 2 | 3;
                  locked?: boolean;
                };
                const isLocked = meta.locked === true && !child.ownedItems.includes(part.id);

                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        sound.tap();
                        if (meta.isGachaOnly && onOpenGacha) {
                          toast('ガチャで手に入るアイテムだよ！', '✨');
                          onOpenGacha();
                        } else {
                          toast('まだ手に入っていないアイテムだよ！', '🔒');
                        }
                        return;
                      }
                      handleSelectPart(part);
                    }}
                    className={`btn-pop group relative flex flex-col items-center justify-between rounded-2xl p-2.5 border-2 transition-all aspect-[4/5] min-h-[110px] sm:min-h-[125px] ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50/90 shadow-md ring-2 ring-amber-400 shadow-[0_4px_0_#f59e0b]'
                        : isParentMade
                        ? 'border-pink-300 bg-pink-50/40 hover:bg-pink-50/80 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/30 shadow-sm'
                    }`}
                  >
                    {/* 💛 親が作った「てづくり」バッジ */}
                    {isParentMade && (
                      <span className="absolute top-1.5 left-1.5 z-10 flex items-center gap-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-black text-white shadow-sm animate-pulse">
                        <Heart size={9} fill="currentColor" />
                        <span className="whitespace-nowrap">てづくり</span>
                      </span>
                    )}

                    {/* 選択中チェックマーク */}
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-md">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}

                    {/* レア度バッジ（将来拡張） */}
                    {meta.rarity && meta.rarity > 1 && !isParentMade && (
                      <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-amber-950 shadow-sm">
                        ★{meta.rarity}
                      </span>
                    )}

                    {/* パーツサムネイル */}
                    <div className="my-auto h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-50/70 shadow-inner border border-slate-200/60 flex items-center justify-center">
                      <PartThumbnail part={part} />
                    </div>

                    {/* パーツ名（絶対に縦書きにならない） */}
                    <span className="mt-1 w-full text-center text-[11px] sm:text-xs font-black text-slate-800 truncate whitespace-nowrap px-1">
                      {part.name}
                    </span>

                    {/* ロック状態のオーバーレイ */}
                    {isLocked && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-slate-900/60 text-white p-1 backdrop-blur-[1px]">
                        <Lock size={18} className="mb-0.5 text-amber-300" />
                        <span className="text-[10px] font-black whitespace-nowrap">
                          {meta.isGachaOnly ? 'ガチャ' : 'ショップ'}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 3. フッター固定エリア（Sticky） ==================== */}
      <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-white via-white/95 to-white/0 pt-4 pb-2 px-2">
        <button
          type="button"
          onClick={handleSaveAndConfirm}
          className="btn-pop flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 py-3.5 sm:py-4 text-base sm:text-lg font-black text-white shadow-[0_5px_0_#ea580c] hover:brightness-105 active:translate-y-1 active:shadow-none"
        >
          <Sparkles size={20} className="animate-bounce" />
          <span>✨ これに きめた！ ✨</span>
        </button>
      </div>
    </div>
  );
}
