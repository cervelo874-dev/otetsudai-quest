export const uid = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const pad = (n: number): string => String(n).padStart(2, '0');

export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

/** ミリ秒を m:ss に整形（切り上げ） */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${pad(s)}`;
}

export function formatHM(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${pad(d.getMinutes())}`;
}

/** 「ふん / ぷん」の読み分け */
export function minuteKana(n: number): string {
  const d = n % 10;
  return n > 0 && [0, 1, 3, 4, 6, 8].includes(d) ? 'ぷん' : 'ふん';
}

/** こども向け「〇じ 〇ふん」表記 */
export function formatHMKana(ts: number): string {
  const d = new Date(ts);
  const m = d.getMinutes();
  return `${d.getHours()}じ ${m}${minuteKana(m)}`;
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

export function clampInt(v: string | number, min = 0, max = 999999): number {
  const n = Math.floor(Number(v));
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
