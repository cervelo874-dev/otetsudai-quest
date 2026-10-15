import type { AvatarConfig, AvatarSlot, Child } from './types';

export interface AvatarOption {
  id: string;
  slot: AvatarSlot;
  name: string;
  icon: string;
  rarity?: 1 | 2 | 3;
  color?: string;
  locked?: boolean;
  gachaOnly?: boolean;
  hidden?: boolean;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  // ---------------- はだ (skin) ----------------
  { id: 's1', slot: 'skin', name: 'はだ 1（あかるい）', icon: '✨', color: '#FFE3CC', rarity: 1 },
  { id: 's2', slot: 'skin', name: 'はだ 2（ナチュラル）', icon: '✨', color: '#F6C9A0', rarity: 1 },
  { id: 's3', slot: 'skin', name: 'はだ 3（こむぎいろ）', icon: '✨', color: '#D9A06A', rarity: 1 },
  { id: 's4', slot: 'skin', name: 'はだ 4（ダーク）', icon: '✨', color: '#A56E42', rarity: 1 },

  // ---------------- かみがた (hairStyle: 全12種類) ----------------
  // 既存6種
  { id: 'short', slot: 'hairStyle', name: 'みじかいショート', icon: '💇', rarity: 1 },
  { id: 'long', slot: 'hairStyle', name: 'さらさらロング', icon: '👧', rarity: 1 },
  { id: 'bob', slot: 'hairStyle', name: 'ふんわりボブ', icon: '👦', rarity: 1 },
  { id: 'twintails', slot: 'hairStyle', name: 'ふたつむすび', icon: '🎀', rarity: 1 },
  { id: 'spiky', slot: 'hairStyle', name: 'つんつんスパイキー', icon: '⚡', rarity: 1 },
  { id: 'buns', slot: 'hairStyle', name: 'おだんごヘア', icon: '🍡', rarity: 1 },
  // 男の子用3種
  { id: 'boy_mash', slot: 'hairStyle', name: 'さわやかマッシュ', icon: '👦', rarity: 1 },
  { id: 'boy_asymmetry', slot: 'hairStyle', name: 'クールななめバング', icon: '🧑', rarity: 1 },
  { id: 'boy_sporty', slot: 'hairStyle', name: 'わんぱくベリーショート', icon: '🏃', rarity: 1 },
  // 女の子用3種
  { id: 'girl_ponytail', slot: 'hairStyle', name: '元気ポニーテール', icon: '👱‍♀️', rarity: 1 },
  { id: 'girl_wavy_princess', slot: 'hairStyle', name: 'ゆるふわプリンセス', icon: '👸', rarity: 1 },
  { id: 'girl_braids', slot: 'hairStyle', name: 'かわいい三つ編み', icon: '👧', rarity: 1 },
  // 旧ID互換用エイリアス
  { id: 'pigtails', slot: 'hairStyle', name: 'ふたつむすび', icon: '🎀', rarity: 1, hidden: true },
  { id: 'bun', slot: 'hairStyle', name: 'おだんごヘア', icon: '🍡', rarity: 1, hidden: true },

  // ---------------- かみのいろ (hairColor) ----------------
  { id: 'brown', slot: 'hairColor', name: 'マロンブラウン', icon: '🎨', color: '#6E473B', rarity: 1 },
  { id: 'black', slot: 'hairColor', name: 'ナチュラルブラック', icon: '🎨', color: '#45322E', rarity: 1 },
  { id: 'blonde', slot: 'hairColor', name: 'ハニーゴールド', icon: '🎨', color: '#E8B342', rarity: 1 },
  { id: 'pink', slot: 'hairColor', name: 'スイートピンク', icon: '🎨', color: '#FF7BAC', rarity: 1 },
  { id: 'blue', slot: 'hairColor', name: 'アクアブルー', icon: '🎨', color: '#4BA3E3', rarity: 1 },

  // ---------------- おかお (expression: 全8種類) ----------------
  { id: 'girl_smile', slot: 'expression', name: 'にっこりガール', icon: '😊', rarity: 1 },
  { id: 'boy_cool', slot: 'expression', name: 'さわやかボーイ', icon: '😎', rarity: 1 },
  { id: 'boy_grin', slot: 'expression', name: 'わんぱくニカッ！', icon: '😆', rarity: 1 },
  { id: 'boy_wink', slot: 'expression', name: 'クールウィンク', icon: '😉', rarity: 1 },
  { id: 'boy_fighting', slot: 'expression', name: 'やるき満々！', icon: '🔥', rarity: 1 },
  { id: 'happy_open', slot: 'expression', name: 'わーい！スマイル', icon: '😄', rarity: 1 },
  { id: 'wink_star', slot: 'expression', name: 'キラッ☆ウィンク', icon: '✨', rarity: 1 },
  { id: 'shy_blush', slot: 'expression', name: 'ぽかぽか照れ顔', icon: '🥰', rarity: 1 },
  // 旧ID互換用エイリアス
  { id: 'smile', slot: 'expression', name: 'にっこりガール', icon: '😊', rarity: 1, hidden: true },
  { id: 'grin', slot: 'expression', name: 'わんぱくニカッ！', icon: '😆', rarity: 1, hidden: true },
  { id: 'wink', slot: 'expression', name: 'クールウィンク', icon: '😉', rarity: 1, hidden: true },
  { id: 'wow', slot: 'expression', name: 'わーい！スマイル', icon: '😮', rarity: 1, hidden: true },

  // ---------------- おようふく (outfit) ----------------
  { id: 'overall', slot: 'outfit', name: 'デニムオーバーオール', icon: '👖', rarity: 1 },
  { id: 'tee_blue', slot: 'outfit', name: 'マリンボーダーTシャツ', icon: '👕', rarity: 1 },
  { id: 'tee_red', slot: 'outfit', name: 'スターレッドTシャツ', icon: '👕', rarity: 1 },
  { id: 'dino', slot: 'outfit', name: 'きょうりゅう着ぐるみ', icon: '🦖', locked: true, rarity: 2 },
  { id: 'princess', slot: 'outfit', name: 'プリンセスフリルドレス', icon: '👗', locked: true, rarity: 2 },
  { id: 'knight', slot: 'outfit', name: 'ゆうしゃのシルバーアーマー', icon: '🛡️', locked: true, rarity: 2 },
  { id: 'magic_robe', slot: 'outfit', name: 'まほうのスターローブ', icon: '🧙‍♂️', gachaOnly: true, rarity: 2 },
  { id: 'panda_suit', slot: 'outfit', name: 'モコモコパンダスーツ', icon: '🐼', gachaOnly: true, rarity: 2 },
  { id: 'pilot_uniform', slot: 'outfit', name: 'パイロットダブルせいふく', icon: '✈️', gachaOnly: true, rarity: 2 },
  { id: 'ninja_suit', slot: 'outfit', name: 'くろがねにんじゃスーツ', icon: '🥷', gachaOnly: true, rarity: 2 },
  { id: 'idol_dress', slot: 'outfit', name: 'きらめきアイドルドレス', icon: '🎤', gachaOnly: true, rarity: 2 },
  { id: 'crystal_armor', slot: 'outfit', name: '★3 でんせつのクリスタルアーマー', icon: '💎', gachaOnly: true, rarity: 3 },

  // ---------------- あたま・アクセサリー (accessory) ----------------
  { id: 'acc_none', slot: 'accessory', name: 'あたま なし', icon: '⭕', rarity: 1 },
  { id: 'ribbon', slot: 'accessory', name: 'ピンクビッグリボン', icon: '🎀', rarity: 1 },
  { id: 'crown', slot: 'accessory', name: 'ゴールドクラウン', icon: '👑', locked: true, rarity: 2 },
  { id: 'wizard', slot: 'accessory', name: 'まほうつかいのぼうし', icon: '🧙', locked: true, rarity: 2 },
  { id: 'sunglasses', slot: 'accessory', name: 'クールサングラス', icon: '🕶️', locked: true, rarity: 1 },
  { id: 'star_pin', slot: 'accessory', name: 'キラキラスターピン', icon: '🌟', gachaOnly: true, rarity: 2 },
  { id: 'knight_helmet', slot: 'accessory', name: 'はねかざりナイトカブト', icon: '🪖', gachaOnly: true, rarity: 2 },
  { id: 'tiara', slot: 'accessory', name: 'プリンセスティアラ', icon: '👸', gachaOnly: true, rarity: 2 },
  { id: 'dino_hood', slot: 'accessory', name: 'きょうりゅうフード', icon: '🐲', gachaOnly: true, rarity: 2 },
  { id: 'ninja_band', slot: 'accessory', name: 'にんじゃのハチマキ', icon: '🥋', gachaOnly: true, rarity: 2 },
  { id: 'cat_headphone', slot: 'accessory', name: 'ネコみみヘッドホン', icon: '🎧', gachaOnly: true, rarity: 2 },
  { id: 'angel_ring', slot: 'accessory', name: '★3 ひかるてんしのリング', icon: '😇', gachaOnly: true, rarity: 3 },

  // ---------------- もちもの・ぶき (weapon) ----------------
  { id: 'wp_none', slot: 'weapon', name: 'もちもの なし', icon: '⭕', rarity: 1 },
  { id: 'brave_sword', slot: 'weapon', name: 'ゆうしゃのブレイブソード', icon: '🗡️', gachaOnly: true, rarity: 2 },
  { id: 'magic_wand', slot: 'weapon', name: 'スターマジックステッキ', icon: '🪄', gachaOnly: true, rarity: 2 },
  { id: 'giant_candy', slot: 'weapon', name: 'きょだいペロペロキャンディ', icon: '🍭', gachaOnly: true, rarity: 2 },
  { id: 'laser_blade', slot: 'weapon', name: 'サイバーレーザーブレード', icon: '⚔️', gachaOnly: true, rarity: 2 },
  { id: 'flame_sword', slot: 'weapon', name: '★3 ほのおのレジェンドブレード', icon: '🔥', gachaOnly: true, rarity: 3 },

  // ---------------- ペット (pet) ----------------
  { id: 'pet_none', slot: 'pet', name: 'ペット なし', icon: '⭕', rarity: 1 },
  { id: 'shiba', slot: 'pet', name: 'ころころしばいぬ', icon: '🐕', locked: true, rarity: 2 },
  { id: 'dragon', slot: 'pet', name: 'ちびドラゴン', icon: '🐉', locked: true, rarity: 2 },
  { id: 'penguin', slot: 'pet', name: 'マフラーペンギン', icon: '🐧', locked: true, rarity: 2 },
  { id: 'unicorn', slot: 'pet', name: 'ミニユニコーン', icon: '🦄', gachaOnly: true, rarity: 2 },
  { id: 'slime', slot: 'pet', name: 'ぷるぷるスライム', icon: '💧', gachaOnly: true, rarity: 2 },
  { id: 'anglerfish', slot: 'pet', name: 'ピカピカアンコウ', icon: '🐡', gachaOnly: true, rarity: 2 },
  { id: 'mini_dragon', slot: 'pet', name: '★3 おうごんのミニドラゴン', icon: '🐲', gachaOnly: true, rarity: 3 },
  { id: 'flying_unicorn', slot: 'pet', name: '★3 はばたくペガサス', icon: '✨🦄', gachaOnly: true, rarity: 3 },

