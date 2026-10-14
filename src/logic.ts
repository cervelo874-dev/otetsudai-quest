import type { Child, Quest, ShopCategory } from './types';
import { todayKey, yesterdayKey } from './utils';

export const BONUS_WINDOW_MS = 3 * 60 * 1000;
export const BONUS_COINS = 15;
export const GACHA_COST = 50;

export interface RankInfo {
  name: string;
  icon: string;
  next: number | null;
  nextName: string | null;
  min: number;
}

export function getRank(total: number): RankInfo {
  if (total >= 30) return { name: 'おてつだい ゆうしゃ', icon: '🗡️', next: null, nextName: null, min: 30 };
  if (total >= 10) return { name: 'おてつだい ナイト', icon: '🛡️', next: 30, nextName: 'おてつだい ゆうしゃ', min: 10 };
  return { name: 'おてつだい みならい', icon: '🌱', next: 10, nextName: 'おてつだい ナイト', min: 0 };
}

/** 最終達成が今日か昨日なら連続日数を表示、それ以前なら途切れ扱い */
export function displayStreak(c: Child): number {
  return c.lastDoneDate === todayKey() || c.lastDoneDate === yesterdayKey() ? c.streak : 0;
}

export function rewardFor(q: Quest, childId: string): number {
  const o = q.rewardOverrides?.[childId];
  return typeof o === 'number' ? o : q.reward;
}

export const CATEGORY_LABEL: Record<ShopCategory, { kid: string; parent: string; icon: string }> = {
  tablet: { kid: 'タブレット', parent: 'タブレット時間', icon: '⏱️' },
  real: { kid: 'おやつ・おでかけ', parent: 'おやつ・リアル', icon: '🍪' },
  avatar: { kid: 'きせかえ', parent: 'アバターアイテム', icon: '👑' },
};

export const CHILD_THEMES: Record<string, string> = {
  pink: 'from-pink-400 to-rose-400',
  sky: 'from-sky-400 to-blue-500',
  lime: 'from-lime-400 to-emerald-500',
  amber: 'from-amber-400 to-orange-500',
  violet: 'from-violet-400 to-purple-500',
};

export function themeOf(color: string): string {
  return CHILD_THEMES[color] ?? CHILD_THEMES.violet;
}
