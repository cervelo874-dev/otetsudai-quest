/**
 * 【AI開発者への絶対厳守ルール（Architecture Guideline）】
 * 1. アバターおよび全アイテム（髪型・表情・頭装備・衣装・武器・ペット・背景）の追加・変更時は、
 *    手書きの簡易SVG（<path>, <circle>, <rect>等の組み合わせ）を絶対に作成しないこと。
 * 2. 新規アイテムを追加する際は、必ず本カタログ（AVATAR_ASSET_CATALOG）に
 *    DiceBearのパーツ指定、または Twemoji SVG CDNコード（もしくは高精細画像URL）と
 *    エフェクト設定を追加する「案A：プロ素材レイヤー合成方式」で実装すること。
 */

import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';
import type { AvatarConfig, AvatarSlot, Child } from './types';

export const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg';

export function getTwemojiUrl(code: string): string {
  const clean = code.toLowerCase().trim();
  return `${TWEMOJI_BASE}/${clean}.svg`;
}

export interface AvatarAssetItem {
  id: string;
  slot: AvatarSlot;
  name: string;
  icon: string;
  rarity: 1 | 2 | 3;
  locked?: boolean;
  gachaOnly?: boolean;
  hidden?: boolean;
  color?: string; // HEXカラーコード

  // DiceBear冒険者アバター本体パーツ設定
  dicebear?: {
    skinColor?: string; // 6桁HEX
    hairColor?: string; // 6桁HEX
    hair?: string;
    eyes?: string;
    eyebrows?: string;
    mouth?: string;
    features?: string;
  };

  // Twemojiプロ素材＆高精細イラストレイヤー設定
  twemojiCode?: string;      // メインイラストコード（例: '1f409'）
  subEffectCode?: string;    // 舞うサブエフェクト（例: '1f525' 炎、'1f496' ハート、'2728' 星）
  assetUrl?: string;         // 外部高精細ベクター画像URL（任意）
  transform?: {
    x: number;
    y: number;
    size: number;
    rotation?: number;
    animation?: 'bounce' | 'float' | 'swing' | 'pulse' | 'glow';
  };

  // 衣装固有テーマ装飾（バッジ・オーラカラー・枠線）
  outfitTheme?: {
    badgeCode: string;
    primaryColor: string;
    secondaryColor: string;
    auraCode?: string;
  };

  // 背景ステージ設定（美麗グラデーション＋多層風景モチーフ）
  stageConfig?: {
    gradient: string;
    skyOverlay?: string;
    particles: { code: string; x: number; y: number; size: number; anim?: string }[];
  };
}

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

/* ---------------- 1. プロ素材アセットカタログ（AVATAR_ASSET_CATALOG） ---------------- */