  // ---------------- はいけい (bg) ----------------
  { id: 'sky', slot: 'bg', name: 'あおぞらとくも', icon: '☁️', rarity: 1 },
  { id: 'meadow', slot: 'bg', name: 'おはなののはら', icon: '🌼', rarity: 1 },
  { id: 'sunset', slot: 'bg', name: 'ゆうやけのまち', icon: '🌇', rarity: 1 },
  { id: 'kirakira', slot: 'bg', name: 'パステルキラキラ', icon: '✨', locked: true, rarity: 2 },
  { id: 'space', slot: 'bg', name: 'コスモスペース', icon: '🪐', locked: true, rarity: 2 },
  { id: 'rainbow', slot: 'bg', name: 'にじのスカイロード', icon: '🌈', gachaOnly: true, rarity: 2 },
  { id: 'candy_land', slot: 'bg', name: 'スイートおかしのくに', icon: '🍭', gachaOnly: true, rarity: 2 },
  { id: 'ocean_temple', slot: 'bg', name: '神秘のかいていしんでん', icon: '🏛️', gachaOnly: true, rarity: 2 },
  { id: 'space_station', slot: 'bg', name: 'サイバーステーション', icon: '🛰️', gachaOnly: true, rarity: 2 },
  { id: 'crystal_castle', slot: 'bg', name: '★3 まおうのクリスタルじょう', icon: '🏰', gachaOnly: true, rarity: 3 },
  { id: 'rainbow_stage', slot: 'bg', name: '★3 にじのキラキラステージ', icon: '🌟', gachaOnly: true, rarity: 3 },
];

const optMap = new Map<string, AvatarOption>(AVATAR_OPTIONS.map((o) => [o.id, o]));

// ほしのかけら交換コスト（★1=15個、★2=40個、★3=80個）
export const SHARD_COST = {
  1: 15,
  2: 40,
  3: 80,
} as const;

export function getShardCost(rarity: number | undefined): number {
  if (rarity === 3) return SHARD_COST[3];
  if (rarity === 2) return SHARD_COST[2];
  return SHARD_COST[1];
}

// デフォルトで最初からアンロックされている初期アイテムかどうか
export function isDefaultAvatarItem(opt: AvatarOption): boolean {
  return !(opt.locked || opt.gachaOnly);
}

// ガチャやほしのかけら交換所で排出・交換の対象となる「特別なアンロック対象アイテム」かどうか
export function isUnlockableAvatarItem(opt: AvatarOption): boolean {
  if (opt.hidden) return false;
  // 「なし」アイテムは除外
  if (opt.id === 'acc_none' || opt.id === 'wp_none' || opt.id === 'pet_none') return false;
  // locked または gachaOnly が true のアイテムのみが対象
  return Boolean(opt.locked || opt.gachaOnly);
}

export function findOption(id: string | null | undefined): AvatarOption | undefined {
  if (!id) return undefined;
  return optMap.get(id);
}

export function optionsFor(slot: AvatarSlot): AvatarOption[] {
  return AVATAR_OPTIONS.filter((o) => o.slot === slot && !o.hidden);
}

export function isUnlocked(opt: AvatarOption, child: Child): boolean {
  return !(opt.locked || opt.gachaOnly) || (child.ownedItems?.includes(opt.id) ?? false);
}

function colorOf(id: string, fallback: string): string {
  return optMap.get(id)?.color ?? fallback;
}

function starPath(cx: number, cy: number, r: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    d += `${i === 0 ? 'M' : 'L'}${(cx + rr * Math.cos(ang)).toFixed(1)} ${(cy + rr * Math.sin(ang)).toFixed(1)} `;
  }
  return `${d}Z`;
}

// 温かみのある主線（#4A2E25）
export const LINE_COLOR = '#4A2E25';
const LINE = `stroke="${LINE_COLOR}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"`;

/* ---------------- イラスト画像アセット レジストリ ---------------- */
export const IMAGE_ASSETS = {
  pet: new Set(['shiba', 'dragon', 'penguin', 'unicorn', 'slime', 'anglerfish', 'mini_dragon', 'flying_unicorn']),
  weapon: new Set(['brave_sword', 'giant_candy', 'laser_blade', 'flame_sword']),
  accessory: new Set(['ribbon']),
  bg: new Set<string>([]),
};

/* ---------------- 1. 背景ステージレイヤー (background: viewBox 0 0 200 240) ---------------- */
function renderBackground(id: string, p: string): string {
  const cardBorder = `<rect x="5" y="5" width="190" height="230" rx="20" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.85"/>`;
  const stageShadow = `<ellipse cx="100" cy="204" rx="42" ry="8" fill="#2E2038" opacity="0.2"/>`;

  if (IMAGE_ASSETS.bg.has(id)) {
    return (
      `<clipPath id="${p}_bgclip"><rect x="5" y="5" width="190" height="230" rx="20"/></clipPath>` +
      `<image href="/assets/avatar/bg/${id}.png" x="5" y="5" width="190" height="230" clip-path="url(#${p}_bgclip)" preserveAspectRatio="xMidYMid slice" />` +
      stageShadow +
      cardBorder
    );
  }

  switch (id) {
    case 'candy_land':
      return (
        `<defs>` +
        `<linearGradient id="${p}_cnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFE4F3"/><stop offset="55%" stop-color="#FFF0F5"/><stop offset="100%" stop-color="#FCE7F3"/></linearGradient>` +
        `<linearGradient id="${p}_cndh" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FF9EC9"/><stop offset="100%" stop-color="#FF75AC"/></linearGradient>` +
        `</defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_cnd)"/>` +
        `<circle cx="35" cy="55" r="14" fill="#FFF" opacity="0.6"/>` +
        `<circle cx="165" cy="65" r="16" fill="#FFF" opacity="0.6"/>` +
        `<path d="M0 165 Q50 145 100 160 T200 155 L200 240 L0 240 Z" fill="#FDBA74" opacity="0.7"/>` +
        `<path d="M0 180 Q65 160 130 178 T200 170 L200 240 L0 240 Z" fill="url(#${p}_cndh)"/>` +
        stageShadow + cardBorder
      );

    case 'ocean_temple':
      return (
        `<defs><linearGradient id="${p}_ocn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0284C7"/><stop offset="60%" stop-color="#0369A1"/><stop offset="100%" stop-color="#082F49"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_ocn)"/>` +
        `<rect x="18" y="95" width="12" height="110" fill="#38BDF8" opacity="0.25" rx="3"/>` +
        `<rect x="170" y="95" width="12" height="110" fill="#38BDF8" opacity="0.25" rx="3"/>` +
        `<circle cx="32" cy="150" r="4.5" fill="#BAE6FD" opacity="0.6"/>` +
        stageShadow + cardBorder
      );

    case 'space':
      return (
        `<defs><linearGradient id="${p}_spc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#090A1A"/><stop offset="100%" stop-color="#1A1838"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_spc)"/>` +
        `<circle cx="152" cy="50" r="20" fill="#F59E0B"/><ellipse cx="152" cy="50" rx="32" ry="7" fill="none" stroke="#FDE68A" stroke-width="2.2" transform="rotate(-18 152 50)"/>` +
        `<circle cx="35" cy="70" r="1.5" fill="#FFF"/><circle cx="120" cy="85" r="1.5" fill="#FFF"/>` +
        stageShadow + cardBorder
      );

    case 'sunset':
      return (
        `<defs><linearGradient id="${p}_sns" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FB7185"/><stop offset="50%" stop-color="#F97316"/><stop offset="100%" stop-color="#FEF08A"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_sns)"/>` +
        `<circle cx="100" cy="120" r="32" fill="#FFF7ED" opacity="0.75"/>` +
        stageShadow + cardBorder
      );

    case 'meadow':
      return (
        `<defs><linearGradient id="${p}_mdw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#BAE6FD"/><stop offset="55%" stop-color="#F0FDF4"/><stop offset="100%" stop-color="#86EFAC"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_mdw)"/>` +
        `<path d="M0 170 Q70 152 142 166 T200 160 L200 240 L0 240 Z" fill="#4ADE80" opacity="0.6"/>` +
        `<path d="M0 186 Q56 172 114 182 T200 176 L200 240 L0 240 Z" fill="#22C55E"/>` +
        stageShadow + cardBorder
      );

    case 'rainbow':
      // にじのスカイロード（大きな美しい虹と雲）
      return (
        `<defs>` +
        `<linearGradient id="${p}_rbw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7DD3FC"/><stop offset="50%" stop-color="#BAE6FD"/><stop offset="100%" stop-color="#E0F2FE"/></linearGradient>` +
        `</defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_rbw)"/>` +
        // 虹のアーチ
        `<path d="M 15 170 A 90 90 0 0 1 185 170" fill="none" stroke="#F43F5E" stroke-width="6" opacity="0.85" />` +
        `<path d="M 21 170 A 84 84 0 0 1 179 170" fill="none" stroke="#FB923C" stroke-width="6" opacity="0.85" />` +
        `<path d="M 27 170 A 78 78 0 0 1 173 170" fill="none" stroke="#FDE047" stroke-width="6" opacity="0.85" />` +
        `<path d="M 33 170 A 72 72 0 0 1 167 170" fill="none" stroke="#4ADE80" stroke-width="6" opacity="0.85" />` +
        `<path d="M 39 170 A 66 66 0 0 1 161 170" fill="none" stroke="#38BDF8" stroke-width="6" opacity="0.85" />` +
        `<path d="M 45 170 A 60 60 0 0 1 155 170" fill="none" stroke="#A855F7" stroke-width="6" opacity="0.85" />` +
        // ふわふわ雲
        `<circle cx="28" cy="165" r="14" fill="#FFFFFF" opacity="0.9" />` +
        `<circle cx="44" cy="168" r="10" fill="#FFFFFF" opacity="0.9" />` +
        `<circle cx="172" cy="165" r="14" fill="#FFFFFF" opacity="0.9" />` +
        `<circle cx="156" cy="168" r="10" fill="#FFFFFF" opacity="0.9" />` +
        `<circle cx="100" cy="55" r="2.5" fill="#FFF" />` +
        `<circle cx="145" cy="70" r="3" fill="#FEF08A" />` +
        `<circle cx="55" cy="75" r="2" fill="#FEF08A" />` +
        stageShadow + cardBorder
      );

    case 'rainbow_stage':
      // ★3 にじのキラキラステージ（スポットライトとネオンアーチ）
      return (
        `<defs>` +
        `<linearGradient id="${p}_rbws" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4C1D95"/><stop offset="50%" stop-color="#7C3AED"/><stop offset="100%" stop-color="#C084FC"/></linearGradient>` +
        `</defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_rbws)"/>` +
        // スポットライト光線
        `<polygon points="100,5 30,230 70,230" fill="#FFFFFF" opacity="0.12" />` +
        `<polygon points="100,5 170,230 130,230" fill="#FFFFFF" opacity="0.12" />` +
        // ネオン虹
        `<path d="M 25 185 A 80 80 0 0 1 175 185" fill="none" stroke="#F43F5E" stroke-width="4" opacity="0.7" />` +
        `<path d="M 29 185 A 76 76 0 0 1 171 185" fill="none" stroke="#FDE047" stroke-width="4" opacity="0.7" />` +
        `<path d="M 33 185 A 72 72 0 0 1 167 185" fill="none" stroke="#38BDF8" stroke-width="4" opacity="0.7" />` +
        // キラキラ星
        `<path d="${starPath(40, 60, 6)}" fill="#FEF08A" />` +
        `<path d="${starPath(160, 50, 7)}" fill="#FEF08A" />` +
        `<path d="${starPath(100, 35, 8)}" fill="#FFFFFF" />` +
        stageShadow + cardBorder
      );

    case 'kirakira':
      // パステルキラキラ
      return (
        `<defs>` +
        `<linearGradient id="${p}_kk" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FCE7F3"/><stop offset="50%" stop-color="#EDE9FE"/><stop offset="100%" stop-color="#E0F2FE"/></linearGradient>` +
        `</defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_kk)"/>` +
        `<path d="${starPath(35, 45, 6)}" fill="#F472B6" opacity="0.8" />` +
        `<path d="${starPath(165, 55, 7)}" fill="#A855F7" opacity="0.8" />` +
        `<path d="${starPath(50, 140, 5)}" fill="#38BDF8" opacity="0.8" />` +
        `<path d="${starPath(150, 145, 6)}" fill="#FBBF24" opacity="0.8" />` +
        `<circle cx="90" cy="50" r="3" fill="#FFF" /><circle cx="120" cy="65" r="2.5" fill="#FFF" />` +
        stageShadow + cardBorder
      );

    case 'space_station':
      // サイバーステーション
      return (
        `<defs><linearGradient id="${p}_spcst" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#030712"/><stop offset="100%" stop-color="#0F172A"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_spcst)"/>` +
        // 地球の円弧
        `<circle cx="100" cy="270" r="100" fill="#0284C7" opacity="0.6" />` +
        `<circle cx="100" cy="270" r="96" fill="#38BDF8" opacity="0.3" />` +
        // サイバーグリッド
        `<line x1="20" y1="180" x2="180" y2="180" stroke="#06B6D4" stroke-width="1.5" opacity="0.6" />` +
        `<line x1="40" y1="160" x2="160" y2="160" stroke="#06B6D4" stroke-width="1" opacity="0.4" />` +
        stageShadow + cardBorder
      );

    case 'crystal_castle':
      // ★3 まおうのクリスタルじょう
      return (
        `<defs><linearGradient id="${p}_cstl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1E1B4B"/><stop offset="70%" stop-color="#312E81"/><stop offset="100%" stop-color="#4C1D95"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_cstl)"/>` +
        // クリスタル城のシルエット
        `<polygon points="100,50 85,150 115,150" fill="#818CF8" opacity="0.4" />` +
        `<polygon points="65,80 55,160 75,160" fill="#6366F1" opacity="0.3" />` +
        `<polygon points="135,80 125,160 145,160" fill="#6366F1" opacity="0.3" />` +
        `<circle cx="100" cy="48" r="4" fill="#C7D2FE" />` +
        stageShadow + cardBorder
      );

    case 'sky':
    default:
      return (
        `<defs><linearGradient id="${p}_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7CCBFF"/><stop offset="60%" stop-color="#BAE6FD"/><stop offset="100%" stop-color="#E0F2FE"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_sky)"/>` +
        `<circle cx="32" cy="64" r="16" fill="#FFF" opacity="0.85"/>` +
        `<circle cx="50" cy="60" r="20" fill="#FFF" opacity="0.85"/>` +
        `<circle cx="152" cy="85" r="18" fill="#FFF" opacity="0.75"/>` +
        `<circle cx="170" cy="82" r="22" fill="#FFF" opacity="0.75"/>` +
        stageShadow + cardBorder
      );
  }
}

