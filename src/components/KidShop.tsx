import { useState } from 'react';
import type { Child, ShopCategory, ShopItem } from '../types';
import { buyItem } from '../actions';
import { sound } from '../sound';
import { toast } from './ui';
import { burst } from '../effects';
import { CATEGORY_LABEL } from '../logic';
import { GachaIcon } from './GachaIcons';
import { KidIcon, SmartTicketIcon, type KidIconKey } from './KidIcons';
import { Check, ShoppingCart } from 'lucide-react';

export function KidShop({
  child,
  shopItems,
  onOpenGacha,
}: {
  child: Child;
  shopItems: ShopItem[];
  onOpenGacha: () => void;
}) {
  const [filter, setFilter] = useState<ShopCategory | 'all'>('all');

  const nonAvatarItems = shopItems.filter((i) => i.category !== 'avatar');
  const filteredItems = filter === 'all'
    ? nonAvatarItems
    : nonAvatarItems.filter((i) => i.category === filter);

  const handleBuy = (item: ShopItem) => {
    const res = buyItem(child.id, item.id);
    if (res === 'ok') {
      sound.coin();
      burst();
      toast(`「${item.name}」を かったよ！`, item.icon);
    } else if (res === 'nocoins') {
      sound.error();
      toast('コインが たりないよ！', '🪙');
    } else if (res === 'owned') {
      sound.tap();
      toast('もう もっているよ！', '✨');
    }
  };

  const categories: { key: ShopCategory | 'all'; label: string; iconKey: KidIconKey }[] = [
    { key: 'all', label: 'ぜんぶ', iconKey: 'tab_shop' },
    { key: 'tablet', label: CATEGORY_LABEL.tablet.kid, iconKey: 'ticket_tab_std' },
    { key: 'real', label: CATEGORY_LABEL.real.kid, iconKey: 'reward_cookie' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ジュエルガチャバナー（スマホで潰れないレスポンシブ配置） */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-indigo-950 via-purple-900 to-pink-900 p-4 text-white shadow-md border-2 border-amber-300/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-black/35 border border-amber-300/40 p-1 shadow-inner">
            <GachaIcon type="box_closed" size={44} />
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-black text-amber-200 truncate">
              ドリームジュエルガチャ
            </div>
            <div className="text-xs font-bold text-indigo-100 line-clamp-1">
              黄金のカギで宝石箱をあけて限定コーデ＆ごほうびをゲット！
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            sound.tap();
            onOpenGacha();
          }}
          className="btn-pop shrink-0 rounded-2xl bg-gradient-to-r from-amber-300 via-pink-300 to-cyan-300 px-5 py-2.5 text-sm font-black text-slate-950 shadow-[0_4px_0_#b45309] hover:brightness-105 text-center whitespace-nowrap active:translate-y-1 active:shadow-none"
        >
          ガチャへ！✨
        </button>
      </div>

      {/* カテゴリ切り替え（あつ森風ピル型タブ） */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              sound.tap();
              setFilter(c.key);
            }}
            className={`btn-pop flex items-center gap-1.5 shrink-0 rounded-2xl px-4 py-2 text-xs sm:text-sm font-black transition-all ${
              filter === c.key
                ? 'bg-amber-500 text-white shadow-[0_3px_0_#b45309]'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <KidIcon iconKey={c.iconKey} size={22} />
            <span className="whitespace-nowrap">{c.label}</span>
          </button>
        ))}
      </div>

      {/* 商品グリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredItems.map((item) => {
          const isOwnedAvatar =
            item.category === 'avatar' &&
            item.avatarItemId &&
            child.ownedItems.includes(item.avatarItemId);
          const canAfford = child.coins >= item.price;
          const neededCoins = item.price - child.coins;

          return (
            <div
              key={item.id}
              className="card flex flex-col justify-between p-4 border-2 border-slate-100 hover:border-amber-200 shadow-sm"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-15 w-15 shrink-0 items-center justify-center rounded-2xl bg-amber-50/80 shadow-inner border border-amber-100 p-1">
                  <SmartTicketIcon item={item} size={48} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-base font-black text-slate-800 break-words leading-tight">
                    {item.name}
                  </span>
                  <div className="mt-1.5 flex items-center gap-1 text-sm font-black text-amber-600">
                    <KidIcon iconKey="ui_coin" size={18} />
                    <span>{item.price} コイン</span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-400 font-bold">
                  {item.category === 'tablet' && `💻 ${item.minutes}ぷん`}
                  {item.category === 'real' && '🎁 おてわたし'}
                  {item.category === 'avatar' && '👕 きせかえ'}
                </div>

                {isOwnedAvatar ? (
                  <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-black text-slate-500">
                    <Check size={15} />
                    <span className="whitespace-nowrap">もっているよ</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={!canAfford}
                    className={`btn-pop flex items-center gap-1.5 rounded-xl px-4 sm:px-5 py-2 text-xs sm:text-sm font-black transition ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-[0_3px_0_#c2410c] active:translate-y-0.5 active:shadow-none'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <ShoppingCart size={15} />
                    <span className="whitespace-nowrap">
                      {canAfford ? 'かう！' : `あと${neededCoins}🪙`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