export const AVATAR_ASSET_CATALOG: AvatarAssetItem[] = [
  // ==================== 1. はだ (skin) ====================
  { id: 's1', slot: 'skin', name: 'はだ 1（あかるい）', icon: '✨', color: '#FFE3CC', rarity: 1, dicebear: { skinColor: 'ffe3cc' } },
  { id: 's2', slot: 'skin', name: 'はだ 2（ナチュラル）', icon: '✨', color: '#F6C9A0', rarity: 1, dicebear: { skinColor: 'f6c9a0' } },
  { id: 's3', slot: 'skin', name: 'はだ 3（こむぎいろ）', icon: '✨', color: '#D9A06A', rarity: 1, dicebear: { skinColor: 'd9a06a' } },
  { id: 's4', slot: 'skin', name: 'はだ 4（ダーク）', icon: '✨', color: '#A56E42', rarity: 1, dicebear: { skinColor: 'a56e42' } },

  // ==================== 2. かみがた (hairStyle) ====================
  // 男の子向けパーツ
  { id: 'short', slot: 'hairStyle', name: 'みじかいショート', icon: '💇', rarity: 1, dicebear: { hair: 'short01' } },
  { id: 'boy_mash', slot: 'hairStyle', name: 'さわやかマッシュ', icon: '👦', rarity: 1, dicebear: { hair: 'short06' } },
  { id: 'spiky', slot: 'hairStyle', name: 'つんつんスパイキー', icon: '⚡', rarity: 1, dicebear: { hair: 'short04' } },
  { id: 'boy_asymmetry', slot: 'hairStyle', name: 'クールななめバング', icon: '🧑', rarity: 1, dicebear: { hair: 'short11' } },
  { id: 'boy_sporty', slot: 'hairStyle', name: 'わんぱくベリーショート', icon: '🏃', rarity: 1, dicebear: { hair: 'short14' } },
  // 女の子向けパーツ
  { id: 'long', slot: 'hairStyle', name: 'さらさらロング', icon: '👧', rarity: 1, dicebear: { hair: 'long01' } },
  { id: 'bob', slot: 'hairStyle', name: 'ふんわりボブ', icon: '👦', rarity: 1, dicebear: { hair: 'long02' } },
  { id: 'twintails', slot: 'hairStyle', name: 'ふたつむすび', icon: '🎀', rarity: 1, dicebear: { hair: 'long12' } },
  { id: 'buns', slot: 'hairStyle', name: 'おだんごヘア', icon: '🍡', rarity: 1, dicebear: { hair: 'long07' } },
  { id: 'girl_ponytail', slot: 'hairStyle', name: '元気ポニーテール', icon: '👱‍♀️', rarity: 1, dicebear: { hair: 'long08' } },
  { id: 'girl_wavy_princess', slot: 'hairStyle', name: 'ゆるふわプリンセス', icon: '👸', rarity: 1, dicebear: { hair: 'long05' } },
  { id: 'girl_braids', slot: 'hairStyle', name: 'かわいい三つ編み', icon: '👧', rarity: 1, dicebear: { hair: 'long13' } },
  // 旧ID互換用エイリアス
  { id: 'pigtails', slot: 'hairStyle', name: 'ふたつむすび', icon: '🎀', rarity: 1, hidden: true, dicebear: { hair: 'long12' } },
  { id: 'bun', slot: 'hairStyle', name: 'おだんごヘア', icon: '🍡', rarity: 1, hidden: true, dicebear: { hair: 'long07' } },

  // ==================== 3. かみのいろ (hairColor) ====================
  { id: 'brown', slot: 'hairColor', name: 'マロンブラウン', icon: '🎨', color: '#6E473B', rarity: 1, dicebear: { hairColor: '6e473b' } },
  { id: 'black', slot: 'hairColor', name: 'ナチュラルブラック', icon: '🎨', color: '#2C2220', rarity: 1, dicebear: { hairColor: '2c2220' } },
  { id: 'blonde', slot: 'hairColor', name: 'ハニーゴールド', icon: '🎨', color: '#E8B342', rarity: 1, dicebear: { hairColor: 'e8b342' } },
  { id: 'pink', slot: 'hairColor', name: 'スイートピンク', icon: '🎨', color: '#FF7BAC', rarity: 1, dicebear: { hairColor: 'ff7bac' } },
  { id: 'blue', slot: 'hairColor', name: 'アクアブルー', icon: '🎨', color: '#4BA3E3', rarity: 1, dicebear: { hairColor: '4ba3e3' } },

  // ==================== 4. おかお・表情 (expression) ====================
  {
    id: 'girl_smile', slot: 'expression', name: 'にっこりガール', icon: '😊', rarity: 1,
    dicebear: { eyes: 'variant02', eyebrows: 'variant02', mouth: 'variant02', features: 'blush' }
  },
  {
    id: 'boy_cool', slot: 'expression', name: 'さわやかボーイ', icon: '😎', rarity: 1,
    dicebear: { eyes: 'variant06', eyebrows: 'variant06', mouth: 'variant01' }
  },
  {
    id: 'boy_grin', slot: 'expression', name: 'わんぱくニカッ！', icon: '😆', rarity: 1,
    dicebear: { eyes: 'variant09', eyebrows: 'variant09', mouth: 'variant13' }
  },
  {
    id: 'boy_wink', slot: 'expression', name: 'クールウィンク', icon: '😉', rarity: 1,
    dicebear: { eyes: 'variant20', eyebrows: 'variant01', mouth: 'variant03' }
  },
  {
    id: 'boy_fighting', slot: 'expression', name: 'やるき満々！', icon: '🔥', rarity: 1,
    dicebear: { eyes: 'variant08', eyebrows: 'variant07', mouth: 'variant26' }
  },
  {
    id: 'happy_open', slot: 'expression', name: 'わーい！スマイル', icon: '😄', rarity: 1,
    dicebear: { eyes: 'variant11', eyebrows: 'variant10', mouth: 'variant19' }
  },
  {
    id: 'wink_star', slot: 'expression', name: 'キラッ☆ウィンク', icon: '✨', rarity: 1,
    dicebear: { eyes: 'variant15', eyebrows: 'variant05', mouth: 'variant10', features: 'blush' }
  },
  {
    id: 'shy_blush', slot: 'expression', name: 'ぽかぽか照れ顔', icon: '🥰', rarity: 1,
    dicebear: { eyes: 'variant03', eyebrows: 'variant04', mouth: 'variant05', features: 'blush' }
  },
  // 旧ID互換用エイリアス
  { id: 'smile', slot: 'expression', name: 'にっこりガール', icon: '😊', rarity: 1, hidden: true, dicebear: { eyes: 'variant02', eyebrows: 'variant02', mouth: 'variant02', features: 'blush' } },
  { id: 'grin', slot: 'expression', name: 'わんぱくニカッ！', icon: '😆', rarity: 1, hidden: true, dicebear: { eyes: 'variant09', eyebrows: 'variant09', mouth: 'variant13' } },
  { id: 'wink', slot: 'expression', name: 'クールウィンク', icon: '😉', rarity: 1, hidden: true, dicebear: { eyes: 'variant20', eyebrows: 'variant01', mouth: 'variant03' } },
  { id: 'wow', slot: 'expression', name: 'わーい！スマイル', icon: '😮', rarity: 1, hidden: true, dicebear: { eyes: 'variant11', eyebrows: 'variant10', mouth: 'variant19' } },

  // ==================== 5. あたま・頭装備 (accessory) ====================
  { id: 'acc_none', slot: 'accessory', name: 'あたま なし', icon: '⭕', rarity: 1 },
  {
    id: 'ribbon', slot: 'accessory', name: 'ピンクビッグリボン', icon: '🎀', rarity: 1,
    twemojiCode: '1f380', transform: { x: 100, y: 38, size: 52, animation: 'float' }
  },
  {
    id: 'tiara', slot: 'accessory', name: 'プリンセスティアラ', icon: '👑', gachaOnly: true, rarity: 2,
    twemojiCode: '1f451', subEffectCode: '2728', transform: { x: 100, y: 44, size: 48, animation: 'pulse' }
  },
  {
    id: 'crown', slot: 'accessory', name: 'ゴールドクラウン', icon: '👑', locked: true, rarity: 2,
    twemojiCode: '1f451', subEffectCode: '2728', transform: { x: 100, y: 38, size: 54, animation: 'float' }
  },
  {
    id: 'cat_headphone', slot: 'accessory', name: 'ネコみみヘッドホン', icon: '🎧', gachaOnly: true, rarity: 2,
    twemojiCode: '1f3a7', subEffectCode: '1f431', transform: { x: 100, y: 52, size: 56, animation: 'bounce' }
  },
  {
    id: 'hero_helm', slot: 'accessory', name: 'ゆうしゃのナイトカブト', icon: '🪖', gachaOnly: true, rarity: 2,
    twemojiCode: '1fa96', subEffectCode: '1faba', transform: { x: 100, y: 45, size: 58, animation: 'float' }
  },
  {
    id: 'knight_helmet', slot: 'accessory', name: 'ゆうしゃのナイトカブト', icon: '🪖', gachaOnly: true, rarity: 2, hidden: true,
    twemojiCode: '1fa96', subEffectCode: '1faba', transform: { x: 100, y: 45, size: 58, animation: 'float' }
  },
  {
    id: 'ninja_band', slot: 'accessory', name: 'にんじゃのハチマキ', icon: '🥋', gachaOnly: true, rarity: 2,
    twemojiCode: '1f9e2', subEffectCode: '2694', transform: { x: 100, y: 56, size: 54, animation: 'float' }
  },
  {
    id: 'dino_hood', slot: 'accessory', name: 'きょうりゅうフード', icon: '🐲', gachaOnly: true, rarity: 2,
    twemojiCode: '1f996', transform: { x: 100, y: 40, size: 60, animation: 'bounce' }
  },
  {
    id: 'wizard', slot: 'accessory', name: 'まほうつかいのぼうし', icon: '🧙', locked: true, rarity: 2,
    twemojiCode: '1fa84', subEffectCode: '2728', transform: { x: 100, y: 40, size: 54, animation: 'pulse' }
  },
  {
    id: 'wizard_hat', slot: 'accessory', name: 'まほうつかいのぼうし', icon: '🧙', gachaOnly: true, rarity: 2, hidden: true,
    twemojiCode: '1fa84', subEffectCode: '2728', transform: { x: 100, y: 40, size: 54, animation: 'pulse' }
  },
  {
    id: 'sunglasses', slot: 'accessory', name: 'クールサングラス', icon: '🕶️', locked: true, rarity: 1,
    twemojiCode: '1f576', transform: { x: 100, y: 78, size: 44, animation: 'float' }
  },
  {
    id: 'star_pin', slot: 'accessory', name: 'キラキラスターピン', icon: '🌟', gachaOnly: true, rarity: 2,
    twemojiCode: '1f31f', transform: { x: 122, y: 55, size: 36, animation: 'pulse' }
  },
  {
    id: 'space_helmet', slot: 'accessory', name: 'うちゅうヘルメット', icon: '👨‍🚀', gachaOnly: true, rarity: 2,
    twemojiCode: '1fa90', subEffectCode: '2728', transform: { x: 100, y: 48, size: 58, animation: 'float' }
  },
  {
    id: 'angel_ring', slot: 'accessory', name: '★3 ひかるてんしの輪', icon: '😇', gachaOnly: true, rarity: 3,
    twemojiCode: '1faba', subEffectCode: '2728', transform: { x: 100, y: 28, size: 60, animation: 'pulse' }
  },
  {
    id: 'angel_halo', slot: 'accessory', name: '★3 ひかるてんしの輪', icon: '😇', gachaOnly: true, rarity: 3, hidden: true,
    twemojiCode: '1faba', subEffectCode: '2728', transform: { x: 100, y: 28, size: 60, animation: 'pulse' }
  },
  {
    id: 'dragon_crown', slot: 'accessory', name: '★3 おうごんのドラゴンクラウン', icon: '👑', gachaOnly: true, rarity: 3,
    twemojiCode: '1f451', subEffectCode: '1f409', transform: { x: 100, y: 32, size: 62, animation: 'glow' }
  },

  // ==================== 6. おようふく・衣装 (outfit) ====================
  {
    id: 'overall', slot: 'outfit', name: 'デニムオーバーオール', icon: '👖', rarity: 1,
    outfitTheme: { badgeCode: '1f456', primaryColor: '#3b82f6', secondaryColor: '#60a5fa' }
  },
  {
    id: 'tee_blue', slot: 'outfit', name: 'マリンボーダーTシャツ', icon: '👕', rarity: 1,
    outfitTheme: { badgeCode: '1f455', primaryColor: '#0ea5e9', secondaryColor: '#38bdf8' }
  },
  {
    id: 'tee_red', slot: 'outfit', name: 'スターレッドTシャツ', icon: '👕', rarity: 1,
    outfitTheme: { badgeCode: '1f455', primaryColor: '#ef4444', secondaryColor: '#f87171' }
  },
  {
    id: 'dino', slot: 'outfit', name: 'きょうりゅう着ぐるみ', icon: '🦖', locked: true, rarity: 2,
    outfitTheme: { badgeCode: '1f996', primaryColor: '#10b981', secondaryColor: '#34d399' }
  },
  {
    id: 'princess', slot: 'outfit', name: 'プリンセスフリルドレス', icon: '👗', locked: true, rarity: 2,
    outfitTheme: { badgeCode: '1f457', primaryColor: '#ec4899', secondaryColor: '#f472b6', auraCode: '2728' }
  },
  {
    id: 'knight', slot: 'outfit', name: 'ゆうしゃのシルバーアーマー', icon: '🛡️', locked: true, rarity: 2,
    outfitTheme: { badgeCode: '1f6e1', primaryColor: '#64748b', secondaryColor: '#94a3b8' }
  },
  {
    id: 'magic_robe', slot: 'outfit', name: 'まほうのスターローブ', icon: '🧙‍♂️', gachaOnly: true, rarity: 2,
    outfitTheme: { badgeCode: '1fa84', primaryColor: '#8b5cf6', secondaryColor: '#a78bfa', auraCode: '2728' }
  },
  {
    id: 'panda_suit', slot: 'outfit', name: 'モコモコパンダスーツ', icon: '🐼', gachaOnly: true, rarity: 2,
    outfitTheme: { badgeCode: '1f43c', primaryColor: '#1e293b', secondaryColor: '#475569' }
  },
  {
    id: 'pilot_uniform', slot: 'outfit', name: 'パイロットダブルせいふく', icon: '✈️', gachaOnly: true, rarity: 2,
    outfitTheme: { badgeCode: '2708', primaryColor: '#0284c7', secondaryColor: '#38bdf8' }
  },
  {
    id: 'ninja_suit', slot: 'outfit', name: 'くろがねにんじゃスーツ', icon: '🥷', gachaOnly: true, rarity: 2,
    outfitTheme: { badgeCode: '1f977', primaryColor: '#0f172a', secondaryColor: '#334155' }
  },
  {
    id: 'idol_dress', slot: 'outfit', name: 'きらめきアイドルドレス', icon: '🎤', gachaOnly: true, rarity: 2,
    outfitTheme: { badgeCode: '1f3a4', primaryColor: '#f43f5e', secondaryColor: '#fb7185', auraCode: '2728' }
  },
  {
    id: 'crystal_armor', slot: 'outfit', name: '★3 でんせつのクリスタルアーマー', icon: '💎', gachaOnly: true, rarity: 3,
    outfitTheme: { badgeCode: '1f48e', primaryColor: '#c084fc', secondaryColor: '#f472b6', auraCode: '1f48e' }
  },

  // ==================== 7. もちもの・ぶき (weapon) ====================
  { id: 'wp_none', slot: 'weapon', name: 'もちもの なし', icon: '⭕', rarity: 1 },
  {
    id: 'wood_sword', slot: 'weapon', name: 'きのけん', icon: '🗡️', rarity: 1,
    twemojiCode: '1f5e1', transform: { x: 155, y: 145, size: 62, rotation: -15, animation: 'swing' }
  },
  {
    id: 'brave_sword', slot: 'weapon', name: 'ゆうしゃのブレイブソード', icon: '🗡️', gachaOnly: true, rarity: 2,
    twemojiCode: '1f5e1', subEffectCode: '2728', transform: { x: 155, y: 145, size: 64, rotation: -15, animation: 'swing' }
  },
  {
    id: 'bug_net', slot: 'weapon', name: 'むしとりあみ', icon: '🦋', rarity: 1,
    twemojiCode: '1f98b', subEffectCode: '2728', transform: { x: 155, y: 140, size: 54, animation: 'float' }
  },
  {
    id: 'giant_candy', slot: 'weapon', name: 'きょだいペロペロキャンディ', icon: '🍭', gachaOnly: true, rarity: 2,
    twemojiCode: '1f36d', transform: { x: 158, y: 138, size: 68, rotation: 10, animation: 'float' }
  },
  {
    id: 'magic_wand', slot: 'weapon', name: 'スターマジックステッキ', icon: '🪄', gachaOnly: true, rarity: 2,
    twemojiCode: '1fa84', subEffectCode: '1f496', transform: { x: 154, y: 142, size: 60, rotation: -10, animation: 'pulse' }
  },
  {
    id: 'hero_shield', slot: 'weapon', name: 'ゆうしゃのたて', icon: '🛡️', gachaOnly: true, rarity: 2,
    twemojiCode: '1f6e1', subEffectCode: '2728', transform: { x: 154, y: 148, size: 60, animation: 'pulse' }
  },
  {
    id: 'laser_blade', slot: 'weapon', name: 'サイバーレーザーブレード', icon: '⚔️', gachaOnly: true, rarity: 2,
    twemojiCode: '2694', subEffectCode: '2728', transform: { x: 155, y: 142, size: 64, rotation: -15, animation: 'swing' }
  },
  {
    id: 'flame_sword', slot: 'weapon', name: '★3 ほのおのレジェンドソード', icon: '🔥', gachaOnly: true, rarity: 3,
    twemojiCode: '2694', subEffectCode: '1f525', transform: { x: 155, y: 140, size: 68, rotation: -15, animation: 'glow' }
  },
  {
    id: 'rainbow_rod', slot: 'weapon', name: '★3 にじいろマジックワンド', icon: '🌈', gachaOnly: true, rarity: 3,
    twemojiCode: '1fa84', subEffectCode: '1f308', transform: { x: 154, y: 138, size: 66, rotation: -10, animation: 'glow' }
  },

  // ==================== 8. ペット (pet) ====================
  { id: 'pet_none', slot: 'pet', name: 'ペット なし', icon: '⭕', rarity: 1 },
  {
    id: 'shiba', slot: 'pet', name: 'ころころしばいぬ', icon: '🐕', locked: true, rarity: 2,
    twemojiCode: '1f436', transform: { x: 38, y: 165, size: 58, animation: 'bounce' }
  },
  {
    id: 'penguin', slot: 'pet', name: 'マフラーペンギン', icon: '🐧', locked: true, rarity: 2,
    twemojiCode: '1f427', transform: { x: 38, y: 165, size: 56, animation: 'bounce' }
  },
  {
    id: 'slime', slot: 'pet', name: 'ぷるぷるスライム', icon: '💧', gachaOnly: true, rarity: 2,
    twemojiCode: '1f4a7', subEffectCode: '2728', transform: { x: 40, y: 170, size: 54, animation: 'bounce' }
  },
  {
    id: 'black_cat', slot: 'pet', name: 'くろねこ', icon: '🐈‍⬛', gachaOnly: true, rarity: 2,
    twemojiCode: '1f408-200d-2b1b', transform: { x: 38, y: 165, size: 56, animation: 'bounce' }
  },
  {
    id: 'dragon', slot: 'pet', name: 'ちびドラゴン', icon: '🐉', locked: true, rarity: 2,
    twemojiCode: '1f409', transform: { x: 36, y: 160, size: 62, animation: 'float' }
  },
  {
    id: 'anglerfish', slot: 'pet', name: 'ピカピカアンコウ', icon: '🐡', gachaOnly: true, rarity: 2,
    twemojiCode: '1f41f', subEffectCode: '1f4a1', transform: { x: 38, y: 165, size: 54, animation: 'float' }
  },
  {
    id: 'mini_dragon', slot: 'pet', name: '★3 おうごんのミニドラゴン', icon: '🐲', gachaOnly: true, rarity: 3,
    twemojiCode: '1f409', subEffectCode: '2728', transform: { x: 36, y: 156, size: 68, animation: 'glow' }
  },
  {
    id: 'unicorn', slot: 'pet', name: 'ミニユニコーン', icon: '🦄', gachaOnly: true, rarity: 2,
    twemojiCode: '1f984', subEffectCode: '2728', transform: { x: 38, y: 160, size: 62, animation: 'bounce' }
  },
  {
    id: 'flying_unicorn', slot: 'pet', name: '★3 はばたくペガサス', icon: '✨🦄', gachaOnly: true, rarity: 3, hidden: true,
    twemojiCode: '1f984', subEffectCode: '1faba', transform: { x: 36, y: 156, size: 68, animation: 'glow' }
  },

  // ==================== 9. はいけい (bg) ====================
  {
    id: 'sky', slot: 'bg', name: 'あおぞらとくも', icon: '☁️', rarity: 1,
    stageConfig: {
      gradient: 'linear-gradient(180deg, #60a5fa 0%, #93c5fd 55%, #86efac 100%)',
      particles: [
        { code: '2601', x: 25, y: 35, size: 30, anim: 'drift' },
        { code: '1f308', x: 165, y: 40, size: 34, anim: 'pulse' },
        { code: '1f33c', x: 100, y: 220, size: 24, anim: 'float' },
      ],
    },
  },
  {
    id: 'meadow', slot: 'bg', name: 'おはなののはら', icon: '🌼', rarity: 1,
    stageConfig: {
      gradient: 'linear-gradient(180deg, #fef08a 0%, #bbf7d0 50%, #4ade80 100%)',
      particles: [
        { code: '1f337', x: 30, y: 215, size: 28 },
        { code: '1f33b', x: 170, y: 215, size: 28 },
        { code: '1f98b', x: 155, y: 50, size: 28, anim: 'float' },
      ],
    },
  },
  {
    id: 'sunset', slot: 'bg', name: 'ゆうやけのまち', icon: '🌇', rarity: 1,
    stageConfig: {
      gradient: 'linear-gradient(180deg, #f97316 0%, #fb923c 45%, #c084fc 100%)',
      particles: [
        { code: '2600', x: 160, y: 45, size: 36, anim: 'pulse' },
        { code: '2b50', x: 40, y: 30, size: 22, anim: 'pulse' },
      ],
    },
  },
  {
    id: 'night', slot: 'bg', name: 'ほしぞらキャンプ', icon: '⛺', rarity: 1,
    stageConfig: {
      gradient: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)',
      particles: [
        { code: '1f315', x: 160, y: 35, size: 38, anim: 'pulse' },
        { code: '2b50', x: 40, y: 35, size: 20 },
        { code: '1f525', x: 100, y: 220, size: 26, anim: 'pulse' },
      ],
    },
  },
  {
    id: 'kirakira', slot: 'bg', name: 'パステルキラキラ', icon: '✨', locked: true, rarity: 2,
    stageConfig: {
      gradient: 'linear-gradient(180deg, #fbcfe8 0%, #fde047 50%, #a7f3d0 100%)',
      particles: [
        { code: '2728', x: 35, y: 40, size: 28, anim: 'pulse' },
        { code: '2728', x: 165, y: 55, size: 32, anim: 'pulse' },
        { code: '1f31f', x: 100, y: 25, size: 30, anim: 'pulse' },
      ],
    },
  },
  {
    id: 'space', slot: 'bg', name: 'コスモスペース', icon: '🪐', locked: true, rarity: 2,
    stageConfig: {
      gradient: 'linear-gradient(180deg, #09090b 0%, #3b0764 50%, #1e1b4b 100%)',
      particles: [
        { code: '1fa90', x: 160, y: 40, size: 42, anim: 'float' },
        { code: '1f680', x: 35, y: 65, size: 34, anim: 'float' },
        { code: '2728', x: 100, y: 25, size: 22 },
      ],
    },
  },
  {
    id: 'rainbow', slot: 'bg', name: 'にじのスカイロード', icon: '🌈', gachaOnly: true, rarity: 2,
    stageConfig: {
      gradient: 'linear-gradient(180deg, #38bdf8 0%, #e0e7ff 50%, #fbcfe8 100%)',
      particles: [
        { code: '1f308', x: 100, y: 35, size: 54, anim: 'pulse' },
        { code: '2601', x: 30, y: 55, size: 32 },
        { code: '2601', x: 170, y: 65, size: 32 },
      ],
    },
  },
  {
    id: 'candy_land', slot: 'bg', name: 'スイートおかしのくに', icon: '🍭', gachaOnly: true, rarity: 2,
    stageConfig: {
      gradient: 'linear-gradient(180deg, #f472b6 0%, #fbcfe8 50%, #fed7aa 100%)',
      particles: [
        { code: '1f36c', x: 35, y: 45, size: 32, anim: 'float' },
        { code: '1f369', x: 165, y: 40, size: 34, anim: 'float' },
        { code: '1f366', x: 100, y: 220, size: 26 },
      ],
    },
  },
  {
    id: 'ninja_mansion', slot: 'bg', name: 'よるのにんじゃやしき', icon: '🏯', gachaOnly: true, rarity: 2,
    stageConfig: {
      gradient: 'linear-gradient(180deg, #020617 0%, #1e1b4b 50%, #311042 100%)',
      particles: [
        { code: '1f315', x: 160, y: 35, size: 42, anim: 'pulse' },
        { code: '1f338', x: 35, y: 50, size: 30, anim: 'float' },
        { code: '1f3ef', x: 100, y: 220, size: 34 },
      ],
    },
  },
  {
    id: 'ocean_temple', slot: 'bg', name: '神秘のかいていしんでん', icon: '🏛️', gachaOnly: true, rarity: 2,
    stageConfig: {
      gradient: 'linear-gradient(180deg, #0369a1 0%, #0891b2 50%, #0d9488 100%)',
      particles: [
        { code: '1fae7', x: 40, y: 60, size: 24, anim: 'float' },
        { code: '1fab8', x: 165, y: 215, size: 32 },
        { code: '1fae7', x: 155, y: 90, size: 20, anim: 'float' },
      ],
    },
  },
  {
    id: 'space_station', slot: 'bg', name: 'サイバーステーション', icon: '🛰️', gachaOnly: true, rarity: 2,
    stageConfig: {
      gradient: 'linear-gradient(180deg, #18181b 0%, #4c1d95 55%, #065f46 100%)',
      particles: [
        { code: '1fa90', x: 165, y: 40, size: 42, anim: 'float' },
        { code: '1f680', x: 35, y: 60, size: 34, anim: 'float' },
      ],
    },
  },
  {
    id: 'crystal_castle', slot: 'bg', name: '★3 まおうのクリスタルじょう', icon: '🏰', gachaOnly: true, rarity: 3,
    stageConfig: {
      gradient: 'linear-gradient(180deg, #2e1065 0%, #581c87 50%, #701a75 100%)',
      particles: [
        { code: '1f3f0', x: 100, y: 38, size: 54, anim: 'pulse' },
        { code: '1f48e', x: 35, y: 70, size: 32, anim: 'pulse' },
        { code: '1f48e', x: 165, y: 70, size: 32, anim: 'pulse' },
      ],
    },
  },
  {
    id: 'rainbow_stage', slot: 'bg', name: '★3 にじのキラキラステージ', icon: '🌟', gachaOnly: true, rarity: 3,
    stageConfig: {
      gradient: 'linear-gradient(180deg, #818cf8 0%, #f472b6 40%, #fbbf24 80%, #34d399 100%)',
      particles: [
        { code: '1f308', x: 100, y: 30, size: 56, anim: 'pulse' },
        { code: '1f31f', x: 30, y: 65, size: 30, anim: 'pulse' },
        { code: '1f31f', x: 170, y: 65, size: 30, anim: 'pulse' },
        { code: '2728', x: 100, y: 220, size: 28 },
      ],
    },
  },
];

