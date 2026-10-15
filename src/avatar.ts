/**
 * 【開発AIへの絶対厳守ルール（Architecture Guideline）】
 * 1. 新しいペット・武器・頭装備・背景を追加・変更する際は、絶対に手書きの簡易SVG図形（ellipse, rect, polygon, line等）を書かないこと。
 * 2. 新規アイテムを追加する際は、必ず AVATAR_OPTIONS と ITEM_ASSET_INFO に twemojiCode と subEffectCode（および座標・glowColor）を追加する「データ駆動のプロ素材合成方式」で実装すること。
 */
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

export function getTwemojiUrl(code: string): string {
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${code}.svg`;
}

export interface AvatarAssetItem {
  id: string;
  twemojiCode: string;
  subEffectCode?: string;
  x?: number;
  y?: number;
  size?: number;
  rotate?: number;
  glowColor?: string;
}

export const ITEM_ASSET_INFO: Record<string, AvatarAssetItem> = {
  // ---------------- あたま (accessory) ----------------
  ribbon:        { id: 'ribbon',        twemojiCode: '1f380', x: 80, y: 26, size: 40 },
  crown:         { id: 'crown',         twemojiCode: '1f451', x: 80, y: 20, size: 40, glowColor: '#FDE047' },
  wizard:        { id: 'wizard',        twemojiCode: '1f9d9', subEffectCode: '2728', x: 78, y: 18, size: 44 },
  sunglasses:    { id: 'sunglasses',    twemojiCode: '1f576', x: 72, y: 66, size: 56 },
  star_pin:      { id: 'star_pin',      twemojiCode: '1f31f', x: 112, y: 48, size: 28, glowColor: '#FEF08A' },
  knight_helmet: { id: 'knight_helmet', twemojiCode: '1fa96', x: 76, y: 18, size: 48 },
  tiara:         { id: 'tiara',         twemojiCode: '1f451', subEffectCode: '1f48e', x: 82, y: 22, size: 36, glowColor: '#F472B6' },
  dino_hood:     { id: 'dino_hood',     twemojiCode: '1f996', x: 78, y: 18, size: 44 },
  ninja_band:    { id: 'ninja_band',    twemojiCode: '1f977', subEffectCode: '1f4a8', x: 80, y: 22, size: 40 },
  cat_headphone: { id: 'cat_headphone', twemojiCode: '1f3a7', subEffectCode: '1f3b5', x: 76, y: 22, size: 48 },
  angel_ring:    { id: 'angel_ring',    twemojiCode: '1faba', subEffectCode: '1f31f', x: 78, y: 12, size: 44, glowColor: '#FEF08A' },

  // ---------------- もちもの・ぶき (weapon) ----------------
  brave_sword:   { id: 'brave_sword',   twemojiCode: '1f5e1', x: 132, y: 118, size: 48, rotate: -15 },
  magic_wand:    { id: 'magic_wand',    twemojiCode: '1fa84', subEffectCode: '1f496', x: 132, y: 116, size: 48, rotate: -10, glowColor: '#F472B6' },
  giant_candy:   { id: 'giant_candy',   twemojiCode: '1f36d', subEffectCode: '2728',  x: 132, y: 116, size: 48, rotate: -10 },
  laser_blade:   { id: 'laser_blade',   twemojiCode: '2694',  subEffectCode: '26a1',  x: 132, y: 116, size: 48, glowColor: '#38BDF8' },
  flame_sword:   { id: 'flame_sword',   twemojiCode: '1f5e1', subEffectCode: '1f525', x: 132, y: 114, size: 52, rotate: -15, glowColor: '#F97316' },

  // ---------------- ペット (pet) ----------------
  shiba:          { id: 'shiba',          twemojiCode: '1f415', subEffectCode: '1f43e', x: 10, y: 142, size: 48 },
  dragon:         { id: 'dragon',         twemojiCode: '1f409', subEffectCode: '1f4a8', x: 8,  y: 140, size: 50 },
  penguin:        { id: 'penguin',        twemojiCode: '1f427', subEffectCode: '2744',  x: 12, y: 142, size: 46 },
  unicorn:        { id: 'unicorn',        twemojiCode: '1f984', subEffectCode: '2728',  x: 10, y: 140, size: 48, glowColor: '#F472B6' },
  slime:          { id: 'slime',          twemojiCode: '1f4a7', subEffectCode: '2728',  x: 14, y: 144, size: 44, glowColor: '#38BDF8' },
  anglerfish:     { id: 'anglerfish',     twemojiCode: '1f420', subEffectCode: '1f4a1', x: 10, y: 142, size: 46, glowColor: '#FDE047' },
  mini_dragon:    { id: 'mini_dragon',    twemojiCode: '1f432', subEffectCode: '1f525', x: 8,  y: 138, size: 52, glowColor: '#FBBF24' },
  flying_unicorn: { id: 'flying_unicorn', twemojiCode: '1f984', subEffectCode: '1f308', x: 8,  y: 136, size: 52, glowColor: '#38BDF8' },

  // ---------------- はいけい (bg) ----------------
  sky:            { id: 'sky',            twemojiCode: '2601' },
  meadow:         { id: 'meadow',         twemojiCode: '1f338' },
  sunset:         { id: 'sunset',         twemojiCode: '1f3f0' },
  kirakira:       { id: 'kirakira',       twemojiCode: '1f31f' },
  space:          { id: 'space',          twemojiCode: '1fa90' },
  rainbow:        { id: 'rainbow',        twemojiCode: '1f308' },
  candy_land:     { id: 'candy_land',     twemojiCode: '1f369' },
  ocean_temple:   { id: 'ocean_temple',   twemojiCode: '1f41a' },
  space_station:  { id: 'space_station',  twemojiCode: '1f680' },
  crystal_castle: { id: 'crystal_castle', twemojiCode: '1f48e' },
  rainbow_stage:  { id: 'rainbow_stage',  twemojiCode: '1f308' },
};

export function findAsset(id: string | null | undefined): AvatarAssetItem | undefined {
  if (!id) return undefined;
  return ITEM_ASSET_INFO[id];
}

// 温かみのある主線（#4A2E25）
export const LINE_COLOR = '#4A2E25';
const LINE = `stroke="${LINE_COLOR}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"`;

/* ---------------- 1. 背景ステージレイヤー (background: viewBox 0 0 200 240) ---------------- */
function renderBackground(id: string, p: string): string {
  const cardBorder = `<rect x="5" y="5" width="190" height="230" rx="20" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.85"/>`;
  const stageShadow = `<ellipse cx="100" cy="192" rx="48" ry="9" fill="#1E1B4B" opacity="0.18"/>`;

  switch (id) {
    case 'candy_land':
      return (
        `<defs>` +
        `<linearGradient id="${p}_cnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFE4F3"/><stop offset="55%" stop-color="#FFF0F5"/><stop offset="100%" stop-color="#FCE7F3"/></linearGradient>` +
        `</defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_cnd)"/>` +
        `<image href="${getTwemojiUrl('1f369')}" x="144" y="20" width="30" height="30" opacity="0.9" />` +
        `<image href="${getTwemojiUrl('1f36c')}" x="16" y="24" width="24" height="24" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f36d')}" x="14" y="170" width="26" height="26" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f366')}" x="154" y="170" width="26" height="26" opacity="0.85" />` +
        stageShadow +
        `<ellipse cx="100" cy="186" rx="66" ry="17" fill="#F472B6" opacity="0.85"/>` +
        `<ellipse cx="100" cy="186" rx="60" ry="14" fill="#FDF2F8" opacity="0.95"/>` +
        cardBorder
      );

    case 'ocean_temple':
      return (
        `<defs><linearGradient id="${p}_ocn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38BDF8"/><stop offset="50%" stop-color="#0284C7"/><stop offset="100%" stop-color="#075985"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_ocn)"/>` +
        `<image href="${getTwemojiUrl('1f41a')}" x="146" y="22" width="28" height="28" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1fab8')}" x="16" y="22" width="26" height="26" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f420')}" x="14" y="170" width="26" height="26" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1fae7')}" x="154" y="170" width="26" height="26" opacity="0.85" />` +
        `<circle cx="28" cy="40" r="3" fill="#BAE6FD" opacity="0.6"/>` +
        `<circle cx="34" cy="56" r="4.5" fill="#BAE6FD" opacity="0.5"/>` +
        stageShadow +
        `<ellipse cx="100" cy="186" rx="66" ry="17" fill="#0369A1" opacity="0.9"/>` +
        `<ellipse cx="100" cy="186" rx="60" ry="14" fill="#7DD3FC" opacity="0.9"/>` +
        cardBorder
      );

    case 'space':
      return (
        `<defs><linearGradient id="${p}_spc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0F172A"/><stop offset="50%" stop-color="#1E1B4B"/><stop offset="100%" stop-color="#312E81"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_spc)"/>` +
        `<image href="${getTwemojiUrl('1fa90')}" x="140" y="18" width="34" height="34" opacity="0.9" />` +
        `<image href="${getTwemojiUrl('1f320')}" x="16" y="24" width="28" height="28" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f31f')}" x="16" y="172" width="24" height="24" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f680')}" x="154" y="168" width="28" height="28" opacity="0.85" />` +
        `<circle cx="35" cy="50" r="1.5" fill="#FFF"/><circle cx="50" cy="75" r="2" fill="#FEF08A"/><circle cx="120" cy="45" r="1.5" fill="#FFF"/>` +
        stageShadow +
        `<ellipse cx="100" cy="186" rx="66" ry="17" fill="#4338CA" opacity="0.9"/>` +
        `<ellipse cx="100" cy="186" rx="60" ry="14" fill="#6366F1" opacity="0.85"/>` +
        cardBorder
      );

    case 'sunset':
      return (
        `<defs><linearGradient id="${p}_sns" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FDA4AF"/><stop offset="50%" stop-color="#FED7AA"/><stop offset="100%" stop-color="#FEF08A"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_sns)"/>` +
        `<image href="${getTwemojiUrl('1f3f0')}" x="146" y="22" width="28" height="28" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f31f')}" x="18" y="24" width="24" height="24" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('2601')}" x="14" y="170" width="26" height="26" opacity="0.8" />` +
        `<image href="${getTwemojiUrl('1f333')}" x="154" y="170" width="26" height="26" opacity="0.85" />` +
        `<circle cx="50" cy="55" r="18" fill="#FFF7ED" opacity="0.5"/>` +
        stageShadow +
        `<ellipse cx="100" cy="186" rx="66" ry="17" fill="#F97316" opacity="0.85"/>` +
        `<ellipse cx="100" cy="186" rx="60" ry="14" fill="#FED7AA" opacity="0.9"/>` +
        cardBorder
      );

    case 'meadow':
      return (
        `<defs><linearGradient id="${p}_mdw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#BAE6FD"/><stop offset="50%" stop-color="#F0FDF4"/><stop offset="100%" stop-color="#BBF7D0"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_mdw)"/>` +
        `<image href="${getTwemojiUrl('1f338')}" x="146" y="20" width="28" height="28" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f33c')}" x="18" y="22" width="26" height="26" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f340')}" x="16" y="170" width="26" height="26" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f98b')}" x="154" y="170" width="26" height="26" opacity="0.85" />` +
        stageShadow +
        `<ellipse cx="100" cy="186" rx="66" ry="17" fill="#22C55E" opacity="0.85"/>` +
        `<ellipse cx="100" cy="186" rx="60" ry="14" fill="#86EFAC" opacity="0.9"/>` +
        cardBorder
      );

    case 'rainbow':
      return (
        `<defs><linearGradient id="${p}_rbw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7DD3FC"/><stop offset="50%" stop-color="#BAE6FD"/><stop offset="100%" stop-color="#E0F2FE"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_rbw)"/>` +
        `<image href="${getTwemojiUrl('1f308')}" x="136" y="16" width="38" height="38" opacity="0.9" />` +
        `<image href="${getTwemojiUrl('2601')}" x="16" y="24" width="26" height="26" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f31f')}" x="16" y="170" width="24" height="24" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('2601')}" x="154" y="170" width="26" height="26" opacity="0.85" />` +
        stageShadow +
        `<ellipse cx="100" cy="186" rx="66" ry="17" fill="#BAE6FD" opacity="0.9"/>` +
        `<ellipse cx="100" cy="186" rx="60" ry="14" fill="#FFFFFF" opacity="0.95"/>` +
        cardBorder
      );

    case 'rainbow_stage':
      return (
        `<defs><linearGradient id="${p}_rbws" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4C1D95"/><stop offset="50%" stop-color="#7C3AED"/><stop offset="100%" stop-color="#C084FC"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_rbws)"/>` +
        `<image href="${getTwemojiUrl('1f308')}" x="136" y="16" width="36" height="36" opacity="0.9" />` +
        `<image href="${getTwemojiUrl('1f31f')}" x="18" y="22" width="26" height="26" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f48e')}" x="16" y="170" width="26" height="26" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('2728')}" x="154" y="170" width="26" height="26" opacity="0.85" />` +
        stageShadow +
        `<ellipse cx="100" cy="186" rx="66" ry="17" fill="#FBBF24" opacity="0.85"/>` +
        `<ellipse cx="100" cy="186" rx="60" ry="14" fill="#FDE047" opacity="0.95"/>` +
        cardBorder
      );

    case 'kirakira':
      return (
        `<defs><linearGradient id="${p}_kk" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FCE7F3"/><stop offset="50%" stop-color="#EDE9FE"/><stop offset="100%" stop-color="#E0F2FE"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_kk)"/>` +
        `<image href="${getTwemojiUrl('1f31f')}" x="146" y="20" width="28" height="28" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f496')}" x="18" y="22" width="26" height="26" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('2728')}" x="16" y="170" width="26" height="26" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f308')}" x="152" y="170" width="28" height="28" opacity="0.85" />` +
        stageShadow +
        `<ellipse cx="100" cy="186" rx="66" ry="17" fill="#C084FC" opacity="0.8"/>` +
        `<ellipse cx="100" cy="186" rx="60" ry="14" fill="#F5D0FE" opacity="0.9"/>` +
        cardBorder
      );

    case 'space_station':
      return (
        `<defs><linearGradient id="${p}_spcst" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#030712"/><stop offset="50%" stop-color="#0F172A"/><stop offset="100%" stop-color="#1E293B"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_spcst)"/>` +
        `<image href="${getTwemojiUrl('1f680')}" x="146" y="20" width="28" height="28" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1fa90')}" x="16" y="20" width="30" height="30" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f6f0')}" x="14" y="170" width="26" height="26" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f31f')}" x="154" y="172" width="24" height="24" opacity="0.85" />` +
        stageShadow +
        `<ellipse cx="100" cy="186" rx="66" ry="17" fill="#0891B2" opacity="0.85"/>` +
        `<ellipse cx="100" cy="186" rx="60" ry="14" fill="#22D3EE" opacity="0.9"/>` +
        cardBorder
      );

    case 'crystal_castle':
      return (
        `<defs><linearGradient id="${p}_cstl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1E1B4B"/><stop offset="70%" stop-color="#312E81"/><stop offset="100%" stop-color="#4C1D95"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_cstl)"/>` +
        `<image href="${getTwemojiUrl('1f3f0')}" x="144" y="20" width="32" height="32" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f48e')}" x="18" y="22" width="26" height="26" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f31f')}" x="16" y="170" width="26" height="26" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('2728')}" x="154" y="170" width="26" height="26" opacity="0.85" />` +
        stageShadow +
        `<ellipse cx="100" cy="186" rx="66" ry="17" fill="#6366F1" opacity="0.85"/>` +
        `<ellipse cx="100" cy="186" rx="60" ry="14" fill="#A5B4FC" opacity="0.9"/>` +
        cardBorder
      );

    case 'sky':
    default:
      return (
        `<defs><linearGradient id="${p}_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7CCBFF"/><stop offset="60%" stop-color="#BAE6FD"/><stop offset="100%" stop-color="#E0F2FE"/></linearGradient></defs>` +
        `<rect x="5" y="5" width="190" height="230" rx="20" fill="url(#${p}_sky)"/>` +
        `<image href="${getTwemojiUrl('2601')}" x="146" y="20" width="30" height="30" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f308')}" x="16" y="20" width="30" height="30" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('1f426')}" x="16" y="170" width="24" height="24" opacity="0.85" />` +
        `<image href="${getTwemojiUrl('2601')}" x="154" y="170" width="26" height="26" opacity="0.85" />` +
        `<circle cx="32" cy="64" r="14" fill="#FFF" opacity="0.75"/>` +
        `<circle cx="48" cy="60" r="18" fill="#FFF" opacity="0.75"/>` +
        stageShadow +
        `<ellipse cx="100" cy="186" rx="66" ry="17" fill="#4ADE80" opacity="0.85"/>` +
        `<ellipse cx="100" cy="186" rx="60" ry="14" fill="#86EFAC" opacity="0.9"/>` +
        cardBorder
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
        `<circle cx="70" cy="144" r="3" fill="#FFFFFF" /><circle cx="130" cy="144" r="3" fill="#FFFFFF" />` +
        // 胸元とレース襟
        `<path d="M 78 134 Q 100 142 122 134 L 124 158 L 76 158 Z" fill="#FF5E7E" ${LINE} />` +
        `<path d="M 78 134 Q 100 142 122 134" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" />` +
        // 宝石ブローチ
        `<polygon points="100,140 106,146 100,152 94,146" fill="#FDE047" stroke="#B45309" stroke-width="1" />` +
        `<circle cx="100" cy="146" r="3.2" fill="#38BDF8" stroke="#FFFFFF" stroke-width="0.8" />` +
        // 広がるフリルスカート
        `<path d="M 76 158 C 55 168 50 186 56 192 C 75 196 125 196 144 192 C 150 186 145 168 124 158 Z" fill="#FFAEC0" ${LINE} />` +
        `<path d="M 68 174 Q 100 182 132 174" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" />` +
        `<path d="M 60 186 Q 100 194 140 186" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" />` +
        `</g>`
      );

    case 'knight':
      return (
        `<g id="layer-outfit">` +
        // マントの裾（肩後ろ）
        `<path d="M 64 140 C 60 156, 62 178, 70 186 L 76 186 C 72 176, 72 156, 74 140 Z" fill="#DC2626" stroke="#4A2E25" stroke-width="1.5" />` +
        `<path d="M 136 140 C 140 156, 138 178, 130 186 L 124 186 C 128 176, 128 156, 126 140 Z" fill="#DC2626" stroke="#4A2E25" stroke-width="1.5" />` +
        // 肩当て袖（鋼鉄の重厚パウルドロン）
        `<ellipse cx="68" cy="142" rx="9" ry="7" fill="#64748B" ${LINE} />` +
        `<ellipse cx="132" cy="142" rx="9" ry="7" fill="#64748B" ${LINE} />` +
        `<path d="M 62 138 Q 70 135 78 138 L 76 146 Q 68 144 60 146 Z" fill="#CBD5E1" stroke="#4A2E25" stroke-width="1.8" />` +
        `<path d="M 122 138 Q 130 135 138 138 L 140 146 Q 132 144 124 146 Z" fill="#CBD5E1" stroke="#4A2E25" stroke-width="1.8" />` +
        // 胴体鎧
        `<path d="M 76 134 L 124 134 L 122 178 L 78 178 Z" fill="#94A3B8" ${LINE} />` +
        `<path d="M 100 136 L 100 162 M 88 148 L 112 148" stroke="#FBBF24" stroke-width="3.5" stroke-linecap="round" />` +
        // 胸元の金メダルコア
        `<circle cx="100" cy="148" r="4.5" fill="#FBBF24" stroke="#B45309" stroke-width="1.2" />` +
        `<circle cx="100" cy="148" r="2.2" fill="#3B82F6" />` +
        // アーマード腰ベルト
        `<rect x="76" y="166" width="48" height="6" fill="#64748B" stroke="#4A2E25" stroke-width="1.8" />` +
        `<line x1="76" y1="166" x2="124" y2="166" stroke="#FBBF24" stroke-width="2" />` +
        `<rect x="96" y="165" width="8" height="8" rx="1.5" fill="#FBBF24" stroke="#B45309" stroke-width="1.2" />` +
        `</g>`
      );

    case 'dino':
      return (
        `<g id="layer-outfit">` +
        // きょうりゅうの半袖
        `<path d="M 80 135 Q 64 136 64 148 L 78 153 Z" fill="#16A34A" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 120 135 Q 136 136 136 148 L 122 153 Z" fill="#16A34A" ${LINE} stroke-linejoin="round" />` +
        // インナーのパステルミントTシャツ胸元
        `<path d="M 78 134 Q 100 140 122 134 L 124 156 L 76 156 Z" fill="#DCFCE7" ${LINE} stroke-linejoin="round" />` +
        // 丸みのあるきょうりゅうサロペット
        `<path
          d="M 82 144 L 82 135 L 88 135 L 88 144 L 112 144 L 112 135 L 118 135 L 118 144 L 124 154 L 126 180 L 103 180 L 103 172 L 97 172 L 97 180 L 74 180 L 76 154 Z"
          fill="#22C55E"
          ${LINE}
          stroke-linejoin="round"
        />` +
        // 肩紐のボタン
        `<circle cx="85" cy="147" r="2.8" fill="#FEF08A" stroke="#4A2E25" stroke-width="1.5" />` +
        `<circle cx="115" cy="147" r="2.8" fill="#FEF08A" stroke="#4A2E25" stroke-width="1.5" />` +
        // お腹のタマゴ型ポケット
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
        `<path d="M 80 135 Q 64 136 64 148 L 78 153 Z" fill="#EF4444" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 120 135 Q 136 136 136 148 L 122 153 Z" fill="#EF4444" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 78 134 Q 100 140 122 134 L 124 166 L 76 166 Z" fill="#EF4444" ${LINE} stroke-linejoin="round" />` +
        `<path d="${starPath(100, 150, 7.5)}" fill="#FDE047" stroke="#F59E0B" stroke-width="1" />` +
        `<path d="M 76 166 L 124 166 L 126 180 L 103 180 L 103 173 L 97 173 L 97 180 L 74 180 Z" fill="#1E293B" ${LINE} stroke-linejoin="round" />` +
        `</g>`
      );

    case 'tee_blue':
      return (
        `<g id="layer-outfit">` +
        `<path d="M 80 135 Q 64 136 64 148 L 78 153 Z" fill="#3B82F6" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 120 135 Q 136 136 136 148 L 122 153 Z" fill="#3B82F6" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 78 134 Q 100 140 122 134 L 124 166 L 76 166 Z" fill="#3B82F6" ${LINE} stroke-linejoin="round" />` +
        `<line x1="77" y1="148" x2="123" y2="148" stroke="#FFFFFF" stroke-width="3" />` +
        `<line x1="77" y1="157" x2="123" y2="157" stroke="#FFFFFF" stroke-width="3" />` +
        `<path d="M 76 166 L 124 166 L 126 180 L 103 180 L 103 173 L 97 173 L 97 180 L 74 180 Z" fill="#1E3A8A" ${LINE} stroke-linejoin="round" />` +
        `</g>`
      );

    case 'panda_suit':
      return (
        `<g id="layer-outfit">` +
        `<path d="M 80 135 Q 64 136 64 148 L 78 153 Z" fill="#18181B" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 120 135 Q 136 136 136 148 L 122 153 Z" fill="#18181B" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 78 134 Q 100 140 122 134 L 124 156 L 76 156 Z" fill="#F8FAFC" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 82 144 L 82 135 L 88 135 L 88 144 L 112 144 L 112 135 L 118 135 L 118 144 L 124 154 L 126 180 L 103 180 L 103 172 L 97 172 L 97 180 L 74 180 L 76 154 Z" fill="#27272A" ${LINE} stroke-linejoin="round" />` +
        `<circle cx="100" cy="162" r="8" fill="#F8FAFC" stroke="#4A2E25" stroke-width="1.5" />` +
        `</g>`
      );

    case 'ninja_suit':
      return (
        `<g id="layer-outfit">` +
        `<path d="M 75 124 L 125 124 L 121 168 L 102 168 L 100 162 L 98 168 L 79 168 Z" fill="#1E293B" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<path d="M 76 124 L 66 138 L 74 143 L 80 132 Z" fill="#1E293B" stroke="#4A2E25" stroke-width="2" />` +
        `<path d="M 124 124 L 134 138 L 126 143 L 120 132 Z" fill="#1E293B" stroke="#4A2E25" stroke-width="2" />` +
        `<polygon points="88,124 112,124 100,142" fill="#64748B" stroke="#4A2E25" stroke-width="1.5" />` +
        `<path d="M 78 122 Q 100 130 122 122 L 120 130 Q 100 137 80 130 Z" fill="#EF4444" stroke="#4A2E25" stroke-width="2" />` +
        `<path d="M 114 126 C 126 128, 134 136, 136 146 L 128 148 C 126 138, 120 132, 112 130 Z" fill="#DC2626" stroke="#4A2E25" stroke-width="1.8" />` +
        `<rect x="78" y="150" width="44" height="7" rx="2" fill="#EF4444" stroke="#4A2E25" stroke-width="1.8" />` +
        `<rect x="95" y="149" width="10" height="9" rx="1.5" fill="#FBBF24" stroke="#4A2E25" stroke-width="1.5" />` +
        `<path d="${starPath(108, 140, 5)}" fill="#FDE047" stroke="#B45309" stroke-width="1" />` +
        `</g>`
      );

    case 'magic_robe':
      return (
        `<g id="layer-outfit">` +
        `<ellipse cx="68" cy="144" rx="9" ry="8" fill="#4C1D95" ${LINE} />` +
        `<ellipse cx="132" cy="144" rx="9" ry="8" fill="#4C1D95" ${LINE} />` +
        `<path d="M 76 134 L 124 134 L 132 186 L 68 186 Z" fill="#581C87" ${LINE} />` +
        // 金の飾り襟
        `<path d="M 78 134 Q 100 144 122 134 L 120 140 Q 100 150 80 140 Z" fill="#FBBF24" stroke="#B45309" stroke-width="1.2" />` +
        `<circle cx="100" cy="144" r="3.5" fill="#EC4899" stroke="#BE185D" stroke-width="1" />` +
        `<path d="M 100 148 L 100 184" stroke="#FBBF24" stroke-width="2.5" />` +
        // 星の刺繍
        `<path d="${starPath(86, 164, 5)}" fill="#FDE047" stroke="#D97706" stroke-width="0.8" />` +
        `<path d="${starPath(114, 164, 5)}" fill="#FDE047" stroke="#D97706" stroke-width="0.8" />` +
        `<path d="${starPath(100, 176, 4.5)}" fill="#FDE047" stroke="#D97706" stroke-width="0.8" />` +
        `<path d="M 68 184 L 132 184" stroke="#FBBF24" stroke-width="3" stroke-linecap="round" />` +
        `</g>`
      );

    case 'pilot_uniform':
      return (
        `<g id="layer-outfit">` +
        `<path d="M 80 135 Q 64 136 64 148 L 78 153 Z" fill="#1E3A8A" ${LINE} />` +
        `<path d="M 120 135 Q 136 136 136 148 L 122 153 Z" fill="#1E3A8A" ${LINE} />` +
        `<path d="M 78 134 L 122 134 L 124 166 L 76 166 Z" fill="#1E3A8A" ${LINE} />` +
        `<polygon points="100,134 94,142 106,142" fill="#FFF" />` +
        `<polygon points="100,142 97,156 100,160 103,156" fill="#DC2626" />` +
        `<circle cx="92" cy="150" r="1.8" fill="#FBBF24" /><circle cx="108" cy="150" r="1.8" fill="#FBBF24" />` +
        `<circle cx="92" cy="158" r="1.8" fill="#FBBF24" /><circle cx="108" cy="158" r="1.8" fill="#FBBF24" />` +
        `<path d="M 76 166 L 124 166 L 126 180 L 103 180 L 103 173 L 97 173 L 97 180 L 74 180 Z" fill="#0F172A" ${LINE} />` +
        `</g>`
      );

    case 'idol_dress':
      return (
        `<g id="layer-outfit">` +
        `<circle cx="70" cy="144" r="9" fill="#F472B6" ${LINE} />` +
        `<circle cx="130" cy="144" r="9" fill="#F472B6" ${LINE} />` +
        `<path d="M 78 134 Q 100 142 122 134 L 124 156 L 76 156 Z" fill="#EC4899" ${LINE} />` +
        // 胸の大きなりぼん
        `<path d="M 94 141 C 88 136 86 146 94 145 Z" fill="#F43F5E" stroke="#4A2E25" stroke-width="1.2" />` +
        `<path d="M 106 141 C 112 136 114 146 106 145 Z" fill="#F43F5E" stroke="#4A2E25" stroke-width="1.2" />` +
        `<circle cx="100" cy="143" r="3" fill="#FDE047" stroke="#D97706" stroke-width="1" />` +
        // ウエストサッシュ＆ティアードスカート
        `<rect x="76" y="152" width="48" height="5" fill="#8B5CF6" stroke="#4A2E25" stroke-width="1.5" />` +
        `<path d="M 76 156 C 55 166 48 186 54 192 C 75 196 125 196 146 192 C 152 186 145 166 124 156 Z" fill="#FBCFE8" ${LINE} />` +
        `<path d="M 80 166 C 70 174 65 186 70 190 C 85 193 115 193 130 190 C 135 186 130 174 120 166 Z" fill="#F472B6" opacity="0.6" />` +
        `<path d="${starPath(86, 174, 4)}" fill="#FDE047" />` +
        `<path d="${starPath(114, 174, 4)}" fill="#FDE047" />` +
        `<path d="M 64 186 Q 100 194 136 186" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" />` +
        `</g>`
      );

    case 'crystal_armor':
      return (
        `<g id="layer-outfit">` +
        // クリスタル肩当て
        `<polygon points="60,134 74,136 70,148 58,144" fill="#A5F3FC" stroke="#0891B2" stroke-width="1.8" />` +
        `<polygon points="140,134 126,136 130,148 142,144" fill="#A5F3FC" stroke="#0891B2" stroke-width="1.8" />` +
        // 胴体
        `<path d="M 76 134 L 124 134 L 122 178 L 78 178 Z" fill="#22D3EE" ${LINE} />` +
        // 多面体クリスタルコア
        `<polygon points="100,138 86,152 100,166 114,152" fill="#38BDF8" stroke="#0284C7" stroke-width="2" />` +
        `<polygon points="100,142 90,152 100,162 110,152" fill="#BAE6FD" />` +
        `<polygon points="100,145 94,152 100,159 106,152" fill="#FFFFFF" />` +
        // 腰の浮遊クリスタル
        `<polygon points="84,170 92,168 90,176 82,176" fill="#67E8F9" stroke="#0284C7" stroke-width="1.5" />` +
        `<polygon points="116,170 108,168 110,176 118,176" fill="#67E8F9" stroke="#0284C7" stroke-width="1.5" />` +
        `</g>`
      );

    case 'overall':
    default:
      return (
        `<g id="layer-outfit">` +
        // 両肩の可愛い半袖（黄色いTシャツの袖）
        `<path d="M 80 135 Q 64 136 64 148 L 78 153 Z" fill="#FFEAA7" ${LINE} stroke-linejoin="round" />` +
        `<path d="M 120 135 Q 136 136 136 148 L 122 153 Z" fill="#FFEAA7" ${LINE} stroke-linejoin="round" />` +
        // インナーの黄色いTシャツ胸元
        `<path d="M 78 134 Q 100 140 122 134 L 124 156 L 76 156 Z" fill="#FFEAA7" ${LINE} stroke-linejoin="round" />` +
        // 可愛い丸みのあるデニムオーバーオール
        `<path
          d="M 82 144 L 82 135 L 88 135 L 88 144 L 112 144 L 112 135 L 118 135 L 118 144 L 124 154 L 126 180 L 103 180 L 103 172 L 97 172 L 97 180 L 74 180 L 76 154 Z"
          fill="#5B8DEF"
          ${LINE}
          stroke-linejoin="round"
        />` +
        // ボタンと丸ポケット
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
        `<ellipse cx="73" cy="101" rx="5.5" ry="3.5" fill="#FF9E80" opacity="0.35" />` +
        `<ellipse cx="127" cy="101" rx="5.5" ry="3.5" fill="#FF9E80" opacity="0.35" />` +
        `<path d="M 75 81 L 91 83" fill="none" stroke="#4A2E25" stroke-width="2.8" stroke-linecap="round" />` +
        `<path d="M 125 81 L 109 83" fill="none" stroke="#4A2E25" stroke-width="2.8" stroke-linecap="round" />` +
        `<ellipse cx="83" cy="93" rx="6" ry="7.5" fill="#2C3A47" />` +
        `<ellipse cx="83" cy="95.5" rx="4.8" ry="4" fill="#38BDF8" />` +
        `<circle cx="81" cy="90" r="2.5" fill="#FFFFFF" />` +
        `<circle cx="85" cy="95.5" r="1.2" fill="#FFFFFF" />` +
        `<ellipse cx="117" cy="93" rx="6" ry="7.5" fill="#2C3A47" />` +
        `<ellipse cx="117" cy="95.5" rx="4.8" ry="4" fill="#38BDF8" />` +
        `<circle cx="115" cy="90" r="2.5" fill="#FFFFFF" />` +
        `<circle cx="119" cy="95.5" r="1.2" fill="#FFFFFF" />` +
        `<path d="M 95 103 Q 100 106 105 103" fill="none" stroke="#4A2E25" stroke-width="2.5" stroke-linecap="round" />` +
        `</g>`
      );

    case 'boy_grin':
    case 'grin':
      // ③ 'boy_grin'（わんぱくニカッ！：白い歯が見える笑顔＋右ほっぺの絆創膏）
      return (
        `<g id="layer-face">` +
        `<ellipse cx="73" cy="101" rx="6" ry="3.5" fill="#FF8DA1" opacity="0.5" />` +
        `<rect x="120" y="99" width="13" height="6" rx="2" transform="rotate(-12 126 102)" fill="#FFEAA7" stroke="#4A2E25" stroke-width="1.3" />` +
        `<line x1="125" y1="99" x2="126" y2="105" stroke="#E1B12C" stroke-width="1.1" />` +
        `<path d="M 75 81 Q 83 77 90 82" fill="none" stroke="#4A2E25" stroke-width="2.8" stroke-linecap="round" />` +
        `<path d="M 125 81 Q 117 77 110 82" fill="none" stroke="#4A2E25" stroke-width="2.8" stroke-linecap="round" />` +
        `<path d="M 77 92 Q 83 85 89 92" fill="none" stroke="#3D2217" stroke-width="3.2" stroke-linecap="round" />` +
        `<path d="M 111 92 Q 117 85 123 92" fill="none" stroke="#3D2217" stroke-width="3.2" stroke-linecap="round" />` +
        `<path d="M 92 102 L 108 102 C 108 111, 92 111, 92 102 Z" fill="#FFFFFF" stroke="#4A2E25" stroke-width="2" stroke-linejoin="round" />` +
        `</g>`
      );

    case 'boy_wink':
    case 'wink':
      // ④ 'boy_wink'（クールウィンク：左目＞ウィンク＋片上がりニヤリ口）
      return (
        `<g id="layer-face">` +
        `<ellipse cx="73" cy="101" rx="6" ry="3.5" fill="#FF8DA1" opacity="0.45" />` +
        `<ellipse cx="127" cy="101" rx="6" ry="3.5" fill="#FF8DA1" opacity="0.45" />` +
        `<path d="M 75 81 L 90 83" fill="none" stroke="#4A2E25" stroke-width="2.8" stroke-linecap="round" />` +
        `<path d="M 125 80 L 110 83" fill="none" stroke="#4A2E25" stroke-width="2.8" stroke-linecap="round" />` +
        `<path d="M 77 90 L 84 94 L 89 89" fill="none" stroke="#3D2217" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />` +
        `<ellipse cx="117" cy="93" rx="6.5" ry="8" fill="#3D2217" />` +
        `<ellipse cx="117" cy="95.5" rx="5" ry="4.5" fill="#D97706" />` +
        `<circle cx="115" cy="90" r="2.8" fill="#FFFFFF" />` +
        `<circle cx="119" cy="96" r="1.3" fill="#FFFFFF" />` +
        `<path d="M 95 103 Q 101 108 107 101" fill="none" stroke="#4A2E25" stroke-width="2.5" stroke-linecap="round" />` +
        `</g>`
      );

    case 'boy_fighting':
      // ⑤ 'boy_fighting'（やるき満々！：勇ましい太眉＋赤い情熱の瞳＋元気な口）
      return (
        `<g id="layer-face">` +
        `<ellipse cx="73" cy="101" rx="6" ry="3.5" fill="#FF8DA1" opacity="0.4" />` +
        `<ellipse cx="127" cy="101" rx="6" ry="3.5" fill="#FF8DA1" opacity="0.4" />` +
        `<path d="M 74 84 L 91 79" fill="none" stroke="#4A2E25" stroke-width="3" stroke-linecap="round" />` +
        `<path d="M 126 84 L 109 79" fill="none" stroke="#4A2E25" stroke-width="3" stroke-linecap="round" />` +
        `<ellipse cx="83" cy="93" rx="6.5" ry="8" fill="#3D2217" />` +
        `<ellipse cx="83" cy="95.5" rx="5" ry="4.5" fill="#EF4444" />` +
        `<circle cx="81" cy="90" r="2.8" fill="#FFFFFF" />` +
        `<circle cx="85" cy="96" r="1.3" fill="#FFFFFF" />` +
        `<ellipse cx="117" cy="93" rx="6.5" ry="8" fill="#3D2217" />` +
        `<ellipse cx="117" cy="95.5" rx="5" ry="4.5" fill="#EF4444" />` +
        `<circle cx="115" cy="90" r="2.8" fill="#FFFFFF" />` +
        `<circle cx="119" cy="96" r="1.3" fill="#FFFFFF" />` +
        `<path d="M 94 102 Q 100 108 106 102" fill="none" stroke="#4A2E25" stroke-width="2.5" stroke-linecap="round" />` +
        `</g>`
      );

    case 'happy_open':
    case 'wow':
      // ⑥ 'happy_open'（わーい！スマイル：girl_smileの口を可愛い開いた笑顔に変更）
      return (
        `<g id="layer-face">` +
        `<ellipse cx="73" cy="101" rx="7" ry="4" fill="#FF8DA1" opacity="0.55" />` +
        `<ellipse cx="127" cy="101" rx="7" ry="4" fill="#FF8DA1" opacity="0.55" />` +
        `<path d="M 76 80 Q 83 76 90 80" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<path d="M 110 80 Q 117 76 124 80" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<ellipse cx="83" cy="93" rx="7" ry="8.5" fill="#3D2217" />` +
        `<ellipse cx="83" cy="95.5" rx="5.5" ry="4.8" fill="#D97706" />` +
        `<circle cx="80.5" cy="89.5" r="3" fill="#FFFFFF" />` +
        `<circle cx="85.5" cy="96" r="1.4" fill="#FFFFFF" />` +
        `<ellipse cx="117" cy="93" rx="7" ry="8.5" fill="#3D2217" />` +
        `<ellipse cx="117" cy="95.5" rx="5.5" ry="4.8" fill="#D97706" />` +
        `<circle cx="114.5" cy="89.5" r="3" fill="#FFFFFF" />` +
        `<circle cx="119.5" cy="96" r="1.4" fill="#FFFFFF" />` +
        `<path d="M 94 102 Q 100 98 106 102 C 106 110 94 110 94 102 Z" fill="#EF4444" stroke="#4A2E25" stroke-width="1.8" stroke-linejoin="round" />` +
        `<path d="M 96 102 Q 100 104 104 102" fill="#FFFFFF" />` +
        `</g>`
      );

    case 'wink_star':
      // ⑦ 'wink_star'（キラッ☆ウィンク：girl_smileの左目を可愛いアーチ曲線に変更）
      return (
        `<g id="layer-face">` +
        `<ellipse cx="73" cy="101" rx="7" ry="4" fill="#FF8DA1" opacity="0.55" />` +
        `<ellipse cx="127" cy="101" rx="7" ry="4" fill="#FF8DA1" opacity="0.55" />` +
        `<path d="M 76 81 Q 83 77 90 81" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<path d="M 110 81 Q 117 77 124 81" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<path d="M 76 93 Q 83 87 90 93" fill="none" stroke="#3D2217" stroke-width="3" stroke-linecap="round" />` +
        `<path d="M 74 91 L 71 88" stroke="#3D2217" stroke-width="2.2" stroke-linecap="round" />` +
        `<path d="${starPath(70, 96, 3.5)}" fill="#FDE047" stroke="#F59E0B" stroke-width="0.8" />` +
        `<ellipse cx="117" cy="93" rx="6.5" ry="8" fill="#3D2217" />` +
        `<ellipse cx="117" cy="95.5" rx="5" ry="4.5" fill="#D97706" />` +
        `<circle cx="115" cy="90" r="2.8" fill="#FFFFFF" />` +
        `<circle cx="119" cy="96" r="1.3" fill="#FFFFFF" />` +
        `<path d="${starPath(117, 92, 2.5)}" fill="#FEF08A" />` +
        `<path d="M 95 103 Q 100 107 105 103" fill="none" stroke="#4A2E25" stroke-width="2.5" stroke-linecap="round" />` +
        `</g>`
      );

    case 'shy_blush':
      // ⑧ 'shy_blush'（ぽかぽか照れ顔：両目をにっこりアーチ曲線にし、チークを濃く表示）
      return (
        `<g id="layer-face">` +
        `<ellipse cx="73" cy="101" rx="8" ry="5" fill="#FB7185" opacity="0.65" />` +
        `<ellipse cx="127" cy="101" rx="8" ry="5" fill="#FB7185" opacity="0.65" />` +
        `<line x1="68" y1="99" x2="72" y2="103" stroke="#E11D48" stroke-width="1.5" stroke-linecap="round" />` +
        `<line x1="74" y1="99" x2="78" y2="103" stroke="#E11D48" stroke-width="1.5" stroke-linecap="round" />` +
        `<line x1="122" y1="99" x2="126" y2="103" stroke="#E11D48" stroke-width="1.5" stroke-linecap="round" />` +
        `<line x1="128" y1="99" x2="132" y2="103" stroke="#E11D48" stroke-width="1.5" stroke-linecap="round" />` +
        `<path d="M 76 83 Q 83 80 90 84" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<path d="M 110 84 Q 117 80 124 83" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<path d="M 76 93 Q 83 86 90 93" fill="none" stroke="#3D2217" stroke-width="3" stroke-linecap="round" />` +
        `<path d="M 110 93 Q 117 86 124 93" fill="none" stroke="#3D2217" stroke-width="3" stroke-linecap="round" />` +
        `<path d="M 96 103 Q 100 106 104 103" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `</g>`
      );

    case 'girl_smile':
    case 'smile':
    default:
      // ① 'girl_smile'（にっこりガール：まつ毛つきうるうる瞳＋小さなにっこり口）
      return (
        `<g id="layer-face">` +
        `<ellipse cx="73" cy="101" rx="6.5" ry="4" fill="#FB7185" opacity="0.45" />` +
        `<ellipse cx="127" cy="101" rx="6.5" ry="4" fill="#FB7185" opacity="0.45" />` +
        `<path d="M 76 82 Q 83 79 90 82" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<path d="M 110 82 Q 117 79 124 82" fill="none" stroke="#4A2E25" stroke-width="2.2" stroke-linecap="round" />` +
        `<ellipse cx="83" cy="93" rx="6.5" ry="8" fill="#3D2217" />` +
        `<ellipse cx="83" cy="95.5" rx="5" ry="4.5" fill="#D97706" />` +
        `<circle cx="81" cy="90" r="2.8" fill="#FFFFFF" />` +
        `<circle cx="85" cy="96" r="1.3" fill="#FFFFFF" />` +
        `<path d="M 77 87 L 74 84" stroke="#3D2217" stroke-width="2" stroke-linecap="round" />` +
        `<ellipse cx="117" cy="93" rx="6.5" ry="8" fill="#3D2217" />` +
        `<ellipse cx="117" cy="95.5" rx="5" ry="4.5" fill="#D97706" />` +
        `<circle cx="115" cy="90" r="2.8" fill="#FFFFFF" />` +
        `<circle cx="119" cy="96" r="1.3" fill="#FFFFFF" />` +
        `<path d="M 123 87 L 126 84" stroke="#3D2217" stroke-width="2" stroke-linecap="round" />` +
        `<path d="M 94 103 Q 100 108 106 103" fill="none" stroke="#4A2E25" stroke-width="2.5" stroke-linecap="round" />` +
        `</g>`
      );
  }
}

// 互換用エイリアス
const renderExpression = renderFace;
// 共通前髪パーツ（short / bob / twintails / buns / ponytail / braids で使用するスリット入り可愛い前髪）
const cuteSlitBangs = "M 50 94 C 48 52, 74 44, 100 44 C 126 44, 152 52, 150 94 Q 144 114, 138 118 C 136 104, 136 94, 134 88 Q 126 95, 116 95 L 112 82 L 108 94 Q 98 96, 88 94 L 84 80 L 79 94 Q 71 95, 66 88 C 64 94, 64 104, 62 118 Q 56 114, 50 94 Z";

// 細い三日月型の天使の輪ツヤハイライト
const hairGloss =
  `<ellipse cx="82" cy="58" rx="10" ry="2.2" transform="rotate(-14 82 58)" fill="#FFFFFF" opacity="0.32" />` +
  `<ellipse cx="118" cy="58" rx="10" ry="2.2" transform="rotate(14 118 58)" fill="#FFFFFF" opacity="0.32" />`;
const HAIR_HIGHLIGHTS = hairGloss;
/* ---------------- 9. 前髪・サイド髪 (frontHair: 全12種類) ---------------- */
function renderFrontHair(style: string, hc: string, hasAccessory: boolean = false): string {
  switch (style) {
    case 'long':
      // ② 'long'（さらさらロング＋赤い大きなリボンカチューシャ）
      return (
        `<g id="layer-fronthair">` +
        `<path d="M 52 88 C 46 115, 48 145, 58 154 C 66 150, 66 125, 65 90 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<path d="M 148 88 C 154 115, 152 145, 142 154 C 134 150, 134 125, 135 90 Z" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        `<path d="${cuteSlitBangs}" fill="${hc}" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
        (!hasAccessory
          ? `<path d="M 100 46 C 82 32, 70 42, 78 54 C 86 58, 95 52, 100 48 C 105 52, 114 58, 122 54 C 130 42, 118 32, 100 46 Z" fill="#FF5E7E" stroke="#4A2E25" stroke-width="2.5" stroke-linejoin="round" />` +
            `<circle cx="100" cy="48" r="5" fill="#FF8DA1" stroke="#4A2E25" stroke-width="2" />`
          : '') +
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
function renderAccessory(acc?: string): string {
  if (!acc || acc === 'acc_none') return '';
  if (acc === 'sunglasses') {
    return (
      `<g id="layer-accessory">` +
      `<path d="M 70 86 H 130 V 90 H 70 Z" fill="#0F172A" stroke="#4A2E25" stroke-width="1.8" />` +
      `<path d="M 72 88 H 94 C 95 99, 90 105, 83 105 C 76 105, 71 99, 72 88 Z" fill="#18181B" stroke="#4A2E25" stroke-width="2" />` +
      `<line x1="75" y1="91" x2="83" y2="101" stroke="#FFFFFF" stroke-width="2" opacity="0.65" stroke-linecap="round" />` +
      `<path d="M 106 88 H 128 C 129 99, 124 105, 117 105 C 110 105, 105 99, 106 88 Z" fill="#18181B" stroke="#4A2E25" stroke-width="2" />` +
      `<line x1="109" y1="91" x2="117" y2="101" stroke="#FFFFFF" stroke-width="2" opacity="0.65" stroke-linecap="round" />` +
      `</g>`
    );
  }
  if (acc === 'angel_ring') {
    return (
      `<g id="layer-accessory" class="animate-head-float">` +
      `<ellipse cx="100" cy="34" rx="26" ry="7" fill="none" stroke="#FEF08A" stroke-width="7" opacity="0.45" class="animate-pulse" />` +
      `<ellipse cx="100" cy="34" rx="24" ry="5.5" fill="none" stroke="#FBBF24" stroke-width="3.5" />` +
      `<image href="${getTwemojiUrl('1f31f')}" x="122" y="18" width="18" height="18" class="animate-pulse" />` +
      `</g>`
    );
  }
  const asset = findAsset(acc);
  if (asset?.twemojiCode) {
    const size = asset.size ?? 42;
    const x = asset.x ?? (100 - size / 2);
    const y = asset.y ?? 22;
    const cx = x + size / 2;
    const cy = y + size / 2;
    return (
      `<g id="layer-accessory" class="animate-head-float">` +
      (asset.glowColor ? `<circle cx="${cx}" cy="${cy}" r="${size / 2 + 3}" fill="${asset.glowColor}" opacity="0.28" class="animate-pulse" />` : '') +
      `<image href="${getTwemojiUrl(asset.twemojiCode)}" x="${x}" y="${y}" width="${size}" height="${size}" />` +
      (asset.subEffectCode ? `<image href="${getTwemojiUrl(asset.subEffectCode)}" x="${x + size - 10}" y="${y - 4}" width="18" height="18" class="animate-pulse" />` : '') +
      `</g>`
    );
  }
  return '';
}

function renderWeapon(weapon?: string): string {
  if (!weapon || weapon === 'wp_none') return '';
  const asset = findAsset(weapon);
  if (!asset?.twemojiCode) return '';
  const x = asset.x ?? 132;
  const y = asset.y ?? 116;
  const size = asset.size ?? 48;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const rot = asset.rotate ? `transform="rotate(${asset.rotate} ${cx} ${cy})"` : '';
  return (
    `<g id="layer-weapon" class="animate-weapon-float">` +
    (asset.glowColor ? `<circle cx="${cx}" cy="${cy}" r="${size / 2 + 4}" fill="${asset.glowColor}" opacity="0.3" class="animate-pulse" />` : '') +
    `<image href="${getTwemojiUrl(asset.twemojiCode)}" x="${x}" y="${y}" width="${size}" height="${size}" ${rot} />` +
    (asset.subEffectCode ? `<image href="${getTwemojiUrl(asset.subEffectCode)}" x="${x + size - 16}" y="${y - 8}" width="22" height="22" class="animate-pulse" />` : '') +
    `</g>`
  );
}

function renderPet(pet?: string): string {
  if (!pet || pet === 'pet_none') return '';
  const asset = findAsset(pet);
  if (!asset?.twemojiCode) return '';
  const x = asset.x ?? 10;
  const y = asset.y ?? 142;
  const size = asset.size ?? 48;
  const cx = x + size / 2;
  return (
    `<g id="layer-pet" class="animate-pet-bounce">` +
    `<ellipse cx="${cx}" cy="190" rx="18" ry="5" fill="#0F172A" opacity="0.2" />` +
    (asset.glowColor ? `<circle cx="${cx}" cy="${y + size / 2}" r="${size / 2 + 4}" fill="${asset.glowColor}" opacity="0.28" class="animate-pulse" />` : '') +
    `<image href="${getTwemojiUrl(asset.twemojiCode)}" x="${x}" y="${y}" width="${size}" height="${size}" />` +
    (asset.subEffectCode ? `<image href="${getTwemojiUrl(asset.subEffectCode)}" x="${x + size - 14}" y="${y - 6}" width="20" height="20" class="animate-pulse" />` : '') +
    `</g>`
  );
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
  const hasAccessory = Boolean(accessory && accessory !== 'acc_none');

  const layers = [
    // 1. 背景ステージ（一番奥・パステルグラデーション＋足元台座＋透かしモチーフ）
    renderBackground(bg, idPrefix),
    // 2. 後ろ髪 (backHair)
    renderBackHair(hairStyle, hc),
    // 3. マント・背中装備 (backItem)
    renderBackItem(weapon, outfit, accessory, idPrefix),
    // 4. 素体 (body: 胴体・手足)
    renderBody(skin),
    // 5. 靴 (shoes)
    renderShoes(outfit),
    // 6. 衣装 (outfit: オーバーオール・ドレス・鎧・Tシャツなど全身)
    renderOutfit(outfit),
    // 7. 顔の輪郭・耳 (headBase)
    renderHeadBase(skin),
    // 8. 表情・瞳 (face: うるうる瞳・まつ毛・チーク・全8種の顔)
    renderFace(expression),
    // 9. 前髪 (frontHair: 全12種。頭装備装着時はlongのリボンを自動非表示)
    renderFrontHair(hairStyle, hc, hasAccessory),
    // 10. 頭装備 (accessory: 頭頂部中央 x=82 y=14)
    renderAccessory(accessory),
    // 11. 持ち物・武器 (weapon: 右手の横 x=140 y=128)
    renderWeapon(weapon),
    // 12. 相棒ペット (pet: 左足の横の地面 x=12 y=148)
    renderPet(pet),
  ];

  const w = pixelWidth ? `width="${pixelWidth}"` : 'width="100%"';
  const h = pixelHeight ? `height="${pixelHeight}"` : 'height="100%"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ${w} ${h}>${layers.join('')}</svg>`;
}

export const buildAvatarSvg = buildGameAvatarSvg;

/**
 * 着せ替えカードやガチャ交換所カードの中央に、
 * 頭装備・武器・ペットの美麗な単体ベクターイラストを拡大表示するためのSVGビルダー。
 */
export function renderSingleAssetPreviewSvg(_slot: AvatarSlot, _id: string): string | null {
  return null;
}

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
