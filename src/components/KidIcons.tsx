import React, { useEffect, useState } from 'react';
import type { Quest, ShopItem, Ticket } from '../types';

export type KidIconKey =
  // Sheet 1: UI Tabs, Tablet/Media Tickets, Currency, Sweets
  | 'tab_quests'
  | 'tab_shop'
  | 'tab_tickets'
  | 'ui_timer'
  | 'ticket_tab_king'
  | 'ticket_tab_plus'
  | 'ticket_tab_std'
  | 'ticket_game'
  | 'ticket_video'
  | 'ticket_golden'
  | 'ui_coin'
  | 'ui_chest'
  | 'reward_cookie'
  | 'reward_cake'
  | 'reward_icecream'
  | 'reward_juice'
  // Sheet 2: Real Rewards & Nursery/Elementary School Chores
  | 'reward_dinner'
  | 'reward_outing'
  | 'reward_book'
  | 'reward_night'
  | 'quest_study'
  | 'quest_bag'
  | 'quest_teeth'
  | 'quest_shoes'
  | 'quest_bath'
  | 'quest_dishes'
  | 'quest_laundry'
  | 'quest_toys'
  | 'quest_clean'
  | 'quest_watering'
  | 'quest_washhands'
  | 'quest_practice';

export interface KidIconMeta {
  key: KidIconKey;
  sheet: 1 | 2;
  col: number; // 0..3
  row: number; // 0..3
  label: string;
  group: 'ui' | 'tablet' | 'reward' | 'quest';
  legacyEmojis: string[];
}

