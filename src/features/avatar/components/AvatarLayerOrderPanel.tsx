import { useState, useMemo, type DragEvent } from 'react';
import type { AvatarCategory, EquippedPartMap } from '../types';
import { CATEGORY_META, DEFAULT_AVATAR_LAYER_ORDER } from '../constants';
import { resolvePartSrc } from '../utils/parts';
import { CATEGORY_ICONS } from './categoryIcons';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Layers,
  Filter,
  Eye,
  Sparkles,
} from 'lucide-react';

export interface AvatarLayerOrderPanelProps {
  /** 現在の全レイヤー描画順（配列先頭インデックス0が最背面、末尾が最前面） */
  layerOrder: AvatarCategory[];
  /** 現在装着中の装備マップ */
  equippedParts: EquippedPartMap;
  /** レイヤー順序変更時のコールバック */
  onLayerOrderChange: (newOrder: AvatarCategory[]) => void;
  /** 標準順序へのリセットコールバック */
  onResetLayerOrder: () => void;
  /** 現在選択中のカテゴリ（ハイライト用） */
  activeCategory?: AvatarCategory;
  /** カテゴリ選択時のコールバック */
  onSelectCategory?: (category: AvatarCategory) => void;
  className?: string;
}

/**
 * 全アイテムの前面〜後面レイヤー（Z-index）並び替えパネル
 * - 最前面（上）から最背面（下）への直感的なレイヤースタックUI
 * - ドラッグ＆ドロップおよび ↑ / ↓ ボタンによる自在な並び替え
 * - 「装着中のみ表示」トグルで必要なパーツだけに絞ってすっきり編集可能
 * - Tailwind Zinc系デザイン（モノトーン＋繊細な境界線）で完全統一
 */