/* ---------------- 2. 後ろ髪レイヤー (backHair) ---------------- */
function renderBackHair(style: string, hc: string): string {
  switch (style) {
    case 'long':
      // ② さらさらロング
      return `<path d="M 50 86 C 36 120, 34 168, 48 184 C 65 192, 135 192, 152 184 C 166 168, 164 120, 150 86 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />`;

    case 'twintails':
    case 'pigtails':
      // ④ ふたつむすび
      return (
        `<g>` +
        `<path d="M 54 78 C 22 72, 16 122, 32 154 C 44 160, 56 144, 56 116 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<path d="M 146 78 C 178 72, 184 122, 168 154 C 156 160, 144 144, 144 116 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<circle cx="52" cy="78" r="7" fill="#FF5E7E" stroke="#4A2E25" stroke-width="2.5" />` +
        `<circle cx="148" cy="78" r="7" fill="#FF5E7E" stroke="#4A2E25" stroke-width="2.5" />` +
        `</g>`
      );

    case 'buns':
    case 'bun':
      // ⑥ おだんごヘア
      return (
        `<g>` +
        `<circle cx="56" cy="56" r="19" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" />` +
        `<circle cx="144" cy="56" r="19" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" />` +
        `<circle cx="56" cy="56" r="21" fill="none" stroke="#FF8DA1" stroke-width="3" stroke-dasharray="6 4" />` +
        `<circle cx="144" cy="56" r="21" fill="none" stroke="#FF8DA1" stroke-width="3" stroke-dasharray="6 4" />` +
        `</g>`
      );

    case 'bob':
      // ③ ふんわりボブ
      return `<path d="M 48 86 C 36 118, 44 142, 68 144 L 132 144 C 156 142, 164 118, 152 86 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />`;

    case 'spiky':
      // ⑤ つんつんスパイキー（シャープな毛先の少年マンガ風ヘア）
      return `<path d="M 48 92 L 36 82 L 48 70 L 42 52 L 64 54 L 78 34 L 100 46 L 122 34 L 136 54 L 158 52 L 152 70 L 164 82 L 152 92 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />`;

    case 'boy_mash':
      // ⑦ さわやかマッシュ
      return `<path d="M 52 94 C 48 60, 152 60, 148 94 L 142 112 L 58 112 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />`;

    case 'boy_asymmetry':
      // ⑧ クールななめバング
      return `<path d="M 52 96 L 42 114 L 58 116 L 52 126 L 72 124 L 128 124 L 148 126 L 142 116 L 158 114 L 148 96 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />`;

    case 'boy_sporty':
      // ⑨ わんぱくベリーショート
      return `<ellipse cx="100" cy="88" rx="48" ry="38" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" />`;

    case 'girl_ponytail':
      // ⑩ 元気ポニーテール
      return (
        `<g>` +
        `<path d="M 136 66 C 174 52, 192 98, 174 142 C 162 152, 146 138, 142 106 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<path d="M 138 66 L 126 54 L 134 74 L 152 60 L 144 76 Z" fill="#FF5E7E" stroke="#4A2E25" stroke-width="2" stroke-linejoin="round" />` +
        `<circle cx="140" cy="66" r="6" fill="#FF8DA1" stroke="#4A2E25" stroke-width="2" />` +
        `</g>`
      );

    case 'girl_wavy_princess':
      // ⑪ ゆるふわプリンセス
      return `<path d="M 48 86 C 30 105, 42 125, 32 145 C 24 165, 40 188, 58 190 C 80 194, 120 194, 142 190 C 160 188, 176 165, 168 145 C 158 125, 170 105, 152 86 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />`;

    case 'girl_braids':
      // ⑫ かわいい三つ編み
      return (
        `<g>` +
        `<circle cx="48" cy="118" r="11" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" />` +
        `<circle cx="46" cy="134" r="10" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" />` +
        `<circle cx="45" cy="149" r="9" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" />` +
        `<path d="M 38 156 L 52 156 L 45 168 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<rect x="39" y="153" width="12" height="5" rx="2" fill="#FF6B8B" stroke="#4A2E25" stroke-width="1.8" />` +
        `<circle cx="152" cy="118" r="11" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" />` +
        `<circle cx="154" cy="134" r="10" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" />` +
        `<circle cx="155" cy="149" r="9" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" />` +
        `<path d="M 148 156 L 162 156 L 155 168 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<rect x="149" y="153" width="12" height="5" rx="2" fill="#FF6B8B" stroke="#4A2E25" stroke-width="1.8" />` +
        `</g>`
      );

    case 'short':
    default:
      // ① みじかいショートの後ろ髪
      return `<ellipse cx="100" cy="92" rx="50" ry="42" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" />`;
  }
}

/* ---------------- 3. マント・背中装備 (backItem / aura) ---------------- */
function renderBackItem(weapon: string | undefined, outfit: string | undefined, accessory: string | undefined, p: string): string {
  let content = '';

  if (outfit === 'crystal_armor') {
    content += (
      `<g opacity="0.9">` +
      `<defs><linearGradient id="${p}_cwings" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#E0F2FE"/><stop offset="50%" stop-color="#38BDF8"/><stop offset="100%" stop-color="#0284C7"/></linearGradient></defs>` +
      `<path d="M 90 130 C 58 100 22 92 12 106 C 4 116 26 138 82 138 Z" fill="url(#${p}_cwings)" stroke="#FFF" stroke-width="1.8"/>` +
      `<path d="M 110 130 C 142 100 178 92 188 106 C 196 116 174 138 118 138 Z" fill="url(#${p}_cwings)" stroke="#FFF" stroke-width="1.8"/>` +
      `</g>`
    );
  }

  if (accessory === 'angel_ring') {
    content += (
      `<g opacity="0.95">` +
      `<path d="M 90 126 C 58 94 30 98 22 112 C 16 124 32 138 86 136 Z" fill="#FFFFFF" stroke="#FDE047" stroke-width="1.8"/>` +
      `<path d="M 110 126 C 142 94 170 98 178 112 C 184 124 168 138 114 136 Z" fill="#FFFFFF" stroke="#FDE047" stroke-width="1.8"/>` +
      `</g>`
    );
  }

  if (weapon === 'flame_sword') {
    content += `<circle cx="150" cy="146" r="30" fill="#F97316" opacity="0.25"/><circle cx="150" cy="146" r="20" fill="#EF4444" opacity="0.3"/>`;
  }

  return content;
}

/* ---------------- 4. 2.5頭身の全身素体 (body: 腕・手) ---------------- */
function renderBody(skinColor: string): string {
  return (
    `<g id="layer-body">` +
    // 首
    `<rect x="94" y="124" width="12" height="12" fill="${skinColor}" />` +
    // 両腕（袖から出るぷっくりした可愛い手）
    `<path d="M 72 142 Q 56 152 56 164 C 56 170, 65 171, 68 165 L 78 152 Z" fill="${skinColor}" ${LINE} stroke-linejoin="round" />` +
    `<path d="M 128 142 Q 144 152 144 164 C 144 170, 135 171, 132 165 L 122 152 Z" fill="${skinColor}" ${LINE} stroke-linejoin="round" />` +
    `</g>`
  );
}

/* ---------------- 5. 靴・レッグウェア (shoes) ---------------- */
function renderShoes(outfit: string): string {
  const isDino = outfit === 'dino';
  const shoeColor = isDino ? '#15803D' : '#FF5E7E';

  return (
    `<g id="layer-shoes">` +
    // 左足（白ソックス＋スニーカー）
    `<path d="M 78 180 L 78 196 C 78 200 94 200 94 196 L 94 180 Z" fill="${shoeColor}" ${LINE} stroke-linejoin="round" />` +
    `<rect x="76" y="193" width="20" height="4" fill="#FFFFFF" stroke="#4A2E25" stroke-width="1.2" rx="1.5" />` +
    // 右足
    `<path d="M 106 180 L 106 196 C 106 200 122 200 122 196 L 122 180 Z" fill="${shoeColor}" ${LINE} stroke-linejoin="round" />` +
    `<rect x="104" y="193" width="20" height="4" fill="#FFFFFF" stroke="#4A2E25" stroke-width="1.2" rx="1.5" />` +
    `</g>`
  );
}

