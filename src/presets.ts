import type { AppState, AvatarConfig, Child, NotificationSettings, Quest, ShopItem } from './types';
import { yesterdayKey } from './utils';

export const STATE_VERSION = 3; // バージョン3: 2D RPGアバター合成レイヤー＆ガチャ確率・ダブり救済システム対応

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
    { id: 'q-shoes', title: 'くつを そろえる', icon: '👟', reward: 30, assignedTo: ['c-imouto', 'c-niito'], rewardOverrides: {} },
    { id: 'q-toys', title: 'おもちゃを かたづける', icon: '🧸', reward: 40, assignedTo: ['c-imouto', 'c-niito', 'c-nene'], rewardOverrides: {} },
    { id: 'q-dishes', title: 'おさらを はこぶ', icon: '🍽️', reward: 50, assignedTo: ['c-niito', 'c-nene'], rewardOverrides: {} },
    { id: 'q-laundry', title: 'せんたくものを たたむ', icon: '👕', reward: 80, assignedTo: ['c-nene'], rewardOverrides: {} },
    { id: 'q-teeth', title: 'はみがき・ねんねの じゅんび', icon: '🪥', reward: 50, assignedTo: ['c-imouto', 'c-niito', 'c-nene'], rewardOverrides: {} },
  ];

  const tab = (id: string, name: string, icon: string, price: number, minutes: number): ShopItem => ({
    id, name, icon, price, category: 'tablet', minutes, avatarItemId: null,
  });
  const real = (id: string, name: string, icon: string, price: number): ShopItem => ({
    id, name, icon, price, category: 'real', minutes: 0, avatarItemId: null,
  });
  const av = (id: string, name: string, icon: string, price: number, avatarItemId: string): ShopItem => ({
    id, name, icon, price, category: 'avatar', minutes: 0, avatarItemId,
  });

  const shop: ShopItem[] = [
    tab('sh-tab10', 'タブレット ちょい足し10ぷん券', '⏱️', 35, 10),
    tab('sh-tab15', 'タブレット 15ふん チケット', '⏱️', 50, 15),
    tab('sh-tab30', 'タブレット 30ぷん チケット', '📱', 90, 30),
    real('sh-snack', 'おやつ 1こ ついかチケット', '🍪', 60),
    real('sh-snack-up', 'おやつ グレードアップ券', '🍰', 70),
    real('sh-book', 'ねるまえ えほん もう1さつ券', '📖', 40),
    real('sh-juice', 'すきな ジュース チケット', '🧃', 80),
    real('sh-dinner', '★3 ばんごはん リクエスト券', '🍛', 250),
    real('sh-outing', 'おでかけ リクエストけん', '🎡', 300),
    av('sh-crown', 'おうかん', '👑', 120, 'crown'),
    av('sh-wizard', 'まほうつかいの ぼうし', '🧙', 150, 'wizard'),
    av('sh-sunglasses', 'サングラス', '🕶️', 80, 'sunglasses'),
    av('sh-dino', 'きょうりゅう パーカー', '🦖', 200, 'dino'),
    av('sh-princess', 'プリンセス ドレス', '👗', 200, 'princess'),
    av('sh-knight', 'ゆうしゃの よろい', '🛡️', 180, 'knight'),
    av('sh-shiba', 'あいぼう しばいぬ', '🐕', 180, 'shiba'),
    av('sh-dragon', 'あいぼう ドラゴン', '🐉', 250, 'dragon'),
    av('sh-penguin', 'あいぼう ペンギン', '🐧', 180, 'penguin'),
    av('sh-kirakira', 'キラキラ はいけい', '✨', 150, 'kirakira'),
    av('sh-space', 'うちゅう はいけい', '🪐', 120, 'space'),
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
  };
}