export function AvatarLayerOrderPanel({
  layerOrder,
  equippedParts,
  onLayerOrderChange,
  onResetLayerOrder,
  activeCategory,
  onSelectCategory,
  className = '',
}: AvatarLayerOrderPanelProps) {
  // 装着中アイテムのみに絞り込むトグル（デフォルトON）
  const [filterEquippedOnly, setFilterEquippedOnly] = useState<boolean>(true);

  // ドラッグ＆ドロップ状態管理
  const [draggedCat, setDraggedCat] = useState<AvatarCategory | null>(null);
  const [dragOverCat, setDragOverCat] = useState<AvatarCategory | null>(null);

  // 画面上での表示順（上 ＝ 最前面、下 ＝ 最背面）
  // layerOrder は [最背面(0) ... 最前面(N-1)] なので、reverse して表示します
  const displayCategories = useMemo(() => {
    const reversed = [...layerOrder].reverse();
    if (!filterEquippedOnly) return reversed;

    return reversed.filter((cat) => {
      // 素体（body）は常に表示
      if (cat === 'body') return true;
      // 装備があるカテゴリを表示
      const part = equippedParts[cat];
      return Boolean(part);
    });
  }, [layerOrder, filterEquippedOnly, equippedParts]);

  // アイテムの移動処理
  const handleMove = (fromCat: AvatarCategory, toCat: AvatarCategory, place: 'before' | 'after') => {
    if (fromCat === toCat) return;
    const current = [...layerOrder];
    const fromIdx = current.indexOf(fromCat);
    if (fromIdx === -1) return;

    // fromCat を一度取り出す
    current.splice(fromIdx, 1);

    const toIdx = current.indexOf(toCat);
    if (toIdx === -1) return;

    // layerOrder は [0: 最背面 ... N-1: 最前面]
    // place === 'after' の場合、toCat の手前（前面: index + 1）に挿入
    // place === 'before' の場合、toCat の奥（背面: index）に挿入
    const insertIdx = place === 'after' ? toIdx + 1 : toIdx;
    current.splice(insertIdx, 0, fromCat);
    onLayerOrderChange(current);
  };

  // 1段階手前（前面）または奥（背面）へ移動
  const handleStep = (cat: AvatarCategory, direction: 'front' | 'back') => {
    // 表示リスト上でのインデックス（0 = 一番上/最前面、last = 一番下/最背面）
    const dispIdx = displayCategories.indexOf(cat);
    if (dispIdx === -1) return;

    if (direction === 'front' && dispIdx > 0) {
      // 1つ上（前面）のアイテムの手前へ配置
      const targetCat = displayCategories[dispIdx - 1];
      handleMove(cat, targetCat, 'after');
    } else if (direction === 'back' && dispIdx < displayCategories.length - 1) {
      // 1つ下（背面）のアイテムの奥へ配置
      const targetCat = displayCategories[dispIdx + 1];
      handleMove(cat, targetCat, 'before');
    }
  };

  // ドラッグ開始
  const handleDragStart = (e: DragEvent<HTMLDivElement>, cat: AvatarCategory) => {
    setDraggedCat(cat);
    e.dataTransfer.setData('text/plain', cat);
    e.dataTransfer.effectAllowed = 'move';
  };

  // ドラッグ通過
  const handleDragOver = (e: DragEvent<HTMLDivElement>, cat: AvatarCategory) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCat !== cat) {
      setDragOverCat(cat);
    }
  };

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggedCat(null);
    setDragOverCat(null);
  };

  // ドロップ
  const handleDrop = (e: DragEvent<HTMLDivElement>, targetCat: AvatarCategory) => {
    e.preventDefault();
    if (draggedCat && draggedCat !== targetCat) {
      const fromDispIdx = displayCategories.indexOf(draggedCat);
      const toDispIdx = displayCategories.indexOf(targetCat);
      // 表示リスト上で上へドラッグ（奥から手前へ）なら targetCat の手前('after')、
      // 下へドラッグ（手前から奥へ）なら targetCat の奥('before')へ配置
      const place = fromDispIdx > toDispIdx ? 'after' : 'before';
      handleMove(draggedCat, targetCat, place);
    }
    setDraggedCat(null);
    setDragOverCat(null);
  };

  // 標準順序との差分があるか
  const isCustomized = useMemo(() => {
    if (layerOrder.length !== DEFAULT_AVATAR_LAYER_ORDER.length) return true;
    return layerOrder.some((cat, i) => cat !== DEFAULT_AVATAR_LAYER_ORDER[i]);
  }, [layerOrder]);

  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 ${className}`}>
      {/* ===== ヘッダー ===== */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/80 pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-zinc-700" />
            <h4 className="text-sm font-semibold text-zinc-900">レイヤー重なり順（前後関係）</h4>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            アイテムをつかんで上下にドラッグ＆ドロップすると、重なり順（手前・奥）を入れ替えられます
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 装着中のみトグル */}
          <button
            type="button"
            onClick={() => setFilterEquippedOnly((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              filterEquippedOnly
                ? 'border border-zinc-300 bg-white text-zinc-800 shadow-sm'
                : 'border border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-200/60'
            }`}
            title="現在アバターが身につけているパーツだけに絞り込んで表示します"
          >
            <Filter className="h-3 w-3 text-zinc-500" />
            <span>装着中のみ: {filterEquippedOnly ? 'ON' : 'OFF'}</span>
          </button>

          {/* 初期順序リセット */}
          <button
            type="button"
            onClick={onResetLayerOrder}
            disabled={!isCustomized}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              isCustomized
                ? 'border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-100 hover:text-zinc-900'
                : 'cursor-not-allowed border border-transparent text-zinc-400'
            }`}
            title="標準の重なり順（服の後ろに腕が来るデフォルト配置）に戻します"
          >
            <RotateCcw className="h-3 w-3" />
            <span>初期順に戻す</span>
          </button>
        </div>
      </div>

      {/* ===== レイヤースタック最前面インジケーター ===== */}
      <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
        <span className="flex items-center gap-1 text-indigo-600">
          ▲ 最前面（一番手前に描画）
        </span>
        <span className="text-zinc-400 font-normal">
          表示中: {displayCategories.length} / 全18レイヤー
        </span>
      </div>

      {/* ===== レイヤー一覧リスト（ドラッグ＆ドロップ対応） ===== */}
      <div className="flex flex-col gap-1.5 max-h-[520px] overflow-y-auto pr-1">
        {displayCategories.map((cat, index) => {
          const part = equippedParts[cat];
          const partSrc = resolvePartSrc(part);
          const meta = CATEGORY_META[cat];
          const IconComp = CATEGORY_ICONS[cat] ?? Layers;
          const isFirst = index === 0;
          const isLast = index === displayCategories.length - 1;
          const isDragging = draggedCat === cat;
          const isDragOver = dragOverCat === cat && draggedCat !== cat;
          const isSelected = activeCategory === cat;

          return (
            <div
              key={cat}
              draggable
              onDragStart={(e) => handleDragStart(e, cat)}
              onDragOver={(e) => handleDragOver(e, cat)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, cat)}
              onClick={() => onSelectCategory?.(cat)}
              className={`group relative flex items-center justify-between gap-2 rounded-lg border p-2 transition-all select-none ${
                isDragging
                  ? 'opacity-40 scale-[0.98] border-indigo-400 bg-indigo-50/30'
                  : isDragOver
                  ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-400/50'
                  : isSelected
                  ? 'border-zinc-800 bg-white ring-1 ring-zinc-800 shadow-sm'
                  : 'border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-xs'
              }`}
            >
              {/* 左端：ドラッグハンドル ＆ レイヤー番号 ＆ サムネイル */}
              <div className="flex items-center gap-2 min-w-0">
                {/* ⠿ ドラッグハンドル */}
                <div
                  className="cursor-grab active:cursor-grabbing p-0.5 text-zinc-400 group-hover:text-zinc-700 transition"
                  title="ドラッグして上下に並び替え"
                >
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* 階層番号（手前からの番号） */}
                <span className="w-4 text-center text-[10px] font-mono text-zinc-400">
                  {index + 1}
                </span>

                {/* サムネイル画像 or カテゴリアイコン */}
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200/60 bg-zinc-100 overflow-hidden">
                  {partSrc ? (
                    <img
                      src={partSrc}
                      alt=""
                      className="h-full w-full object-contain p-0.5"
                    />
                  ) : (
                    <IconComp className="h-4 w-4 text-zinc-400" />
                  )}
                </div>

                {/* パーツ名 ＆ カテゴリバッジ */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 border border-zinc-200/50 shrink-0">
                      {meta.label}
                    </span>
                    <span
                      className={`truncate text-xs font-semibold ${
                        part ? 'text-zinc-900' : 'text-zinc-400 font-normal italic'
                      }`}
                    >
                      {part ? part.name : '（未装着）'}
                    </span>
                  </div>

                  {/* 補足タグ（服の後ろ / 服の前） */}
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-400">
                    {cat === 'arm_left' || cat === 'arm_right' ? (
                      layerOrder.indexOf(cat) > layerOrder.indexOf('tops') ? (
                        <span className="text-indigo-600 font-medium">服の手前</span>
                      ) : (
                        <span className="text-zinc-500">服の奥（標準）</span>
                      )
                    ) : (
                      <span>{meta.description}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 右端：1つ手前（↑） / 1つ奥（↓）クイック移動ボタン */}
              <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => handleStep(cat, 'front')}
                  disabled={isFirst}
                  className={`flex h-7 w-7 items-center justify-center rounded border transition ${
                    isFirst
                      ? 'cursor-not-allowed border-transparent text-zinc-300'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-white hover:text-zinc-900 shadow-xs'
                  }`}
                  title="1つ手前（前面）へ移動"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStep(cat, 'back')}
                  disabled={isLast}
                  className={`flex h-7 w-7 items-center justify-center rounded border transition ${
                    isLast
                      ? 'cursor-not-allowed border-transparent text-zinc-300'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-white hover:text-zinc-900 shadow-xs'
                  }`}
                  title="1つ奥（背面）へ移動"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== レイヤースタック最背面インジケーター ===== */}
      <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase border-t border-zinc-200/80 pt-2">
        <span className="flex items-center gap-1 text-zinc-500">
          ▼ 最背面（一番奥に描画）
        </span>
        <span className="text-zinc-400 font-normal text-[10px]">
          並び順は保存時に自動反映されます
        </span>
      </div>
    </div>
  );
}