export const KID_ICON_META: Record<KidIconKey, KidIconMeta> = {
  // ===== Sheet 1 (4x4) =====
  tab_quests: {
    key: 'tab_quests',
    sheet: 1,
    col: 0,
    row: 0,
    label: 'おてつだい（剣と盾）',
    group: 'ui',
    legacyEmojis: ['⚔️', '🗡️', '🛡️'],
  },
  tab_shop: {
    key: 'tab_shop',
    sheet: 1,
    col: 1,
    row: 0,
    label: 'ごほうびショップ',
    group: 'ui',
    legacyEmojis: ['🏪', '🛒', '🏬'],
  },
  tab_tickets: {
    key: 'tab_tickets',
    sheet: 1,
    col: 2,
    row: 0,
    label: 'もちもの＆チケット袋',
    group: 'ui',
    legacyEmojis: ['🎟️', '🎒'],
  },
  ui_timer: {
    key: 'ui_timer',
    sheet: 1,
    col: 3,
    row: 0,
    label: 'まほうのタイマー時計',
    group: 'tablet',
    legacyEmojis: ['⏱️', '⏰', '⌚', '⏳'],
  },

  ticket_tab_king: {
    key: 'ticket_tab_king',
    sheet: 1,
    col: 0,
    row: 1,
    label: '王冠タブレット（1時間・VIP）',
    group: 'tablet',
    legacyEmojis: ['👑📱'],
  },
  ticket_tab_plus: {
    key: 'ticket_tab_plus',
    sheet: 1,
    col: 1,
    row: 1,
    label: 'ちょい足し追加タブレット',
    group: 'tablet',
    legacyEmojis: ['⚡📱'],
  },
  ticket_tab_std: {
    key: 'ticket_tab_std',
    sheet: 1,
    col: 2,
    row: 1,
    label: '標準タブレット',
    group: 'tablet',
    legacyEmojis: ['📱', '📲', '💻'],
  },
  ticket_game: {
    key: 'ticket_game',
    sheet: 1,
    col: 3,
    row: 1,
    label: 'ゲームコントローラー',
    group: 'tablet',
    legacyEmojis: ['🎮', '🕹️', '👾'],
  },

  ticket_video: {
    key: 'ticket_video',
    sheet: 1,
    col: 0,
    row: 2,
    label: 'YouTube・アニメ・映画',
    group: 'tablet',
    legacyEmojis: ['📺', '🎬', '🍿', '📽️'],
  },
  ticket_golden: {
    key: 'ticket_golden',
    sheet: 1,
    col: 1,
    row: 2,
    label: 'プレミアム黄金チケット',
    group: 'reward',
    legacyEmojis: ['🎫', '🌟', '✨'],
  },
  ui_coin: {
    key: 'ui_coin',
    sheet: 1,
    col: 2,
    row: 2,
    label: 'スターゴールドコイン',
    group: 'ui',
    legacyEmojis: ['🪙', '💰'],
  },
  ui_chest: {
    key: 'ui_chest',
    sheet: 1,
    col: 3,
    row: 2,
    label: 'ごほうび宝箱・プレゼント',
    group: 'reward',
    legacyEmojis: ['🎁', '📦'],
  },

  reward_cookie: {
    key: 'reward_cookie',
    sheet: 1,
    col: 0,
    row: 3,
    label: 'クッキー＆キャンディ（おやつ）',
    group: 'reward',
    legacyEmojis: ['🍪', '🍬', '🍭', '🍩', '🍫'],
  },
  reward_cake: {
    key: 'reward_cake',
    sheet: 1,
    col: 1,
    row: 3,
    label: 'ショートケーキ（豪華おやつ）',
    group: 'reward',
    legacyEmojis: ['🍰', '🎂', '🧁', '🍮'],
  },
  reward_icecream: {
    key: 'reward_icecream',
    sheet: 1,
    col: 2,
    row: 3,
    label: 'アイスクリーム',
    group: 'reward',
    legacyEmojis: ['🍦', '🍨', '🍧'],
  },
  reward_juice: {
    key: 'reward_juice',
    sheet: 1,
    col: 3,
    row: 3,
    label: 'フルーツジュース',
    group: 'reward',
    legacyEmojis: ['🧃', '🍹', '🥤', '🧋'],
  },

  // ===== Sheet 2 (4x4) =====
  reward_dinner: {
    key: 'reward_dinner',
    sheet: 2,
    col: 0,
    row: 0,
    label: 'ごちそう・お子様ランチ（晩ごはん）',
    group: 'reward',
    legacyEmojis: ['🍛', '🍔', '🍕', '🍝', '🍣', '🍖'],
  },
  reward_outing: {
    key: 'reward_outing',
    sheet: 2,
    col: 1,
    row: 0,
    label: '遊園地・おでかけリクエスト',
    group: 'reward',
    legacyEmojis: ['🎡', '🎢', '🎠', '🎪', '🏞️', '🚗'],
  },
  reward_book: {
    key: 'reward_book',
    sheet: 2,
    col: 2,
    row: 0,
    label: 'えほん・マンガ・図鑑',
    group: 'reward',
    legacyEmojis: ['📖', '📚', '📕', '📗'],
  },
  reward_night: {
    key: 'reward_night',
    sheet: 2,
    col: 3,
    row: 0,
    label: 'よるふかし・おやすみチケット',
    group: 'reward',
    legacyEmojis: ['🛌', '🌙', '💤', '🛌'],
  },

  quest_study: {
    key: 'quest_study',
    sheet: 2,
    col: 0,
    row: 1,
    label: 'しゅくだい・べんきょう・音読',
    group: 'quest',
    legacyEmojis: ['✏️', '📝', '💯', '🖍️', '🎓'],
  },
  quest_bag: {
    key: 'quest_bag',
    sheet: 2,
    col: 1,
    row: 1,
    label: 'ランドセル・通園バッグ（明日の準備）',
    group: 'quest',
    legacyEmojis: ['🎒', '🧢', '🏫'],
  },
  quest_teeth: {
    key: 'quest_teeth',
    sheet: 2,
    col: 2,
    row: 1,
    label: 'はみがき・ねんねの準備',
    group: 'quest',
    legacyEmojis: ['🪥', '🦷'],
  },
  quest_shoes: {
    key: 'quest_shoes',
    sheet: 2,
    col: 3,
    row: 1,
    label: 'くつをそろえる',
    group: 'quest',
    legacyEmojis: ['👟', '👞', '🥾'],
  },

  quest_bath: {
    key: 'quest_bath',
    sheet: 2,
    col: 0,
    row: 2,
    label: 'おふろそうじ・おふろ準備',
    group: 'quest',
    legacyEmojis: ['🛁', '🚿', '🐥', '♨️'],
  },
  quest_dishes: {
    key: 'quest_dishes',
    sheet: 2,
    col: 1,
    row: 2,
    label: 'おさらはこび・食器あらい',
    group: 'quest',
    legacyEmojis: ['🍽️', '🥣', '🥢', '🍴'],
  },
  quest_laundry: {
    key: 'quest_laundry',
    sheet: 2,
    col: 2,
    row: 2,
    label: 'せんたくものをたたむ・着替え',
    group: 'quest',
    legacyEmojis: ['👕', '👚', '🧦', '🧺'],
  },
  quest_toys: {
    key: 'quest_toys',
    sheet: 2,
    col: 3,
    row: 2,
    label: 'おもちゃのかたづけ',
    group: 'quest',
    legacyEmojis: ['🧸', '🧩', '🧱', '🚂'],
  },

  quest_clean: {
    key: 'quest_clean',
    sheet: 2,
    col: 0,
    row: 3,
    label: 'おへやのそうじ・ゴミすて',
    group: 'quest',
    legacyEmojis: ['🧹', '🗑️', '🧽', '🪣'],
  },
  quest_watering: {
    key: 'quest_watering',
    sheet: 2,
    col: 1,
    row: 3,
    label: 'みずやり・生き物のお世話',
    group: 'quest',
    legacyEmojis: ['🌱', '🪴', '🌷', '🐶', '🐱'],
  },
  quest_washhands: {
    key: 'quest_washhands',
    sheet: 2,
    col: 2,
    row: 3,
    label: 'てあらい・うがい・ハンカチ',
    group: 'quest',
    legacyEmojis: ['🧼', '🫧', '🤲', '🧻'],
  },
  quest_practice: {
    key: 'quest_practice',
    sheet: 2,
    col: 3,
    row: 3,
    label: 'ならいごと・ピアノ・うんどう練習',
    group: 'quest',
    legacyEmojis: ['🎹', '🎵', '⚽', '🏀', '🛹', '🎯'],
  },
};

