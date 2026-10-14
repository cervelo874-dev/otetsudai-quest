import { useState } from 'react';
import type { Child, ShopCategory, ShopItem } from '../types';
import { buyItem } from '../actions';
import { sound } from '../sound';
import { toast } from './ui';
import { burst } from '../effects';
import { CATEGORY_LABEL } from '../logic';
import { Check, ShoppingCart, Sparkles } from 'lucide-react';

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

  const filteredItems = filter === 'all'
    ? shopItems
    : shopItems.filter((i) => i.category === filter);

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

  const categories: { key: ShopCategory | 'all'; label: string; icon: string }[] = [
    { key: 'all', label: 'ぜんぶ', icon: '🌟' },
    { key: 'tablet', label: CATEGORY_LABEL.tablet.kid, icon: CATEGORY_LABEL.tablet.icon },
    { key: 'real', label: CATEGORY_LABEL.real.kid, icon: CATEGORY_LABEL.real.icon },
    { key: 'avatar', label: CATEGORY_LABEL.avatar.kid, icon: CATEGORY_LABEL.avatar.icon },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ガチャバナー */}
      <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-pink-400 via-rose-400 to-amber-400 p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/30 text-3xl shadow-inner">
            🎰
          </span>
          <div>
            <div className="text-lg font-black">ごほうびガチャ</div>
            <div className="text-xs font-bold text-pink-100">
              1にち1かい むりょう！レアアイテムが あたるかも！？
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            sound.tap();
            onOpenGacha();
          }}
          className="btn-pop rounded-2xl bg-white px-4 py-2 text-sm font-black text-rose-600 shadow-[0_4px_0_#fda4af]"
        >
          まわす！✨
        </button>
      </div>

      {/* カテゴリ切り替え */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              sound.tap();
              setFilter(c.key);
            }}
            className={`btn-pop flex items-center gap-1.5 shrink-0 rounded-2xl px-4 py-2 text-sm font-black transition-all ${
              filter === c.key
                ? 'bg-amber-500 text-white shadow-[0_4px_0_#b45309]'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>{c.icon}</span>
            <span>{c.label}</span>
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

          return (
            <div
              key={item.id}
              className="card flex flex-col justify-between p-4 border-2 border-slate-100 hover:border-amber-200"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-3xl shadow-inner border border-amber-100">
                  {item.icon}
                </span>
                <div className="flex flex-col">
                  <span className="text-base font-black text-slate-800">
                    {item.name}
                  </span>
                  <div className="mt-1 flex items-center gap-1 text-sm font-black text-amber-600">
                    <span>🪙</span>
                    <span>{item.price} コイン</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-100 flex justify-end">
                {isOwnedAvatar ? (
                  <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-500">
                    <Check size={16} />
                    <span>もっているよ</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={!canAfford}
                    className={`btn-pop flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-black shadow-md ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-[0_3px_0_#c2410c] active:shadow-none'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <ShoppingCart size={16} />
                    <span>{canAfford ? 'かう！' : 'コイン不足'}</span>
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