/* ---------------- 2. カタログから生成されるアクセサとマップ ---------------- */

const assetMap = new Map<string, AvatarAssetItem>(AVATAR_ASSET_CATALOG.map((item) => [item.id, item]));

export const AVATAR_OPTIONS: AvatarOption[] = AVATAR_ASSET_CATALOG.map((item) => ({
  id: item.id,
  slot: item.slot,
  name: item.name,
  icon: item.icon,
  rarity: item.rarity,
  color: item.color,
  locked: item.locked,
  gachaOnly: item.gachaOnly,
  hidden: item.hidden,
}));

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

export function isDefaultAvatarItem(opt: AvatarOption): boolean {
  return !(opt.locked || opt.gachaOnly);
}

export function isUnlockableAvatarItem(opt: AvatarOption): boolean {
  if (opt.hidden) return false;
  if (opt.id === 'acc_none' || opt.id === 'wp_none' || opt.id === 'pet_none') return false;
  return Boolean(opt.locked || opt.gachaOnly);
}

export function findOption(id: string | null | undefined): AvatarOption | undefined {
  if (!id) return undefined;
  return optMap.get(id);
}

export function findAsset(id: string | null | undefined): AvatarAssetItem | undefined {
  if (!id) return undefined;
  return assetMap.get(id);
}