/* ---------------- 6. 衣装・おようふく (outfit) ---------------- */
function renderOutfit(outfit: string): string {
  switch (outfit) {
    case 'princess':
      return (
        `<g id="layer-outfit">` +
        // パフスリーブ袖
        `<circle cx="70" cy="144" r="10" fill="#FF8DA1" ${LINE} />` +
        `<circle cx="130" cy="144" r="10" fill="#FF8DA1" ${LINE} />` +
        // 胸元
        `<path d="M 78 134 Q 100 142 122 134 L 124 158 L 76 158 Z" fill="#FF5E7E" ${LINE} />` +
        `<circle cx="100" cy="146" r="4" fill="#38BDF8" stroke="#FFF" stroke-width="1" />` +
        // フリルスカート
        `<path d="M 76 158 C 55 168 50 186 56 192 C 75 196 125 196 144 192 C 150 186 145 168 124 158 Z" fill="#FFAEC0" ${LINE} />` +
        `</g>`
      );

    case 'knight':
      return (
        `<g id="layer-outfit">` +
        // 肩当て袖
        `<ellipse cx="68" cy="142" rx="9" ry="7" fill="#64748B" ${LINE} />` +
        `<ellipse cx="132" cy="142" rx="9" ry="7" fill="#64748B" ${LINE} />` +
        // 胴体鎧
        `<path d="M 76 134 L 124 134 L 122 178 L 78 178 Z" fill="#94A3B8" ${LINE} />` +
        `<path d="M 100 138 L 100 162 M 88 148 L 112 148" stroke="#FBBF24" stroke-width="3.5" stroke-linecap="round" />` +
        `</g>`
      );

    case 'dino':
      // 緑の服：四角に黄色い丸を完全廃止し、可愛いサロペット風きょうりゅう着ぐるみディテールに刷新！
      return (
        `<g id="layer-outfit">` +
        // きょうりゅうの半袖
        `<path d="M 80 135 Q 64 136 64 148 L 78 153 Z" fill="#16A34A" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 120 135 Q 136 136 136 148 L 122 153 Z" fill="#16A34A" ${LINE} stroke-linejoin="round" />` +
        // インナーのパステルミントTシャツ胸元
        `<path d="M 78 134 Q 100 140 122 134 L 124 156 L 76 156 Z" fill="#DCFCE7" ${LINE} stroke-linejoin="round" />` +
        // 丸みのあるきょうりゅうサロペット（肩紐・股の切れ込み・ズボン裾）
        `<path
          d="M 82 144 L 82 135 L 88 135 L 88 144 L 112 144 L 112 135 L 118 135 L 118 144 L 124 154 L 126 180 L 103 180 L 103 172 L 97 172 L 97 180 L 74 180 L 76 154 Z"
          fill="#22C55E"
          ${LINE}
          stroke-linejoin="round"
        />` +
        // 肩紐のボタン
        `<circle cx="85" cy="147" r="2.8" fill="#FEF08A" stroke="#4A2E25" stroke-width="1.5" />` +
        `<circle cx="115" cy="147" r="2.8" fill="#FEF08A" stroke="#4A2E25" stroke-width="1.5" />` +
        // お腹の可愛いタマゴ型ポケット
        `<path d="M 91 154 L 109 154 L 109 164 A 7 7 0 0 1 91 164 Z" fill="#FEF08A" stroke="#4A2E25" stroke-width="2" />` +
        `<polygon points="98,157 100,161 102,157" fill="#16A34A" />` +
        // 両脇のオレンジのトゲ飾り
        `<polygon points="76,146 71,149 76,152" fill="#F97316" stroke="#4A2E25" stroke-width="1.5" />` +
        `<polygon points="124,146 129,149 124,152" fill="#F97316" stroke="#4A2E25" stroke-width="1.5" />` +
        `</g>`
      );

    case 'tee_red':
      return (
        `<g id="layer-outfit">` +
        // 赤い半袖
        `<path d="M 80 135 Q 64 136 64 148 L 78 153 Z" fill="#EF4444" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 120 135 Q 136 136 136 148 L 122 153 Z" fill="#EF4444" ${LINE} stroke-linejoin="round" />` +
        // 赤いTシャツ胸元
        `<path d="M 78 134 Q 100 140 122 134 L 124 166 L 76 166 Z" fill="#EF4444" ${LINE} stroke-linejoin="round" />` +
        `<path d="${starPath(100, 150, 7.5)}" fill="#FDE047" stroke="#F59E0B" stroke-width="1" />` +
        // ハーフパンツ（股の立体感）
        `<path d="M 76 166 L 124 166 L 126 180 L 103 180 L 103 173 L 97 173 L 97 180 L 74 180 Z" fill="#1E293B" ${LINE} stroke-linejoin="round" />` +
        `</g>`
      );

    case 'tee_blue':
      return (
        `<g id="layer-outfit">` +
        // 青い半袖
        `<path d="M 80 135 Q 64 136 64 148 L 78 153 Z" fill="#3B82F6" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 120 135 Q 136 136 136 148 L 122 153 Z" fill="#3B82F6" ${LINE} stroke-linejoin="round" />` +
        // 青いボーダーTシャツ
        `<path d="M 78 134 Q 100 140 122 134 L 124 166 L 76 166 Z" fill="#3B82F6" ${LINE} stroke-linejoin="round" />` +
        `<line x1="77" y1="148" x2="123" y2="148" stroke="#FFFFFF" stroke-width="3" />` +
        `<line x1="77" y1="157" x2="123" y2="157" stroke="#FFFFFF" stroke-width="3" />` +
        // ハーフパンツ（股の立体感）
        `<path d="M 76 166 L 124 166 L 126 180 L 103 180 L 103 173 L 97 173 L 97 180 L 74 180 Z" fill="#1E3A8A" ${LINE} stroke-linejoin="round" />` +
        `</g>`
      );

    case 'panda_suit':
      return (
        `<g id="layer-outfit">` +
        // モコモコパンダ袖
        `<path d="M 80 135 Q 64 136 64 148 L 78 153 Z" fill="#18181B" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 120 135 Q 136 136 136 148 L 122 153 Z" fill="#18181B" ${LINE} stroke-linejoin="round" />` +
        // 白ボディ＋黒サロペット
        `<path d="M 78 134 Q 100 140 122 134 L 124 156 L 76 156 Z" fill="#F8FAFC" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 82 144 L 82 135 L 88 135 L 88 144 L 112 144 L 112 135 L 118 135 L 118 144 L 124 154 L 126 180 L 103 180 L 103 172 L 97 172 L 97 180 L 74 180 L 76 154 Z" fill="#27272A" ${LINE} stroke-linejoin="round" />` +
        `<circle cx="100" cy="162" r="8" fill="#F8FAFC" stroke="#4A2E25" stroke-width="1.5" />` +
        `</g>`
      );

    case 'ninja_suit':
      // くろがねにんじゃスーツ
      return (
        `<g id="layer-outfit">` +
        // 忍び袖
        `<path d="M 80 135 Q 64 136 64 148 L 78 153 Z" fill="#1E293B" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 120 135 Q 136 136 136 148 L 122 153 Z" fill="#1E293B" ${LINE} stroke-linejoin="round" />` +
        // 交差襟の忍者装束
        `<path d="M 78 134 L 122 134 L 124 166 L 76 166 Z" fill="#0F172A" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 82 134 L 100 152 L 118 134" stroke="#DC2626" stroke-width="2.5" fill="none" />` +
        // 赤い帯（腰布）
        `<rect x="76" y="156" width="48" height="6" fill="#DC2626" stroke="#4A2E25" stroke-width="1.5" />` +
        // 忍び袴
        `<path d="M 76 162 L 124 162 L 126 180 L 103 180 L 103 173 L 97 173 L 97 180 L 74 180 Z" fill="#1E293B" ${LINE} stroke-linejoin="round" />` +
        `</g>`
      );

    case 'magic_robe':
      // まほうのスターローブ
      return (
        `<g id="layer-outfit">` +
        `<ellipse cx="68" cy="144" rx="9" ry="8" fill="#4C1D95" ${LINE} />` +
        `<ellipse cx="132" cy="144" rx="9" ry="8" fill="#4C1D95" ${LINE} />` +
        `<path d="M 76 134 L 124 134 L 132 186 L 68 186 Z" fill="#581C87" ${LINE} />` +
        `<path d="M 100 134 L 100 186" stroke="#FBBF24" stroke-width="2.5" />` +
        `<path d="${starPath(88, 160, 5)}" fill="#FDE047" />` +
        `<path d="${starPath(112, 160, 5)}" fill="#FDE047" />` +
        `</g>`
      );

    case 'pilot_uniform':
      // パイロットダブルせいふく
      return (
        `<g id="layer-outfit">` +
        `<path d="M 80 135 Q 64 136 64 148 L 78 153 Z" fill="#1E3A8A" ${LINE} />` +
        `<path d="M 120 135 Q 136 136 136 148 L 122 153 Z" fill="#1E3A8A" ${LINE} />` +
        `<path d="M 78 134 L 122 134 L 124 166 L 76 166 Z" fill="#1E3A8A" ${LINE} />` +
        // 白シャツ襟とネクタイ
        `<polygon points="100,134 94,142 106,142" fill="#FFF" />` +
        `<polygon points="100,142 97,156 100,160 103,156" fill="#DC2626" />` +
        // 金ボタン
        `<circle cx="92" cy="150" r="1.8" fill="#FBBF24" /><circle cx="108" cy="150" r="1.8" fill="#FBBF24" />` +
        `<circle cx="92" cy="158" r="1.8" fill="#FBBF24" /><circle cx="108" cy="158" r="1.8" fill="#FBBF24" />` +
        // ズボン
        `<path d="M 76 166 L 124 166 L 126 180 L 103 180 L 103 173 L 97 173 L 97 180 L 74 180 Z" fill="#0F172A" ${LINE} />` +
        `</g>`
      );

    case 'idol_dress':
      // きらめきアイドルドレス
      return (
        `<g id="layer-outfit">` +
        `<circle cx="70" cy="144" r="9" fill="#F472B6" ${LINE} />` +
        `<circle cx="130" cy="144" r="9" fill="#F472B6" ${LINE} />` +
        `<path d="M 78 134 Q 100 142 122 134 L 124 156 L 76 156 Z" fill="#EC4899" ${LINE} />` +
        `<circle cx="100" cy="145" r="4" fill="#FDE047" stroke="#F59E0B" stroke-width="1" />` +
        `<path d="M 76 156 C 55 166 48 186 54 192 C 75 196 125 196 146 192 C 152 186 145 166 124 156 Z" fill="#FBCFE8" ${LINE} />` +
        `<path d="M 80 166 C 70 174 65 186 70 190 C 85 193 115 193 130 190 C 135 186 130 174 120 166 Z" fill="#F472B6" opacity="0.6" />` +
        `</g>`
      );

    case 'crystal_armor':
      // ★3 でんせつのクリスタルアーマー
      return (
        `<g id="layer-outfit">` +
        `<ellipse cx="68" cy="142" rx="9" ry="7" fill="#06B6D4" ${LINE} />` +
        `<ellipse cx="132" cy="142" rx="9" ry="7" fill="#06B6D4" ${LINE} />` +
        `<path d="M 76 134 L 124 134 L 122 178 L 78 178 Z" fill="#22D3EE" ${LINE} />` +
        `<polygon points="100,138 88,154 100,170 112,154" fill="#67E8F9" stroke="#0891B2" stroke-width="2" />` +
        `<circle cx="100" cy="154" r="3" fill="#FFF" />` +
        `</g>`
      );

    case 'overall':
    default:
      // 可愛いオーバーオール＆黄色Tシャツ袖
      return (
        `<g id="layer-outfit">` +
        // 両肩の可愛い半袖（黄色いTシャツの袖）
        `<path d="M 80 135 Q 64 136 64 148 L 78 153 Z" fill="#FFEAA7" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 120 135 Q 136 136 136 148 L 122 153 Z" fill="#FFEAA7" ${LINE} stroke-linejoin="round" />` +
        // インナーの黄色いTシャツ胸元
        `<path d="M 78 134 Q 100 140 122 134 L 124 156 L 76 156 Z" fill="#FFEAA7" ${LINE} stroke-linejoin="round" />` +
        // 可愛い丸みのあるデニムオーバーオール（台形＋ズボンの裾）
        `<path
          d="M 82 144 L 82 135 L 88 135 L 88 144 L 112 144 L 112 135 L 118 135 L 118 144 L 124 154 L 126 180 L 103 180 L 103 172 L 97 172 L 97 180 L 74 180 L 76 154 Z"
          fill="#5B8DEF"
          ${LINE}
          stroke-linejoin="round"
        />` +
        // オーバーオールの黄色いボタン2つと可愛い丸ポケット
        `<circle cx="85" cy="147" r="2.8" fill="#FFD166" stroke="#4A2E25" stroke-width="1.5" />` +
        `<circle cx="115" cy="147" r="2.8" fill="#FFD166" stroke="#4A2E25" stroke-width="1.5" />` +
        `<path d="M 92 154 L 108 154 L 108 163 A 6 6 0 0 1 92 163 Z" fill="#4A78D6" stroke="#4A2E25" stroke-width="2" />` +
        `</g>`
      );
  }
}

