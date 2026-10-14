import { useState, useRef } from 'react';
import { sound } from '../sound';

export function useSortableList<T>(
  items: T[],
  onReorder: (fromIndex: number, toIndex: number) => void
) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // HTML5 Drag & Drop (PC/マウス用)
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
    setOverIndex(index);
    sound.pop();
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (overIndex !== index) {
      setOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && overIndex !== null && draggedIndex !== overIndex) {
      sound.tap();
      onReorder(draggedIndex, overIndex);
    }
    setDraggedIndex(null);
    setOverIndex(null);
  };

  // タッチ操作用 (スマホ/タブレット用)
  const handleTouchStart = (_e: React.TouchEvent, index: number) => {
    setDraggedIndex(index);
    setOverIndex(index);
    sound.pop();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null) return;
    const touch = e.touches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!targetEl) return;

    // itemRefs から最も近いアイテムのインデックスを見つける
    const foundIndex = itemRefs.current.findIndex(
      (ref) => ref && (ref === targetEl || ref.contains(targetEl))
    );
    if (foundIndex !== -1 && foundIndex !== overIndex) {
      setOverIndex(foundIndex);
    }
  };

  const handleTouchEnd = () => {
    if (draggedIndex !== null && overIndex !== null && draggedIndex !== overIndex) {
      sound.tap();
      onReorder(draggedIndex, overIndex);
    }
    setDraggedIndex(null);
    setOverIndex(null);
  };

  // 1つ上へ移動
  const moveUp = (index: number) => {
    if (index > 0) {
      sound.pop();
      onReorder(index, index - 1);
    }
  };

  // 1つ下へ移動
  const moveDown = (index: number) => {
    if (index < items.length - 1) {
      sound.pop();
      onReorder(index, index + 1);
    }
  };

  return {
    draggedIndex,
    overIndex,
    itemRefs,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    moveUp,
    moveDown,
  };
}
