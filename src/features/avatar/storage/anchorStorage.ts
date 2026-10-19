/**
 * スタジオの「目安ポイント（基準点）」および「3頭身ガイドライン設定」の永続化ストレージ
 * ユーザーがスタジオ上で自由に位置をいじった設定をブラウザに保持します。
 */
import type { ProportionGuideConfig, ReferenceAnchor } from '../types';
import { DEFAULT_PROPORTION_GUIDE, DEFAULT_REFERENCE_ANCHORS } from '../constants';

const ANCHORS_STORAGE_KEY = 'mobage_avatar_reference_anchors_v2';
const GUIDE_CONFIG_STORAGE_KEY = 'mobage_avatar_proportion_guide_v1';

/** 保存済みの目安ポイント一覧を読み込む（未保存時はデフォルトを返す） */
export function loadReferenceAnchors(): ReferenceAnchor[] {
  try {
    const raw = localStorage.getItem(ANCHORS_STORAGE_KEY);
    if (!raw) return DEFAULT_REFERENCE_ANCHORS.map((a) => ({ ...a }));
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore parse error
  }
  return DEFAULT_REFERENCE_ANCHORS.map((a) => ({ ...a }));
}

/** 目安ポイント一覧を保存する */
export function saveReferenceAnchors(anchors: ReferenceAnchor[]): void {
  try {
    localStorage.setItem(ANCHORS_STORAGE_KEY, JSON.stringify(anchors));
  } catch {
    // ignore quota error
  }
}

/** 3頭身ガイドライン設定を読み込む */
export function loadProportionGuideConfig(): ProportionGuideConfig {
  try {
    const raw = localStorage.getItem(GUIDE_CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROPORTION_GUIDE };
    return { ...DEFAULT_PROPORTION_GUIDE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROPORTION_GUIDE };
  }
}

/** 3頭身ガイドライン設定を保存する */
export function saveProportionGuideConfig(config: ProportionGuideConfig): void {
  try {
    localStorage.setItem(GUIDE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore quota error
  }
}