/* ---------------- 7. 頭部輪郭・耳 (headBase) ---------------- */
function renderHeadBase(skinColor: string): string {
  return (
    `<g id="layer-headbase">` +
    // 【共通：両耳とぷっくり丸い顔輪郭】
    `<circle cx="53" cy="106" r="7.5" fill="${skinColor}" stroke="#4A2E25" stroke-width="2.5" />` +
    `<circle cx="147" cy="106" r="7.5" fill="${skinColor}" stroke="#4A2E25" stroke-width="2.5" />` +
    `<path d="M 55 96 C 55 64, 145 64, 145 96 C 146 122, 126 135, 100 135 C 74 135, 54 122, 55 96 Z" fill="${skinColor}" stroke="#4A2E25" stroke-width="2.5" />` +
    `</g>`
  );
}

/* ---------------- 8. アニメ調のお顔・表情 (face: 全8種類) ---------------- */
function renderFace(expression: string): string {
  switch (expression) {
    case 'boy_cool':
      // ② 'boy_cool'（さわやかボーイ：キリッと太眉＋まつ毛なしクール瞳＋爽やか口）
      return (
        `<g id="layer-face">` +
        `<ellipse cx="67" cy="115" rx="6" ry="3.5" fill="#FF9E80" opacity="0.4" />` +
        `<ellipse cx="133" cy="115" rx="6" ry="3.5" fill="#FF9E80" opacity="0.4" />` +
        `<path d="M 70 90 L 86 93" fill="none" stroke="#4A2E25" stroke-width="3.2" stroke-linecap="round" />` +
        `<path d="M 130 90 L 114 93" fill="none" stroke="#4A2E25" stroke-width="3.2" stroke-linecap="round" />` +
        `<ellipse cx="79" cy="106" rx="8" ry="8.5" fill="#2C3A47" />` +
        `<ellipse cx="79" cy="108.5" rx="6.5" ry="5" fill="#4A90E2" />` +
        `<circle cx="76" cy="102" r="3.2" fill="#FFFFFF" />` +
        `<circle cx="82" cy="110" r="1.5" fill="#FFFFFF" />` +
        `<path d="M 70 99 L 87 100" fill="none" stroke="#2C3A47" stroke-width="3" stroke-linecap="round" />` +
        `<ellipse cx="121" cy="106" rx="8" ry="8.5" fill="#2C3A47" />` +
        `<ellipse cx="121" cy="108.5" rx="6.5" ry="5" fill="#4A90E2" />` +
        `<circle cx="118" cy="102" r="3.2" fill="#FFFFFF" />` +
        `<circle cx="124" cy="110" r="1.5" fill="#FFFFFF" />` +
        `<path d="M 113 100 L 130 99" fill="none" stroke="#2C3A47" stroke-width="3" stroke-linecap="round" />` +
        `<path d="M 94 115 Q 100 120 107 114" fill="none" stroke="#4A2E25" stroke-width="2.5" stroke-linecap="round" />` +
        `</g>`
      );

    case 'boy_grin':
    case 'grin':
      // ③ 'boy_grin'（わんぱくニカッ！：白い歯が見える笑顔＋右ほっぺの絆創膏）
      return (
        `<g id="layer-face">` +
        `<ellipse cx="67" cy="115" rx="6.5" ry="3.5" fill="#FF8DA1" opacity="0.5" />` +
        `<rect x="124" y="111" width="13" height="6" rx="2" transform="rotate(-12 130 114)" fill="#FFEAA7" stroke="#4A2E25" stroke-width="1.5" />` +
        `<line x1="129" y1="111" x2="130" y2="117" stroke="#E1B12C" stroke-width="1.2" />` +
        `<path d="M 69 91 Q 78 87 86 92" fill="none" stroke="#4A2E25" stroke-width="3.2" stroke-linecap="round" />` +
        `<path d="M 131 91 Q 122 87 114 92" fill="none" stroke="#4A2E25" stroke-width="3.2" stroke-linecap="round" />` +
        `<ellipse cx="79" cy="105" rx="8" ry="8.5" fill="#3D2217" />` +
        `<ellipse cx="79" cy="107.5" rx="6.5" ry="5" fill="#E58E26" />` +
        `<circle cx="76" cy="101" r="3.5" fill="#FFFFFF" />` +
        `<ellipse cx="121" cy="105" rx="8" ry="8.5" fill="#3D2217" />` +
        `<ellipse cx="121" cy="107.5" rx="6.5" ry="5" fill="#E58E26" />` +
        `<circle cx="118" cy="101" r="3.5" fill="#FFFFFF" />` +
        `<path d="M 91 113 L 109 113 C 109 122, 91 122, 91 113 Z" fill="#FFFFFF" stroke="#4A2E25" stroke-width="2.2" stroke-linejoin="round" />` +
        `</g>`
      );

    case 'boy_wink':
    case 'wink':
      // ④ 'boy_wink'（クールウィンク：左目＞ウィンク＋片上がりニヤリ口）
      return (
        `<g id="layer-face">` +
        `<path d="M 70 90 L 86 92" fill="none" stroke="#4A2E25" stroke-width="3.2" stroke-linecap="round" />` +
        `<path d="M 130 89 L 114 92" fill="none" stroke="#4A2E25" stroke-width="3.2" stroke-linecap="round" />` +
        `<path d="M 70 101 L 85 106 L 71 111" fill="none" stroke="#3D2217" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />` +
        `<ellipse cx="121" cy="106" rx="8" ry="8.5" fill="#2C3A47" />` +
        `<ellipse cx="121" cy="108.5" rx="6.5" ry="5" fill="#38ADA9" />` +
        `<circle cx="118" cy="102" r="3.2" fill="#FFFFFF" />` +
        `<path d="M 113 100 L 130 99" fill="none" stroke="#2C3A47" stroke-width="3" stroke-linecap="round" />` +
        `<path d="M 94 116 Q 102 118 108 112" fill="none" stroke="#4A2E25" stroke-width="2.5" stroke-linecap="round" />` +
        `</g>`
      );

    case 'boy_fighting':
      // ⑤ 'boy_fighting'（やるき満々！：勇ましい太眉＋赤い情熱の瞳＋元気な口）
      return (
        `<g id="layer-face">` +
        `<ellipse cx="67" cy="115" rx="6.5" ry="3.5" fill="#FF8DA1" opacity="0.5" />` +
        `<ellipse cx="133" cy="115" rx="6.5" ry="3.5" fill="#FF8DA1" opacity="0.5" />` +
        `<path d="M 68 89 L 87 94" fill="none" stroke="#4A2E25" stroke-width="3.5" stroke-linecap="round" />` +
        `<path d="M 132 89 L 113 94" fill="none" stroke="#4A2E25" stroke-width="3.5" stroke-linecap="round" />` +
        `<ellipse cx="79" cy="106" rx="8" ry="8.5" fill="#3D2217" />` +
        `<ellipse cx="79" cy="108.5" rx="6.5" ry="5" fill="#EB2F06" />` +
        `<circle cx="76" cy="102" r="3.5" fill="#FFFFFF" />` +
        `<ellipse cx="121" cy="106" rx="8" ry="8.5" fill="#3D2217" />` +
        `<ellipse cx="121" cy="108.5" rx="6.5" ry="5" fill="#EB2F06" />` +
        `<circle cx="118" cy="102" r="3.5" fill="#FFFFFF" />` +
        `<path d="M 94 113 L 106 113 C 108 122, 92 122, 94 113 Z" fill="#FF6B8B" stroke="#4A2E25" stroke-width="2.2" stroke-linejoin="round" />` +
        `</g>`
      );

    case 'happy_open':
    case 'wow':
      // ⑥ 'happy_open'（わーい！スマイル：girl_smileの口を可愛い開いた笑顔に変更）
      return (
        `<g id="layer-face">` +
        `<ellipse cx="67" cy="115" rx="7.5" ry="4.5" fill="#FF8DA1" opacity="0.6" />` +
        `<ellipse cx="133" cy="115" rx="7.5" ry="4.5" fill="#FF8DA1" opacity="0.6" />` +
        `<path d="M 72 91 Q 78 88 84 91" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<path d="M 116 91 Q 122 88 128 91" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<ellipse cx="78" cy="106" rx="8.5" ry="9.5" fill="#3D2217" />` +
        `<ellipse cx="78" cy="109" rx="7" ry="5.5" fill="#C87D46" />` +
        `<circle cx="75" cy="102" r="3.5" fill="#FFFFFF" />` +
        `<circle cx="82" cy="110" r="1.6" fill="#FFFFFF" />` +
        `<path d="M 67 99 Q 78 92 87 100" fill="none" stroke="#3D2217" stroke-width="3" stroke-linecap="round" />` +
        `<path d="M 68 99 L 64 96" stroke="#3D2217" stroke-width="2.5" stroke-linecap="round" />` +
        `<ellipse cx="122" cy="106" rx="8.5" ry="9.5" fill="#3D2217" />` +
        `<ellipse cx="122" cy="109" rx="7" ry="5.5" fill="#C87D46" />` +
        `<circle cx="119" cy="102" r="3.5" fill="#FFFFFF" />` +
        `<circle cx="126" cy="110" r="1.6" fill="#FFFFFF" />` +
        `<path d="M 113 100 Q 122 92 133 99" fill="none" stroke="#3D2217" stroke-width="3" stroke-linecap="round" />` +
        `<path d="M 132 99 L 136 96" stroke="#3D2217" stroke-width="2.5" stroke-linecap="round" />` +
        `<path d="M 94 114 Q 100 110 106 114 C 106 122 94 122 94 114 Z" fill="#FF5E7E" stroke="#4A2E25" stroke-width="1.8" stroke-linejoin="round" />` +
        `<path d="M 96 114 Q 100 116 104 114" fill="#FFFFFF" />` +
        `</g>`
      );

    case 'wink_star':
      // ⑦ 'wink_star'（キラッ☆ウィンク：girl_smileの左目を可愛いアーチ曲線に変更）
      return (
        `<g id="layer-face">` +
        `<ellipse cx="67" cy="115" rx="7.5" ry="4.5" fill="#FF8DA1" opacity="0.6" />` +
        `<ellipse cx="133" cy="115" rx="7.5" ry="4.5" fill="#FF8DA1" opacity="0.6" />` +
        `<path d="M 72 91 Q 78 88 84 91" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<path d="M 116 91 Q 122 88 128 91" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<path d="M 70 106 Q 78 98 86 106" fill="none" stroke="#3D2217" stroke-width="3.2" stroke-linecap="round" />` +
        `<path d="M 68 103 L 64 100" stroke="#3D2217" stroke-width="2.5" stroke-linecap="round" />` +
        `<ellipse cx="122" cy="106" rx="8.5" ry="9.5" fill="#3D2217" />` +
        `<ellipse cx="122" cy="109" rx="7" ry="5.5" fill="#C87D46" />` +
        `<circle cx="119" cy="102" r="3.5" fill="#FFFFFF" />` +
        `<circle cx="126" cy="110" r="1.6" fill="#FFFFFF" />` +
        `<path d="M 113 100 Q 122 92 133 99" fill="none" stroke="#3D2217" stroke-width="3" stroke-linecap="round" />` +
        `<path d="M 132 99 L 136 96" stroke="#3D2217" stroke-width="2.5" stroke-linecap="round" />` +
        `<path d="${starPath(63, 108, 3.5)}" fill="#FDE047" />` +
        `<path d="M 96 115 Q 100 119 104 115" fill="none" stroke="#4A2E25" stroke-width="2.5" stroke-linecap="round" />` +
        `</g>`
      );

    case 'shy_blush':
      // ⑧ 'shy_blush'（ぽかぽか照れ顔：両目をにっこりアーチ曲線にし、チークを濃く表示）
      return (
        `<g id="layer-face">` +
        `<ellipse cx="67" cy="115" rx="8.5" ry="5.5" fill="#FF8DA1" opacity="0.8" />` +
        `<ellipse cx="133" cy="115" rx="8.5" ry="5.5" fill="#FF8DA1" opacity="0.8" />` +
        `<line x1="63" y1="113" x2="66" y2="117" stroke="#FF5E7E" stroke-width="1.5" stroke-linecap="round" />` +
        `<line x1="68" y1="113" x2="71" y2="117" stroke="#FF5E7E" stroke-width="1.5" stroke-linecap="round" />` +
        `<line x1="129" y1="113" x2="132" y2="117" stroke="#FF5E7E" stroke-width="1.5" stroke-linecap="round" />` +
        `<line x1="134" y1="113" x2="137" y2="117" stroke="#FF5E7E" stroke-width="1.5" stroke-linecap="round" />` +
        `<path d="M 72 90 Q 78 87 84 90" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<path d="M 116 90 Q 122 87 128 90" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<path d="M 70 106 Q 78 98 86 106" fill="none" stroke="#3D2217" stroke-width="3.2" stroke-linecap="round" />` +
        `<path d="M 114 106 Q 122 98 130 106" fill="none" stroke="#3D2217" stroke-width="3.2" stroke-linecap="round" />` +
        `<path d="M 96 115 Q 100 119 104 115" fill="none" stroke="#4A2E25" stroke-width="2.5" stroke-linecap="round" />` +
        `</g>`
      );

    case 'girl_smile':
    case 'smile':
    default:
      // ① 'girl_smile'（にっこりガール：まつ毛つきうるうる瞳＋小さなにっこり口）
      return (
        `<g id="layer-face">` +
        `<ellipse cx="67" cy="115" rx="7.5" ry="4.5" fill="#FF8DA1" opacity="0.6" />` +
        `<ellipse cx="133" cy="115" rx="7.5" ry="4.5" fill="#FF8DA1" opacity="0.6" />` +
        `<path d="M 72 91 Q 78 88 84 91" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<path d="M 116 91 Q 122 88 128 91" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<ellipse cx="78" cy="106" rx="8.5" ry="9.5" fill="#3D2217" />` +
        `<ellipse cx="78" cy="109" rx="7" ry="5.5" fill="#C87D46" />` +
        `<circle cx="75" cy="102" r="3.5" fill="#FFFFFF" />` +
        `<circle cx="82" cy="110" r="1.6" fill="#FFFFFF" />` +
        `<path d="M 67 99 Q 78 92 87 100" fill="none" stroke="#3D2217" stroke-width="3" stroke-linecap="round" />` +
        `<path d="M 68 99 L 64 96" stroke="#3D2217" stroke-width="2.5" stroke-linecap="round" />` +
        `<ellipse cx="122" cy="106" rx="8.5" ry="9.5" fill="#3D2217" />` +
        `<ellipse cx="122" cy="109" rx="7" ry="5.5" fill="#C87D46" />` +
        `<circle cx="119" cy="102" r="3.5" fill="#FFFFFF" />` +
        `<circle cx="126" cy="110" r="1.6" fill="#FFFFFF" />` +
        `<path d="M 113 100 Q 122 92 133 99" fill="none" stroke="#3D2217" stroke-width="3" stroke-linecap="round" />` +
        `<path d="M 132 99 L 136 96" stroke="#3D2217" stroke-width="2.5" stroke-linecap="round" />` +
        `<path d="M 96 115 Q 100 119 104 115" fill="none" stroke="#4A2E25" stroke-width="2.5" stroke-linecap="round" />` +
        `</g>`
      );
  }
}

