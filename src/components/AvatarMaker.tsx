import { useState } from 'react';
import type { AvatarSlot, Child } from '../types';
import { optionsFor, isUnlocked, type AvatarOption, getShardCost, SHARD_COST, findAsset, getTwemojiUrl } from '../avatar';
import { updateAvatar, exchangeStarShards } from '../actions';
import { sound } from '../sound';
import { burst } from '../effects';
import { toast } from './ui';
import { GameAvatar2D } from './Avatar';
import { Lock, Check, Sparkles, Star, ShoppingBag } from 'lucide-react';

export function AvatarMaker({
  child,
  onClose,
  onOpenGacha,
}: {
  child: Child;
  onClose: () => void;
  onOpenGacha?: () => void;
}) {
  const [currentSlot, setCurrentSlot] = useState<AvatarSlot>('hairStyle');
  const [sparkleCount, setSparkleCount] = useState(0);
  const [previewLockedItem, setPreviewLockedItem] = useState<AvatarOption | null>(null);

  const slots: { slot: AvatarSlot; label: string; icon: string }[] = [
    { slot: 'hairStyle', label: 'かみがた', icon: '💇' },
    { slot: 'hairColor', label: 'かみいろ', icon: '🎨' },
    { slot: 'expression', label: 'おかお', icon: '😊' },
    { slot: 'skin', label: 'はだ', icon: '✨' },
    { slot: 'outfit', label: 'おようふく', icon: '👕' },
    { slot: 'accessory', label: 'あたま', icon: '👑' },
    { slot: 'weapon', label: 'もちもの', icon: '🗡️' },
    { slot: 'pet', label: 'ペット', icon: '🐾' },
    { slot: 'bg', label: 'はいけい', icon: '🌈' },
  ];

  const currentOptions = optionsFor(currentSlot);

  // アイテム選択ハンドラー
  const handleSelect = (opt: AvatarOption, locked: boolean) => {
    if (locked) {
      sound.tap();
      setPreviewLockedItem(opt);
      return;
    }
    // 解放済みのアイテムを選択
    setPreviewLockedItem(null);
    sound.pop();
    setSparkleCount((c) => c + 1);
    updateAvatar(child.id, currentSlot, opt.id);
  };

  // ほしのかけらで即時アンロック＆装備
  const handleUnlockWithShards = (opt: AvatarOption) => {
    const cost = getShardCost(opt.rarity);
    if ((child.starShards ?? 0) < cost) {
      sound.error();
      toast('ほしのかけらが たりないよ！', '🌟');
      return;
    }

    sound.fanfare();
    burst();
    const res = exchangeStarShards(child.id, opt.id);
    if (res === 'ok') {
      toast(`「${opt.name}」を アンロックしたよ！🎉`, '✨');
      setSparkleCount((c) => c + 1);
      updateAvatar(child.id, currentSlot, opt.id);
      setPreviewLockedItem(null);
    }
  };

  // 試着中アバター構成（ロックアイテムの試着対応）
  const displayAvatar = previewLockedItem
    ? {
        ...child.avatar,
        [previewLockedItem.slot]: previewLockedItem.id,
      }
    : child.avatar;

  return (
    <div className="flex flex-col gap-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-sm">
            <Sparkles size={18} />
          </span>
          <h3 className="text-xl font-black text-slate-800">
            アバター きせかえ
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* ほしのかけら所持数バッジ */}
          <div className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 border border-amber-300 shadow-sm">
            <span className="text-amber-500">🌟</span>
            <span>{child.starShards ?? 0} こ</span>
          </div>

          <button
            onClick={() => {
              sound.tap();
              onClose();
            }}
            className="btn-pop rounded-xl bg-amber-400 px-4 py-1.5 text-sm font-black text-amber-950 shadow-[0_3px_0_#d97706] hover:bg-amber-300"
          >
            かんりょう！
          </button>
        </div>
      </div>

      {/* 1. モバゲー風 上部アバターステージ */}
      <div className="relative flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-indigo-100/90 via-sky-50 to-amber-50/60 p-4 border-2 border-indigo-200/80 shadow-inner overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/60 via-transparent to-transparent pointer-events-none" />

        <div className="relative flex flex-col items-center">
          <GameAvatar2D
            config={displayAvatar}
            width={200}
            sparkleTrigger={sparkleCount}
            rounded="rounded-3xl shadow-2xl border-4 border-white"
          />
          <div className="w-40 h-4 bg-slate-800/15 rounded-full blur-[2px] -mt-2 mb-1" />
        </div>

        {/* 試着中インジケーター */}
        {previewLockedItem ? (
          <div className="mt-1 flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950 shadow-md animate-pulse">
            <span>👕</span>
            <span>「{previewLockedItem.name}」をおためし試着中！</span>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-indigo-900 shadow-sm backdrop-blur-sm">
            <span>✨</span>
            <span>タップするとジャンプ！ パーツをえらぶとキラッとへんしん！</span>
          </div>
        )}
      </div>

      {/* ロックアイテム試着時のアンロック案内バー（🌟ほしのかけらで解放） */}
      {previewLockedItem && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-3 border-2 border-amber-300 shadow-md animate-popin">
          <div className="flex items-center gap-2 text-left">
            <span className="text-3xl drop-shadow-sm">{previewLockedItem.icon}</span>
            <div>
              <div className="text-xs font-black text-amber-950 flex items-center gap-1">
                <span>{previewLockedItem.name}</span>
                <span className="rounded bg-amber-200 px-1.5 py-0.2 text-[9px] font-bold text-amber-900">
                  {previewLockedItem.rarity ? `★${previewLockedItem.rarity}` : '★1'}
                </span>
              </div>
              <div className="text-[11px] font-bold text-amber-800">
                必要: <span className="font-black text-amber-600">🌟 {getShardCost(previewLockedItem.rarity)}こ</span>
                （いま持っている: {child.starShards ?? 0}こ）
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* かけら足りている場合 */}
            {(child.starShards ?? 0) >= getShardCost(previewLockedItem.rarity) ? (
              <button
                type="button"
                onClick={() => handleUnlockWithShards(previewLockedItem)}
                className="btn-pop flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 px-4 py-2 text-xs font-black text-amber-950 shadow-[0_3px_0_#d97706] hover:bg-amber-300"
              >
                <span>🌟</span>
                <span>ほしのかけらで 解放する！</span>
              </button>
            ) : (
              /* かけら足りない場合：ガチャへ誘導 */
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-rose-600">
                  あと {getShardCost(previewLockedItem.rarity) - (child.starShards ?? 0)}こ！
                </span>
                {onOpenGacha && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.tap();
                      onClose();
                      onOpenGacha();
                    }}
                    className="btn-pop flex items-center gap-1 rounded-xl bg-yellow-400 px-3 py-1.5 text-xs font-black text-amber-950 shadow-[0_2px_0_#d97706]"
                  >
                    <span>🎰</span>
                    <span>ガチャで集める</span>
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setPreviewLockedItem(null)}
              className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
            >
              もどす
            </button>
          </div>
        </div>
      )}

      {/* 2. スロット切り替えタブ */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {slots.map((s) => (
          <button
            key={s.slot}
            onClick={() => {
              sound.tap();
              setCurrentSlot(s.slot);
              setPreviewLockedItem(null);
            }}
            className={`btn-pop flex items-center gap-1.5 shrink-0 rounded-2xl px-3.5 py-2 text-xs font-black transition-all ${
              currentSlot === s.slot
                ? 'bg-indigo-600 text-white shadow-[0_4px_0_#3730a3] scale-105'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* 3. アイテム選択グリッド */}
      <div className="grid grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1 pr-1.5">
        {currentOptions.map((opt) => {
          const unlocked = isUnlocked(opt, child);
          const isSelected = child.avatar[currentSlot] === opt.id;
          const isPreviewing = previewLockedItem?.id === opt.id;
          const cost = getShardCost(opt.rarity);

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt, !unlocked)}
              className={`btn-pop relative flex flex-col items-center justify-between rounded-2xl p-2 border-2 transition-all min-h-[110px] ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50/90 shadow-[0_4px_0_#6366f1] ring-2 ring-indigo-300'
                  : isPreviewing
                  ? 'border-amber-400 bg-amber-50/90 ring-2 ring-amber-300 shadow-[0_4px_0_#d97706]'
                  : unlocked
                  ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                  : 'border-slate-200 bg-slate-100'
              }`}
            >
              {/* 選択中チェックマーク */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm z-10">
                  <Check size={13} strokeWidth={3} />
                </div>
              )}

              {/* 試着中マーク */}
              {isPreviewing && !isSelected && (
                <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm z-10 animate-bounce">
                  <Sparkles size={12} strokeWidth={3} />
                </div>
              )}

              {/* レア度バッジ */}
              {opt.rarity && opt.rarity > 1 && (
                <div
                  className={`absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-black z-10 ${
                    opt.rarity === 3 ? 'bg-amber-400 text-amber-950 shadow-sm ring-1 ring-amber-500' : 'bg-sky-400 text-white shadow-sm'
                  }`}
                >
                  ★{opt.rarity}
                </div>
              )}

              {/* アイテム高精細イラストプレビュー（装備・ペット・衣装・背景は単体イラストを大きく表示） */}
              <div className="flex items-center justify-center my-0.5 w-16 h-16 shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-200/60 shadow-inner">
                {(() => {
                  const asset = findAsset(opt.id);

                  // 1. あたま・ぶき・ペット（Twemoji高精細ベクターイラスト）
                  if (currentSlot === 'accessory' || currentSlot === 'weapon' || currentSlot === 'pet') {
                    if (opt.id === 'acc_none' || opt.id === 'wp_none' || opt.id === 'pet_none') {
                      return <span className="text-2xl text-slate-400 font-black">なし</span>;
                    }
                    if (asset?.twemojiCode) {
                      return (
                        <div className="relative flex items-center justify-center w-full h-full p-2">
                          <img
                            src={getTwemojiUrl(asset.twemojiCode)}
                            alt={opt.name}
                            className="w-12 h-12 object-contain filter drop-shadow"
                          />
                          {asset.subEffectCode && (
                            <img
                              src={getTwemojiUrl(asset.subEffectCode)}
                              alt=""
                              className="absolute top-1 right-1 w-5 h-5 animate-pulse"
                            />
                          )}
                        </div>
                      );
                    }
                  }

                  // 2. おようふく（衣装モチーフ＋テーマカラー）
                  if (currentSlot === 'outfit') {
                    if (asset?.outfitTheme) {
                      return (
                        <div
                          className="flex items-center justify-center w-full h-full p-2 rounded-xl"
                          style={{
                            background: `linear-gradient(135deg, ${asset.outfitTheme.primaryColor}33, ${asset.outfitTheme.secondaryColor}66)`,
                          }}
                        >
                          <img
                            src={getTwemojiUrl(asset.outfitTheme.badgeCode)}
                            alt={opt.name}
                            className="w-11 h-11 object-contain filter drop-shadow"
                          />
                        </div>
                      );
                    }
                  }

                  // 3. はいけい（背景ステージミニチュア）
                  if (currentSlot === 'bg') {
                    if (asset?.stageConfig) {
                      return (
                        <div
                          className="relative flex items-center justify-center w-full h-full rounded-xl overflow-hidden shadow-inner"
                          style={{ background: asset.stageConfig.gradient }}
                        >
                          {asset.stageConfig.particles.slice(0, 2).map((p, pIdx) => (
                            <img
                              key={pIdx}
                              src={getTwemojiUrl(p.code)}
                              alt=""
                              className="absolute w-5 h-5 opacity-90 filter drop-shadow-sm"
                              style={{
                                left: `${pIdx === 0 ? '20%' : '70%'}`,
                                top: `${pIdx === 0 ? '30%' : '60%'}`,
                              }}
                            />
                          ))}
                        </div>
                      );
                    }
                  }

                  // 4. かみがた・かみいろ・おかお・はだ（キャラクター顔ズームプレビュー）
                  return (
                    <GameAvatar2D
                      avatar={{
                        ...child.avatar,
                        [currentSlot]: opt.id,
                      }}
                      previewMode={currentSlot}
                      size={64}
                      interactive={false}
                      rounded="rounded-none"
                      className="w-full h-full object-contain"
                    />
                  );
                })()}
              </div>

              {/* アイテム名 */}
              <span className="mt-1 text-[11px] font-black text-slate-700 text-center leading-tight line-clamp-2 w-full">
                {opt.name}
              </span>

              {/* 未解放時のロック・星のかけら解放バッジ */}
              {!unlocked && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-slate-900/60 text-white p-1 backdrop-blur-[1px]">
                  <Lock size={16} className="mb-0.5 text-amber-300" />
                  <span className="text-[10px] font-bold text-center leading-tight">
                    {opt.gachaOnly ? 'ガチャ' : 'ショップ'}
                  </span>
                  <span className="mt-1 rounded-full bg-amber-400/90 text-amber-950 px-2 py-0.5 text-[9px] font-black shadow-sm flex items-center gap-0.5">
                    <span>🌟</span>
                    <span>{cost}こ</span>
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