export const KID_ICON_KEYS = Object.keys(KID_ICON_META) as KidIconKey[];

export function isKidIconKey(val: string | undefined | null): val is KidIconKey {
  if (!val) return false;
  return val in KID_ICON_META;
}

const SHEET_URLS: Record<1 | 2, string> = {
  1: '/kid_ui_tickets_sheet.jpg',
  2: '/kid_rewards_quests_sheet.jpg',
};

const slicedCache = new Map<KidIconKey, string>();
const sheetPromises: Partial<Record<1 | 2, Promise<void>>> = {};
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((fn) => fn());
}

/**
 * 4x4 スプライトシートから外周白背景(#FFFFFF)をフラッドフィル透過し、
 * アイコン内部の白いハイライトを残したまま切り出す
 */
function ensureSheetSliced(sheetNum: 1 | 2): Promise<void> {
  if (sheetPromises[sheetNum]) return sheetPromises[sheetNum]!;

  const p = new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const cellW = Math.floor(img.naturalWidth / 4);
        const cellH = Math.floor(img.naturalHeight / 4);

        const keysForSheet = KID_ICON_KEYS.filter((k) => KID_ICON_META[k].sheet === sheetNum);

        keysForSheet.forEach((key) => {
          const { col, row } = KID_ICON_META[key];
          const canvas = document.createElement('canvas');
          canvas.width = cellW;
          canvas.height = cellH;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;

          ctx.drawImage(
            img,
            col * cellW,
            row * cellH,
            cellW,
            cellH,
            0,
            0,
            cellW,
            cellH,
          );

          const imgData = ctx.getImageData(0, 0, cellW, cellH);
          const data = imgData.data;
          const visited = new Uint8Array(cellW * cellH);
          const queue = new Int32Array(cellW * cellH);
          let qHead = 0;
          let qTail = 0;

          const isBgWhite = (idx: number) => {
            const pIdx = idx * 4;
            const r = data[pIdx];
            const g = data[pIdx + 1];
            const b = data[pIdx + 2];
            return r >= 234 && g >= 234 && b >= 234;
          };

          const pushSeed = (x: number, y: number) => {
            const idx = y * cellW + x;
            if (!visited[idx] && isBgWhite(idx)) {
              visited[idx] = 1;
              queue[qTail++] = idx;
            }
          };

          for (let x = 0; x < cellW; x++) {
            pushSeed(x, 0);
            pushSeed(x, cellH - 1);
          }
          for (let y = 0; y < cellH; y++) {
            pushSeed(0, y);
            pushSeed(cellW - 1, y);
          }

          while (qHead < qTail) {
            const curr = queue[qHead++];
            const pIdx = curr * 4;
            data[pIdx + 3] = 0;

            const cx = curr % cellW;
            const cy = (curr - cx) / cellW;

            if (cx > 0) pushSeed(cx - 1, cy);
            if (cx + 1 < cellW) pushSeed(cx + 1, cy);
            if (cy > 0) pushSeed(cx, cy - 1);
            if (cy + 1 < cellH) pushSeed(cx, cy + 1);
          }

          // 境界アンチエイリアス
          for (let y = 1; y < cellH - 1; y++) {
            for (let x = 1; x < cellW - 1; x++) {
              const idx = y * cellW + x;
              if (visited[idx]) continue;
              const hasTransparentNeighbor =
                visited[idx - 1] ||
                visited[idx + 1] ||
                visited[idx - cellW] ||
                visited[idx + cellW];
              if (hasTransparentNeighbor) {
                const pIdx = idx * 4;
                const r = data[pIdx];
                const g = data[pIdx + 1];
                const b = data[pIdx + 2];
                const brightness = (r + g + b) / 3;
                if (brightness > 220) {
                  data[pIdx + 3] = Math.floor(data[pIdx + 3] * 0.45);
                }
              }
            }
          }

          ctx.putImageData(imgData, 0, 0);
          slicedCache.set(key, canvas.toDataURL('image/png'));
        });

        notifySubscribers();
      } catch {
        // ignore
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = SHEET_URLS[sheetNum];
  });

  sheetPromises[sheetNum] = p;
  return p;
}