// 共通前髪パーツ（short / bob / twintails / buns / ponytail / braids で使用するスリット入り可愛い前髪）
const cuteSlitBangs = "M 50 94 C 48 52, 74 44, 100 44 C 126 44, 152 52, 150 94 Q 144 114, 138 118 C 136 104, 136 94, 134 88 Q 126 95, 116 95 L 112 82 L 108 94 Q 98 96, 88 94 L 84 80 L 79 94 Q 71 95, 66 88 C 64 94, 64 104, 62 118 Q 56 114, 50 94 Z";

// すべての髪型の frontHair の最後に重ねる「3つの柔らかいツヤ玉ハイライト」
const HAIR_HIGHLIGHTS =
  `<ellipse cx="78" cy="64" rx="8" ry="3" transform="rotate(-15 78 64)" fill="#FFFFFF" opacity="0.35" />` +
  `<ellipse cx="100" cy="60" rx="10" ry="3" fill="#FFFFFF" opacity="0.35" />` +
  `<ellipse cx="122" cy="64" rx="8" ry="3" transform="rotate(15 122 64)" fill="#FFFFFF" opacity="0.35" />`;

/* ---------------- 9. 前髪・サイド髪 (frontHair: 全12種類) ---------------- */
function renderFrontHair(style: string, hc: string): string {
  switch (style) {
    case 'long':
      // ② 'long'（さらさらロング＋赤い大きなリボンカチューシャ）
      return (
        `<g id="layer-fronthair">` +
        `<path d="M 52 88 C 46 115, 48 145, 58 154 C 66 150, 66 125, 65 90 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<path d="M 148 88 C 154 115, 152 145, 142 154 C 134 150, 134 125, 135 90 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<path d="${cuteSlitBangs}" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<path d="M 100 46 C 82 32, 70 42, 78 54 C 86 58, 95 52, 100 48 C 105 52, 114 58, 122 54 C 130 42, 118 32, 100 46 Z" fill="#FF5E7E" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<circle cx="100" cy="48" r="5" fill="#FF8DA1" stroke="#4A2E25" stroke-width="2" />` +
        HAIR_HIGHLIGHTS +
        `</g>`
      );

    case 'bob':
      // ③ 'bob'（ふんわりボブ）
      return (
        `<g id="layer-fronthair">` +
        `<path d="M 49 88 C 42 115, 48 138, 66 140 C 66 122, 65 104, 65 90 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<path d="M 151 88 C 158 115, 152 138, 134 140 C 134 122, 135 104, 135 90 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<path d="${cuteSlitBangs}" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        HAIR_HIGHLIGHTS +
        `</g>`
      );

    case 'twintails':
    case 'pigtails':
      // ④ 'twintails'（ふたつむすび）
      return (
        `<g id="layer-fronthair">` +
        `<path d="${cuteSlitBangs}" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        HAIR_HIGHLIGHTS +
        `</g>`
      );

    case 'spiky':
      // ⑤ 'spiky'（つんつんスパイキー）
      return (
        `<g id="layer-fronthair">` +
        `<path d="M 50 96 L 38 82 L 52 72 L 44 50 L 70 54 L 82 32 L 102 46 L 122 32 L 132 54 L 156 50 L 148 72 L 162 82 L 150 96 L 140 112 L 135 88 L 122 96 L 114 80 L 102 95 L 92 78 L 80 95 L 65 88 L 60 112 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        HAIR_HIGHLIGHTS +
        `</g>`
      );

    case 'buns':
    case 'bun':
      // ⑥ 'buns'（おだんごヘア）
      return (
        `<g id="layer-fronthair">` +
        `<path d="${cuteSlitBangs}" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        HAIR_HIGHLIGHTS +
        `</g>`
      );

    case 'boy_mash':
      // ⑦ 【男の子用】さわやかマッシュ
      return (
        `<g id="layer-fronthair">` +
        `<path d="M 51 94 C 48 52, 74 44, 100 44 C 126 44, 152 52, 149 94 L 143 105 L 139 89 Q 128 96, 114 95 L 106 78 L 101 94 Q 88 96, 76 92 L 72 82 L 67 92 L 61 89 L 57 105 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        HAIR_HIGHLIGHTS +
        `</g>`
      );

    case 'boy_asymmetry':
      // ⑧ 【男の子用】クールななめバング
      return (
        `<g id="layer-fronthair">` +
        `<path d="M 50 95 C 48 52, 74 44, 100 44 C 126 44, 152 52, 150 95 L 142 110 L 138 88 Q 126 92, 118 82 L 114 93 Q 94 98, 74 102 L 82 86 Q 68 94, 62 88 L 58 110 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        HAIR_HIGHLIGHTS +
        `</g>`
      );

    case 'boy_sporty':
      // ⑨ 【男の子用】わんぱくベリーショート
      return (
        `<g id="layer-fronthair">` +
        `<path d="M 52 94 L 46 78 L 56 72 L 54 54 L 76 54 L 90 36 L 104 48 L 118 36 L 128 52 L 148 54 L 144 72 L 154 78 L 148 94 L 142 104 L 138 84 L 122 86 L 112 76 L 102 84 L 90 74 L 78 85 L 62 84 L 58 104 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        HAIR_HIGHLIGHTS +
        `</g>`
      );

    case 'girl_ponytail':
      // ⑩ 【女の子用】元気ポニーテール
      return (
        `<g id="layer-fronthair">` +
        `<path d="${cuteSlitBangs}" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        HAIR_HIGHLIGHTS +
        `</g>`
      );

    case 'girl_wavy_princess':
      // ⑪ 【女の子用】ゆるふわプリンセス
      return (
        `<g id="layer-fronthair">` +
        `<path d="M 50 88 C 38 115, 52 135, 46 154 C 56 160, 68 148, 65 120 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<path d="M 150 88 C 162 115, 148 135, 154 154 C 144 160, 132 148, 135 120 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<path d="M 50 94 C 48 50, 74 44, 100 44 C 126 44, 152 50, 150 94 Q 132 98, 114 90 Q 104 82, 100 76 Q 96 82, 86 90 Q 68 98, 50 94 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        HAIR_HIGHLIGHTS +
        `</g>`
      );

    case 'girl_braids':
      // ⑫ 【女の子用】かわいい三つ編み
      return (
        `<g id="layer-fronthair">` +
        `<path d="${cuteSlitBangs}" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        HAIR_HIGHLIGHTS +
        `</g>`
      );

    case 'short':
    default:
      // ① 'short'（みじかいショート）
      return (
        `<g id="layer-fronthair">` +
        `<path d="${cuteSlitBangs}" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        HAIR_HIGHLIGHTS +
        `</g>`
      );
  }
}

/* ---------------- 10. 頭装備 (accessory) ---------------- */
function renderAccessory(accessory: string): string {
  if (IMAGE_ASSETS.accessory.has(accessory)) {
    if (accessory === 'ribbon') {
      return `<image href="/assets/avatar/accessory/ribbon.png" x="66" y="16" width="68" height="68" preserveAspectRatio="xMidYMid meet" />`;
    }
    return `<image href="/assets/avatar/accessory/${accessory}.png" x="65" y="15" width="70" height="70" preserveAspectRatio="xMidYMid meet" />`;
  }

  switch (accessory) {
    case 'crown':
      return (
        `<g>` +
        `<path d="M 80 44 L 84 24 L 92 34 L 100 20 L 108 34 L 116 24 L 120 44 Z" fill="#FBBF24" ${LINE} />` +
        `<circle cx="84" cy="24" r="2.2" fill="#EF4444" /><circle cx="100" cy="20" r="2.5" fill="#38BDF8" /><circle cx="116" cy="24" r="2.2" fill="#10B981" />` +
        `</g>`
      );

    case 'tiara':
      return (
        `<g>` +
        `<path d="M 82 48 C 88 36 94 30 100 28 C 106 30 112 36 118 48 Z" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1.5" />` +
        `<circle cx="100" cy="32" r="2.5" fill="#38BDF8" />` +
        `</g>`
      );

    case 'ribbon':
      return (
        `<g>` +
        `<polygon points="100,42 78,30 80,50" fill="#FF5E7E" ${LINE} />` +
        `<polygon points="100,42 122,30 120,50" fill="#FF5E7E" ${LINE} />` +
        `<circle cx="100" cy="42" r="4.5" fill="#FF8DA1" ${LINE} />` +
        `</g>`
      );

    case 'angel_ring':
      return (
        `<g>` +
        `<ellipse cx="100" cy="30" rx="26" ry="7.5" fill="none" stroke="#FDE047" stroke-width="4.5" opacity="0.95" />` +
        `<ellipse cx="100" cy="30" rx="26" ry="7.5" fill="none" stroke="#FFFFFF" stroke-width="1.8" />` +
        `</g>`
      );

    case 'sunglasses':
      return (
        `<g>` +
        `<path d="M 68 100 L 94 100 C 94 112 84 116 70 112 Z" fill="#18181B" ${LINE} />` +
        `<path d="M 106 100 L 132 100 C 132 112 122 116 108 112 Z" fill="#18181B" ${LINE} />` +
        `<line x1="94" y1="102" x2="106" y2="102" stroke="#4A2E25" stroke-width="2" />` +
        `</g>`
      );

    case 'ninja_band':
      // にんじゃのハチマキ（額当て＆風になびく帯）
      return (
        `<g>` +
        // なびくハチマキの紐（後頭部から右へなびく）
        `<path d="M 144 82 C 160 80, 172 88, 182 86 C 175 92, 162 90, 146 88 Z" fill="#1E293B" stroke="#4A2E25" stroke-width="2" />` +
        `<path d="M 144 86 C 162 90, 168 102, 178 106 C 170 104, 158 96, 145 90 Z" fill="#1E293B" stroke="#4A2E25" stroke-width="2" />` +
        // 額に巻いたハチマキの帯
        `<path d="M 53 82 Q 100 77 147 82 L 146 93 Q 100 88 54 93 Z" fill="#1E293B" stroke="#4A2E25" stroke-width="2.5" />` +
        // 中央の銀色額当てプレート
        `<rect x="87" y="78" width="26" height="12" rx="2" fill="#E2E8F0" stroke="#4A2E25" stroke-width="1.8" />` +
        `<circle cx="91" cy="84" r="1" fill="#475569" /><circle cx="109" cy="84" r="1" fill="#475569" />` +
        `<polygon points="100,80 102.5,84 100,88 97.5,84" fill="#334155" />` +
        `</g>`
      );

    case 'wizard':
      // まほうつかいのぼうし
      return (
        `<g>` +
        `<ellipse cx="100" cy="54" rx="42" ry="10" fill="#3B0764" ${LINE} />` +
        `<path d="M 70 52 L 100 10 L 130 52 Z" fill="#581C87" ${LINE} />` +
        `<path d="M 76 48 Q 100 52 124 48 L 126 53 Q 100 57 74 53 Z" fill="#FBBF24" />` +
        `<path d="${starPath(100, 50, 4.5)}" fill="#FEF08A" stroke="#F59E0B" stroke-width="1" />` +
        `</g>`
      );

    case 'star_pin':
      // キラキラスターピン
      return (
        `<g>` +
        `<path d="${starPath(70, 70, 9)}" fill="#FDE047" stroke="#F59E0B" stroke-width="2" />` +
        `<circle cx="70" cy="70" r="3" fill="#FFFFFF" />` +
        `</g>`
      );

    case 'knight_helmet':
      // はねかざりナイトカブト
      return (
        `<g>` +
        `<path d="M 60 64 Q 100 50 140 64 L 136 78 Q 100 66 64 78 Z" fill="#94A3B8" ${LINE} />` +
        `<path d="M 100 54 C 100 28, 118 20, 126 12 C 120 30, 110 42, 100 54 Z" fill="#EF4444" stroke="#B91C1C" stroke-width="1.5" />` +
        `</g>`
      );

    case 'dino_hood':
      // きょうりゅうフード
      return (
        `<g>` +
        `<path d="M 56 75 C 56 36, 144 36, 144 75 Z" fill="#22C55E" ${LINE} />` +
        `<polygon points="96,36 100,24 104,36" fill="#F97316" ${LINE} />` +
        `<polygon points="82,42 85,32 90,43" fill="#F97316" ${LINE} />` +
        `<polygon points="110,43 115,32 118,42" fill="#F97316" ${LINE} />` +
        `<circle cx="74" cy="52" r="5" fill="#FFF" stroke="#4A2E25" stroke-width="1.5" /><circle cx="75" cy="52" r="2.5" fill="#000" />` +
        `<circle cx="126" cy="52" r="5" fill="#FFF" stroke="#4A2E25" stroke-width="1.5" /><circle cx="125" cy="52" r="2.5" fill="#000" />` +
        `</g>`
      );

    case 'cat_headphone':
      // ネコみみヘッドホン
      return (
        `<g>` +
        `<path d="M 52 95 C 50 40, 150 40, 148 95" fill="none" stroke="#F43F5E" stroke-width="4.5" stroke-linecap="round" />` +
        `<polygon points="62,56 70,30 88,50" fill="#FDA4AF" ${LINE} />` +
        `<polygon points="68,52 72,36 82,48" fill="#FFF" />` +
        `<polygon points="138,56 130,30 112,50" fill="#FDA4AF" ${LINE} />` +
        `<polygon points="132,52 128,36 118,48" fill="#FFF" />` +
        `<circle cx="52" cy="100" r="9" fill="#FB7185" ${LINE} />` +
        `<circle cx="148" cy="100" r="9" fill="#FB7185" ${LINE} />` +
        `</g>`
      );

    case 'acc_none':
    default:
      return '';
  }
}

