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
}

export interface ActiveTimer {
  childId: string;
  ticketId: string;
  name: string;
  minutes: number;
  startedAt: number;
  endsAt: number;
  alarmed: boolean;
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
}