export interface KidIconProps {
  iconKey: KidIconKey;
  size?: number | string;
  className?: string;
  alt?: string;
}

export const KidIcon: React.FC<KidIconProps> = ({
  iconKey,
  size = 40,
  className = '',
  alt = '',
}) => {
  const meta = KID_ICON_META[iconKey] ?? KID_ICON_META.ticket_golden;
  const [dataUrl, setDataUrl] = useState<string | undefined>(() => slicedCache.get(meta.key));

  useEffect(() => {
    if (slicedCache.has(meta.key)) {
      setDataUrl(slicedCache.get(meta.key));
      return;
    }
    const update = () => {
      if (slicedCache.has(meta.key)) {
        setDataUrl(slicedCache.get(meta.key));
      }
    };
    subscribers.add(update);
    void ensureSheetSliced(meta.sheet);
    return () => {
      subscribers.delete(update);
    };
  }, [meta.key, meta.sheet]);

  const dimStyle =
    typeof size === 'number'
      ? { width: `${size}px`, height: `${size}px` }
      : { width: size, height: size };

  if (dataUrl) {
    return (
      <img
        src={dataUrl}
        alt={alt || meta.label}
        draggable={false}
        style={dimStyle}
        className={`select-none object-contain pointer-events-none drop-shadow-xs ${className}`}
      />
    );
  }

  // 初回スライス完了までの数ミリ秒用CSSスプライトフォールバック
  const bgPosX = `${(meta.col / 3) * 100}%`;
  const bgPosY = `${(meta.row / 3) * 100}%`;

  return (
    <div
      role="img"
      aria-label={alt || meta.label}
      style={{
        ...dimStyle,
        backgroundImage: `url(${SHEET_URLS[meta.sheet]})`,
        backgroundSize: '400% 400%',
        backgroundPosition: `${bgPosX} ${bgPosY}`,
        backgroundRepeat: 'no-repeat',
      }}
      className={`select-none shrink-0 pointer-events-none rounded-xl ${className}`}
    />
  );
};