/* ---------------- 11. 持ち物・武器 (weapon) ---------------- */
function renderWeapon(weapon?: string): string {
  if (weapon && IMAGE_ASSETS.weapon.has(weapon)) {
    if (weapon === 'flame_sword') {
      return `<image href="/assets/avatar/weapon/flame_sword.png" x="106" y="88" width="90" height="90" preserveAspectRatio="xMidYMid meet" />`;
    }
    if (weapon === 'brave_sword') {
      return `<image href="/assets/avatar/weapon/brave_sword.png" x="108" y="94" width="84" height="84" preserveAspectRatio="xMidYMid meet" />`;
    }
    if (weapon === 'laser_blade') {
      return `<image href="/assets/avatar/weapon/laser_blade.png" x="110" y="94" width="82" height="82" preserveAspectRatio="xMidYMid meet" />`;
    }
    if (weapon === 'giant_candy') {
      return `<image href="/assets/avatar/weapon/giant_candy.png" x="112" y="94" width="80" height="80" preserveAspectRatio="xMidYMid meet" />`;
    }
    return `<image href="/assets/avatar/weapon/${weapon}.png" x="110" y="94" width="82" height="82" preserveAspectRatio="xMidYMid meet" />`;
  }

  switch (weapon) {
    case 'brave_sword':
      return (
        `<g>` +
        `<path d="M 132 160 L 158 112 L 162 114 L 137 165 Z" fill="#F1F5F9" stroke="#64748B" stroke-width="1.5" />` +
        `<rect x="126" y="160" width="16" height="4.5" fill="#FBBF24" rx="1.5" transform="rotate(-35 134 162)" />` +
        `<circle cx="125" cy="176" r="3" fill="#FBBF24" />` +
        `</g>`
      );

    case 'magic_wand':
      return (
        `<g>` +
        `<line x1="126" y1="175" x2="154" y2="120" stroke="#FBBF24" stroke-width="3.5" stroke-linecap="round" />` +
        `<path d="${starPath(155, 118, 10)}" fill="#FDE047" stroke="#F59E0B" stroke-width="1.5" />` +
        `</g>`
      );

    case 'giant_candy':
      return (
        `<g>` +
        `<line x1="126" y1="175" x2="148" y2="130" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" />` +
        `<circle cx="152" cy="120" r="15" fill="#F43F5E" ${LINE} />` +
        `<circle cx="152" cy="120" r="10" fill="#FFFFFF" />` +
        `<circle cx="152" cy="120" r="5" fill="#38BDF8" />` +
        `</g>`
      );

    case 'laser_blade':
      // サイバーレーザーブレード
      return (
        `<g>` +
        `<rect x="128" y="160" width="10" height="20" rx="2" fill="#334155" stroke="#4A2E25" stroke-width="1.5" transform="rotate(-30 133 170)" />` +
        `<line x1="135" y1="162" x2="160" y2="114" stroke="#4ADE80" stroke-width="5" stroke-linecap="round" />` +
        `<line x1="135" y1="162" x2="160" y2="114" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" />` +
        `</g>`
      );

    case 'flame_sword':
      // ★3 ほのおのレジェンドブレード
      return (
        `<g>` +
        `<path d="M 132 160 L 158 108 C 168 118, 150 135, 162 140 C 150 148, 142 165, 137 165 Z" fill="#EF4444" stroke="#B91C1C" stroke-width="2" />` +
        `<path d="M 135 158 L 154 116 C 160 124, 148 135, 156 138 C 146 145, 140 158, 138 158 Z" fill="#F59E0B" />` +
        `<path d="M 137 156 L 150 125 L 142 152 Z" fill="#FEF08A" />` +
        `<rect x="126" y="160" width="16" height="5" fill="#FBBF24" rx="1.5" transform="rotate(-35 134 162)" />` +
        `<circle cx="125" cy="176" r="3" fill="#DC2626" />` +
        `</g>`
      );

    case 'wp_none':
    default:
      return '';
  }
}

