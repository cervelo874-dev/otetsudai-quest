import type { EquippedPartMap, LayerAdjustmentMap } from './features/avatar';

export type AvatarSlot =
  | 'skin'
  | 'hairStyle'
  | 'hairColor'
  | 'expression'
  | 'outfit'
  | 'accessory'
  | 'weapon'
  | 'pet'
  | 'bg';

export type AvatarConfig = {
  skin: string;
  hairStyle: string;
  hairColor: string;
  expression: string;
  outfit: string;
  accessory: string;
  weapon?: string;
  pet: string;
  bg: string;
};

export type ChildAvatarStudio = {
  equipped: Partial<Record<import('./features/avatar').AvatarCategory, string | null>>;
  adjustments?: LayerAdjustmentMap;
  /** 複数持ち物のパーツIDリスト */
  hand_items?: string[];
};

export interface Child {
  id: string;
  name: string;
  age: number;
  pin: string;
  coins: number;
  streak: number;
  lastDoneDate: string | null;
  totalQuests: number;
  avatar: AvatarConfig;
  /** 18レイヤー新アバター工房の装備＆微調整データ */
  avatarStudio?: ChildAvatarStudio;
  ownedItems: string[];
  lastFreeGacha: string | null;
  color: string;
  /** かんたんログイン（数字なしで入る）を許可するかどうか（未設定は true） */
  allowQuickLogin?: boolean;
  /** 最後にデイリーログインボーナスを受け取った日 (YYYY-MM-DD) */
  lastDailyLoginDate?: string | null;
  /** 最後にデイリー1時間チケットを使用した日 (YYYY-MM-DD) */
  lastDailyTicketUsedDate?: string | null;
  /** ガチャ素材: ほしのかけら所持数 */
  starShards: number;
}

export interface Quest {
  id: string;
  title: string;
  icon: string;
  reward: number;
  assignedTo: string[];
  /** 子ども別のコイン個別調整（未設定の子は reward を使用） */
  rewardOverrides: Record<string, number>;
}

export interface Submission {
  id: string;
  questId: string;
  childId: string;
  createdAt: number;
}

export interface Chest {
  id: string;
  childId: string;
  coins: number;
  ticketItemId: string | null;
  message: string;
  createdAt: number;
}

export type ShopCategory = 'tablet' | 'real' | 'avatar';

export interface ShopItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  category: ShopCategory;
  minutes: number;
  avatarItemId: string | null;
}

export type TicketStatus = 'owned' | 'requested' | 'done' | 'used';

export interface Ticket {
  id: string;
  childId: string;
  shopItemId: string;
  name: string;
  icon: string;
  category: 'tablet' | 'real';
  minutes: number;
  status: TicketStatus;
  acquiredAt: number;
  usedAt: number | null;
  /** 毎日ログインボーナスチケットフラグ */
  isDaily?: boolean;
  /** チケットの有効日 (YYYY-MM-DD) */
  dateKey?: string;
}

export interface ActiveTimer {
  childId: string;
  ticketId: string;
  name: string;
  minutes: number;
  startedAt: number;
  endsAt: number;
  alarmed: boolean;
  /** 一時停止中かどうか */
  isPaused?: boolean;
  /** 一時停止した時点での残りミリ秒 */
  pausedRemainingMs?: number;
}

export interface Notice {
  id: string;
  childId: string;
  icon: string;
  text: string;
  createdAt: number;
}

export interface LogEntry {
  id: string;
  icon: string;
  text: string;
  at: number;
}

export interface DoneRecord {
  childId: string;
  questId: string;
  date: string;
}

export type GachaRarity = 1 | 2 | 3; // 1: ★1(N), 2: ★2(R), 3: ★3(SSR)

/** パーツ個別のガチャ設定 */
export interface GachaPartSetting {
  partId: string;
  /** true の場合「ガチャ限定（未所持ならロック🔒）」、false の場合「初期所持（誰でも着られる）」 */
  isGachaOnly: boolean;
  /** レアリティ: 1 (★1 N) | 2 (★2 R) | 3 (★3 SSR) */
  rarity: GachaRarity;
  /** ピックアップ対象（同レア度内で排出率2.5倍＆バナー表示） */
  isPickup?: boolean;
  /** 交換所での個別必要ジュエル数（未設定時はレア度別標準値） */
  exchangeCost?: number;
}