/**
 * チケットまたはショップ商品のデータから最適な高精細アイコンキーを自動判定する
 */
export function resolveShopOrTicketIconKey(
  item: Pick<Ticket, 'name' | 'icon' | 'category' | 'minutes' | 'isDaily'> | Pick<ShopItem, 'id' | 'name' | 'icon' | 'category' | 'minutes'>,
): KidIconKey {
  if (isKidIconKey(item.icon)) {
    return item.icon;
  }

  const name = item.name || '';
  const icon = item.icon || '';
  const minutes = item.minutes || 0;
  const isDaily = 'isDaily' in item ? Boolean(item.isDaily) : false;

  // 1. タブレット・時間系チケットの細分化判定
  if (item.category === 'tablet' || minutes > 0) {
    if (name.includes('ゲーム') || name.includes('Switch') || icon === '🎮') {
      return 'ticket_game';
    }
    if (
      name.includes('YouTube') ||
      name.includes('アニメ') ||
      name.includes('動画') ||
      name.includes('テレビ') ||
      name.includes('映画') ||
      icon === '📺' ||
      icon === '🎬'
    ) {
      return 'ticket_video';
    }
    if (isDaily || name.includes('まいにち') || name.includes('1時間') || minutes >= 60) {
      return 'ticket_tab_king';
    }
    if (
      name.includes('ちょい足し') ||
      name.includes('ついか') ||
      name.includes('追加') ||
      (minutes > 0 && minutes <= 10 && !name.includes('のこり'))
    ) {
      return 'ticket_tab_plus';
    }
    return 'ticket_tab_std';
  }

  // 2. リアルごほうびチケットの名前・絵文字判定
  if (name.includes('グレードアップ') || name.includes('ケーキ') || name.includes('パフェ') || icon === '🍰') {
    return 'reward_cake';
  }
  if (name.includes('アイス') || icon === '🍦' || icon === '🍨') {
    return 'reward_icecream';
  }
  if (name.includes('ジュース') || name.includes('ドリンク') || icon === '🧃' || icon === '🥤') {
    return 'reward_juice';
  }
  if (name.includes('おやつ') || name.includes('クッキー') || name.includes('おかし') || icon === '🍪') {
    return 'reward_cookie';
  }
  if (name.includes('ばんごはん') || name.includes('ごはん') || name.includes('ランチ') || name.includes('外食') || icon === '🍛') {
    return 'reward_dinner';
  }
  if (name.includes('おでかけ') || name.includes('遊園地') || name.includes('公園') || icon === '🎡' || icon === '🎪') {
    return 'reward_outing';
  }
  if (name.includes('えほん') || name.includes('絵本') || name.includes('マンガ') || name.includes('本') || icon === '📖' || icon === '📚') {
    return 'reward_book';
  }
  if (name.includes('よるふかし') || name.includes('夜更かし') || name.includes('ねる') || icon === '🛌' || icon === '🌙') {
    return 'reward_night';
  }

  // 3. 絵文字テーブルからのフォールバック検索
  for (const k of KID_ICON_KEYS) {
    if (KID_ICON_META[k].legacyEmojis.includes(icon)) {
      return k;
    }
  }

  return 'ticket_golden';
}

/**
 * お手伝いクエストから最適な高精細アイコンキーを自動判定する
 */