export function optionsFor(slot: AvatarSlot): AvatarOption[] {
  return AVATAR_OPTIONS.filter((o) => o.slot === slot && !o.hidden);
}

export function isUnlocked(opt: AvatarOption, child: Child): boolean {
  return !(opt.locked || opt.gachaOnly) || (child.ownedItems?.includes(opt.id) ?? false);
}

/* ---------------- 3. DiceBear Adventurer 高速ベクターアバター合成 ---------------- */

const dicebearCache = new Map<string, string>();

/**
 * DiceBear Adventurer でアバター本体（肌・髪・表情）を生成
 */
export function getDicebearAvatarSvg(config?: AvatarConfig | null): string {
  const skinAsset = findAsset(config?.skin ?? 's1');
  const hairStyleAsset = findAsset(config?.hairStyle ?? 'short');
  const hairColorAsset = findAsset(config?.hairColor ?? 'brown');
  const exprAsset = findAsset(config?.expression ?? 'girl_smile');

  const skinColor = skinAsset?.dicebear?.skinColor ?? 'ffe3cc';
  const hairColor = hairColorAsset?.dicebear?.hairColor ?? '6e473b';
  const hair = hairStyleAsset?.dicebear?.hair ?? 'short01';
  const eyes = exprAsset?.dicebear?.eyes ?? 'variant02';
  const eyebrows = exprAsset?.dicebear?.eyebrows ?? 'variant02';
  const mouth = exprAsset?.dicebear?.mouth ?? 'variant02';
  const features = exprAsset?.dicebear?.features;

  const cacheKey = `${skinColor}_${hairColor}_${hair}_${eyes}_${eyebrows}_${mouth}_${features ?? ''}`;
  const hit = dicebearCache.get(cacheKey);
  if (hit) return hit;

  const avatar = createAvatar(adventurer, {
    skinColor: [skinColor],
    hairColor: [hairColor],
    hair: [hair],
    eyes: [eyes],
    eyebrows: [eyebrows],
    mouth: [mouth],
    features: features ? [features] : [],
    featuresProbability: features ? 100 : 0,
    glassesProbability: 0,
    earringsProbability: 0,
  } as any);

  const svgStr = avatar.toString();
  dicebearCache.set(cacheKey, svgStr);
  return svgStr;
}