/* ---------------- 12. 相棒ペット (pet) ---------------- */
function renderPet(pet: string): string {
  if (IMAGE_ASSETS.pet.has(pet)) {
    if (pet === 'flying_unicorn') {
      return `<image href="/assets/avatar/pet/flying_unicorn.png" x="4" y="138" width="72" height="72" preserveAspectRatio="xMidYMid meet" />`;
    }
    if (pet === 'slime') {
      return `<image href="/assets/avatar/pet/slime.png" x="10" y="156" width="60" height="60" preserveAspectRatio="xMidYMid meet" />`;
    }
    if (pet === 'mini_dragon' || pet === 'dragon') {
      return `<image href="/assets/avatar/pet/${pet}.png" x="6" y="144" width="68" height="68" preserveAspectRatio="xMidYMid meet" />`;
    }
    if (pet === 'unicorn') {
      return `<image href="/assets/avatar/pet/unicorn.png" x="6" y="142" width="68" height="68" preserveAspectRatio="xMidYMid meet" />`;
    }
    return `<image href="/assets/avatar/pet/${pet}.png" x="8" y="146" width="66" height="66" preserveAspectRatio="xMidYMid meet" />`;
  }

  switch (pet) {
    case 'shiba':
      return (
        `<g transform="translate(18 172)">` +
        `<ellipse cx="19" cy="18" rx="12" ry="9" fill="#D97706" ${LINE} />` +
        `<circle cx="13" cy="8" r="8.5" fill="#D97706" ${LINE} />` +
        `<circle cx="13" cy="10" r="5.5" fill="#FEF3C7" />` +
        `<circle cx="10" cy="8" r="1.2" fill="#1E293B" /><circle cx="16" cy="8" r="1.2" fill="#1E293B" />` +
        `<rect x="8" y="14" width="10" height="2.5" fill="#DC2626" rx="1" />` +
        `</g>`
      );

    case 'dragon':
    case 'mini_dragon':
      return (
        `<g transform="translate(18 172)">` +
        `<ellipse cx="18" cy="17" rx="11" ry="10" fill="#10B981" ${LINE} />` +
        `<circle cx="13" cy="8" r="7.5" fill="#10B981" ${LINE} />` +
        `<circle cx="11" cy="7" r="1.3" fill="#1E293B" /><circle cx="16" cy="7" r="1.3" fill="#1E293B" />` +
        `</g>`
      );

    case 'penguin':
      // マフラーペンギン
      return (
        `<g transform="translate(18 170)">` +
        `<ellipse cx="18" cy="18" rx="10" ry="12" fill="#18181B" ${LINE} />` +
        `<ellipse cx="18" cy="19" rx="6.5" ry="8.5" fill="#FFFFFF" />` +
        `<circle cx="18" cy="8" r="8" fill="#18181B" ${LINE} />` +
        `<circle cx="15" cy="7" r="1.3" fill="#FFFFFF" /><circle cx="21" cy="7" r="1.3" fill="#FFFFFF" />` +
        `<polygon points="18,8 15,11 21,11" fill="#F59E0B" />` +
        `<path d="M 10 13 Q 18 16 26 13 L 26 16 Q 18 19 10 16 Z" fill="#EF4444" />` +
        `<polygon points="23,15 25,24 21,24" fill="#DC2626" />` +
        `</g>`
      );

    case 'slime':
      // ぷるぷるスライム
      return (
        `<g transform="translate(18 176)">` +
        `<path d="M 18 4 C 8 4 6 18 8 22 C 10 26 26 26 28 22 C 30 18 28 4 18 4 Z" fill="#38BDF8" ${LINE} />` +
        `<ellipse cx="14" cy="14" rx="2" ry="3" fill="#0F172A" /><ellipse cx="22" cy="14" rx="2" ry="3" fill="#0F172A" />` +
        `<circle cx="13" cy="13" r="0.8" fill="#FFF" /><circle cx="21" cy="13" r="0.8" fill="#FFF" />` +
        `<ellipse cx="14" cy="9" rx="3" ry="1.5" fill="#FFF" opacity="0.6" transform="rotate(-20 14 9)" />` +
        `</g>`
      );

    case 'unicorn':
      // ミニユニコーン
      return (
        `<g transform="translate(16 172)">` +
        `<ellipse cx="20" cy="18" rx="11" ry="9" fill="#FFFFFF" ${LINE} />` +
        `<circle cx="14" cy="9" r="8" fill="#FFFFFF" ${LINE} />` +
        `<circle cx="11" cy="9" r="1.3" fill="#1E293B" />` +
        `<polygon points="12,2 14,8 10,8" fill="#FBBF24" ${LINE} />` +
        `<path d="M 18 4 C 22 2, 24 10, 24 14" fill="none" stroke="#F472B6" stroke-width="2.5" stroke-linecap="round" />` +
        `</g>`
      );

    case 'flying_unicorn':
      // ★3 はばたくペガサス
      return (
        `<g transform="translate(16 172)">` +
        `<ellipse cx="20" cy="18" rx="11" ry="9" fill="#FFFFFF" ${LINE} />` +
        `<circle cx="14" cy="9" r="8" fill="#FFFFFF" ${LINE} />` +
        `<circle cx="11" cy="9" r="1.3" fill="#1E293B" />` +
        `<polygon points="12,2 14,8 10,8" fill="#FDE047" ${LINE} />` +
        `<path d="M 18 4 C 22 2, 24 10, 24 14" fill="none" stroke="#F472B6" stroke-width="2.5" stroke-linecap="round" />` +
        `<path d="M 22 14 C 26 6, 36 8, 32 18 C 28 18, 24 16, 22 14 Z" fill="#BAE6FD" stroke="#38BDF8" stroke-width="1.5" />` +
        `</g>`
      );

    case 'anglerfish':
      // ピカピカアンコウ
      return (
        `<g transform="translate(16 172)">` +
        `<ellipse cx="20" cy="17" rx="13" ry="10" fill="#FBBF24" ${LINE} />` +
        `<circle cx="13" cy="15" r="2.5" fill="#FFF" /><circle cx="13" cy="15" r="1.2" fill="#000" />` +
        `<path d="M 18 8 C 16 0, 8 2, 7 6" fill="none" stroke="#B45309" stroke-width="2" stroke-linecap="round" />` +
        `<circle cx="7" cy="6" r="3" fill="#FDE047" /><circle cx="7" cy="6" r="1.5" fill="#FFF" />` +
        `<polygon points="32,17 38,12 38,22" fill="#F59E0B" ${LINE} />` +
        `</g>`
      );

    case 'pet_none':
    default:
      return '';
  }
}

/* ---------------- 13. 総合SVG生成関数 (viewBox 0 0 200 240) ---------------- */
export function buildGameAvatarSvg(
  cfg?: Partial<AvatarConfig> | null,
  pixelWidth?: number | string,
  pixelHeight?: number | string,
  viewBox: string = '0 0 200 240',
  idPrefix: string = 'av'
): string {
  const safeCfg: AvatarConfig = {
    skin: 's1',
    hairStyle: 'short',
    hairColor: 'brown',
    expression: 'girl_smile',
    outfit: 'overall',
    accessory: 'acc_none',
    weapon: 'wp_none',
    pet: 'pet_none',
    bg: 'sky',
    ...(cfg || {}),
  };

  const skin = colorOf(safeCfg.skin, '#FFE3CC');
  const hc = colorOf(safeCfg.hairColor, '#6E473B');
  const outfit = safeCfg.outfit || 'overall';
  const accessory = safeCfg.accessory || 'acc_none';
  const weapon = safeCfg.weapon || 'wp_none';
  const hairStyle = safeCfg.hairStyle || 'short';
  const expression = safeCfg.expression || 'girl_smile';
  const bg = safeCfg.bg || 'sky';
  const pet = safeCfg.pet || 'pet_none';

  const layers = [
    // 1. 背景ステージ
    renderBackground(bg, idPrefix),
    // 2. 後ろ髪 (backHair)
    renderBackHair(hairStyle, hc),
    // 3. マント・背中装備 (backItem)
    renderBackItem(weapon, outfit, accessory, idPrefix),
    // 4. 素体 (body)
    renderBody(skin),
    // 5. 靴 (shoes)
    renderShoes(outfit),
    // 6. 衣装 (outfit)
    renderOutfit(outfit),
    // 7. 顔の輪郭・耳 (headBase)
    renderHeadBase(skin),
    // 8. 表情・瞳 (face)
    renderFace(expression),
    // 9. 前髪 (frontHair)
    renderFrontHair(hairStyle, hc),
    // 10. 頭装備 (accessory)
    renderAccessory(accessory),
    // 11. 持ち物・武器 (weapon)
    renderWeapon(weapon),
    // 12. 相棒ペット (pet)
    renderPet(pet),
  ];

  const w = pixelWidth ? `width="${pixelWidth}"` : 'width="100%"';
  const h = pixelHeight ? `height="${pixelHeight}"` : 'height="100%"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ${w} ${h}>${layers.join('')}</svg>`;
}

export const buildAvatarSvg = buildGameAvatarSvg;

/* ---------------- 14. アバターアイテム整合性自己診断バリデーター ---------------- */

/**
 * 全アバターアイテムの描画整合性を自己診断するバリデーション関数。
 * 未実装のアイテム描画処理がある場合、警告を出力して検出します。
 */
export function validateAvatarRenderers(): {
  ok: boolean;
  missing: { id: string; slot: string; name: string }[];
} {
  const missing: { id: string; slot: string; name: string }[] = [];
  const defaultSkySvg = renderBackground('sky', 'chk');
  const defaultOverallSvg = renderOutfit('overall');

  for (const opt of AVATAR_OPTIONS) {
    if (opt.hidden) continue;

    if (opt.slot === 'accessory') {
      if (opt.id !== 'acc_none' && renderAccessory(opt.id) === '') {
        missing.push({ id: opt.id, slot: opt.slot, name: opt.name });
      }
    } else if (opt.slot === 'weapon') {
      if (opt.id !== 'wp_none' && renderWeapon(opt.id) === '') {
        missing.push({ id: opt.id, slot: opt.slot, name: opt.name });
      }
    } else if (opt.slot === 'pet') {
      if (opt.id !== 'pet_none' && renderPet(opt.id) === '') {
        missing.push({ id: opt.id, slot: opt.slot, name: opt.name });
      }
    } else if (opt.slot === 'bg') {
      if (opt.id !== 'sky' && renderBackground(opt.id, 'chk') === defaultSkySvg) {
        missing.push({ id: opt.id, slot: opt.slot, name: opt.name });
      }
    } else if (opt.slot === 'outfit') {
      if (opt.id !== 'overall' && renderOutfit(opt.id) === defaultOverallSvg) {
        missing.push({ id: opt.id, slot: opt.slot, name: opt.name });
      }
    }
  }

  if (missing.length > 0) {
    console.warn(
      `🚨 [Avatar Warning] 未実装のアバター描画処理が検知されました:`,
      missing
    );
  } else {
    console.info(
      `✅ [Avatar Registry] 全${AVATAR_OPTIONS.length}個のアバターアイテムの描画整合性を確認しました（未実装アイテム: 0件）。`
    );
  }

  return { ok: missing.length === 0, missing };
}

// 開発・実行時の自動整合性チェック
if (typeof window !== 'undefined') {
  validateAvatarRenderers();
}