export function resolveQuestIconKey(quest: Pick<Quest, 'id' | 'title' | 'icon'>): KidIconKey {
  if (isKidIconKey(quest.icon)) {
    return quest.icon;
  }

  const title = quest.title || '';
  const icon = quest.icon || '';

  if (title.includes('おふろ') || title.includes('お風呂') || icon === '🛁' || icon === '🚿') {
    return 'quest_bath';
  }
  if (
    title.includes('しゅくだい') ||
    title.includes('宿題') ||
    title.includes('べんきょう') ||
    title.includes('勉強') ||
    title.includes('おんどく') ||
    title.includes('プリント') ||
    icon === '✏️' ||
    icon === '📝'
  ) {
    return 'quest_study';
  }
  if (
    title.includes('じゅんび') && (title.includes('あした') || title.includes('がっこう') || title.includes('ほいくえん') || title.includes('ランドセル')) ||
    icon === '🎒'
  ) {
    return 'quest_bag';
  }
  if (title.includes('くつ') || title.includes('靴') || icon === '👟') {
    return 'quest_shoes';
  }
  if (title.includes('おもちゃ') || icon === '🧸' || icon === '🧩') {
    return 'quest_toys';
  }
  if (title.includes('おさら') || title.includes('お皿') || title.includes('しょっき') || title.includes('ちゃわん') || icon === '🍽️') {
    return 'quest_dishes';
  }
  if (title.includes('せんたく') || title.includes('洗濯') || title.includes('ふく') || title.includes('パジャマ') || icon === '👕') {
    return 'quest_laundry';
  }
  if (title.includes('はみがき') || title.includes('歯みがき') || title.includes('ねんね') || icon === '🪥') {
    return 'quest_teeth';
  }
  if (title.includes('そうじ') || title.includes('掃除') || title.includes('ゴミ') || icon === '🧹') {
    return 'quest_clean';
  }
  if (title.includes('みずやり') || title.includes('水やり') || title.includes('ペット') || icon === '🌱') {
    return 'quest_watering';
  }
  if (title.includes('てあらい') || title.includes('手洗い') || title.includes('うがい') || icon === '🧼') {
    return 'quest_washhands';
  }
  if (title.includes('ピアノ') || title.includes('れんしゅう') || title.includes('練習') || icon === '🎹' || icon === '⚽') {
    return 'quest_practice';
  }

  for (const k of KID_ICON_KEYS) {
    if (KID_ICON_META[k].legacyEmojis.includes(icon)) {
      return k;
    }
  }

  return 'tab_quests';
}

/**
 * チケット・ショップアイテム用の「高精細アイコン＋一目でわかる分数カプセルバッジ」コンポーネント
 */
export const SmartTicketIcon: React.FC<{
  item:
    | Pick<Ticket, 'name' | 'icon' | 'category' | 'minutes' | 'isDaily'>
    | Pick<ShopItem, 'id' | 'name' | 'icon' | 'category' | 'minutes'>;
  size?: number;
  className?: string;
}> = ({ item, size = 48, className = '' }) => {
  const iconKey = resolveShopOrTicketIconKey(item);
  const minutes = item.minutes || 0;
  const isDaily = 'isDaily' in item ? Boolean(item.isDaily) : false;
  const name = item.name || '';
  const isLeftover = name.includes('のこり');
  const isBoost =
    iconKey === 'ticket_tab_plus' ||
    name.includes('ちょい足し') ||
    name.includes('追加') ||
    name.includes('ついか');

  // 分数バッジテキストとスタイル
  let badgeText: string | null = null;
  let badgeClass = '';

  if (item.category === 'tablet' && minutes > 0) {
    if (isDaily || minutes >= 60) {
      badgeText = minutes === 60 ? '👑60分' : `👑${minutes}分`;
      badgeClass =
        'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-amber-950 border-white';
    } else if (isLeftover) {
      badgeText = `⏳${minutes}分`;
      badgeClass =
        'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-white';
    } else if (isBoost) {
      badgeText = `⚡+${minutes}分`;
      badgeClass =
        'bg-gradient-to-r from-sky-500 to-cyan-500 text-white border-white';
    } else {
      badgeText = `${minutes}分`;
      badgeClass =
        'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-white';
    }
  } else if (name.includes('1こ') || name.includes('ついか')) {
    badgeText = '+1こ';
    badgeClass = 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-white';
  }

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
    >
      <KidIcon iconKey={iconKey} size={size} />
      {badgeText && (
        <span
          className={`absolute -bottom-1 -right-1 z-10 rounded-full border px-1.5 py-0.2 text-[9px] font-black leading-tight tracking-tight shadow-xs whitespace-nowrap ${badgeClass}`}
        >
          {badgeText}
        </span>
      )}
    </div>
  );
};
