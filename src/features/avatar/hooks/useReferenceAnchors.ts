import { useCallback, useEffect, useState } from 'react';
import type { ProportionGuideConfig, ReferenceAnchor } from '../types';
import {
  AVATAR_CANVAS_SIZE,
  DEFAULT_PROPORTION_GUIDE,
  DEFAULT_REFERENCE_ANCHORS,
} from '../constants';
import {
  loadProportionGuideConfig,
  loadReferenceAnchors,
  saveProportionGuideConfig,
  saveReferenceAnchors,
} from '../storage/anchorStorage';

const clampCoord = (v: number) => Math.max(0, Math.min(AVATAR_CANVAS_SIZE, Math.round(v)));

const ANCHOR_PALETTE = [
  '#ec4899',
  '#3b82f6',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#06b6d4',
  '#f43f5e',
  '#6366f1',
];

/**
 * スタジオの「目安ポイント（アンカー）」と「3頭身プロポーションガイド」を
 * ユーザー自身が自由に移動・追加・削除・リセットできるフック
 */
export function useReferenceAnchors() {
  const [anchors, setAnchors] = useState<ReferenceAnchor[]>(() => loadReferenceAnchors());
  const [proportionGuide, setProportionGuide] = useState<ProportionGuideConfig>(() =>
    loadProportionGuideConfig(),
  );

  useEffect(() => {
    saveReferenceAnchors(anchors);
  }, [anchors]);

  useEffect(() => {
    saveProportionGuideConfig(proportionGuide);
  }, [proportionGuide]);

  /** 指定IDの目安ポイントの座標やラベルを更新 */
  const updateAnchor = useCallback((id: string, patch: Partial<Omit<ReferenceAnchor, 'id'>>) => {
    setAnchors((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        return {
          ...a,
          ...patch,
          x: patch.x !== undefined ? clampCoord(patch.x) : a.x,
          y: patch.y !== undefined ? clampCoord(patch.y) : a.y,
        };
      }),
    );
  }, []);

  /** 新しい目安ポイントを追加 */
  const addAnchor = useCallback((label = 'カスタム基準点', x = 256, y = 256) => {
    const id = `anchor_${Date.now().toString(36)}`;
    setAnchors((prev) => {
      const color = ANCHOR_PALETTE[prev.length % ANCHOR_PALETTE.length];
      return [
        ...prev,
        {
          id,
          label,
          x: clampCoord(x),
          y: clampCoord(y),
          color,
        },
      ];
    });
    return id;
  }, []);

  /** 指定IDの目安ポイントを削除 */
  const removeAnchor = useCallback((id: string) => {
    setAnchors((prev) => prev.filter((a) => a.id !== id));
  }, []);

  /** 目安ポイントを初期状態（3頭身標準）にリセット */
  const resetAnchors = useCallback(() => {
    setAnchors(DEFAULT_REFERENCE_ANCHORS.map((a) => ({ ...a })));
  }, []);

  /** 3頭身プロポーションガイド設定を更新 */
  const updateProportionGuide = useCallback((patch: Partial<ProportionGuideConfig>) => {
    setProportionGuide((prev) => ({
      ...prev,
      ...patch,
    }));
  }, []);

  /** 3頭身プロポーションガイドを初期状態にリセット */
  const resetProportionGuide = useCallback(() => {
    setProportionGuide({ ...DEFAULT_PROPORTION_GUIDE });
  }, []);

  return {
    anchors,
    proportionGuide,
    updateAnchor,
    addAnchor,
    removeAnchor,
    resetAnchors,
    updateProportionGuide,
    resetProportionGuide,
  };
}