/* ---------------- 4. 完全自己完結型 SVG 文字列ビルダー（PiP・Canvas・画像出力対応） ---------------- */

export function buildGameAvatarSvg(
  config?: AvatarConfig | null,
  width?: number,
  height?: number,
  viewBox = '0 0 200 240',
  idPrefix = 'av'
): string {
  const bgItem = findAsset(config?.bg ?? 'sky');
  const accItem = findAsset(config?.accessory ?? 'acc_none');
  const outfitItem = findAsset(config?.outfit ?? 'overall');
  const wpItem = findAsset(config?.weapon ?? 'wp_none');
  const petItem = findAsset(config?.pet ?? 'pet_none');

  const stage = bgItem?.stageConfig ?? AVATAR_ASSET_CATALOG.find((x) => x.id === 'sky')!.stageConfig!;

  // 1. 背景グラデーション
  const bgGradient = stage.gradient;

  // 2. DiceBear アバター本体
  const dicebearSvg = getDicebearAvatarSvg(config);
  // 内側のSVGコンテンツまたはネストSVG
  const bodyNested = `<svg x="18" y="24" width="164" height="164" viewBox="0 0 762 762">${dicebearSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg>`;

  // 3. 背景パーティクル
  const bgParticles = stage.particles
    .map(
      (p) =>
        `<image href="${getTwemojiUrl(p.code)}" x="${p.x - p.size / 2}" y="${p.y - p.size / 2}" width="${p.size}" height="${p.size}" opacity="0.85" />`
    )
    .join('');

  // 4. ペット
  let petSvg = '';
  if (petItem && petItem.id !== 'pet_none' && petItem.twemojiCode && petItem.transform) {
    const t = petItem.transform;
    const url = getTwemojiUrl(petItem.twemojiCode);
    petSvg = `
      <g filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))">
        <ellipse cx="${t.x}" cy="${t.y + t.size * 0.42}" rx="${t.size * 0.38}" ry="${t.size * 0.16}" fill="rgba(0,0,0,0.2)" />
        <image href="${url}" x="${t.x - t.size / 2}" y="${t.y - t.size / 2}" width="${t.size}" height="${t.size}" />
      </g>
    `;
  }

  // 5. 頭装備
  let headSvg = '';
  if (accItem && accItem.id !== 'acc_none' && accItem.twemojiCode && accItem.transform) {
    const t = accItem.transform;
    const url = getTwemojiUrl(accItem.twemojiCode);
    const subUrl = accItem.subEffectCode ? getTwemojiUrl(accItem.subEffectCode) : null;
    headSvg = `
      <g filter="drop-shadow(0 4px 8px rgba(0,0,0,0.35))">
        <image href="${url}" x="${t.x - t.size / 2}" y="${t.y - t.size / 2}" width="${t.size}" height="${t.size}" />
        ${subUrl ? `<image href="${subUrl}" x="${t.x + t.size * 0.25}" y="${t.y - t.size * 0.35}" width="${t.size * 0.45}" height="${t.size * 0.45}" />` : ''}
      </g>
    `;
  }

  // 6. 武器・もちもの
  let weaponSvg = '';
  if (wpItem && wpItem.id !== 'wp_none' && wpItem.twemojiCode && wpItem.transform) {
    const t = wpItem.transform;
    const url = getTwemojiUrl(wpItem.twemojiCode);
    const subUrl = wpItem.subEffectCode ? getTwemojiUrl(wpItem.subEffectCode) : null;
    const rot = t.rotation ?? 0;
    weaponSvg = `
      <g transform="rotate(${rot} ${t.x} ${t.y})" filter="drop-shadow(0 6px 10px rgba(0,0,0,0.35))">
        <image href="${url}" x="${t.x - t.size / 2}" y="${t.y - t.size / 2}" width="${t.size}" height="${t.size}" />
        ${subUrl ? `<image href="${subUrl}" x="${t.x - t.size * 0.3}" y="${t.y - t.size * 0.4}" width="${t.size * 0.4}" height="${t.size * 0.4}" />` : ''}
      </g>
    `;
  }

  // 7. 衣装バッジ＆オーラ
  let outfitSvg = '';
  if (outfitItem?.outfitTheme) {
    const theme = outfitItem.outfitTheme;
    const badgeUrl = getTwemojiUrl(theme.badgeCode);
    const auraUrl = theme.auraCode ? getTwemojiUrl(theme.auraCode) : null;
    outfitSvg = `
      <g>
        ${auraUrl ? `<image href="${auraUrl}" x="12" y="115" width="32" height="32" opacity="0.85" />` : ''}
        ${outfitItem.id === 'crystal_armor' ? `<image href="${getTwemojiUrl('1f48e')}" x="156" y="110" width="30" height="30" opacity="0.9" />` : ''}
        <g filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))">
          <circle cx="100" cy="188" r="14" fill="${theme.primaryColor}" stroke="#ffffff" stroke-width="2.5" />
          <image href="${badgeUrl}" x="88" y="176" width="24" height="24" />
        </g>
      </g>
    `;
  }

  const w = width ? `width="${width}"` : '';
  const h = height ? `height="${height}"` : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ${w} ${h} style="border-radius: inherit;">
      <defs>
        <clipPath id="${idPrefix}-clip">
          <rect x="0" y="0" width="200" height="240" rx="28" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width="200" height="240" fill="#f8fafc" />
      <foreignObject x="0" y="0" width="200" height="240">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:${bgGradient};"></div>
      </foreignObject>
      <g clip-path="url(#${idPrefix}-clip)">
        ${bgParticles}
        ${bodyNested}
        ${outfitSvg}
        ${headSvg}
        ${petSvg}
        ${weaponSvg}
      </g>
    </svg>
  `.trim();
}

export const buildAvatarSvg = buildGameAvatarSvg;

/* ---------------- 5. カタログ整合性自己診断バリデーター ---------------- */

export function validateAvatarRenderers(): {
  ok: boolean;
  missing: { id: string; slot: string; name: string }[];
} {
  const missing: { id: string; slot: string; name: string }[] = [];

  for (const item of AVATAR_ASSET_CATALOG) {
    if (item.hidden) continue;

    if (item.slot === 'skin' || item.slot === 'hairStyle' || item.slot === 'hairColor' || item.slot === 'expression') {
      if (!item.dicebear) {
        missing.push({ id: item.id, slot: item.slot, name: item.name });
      }
    } else if (item.slot === 'accessory' && item.id !== 'acc_none') {
      if (!item.twemojiCode && !item.assetUrl) {
        missing.push({ id: item.id, slot: item.slot, name: item.name });
      }
    } else if (item.slot === 'weapon' && item.id !== 'wp_none') {
      if (!item.twemojiCode && !item.assetUrl) {
        missing.push({ id: item.id, slot: item.slot, name: item.name });
      }
    } else if (item.slot === 'outfit') {
      if (!item.outfitTheme) {
        missing.push({ id: item.id, slot: item.slot, name: item.name });
      }
    } else if (item.slot === 'pet' && item.id !== 'pet_none') {
      if (!item.twemojiCode && !item.assetUrl) {
        missing.push({ id: item.id, slot: item.slot, name: item.name });
      }
    } else if (item.slot === 'bg') {
      if (!item.stageConfig?.gradient) {
        missing.push({ id: item.id, slot: item.slot, name: item.name });
      }
    }
  }

  if (missing.length > 0) {
    console.warn(`🚨 [Avatar Catalog Warning] 未設定のプロ素材アイテムが検知されました:`, missing);
  } else {
    console.info(`✅ [Avatar Catalog] 全${AVATAR_ASSET_CATALOG.length}個のアイテムがプロ素材合成システムに完全対応しています。`);
  }

  return { ok: missing.length === 0, missing };
}

if (typeof window !== 'undefined') {
  validateAvatarRenderers();
}