/** ★3 SSR フルコーデセット（一式まとめて排出枠） */
export interface GachaCoordSet {
  id: string;
  name: string;
  description?: string;
  /** セットに含まれる自作パーツIDのリスト */
  partIds: string[];
  /** ピックアップ対象か */
  isPickup?: boolean;
  /** 交換所での必要スタージュエル数（未設定時は r3Set 標準値） */
  exchangeCost?: number;
  createdAt: number;
}

/** ガチャ全体の運営設定（親モードで自由に変更可能） */
export interface GachaConfig {
  /** バナータイトル（例: 「ロイヤル・ジュエルステージ」） */
  bannerTitle: string;
  /** バナーサブタイトル */
  bannerSubtitle: string;
  /** 1回ガチャのコイン価格（デフォルト: 50） */
  singleCost: number;
  /** 10連ガチャのコイン価格（デフォルト: 450） */
  tenPullCost: number;
  /** 1日1回無料ガチャを有効にするか（デフォルト: true） */
  enableDailyFree: boolean;
  /** レア度別の排出確率（合計100%: デフォルト ★3: 6%, ★2: 34%, ★1: 60%） */
  rarityRates: {
    r3: number;
    r2: number;
    r1: number;
  };
  /** 各レア度内で「アバターパーツ（またはセット）」が選ばれる確率(%)（残りはチケットやコイン等の副賞） */
  avatarWeightPercent: {
    r3: number;
    r2: number;
    r1: number;
  };
  /** 副賞の中で「ショップごほうびチケット」と「コイン＆ジュエル」の比率（チケット側%） */
  ticketSubWeightPercent: number;
  /** 副賞として排出を許可するショップチケットIDリスト */
  enabledShopTicketIds: string[];
  /** 副賞コイン＆ジュエル設定 */
  subPrizeCoins: {
    r3Coins: number;
    r3Shards: number;
    r2Coins: number;
    r2Shards: number;
    r1Coins: number;
    r1Shards: number;
  };
  /** ダブり時の自動変換（補填）設定 */
  duplicateRefund: {
    r3Coins: number;
    r3Shards: number;
    r2Coins: number;
    r2Shards: number;
    r1Coins: number;
    r1Shards: number;
  };
  /** 天井（スタージュエル交換所）の必要ジュエル数 */
  exchangeCosts: {
    r3Set: number;
    r3Part: number;
    r2Part: number;
    r1Part: number;
  };
  /** パーツIDごとのガチャ設定マップ */
  partSettings: Record<string, GachaPartSetting>;
  /** ★3 フルコーデセット（一式排出）リスト */
  coordSets: GachaCoordSet[];
}

export interface NotificationSettings {
  /** チケット使用通知（子ども ➔ 親） */
  ticketUsed: boolean;
  /** お手伝い完了申請通知（子ども ➔ 親） */
  questSubmitted: boolean;
  /** プレゼント・宝箱贈呈通知（親 ➔ 子ども） */
  chestOrBonusGifted: boolean;
  /** お手伝い承認通知（親 ➔ 子ども） */
  questApproved: boolean;
  /** 通知時の効果音を有効にするか */
  soundEnabled: boolean;
  /** ブラウザ通知（Web Notification）を有効にするか */
  browserNotification: boolean;
}

export interface AppState {
  version: number;
  parentPin: string;
  children: Child[];
  quests: Quest[];
  submissions: Submission[];
  chests: Chest[];
  shop: ShopItem[];
  tickets: Ticket[];
  timers: ActiveTimer[];
  notices: Notice[];
  logs: LogEntry[];
  done: DoneRecord[];
  notificationSettings: NotificationSettings;
  /** ガチャ運営設定（ラインナップ・確率・補填・フルコーデセット） */
  gachaConfig: GachaConfig;
  /** 意図的に削除された子どものID（別端末同期時のゾンビ復活防止） */
  deletedChildIds?: string[];
  /** 意図的に削除されたお手伝いのID（別端末同期時のゾンビ復活防止） */
  deletedQuestIds?: string[];
  /** 意図的に削除されたショップ商品のID（別端末同期時のゾンビ復活防止） */
  deletedShopItemIds?: string[];
  /** 最終更新日時タイムスタンプ（ミリ秒） */
  lastUpdatedAt?: number;
}
