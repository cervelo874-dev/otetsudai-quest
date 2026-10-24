import type { AppState, AvatarConfig, Child, GachaConfig, NotificationSettings, Quest, ShopItem } from './types';
import { yesterdayKey } from './utils';

export const STATE_VERSION = 3; // バージョン3: 2D RPGアバター合成レイヤー＆ガチャ確率・ダブり救済システム対応

export const DEFAULT_GACHA_CONFIG: GachaConfig = {
  bannerTitle: 'ロイヤル・ジュエルステージ',
  bannerSubtitle: '特別なドレス・コーデセット＆ごほうびを手に入れよう！',
  singleCost: 50,
  tenPullCost: 450,
  enableDailyFree: true,
  rarityRates: {
    r3: 6,
    r2: 34,
    r1: 60,
  },
  avatarWeightPercent: {
    r3: 85,
    r2: 80,
    r1: 65,
  },
  ticketSubWeightPercent: 45,
  enabledShopTicketIds: [
    'sh-tab10',
    'sh-tab15',
    'sh-snack',
    'sh-snack-up',
    'sh-book',
    'sh-dinner',
    'sh-outing',
  ],
  subPrizeCoins: {
    r3Coins: 50,
    r3Shards: 4,
    r2Coins: 20,
    r2Shards: 2,
    r1Coins: 15,
    r1Shards: 1,
  },
  duplicateRefund: {
    r3Coins: 35,
    r3Shards: 3,
    r2Coins: 15,
    r2Shards: 2,
    r1Coins: 10,
    r1Shards: 1,
  },
  exchangeCosts: {
    r3Set: 25,
    r3Part: 15,
    r2Part: 8,
    r1Part: 4,
  },
  partSettings: {},
  coordSets: [],
};

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: 's1',
  hairStyle: 'short',
  hairColor: 'brown',
  expression: 'girl_smile',
  outfit: 'overall',
  accessory: 'acc_none',
  weapon: 'wp_none',
  pet: 'pet_none',
  bg: 'sky',
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  ticketUsed: true,
  questSubmitted: true,
  chestOrBonusGifted: true,
  questApproved: true,
  soundEnabled: true,
  browserNotification: false,
};

export const DEFAULT_CHILD_PROPS: Omit<Child, 'id' | 'name'> = {
  age: 6,
  pin: '1234',
  coins: 50,
  streak: 0,
  lastDoneDate: null,
  totalQuests: 0,
  avatar: DEFAULT_AVATAR,
  ownedItems: [],
  lastFreeGacha: null,
  color: 'sky',
  allowQuickLogin: true,
  starShards: 0,
};

