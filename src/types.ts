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
  /** 意図的に削除された子どものID（別端末同期時のゾンビ復活防止） */
  deletedChildIds?: string[];
  /** 意図的に削除されたお手伝いのID（別端末同期時のゾンビ復活防止） */
  deletedQuestIds?: string[];
  /** 意図的に削除されたショップ商品のID（別端末同期時のゾンビ復活防止） */
  deletedShopItemIds?: string[];
  /** 最終更新日時タイムスタンプ（ミリ秒） */
  lastUpdatedAt?: number;
}