export function createInitialState(): AppState {
  const y = yesterdayKey();

  const children: Child[] = [
    {
      id: 'c-nene',
      name: 'ねえね',
      age: 7,
      pin: '1111',
      coins: 150,
      streak: 3,
      lastDoneDate: y,
      totalQuests: 32,
      ownedItems: [],
      lastFreeGacha: null,
      color: 'pink',
      allowQuickLogin: true,
      starShards: 3,
      avatar: {
        skin: 's1',
        hairStyle: 'long',
        hairColor: 'brown',
        expression: 'girl_smile',
        outfit: 'overall',
        accessory: 'ribbon',
        weapon: 'wp_none',
        pet: 'pet_none',
        bg: 'sunset',
      },
    },
    {
      id: 'c-niito',
      name: 'にいにと',
      age: 5,
      pin: '2222',
      coins: 100,
      streak: 2,
      lastDoneDate: y,
      totalQuests: 12,
      ownedItems: [],
      lastFreeGacha: null,
      color: 'sky',
      allowQuickLogin: true,
      starShards: 2,
      avatar: {
        skin: 's2',
        hairStyle: 'spiky',
        hairColor: 'brown',
        expression: 'boy_grin',
        outfit: 'tee_blue',
        accessory: 'acc_none',
        weapon: 'wp_none',
        pet: 'pet_none',
        bg: 'sky',
      },
    },
    {
      id: 'c-imouto',
      name: 'いもうと',
      age: 3,
      pin: '3333',
      coins: 80,
      streak: 1,
      lastDoneDate: y,
      totalQuests: 3,
      ownedItems: [],
      lastFreeGacha: null,
      color: 'lime',
      starShards: 1,
      avatar: {
        skin: 's1',
        hairStyle: 'twintails',
        hairColor: 'brown',
        expression: 'wink_star',
        outfit: 'tee_red',
        accessory: 'acc_none',
        weapon: 'wp_none',
        pet: 'pet_none',
        bg: 'meadow',
      },
    },
  ];

  const quests: Quest[] = [
    { id: 'q-shoes', title: 'くつを そろえる', icon: 'quest_shoes', reward: 30, assignedTo: ['c-imouto', 'c-niito'], rewardOverrides: {} },
    { id: 'q-toys', title: 'おもちゃを かたづける', icon: 'quest_toys', reward: 40, assignedTo: ['c-imouto', 'c-niito', 'c-nene'], rewardOverrides: {} },
    { id: 'q-dishes', title: 'おさらを はこぶ', icon: 'quest_dishes', reward: 50, assignedTo: ['c-niito', 'c-nene'], rewardOverrides: {} },
    { id: 'q-laundry', title: 'せんたくものを たたむ', icon: 'quest_laundry', reward: 80, assignedTo: ['c-nene'], rewardOverrides: {} },
    { id: 'q-teeth', title: 'はみがき・ねんねの じゅんび', icon: 'quest_teeth', reward: 50, assignedTo: ['c-imouto', 'c-niito', 'c-nene'], rewardOverrides: {} },
    { id: 'q-bath', title: 'おふろそうじを する', icon: 'quest_bath', reward: 70, assignedTo: ['c-nene'], rewardOverrides: {} },
    { id: 'q-study', title: 'しゅくだい・おべんきょう', icon: 'quest_study', reward: 60, assignedTo: ['c-nene'], rewardOverrides: {} },
  ];

  const tab = (id: string, name: string, icon: string, price: number, minutes: number): ShopItem => ({
    id, name, icon, price, category: 'tablet', minutes, avatarItemId: null,
  });
  const real = (id: string, name: string, icon: string, price: number): ShopItem => ({
    id, name, icon, price, category: 'real', minutes: 0, avatarItemId: null,
  });

  const shop: ShopItem[] = [
    tab('sh-tab10', 'タブレット ちょい足し10ぷん券', 'ticket_tab_plus', 35, 10),
    tab('sh-tab15', 'タブレット 15ふん チケット', 'ticket_tab_std', 50, 15),
    tab('sh-tab30', 'タブレット 30ぷん チケット', 'ticket_tab_std', 90, 30),
    real('sh-snack', 'おやつ 1こ ついかチケット', 'reward_cookie', 60),
    real('sh-snack-up', 'おやつ グレードアップ券', 'reward_cake', 70),
    real('sh-book', 'ねるまえ えほん もう1さつ券', 'reward_book', 40),
    real('sh-juice', 'すきな ジュース チケット', 'reward_juice', 80),
    real('sh-dinner', '★3 ばんごはん リクエスト券', 'reward_dinner', 250),
    real('sh-outing', 'おでかけ リクエストけん', 'reward_outing', 300),
  ];

  return {
    version: STATE_VERSION,
    parentPin: '0000',
    children,
    quests,
    submissions: [],
    chests: [],
    shop,
    tickets: [],
    timers: [],
    notices: [],
    logs: [{ id: 'log-init', icon: '🏰', text: 'ごほうびタウンへ ようこそ！初期データを読み込みました', at: Date.now() }],
    done: [],
    notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
    gachaConfig: {
      ...DEFAULT_GACHA_CONFIG,
      rarityRates: { ...DEFAULT_GACHA_CONFIG.rarityRates },
      avatarWeightPercent: { ...DEFAULT_GACHA_CONFIG.avatarWeightPercent },
      enabledShopTicketIds: [...DEFAULT_GACHA_CONFIG.enabledShopTicketIds],
      subPrizeCoins: { ...DEFAULT_GACHA_CONFIG.subPrizeCoins },
      duplicateRefund: { ...DEFAULT_GACHA_CONFIG.duplicateRefund },
      exchangeCosts: { ...DEFAULT_GACHA_CONFIG.exchangeCosts },
      partSettings: {},
      coordSets: [],
    },
    deletedChildIds: [],
    deletedQuestIds: [],
    deletedShopItemIds: [],
    lastUpdatedAt: Date.now(),
  };
}
