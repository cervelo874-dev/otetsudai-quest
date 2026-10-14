import { useState } from 'react';
import type { AvatarSlot, Child } from '../types';
import { optionsFor, isUnlocked } from '../avatar';
import { updateAvatar } from '../actions';
import { sound } from '../sound';
import { GameAvatar2D } from './Avatar';
import { Lock, Check, Sparkles } from 'lucide-react';

export function AvatarMaker({
  child,
  onClose,
}: {
  child: Child;
  onClose: () => void;
}) {
  const [currentSlot, setCurrentSlot] = useState<AvatarSlot>('hairStyle');
  const [sparkleCount, setSparkleCount] = useState(0);

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

  const handleSelect = (id: string, locked: boolean) => {
    if (locked) {
      sound.error();
      return;
    }
    sound.pop();
    setSparkleCount((c) => c + 1);
    updateAvatar(child.id, currentSlot, id);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-sm">
            <Sparkles size={18} />
          </span>
          <span>アバター きせかえ</span>
        </h3>
        <button
          onClick={() => {
            sound.tap();
            onClose();
          }}
          className="btn-pop rounded-xl bg-amber-400 px-5 py-2 text-sm font-black text-amber-950 shadow-[0_3px_0_#d97706] hover:bg-amber-300"
        >
          かんりょう！
        </button>
      </div>

      {/* 1. モバゲー風 上部アバターステージ */}
      <div className="relative flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-indigo-100/90 via-sky-50 to-amber-50/60 p-4 border-2 border-indigo-200/80 shadow-inner overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/60 via-transparent to-transparent pointer-events-none" />

        <div className="relative flex flex-col items-center">
          <GameAvatar2D
            config={child.avatar}
            width={200}
            sparkleTrigger={sparkleCount}
            rounded="rounded-3xl shadow-2xl border-4 border-white"
          />
          <div className="w-40 h-4 bg-slate-800/15 rounded-full blur-[2px] -mt-2 mb-1" />
        </div>

        <div className="mt-1 flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-indigo-900 shadow-sm backdrop-blur-sm">
          <span>✨</span>
          <span>タップするとジャンプ！ パーツをえらぶとキラッとへんしん！</span>
        </div>
      </div>

      {/* 2. スロット切り替えタブ */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {slots.map((s) => (
          <button
            key={s.slot}
            onClick={() => {
              sound.tap();
              setCurrentSlot(s.slot);
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

      {/* 3. アイテム選択グリッド：dangerouslySetInnerHTMLを完全廃止し、GameAvatar2Dによる試着ライブプレビューを描画 */}
      <div className="grid grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1 pr-1.5">
        {currentOptions.map((opt) => {
          const unlocked = isUnlocked(opt, child);
          const isSelected = child.avatar[currentSlot] === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id, !unlocked)}
              className={`btn-pop relative flex flex-col items-center justify-between rounded-2xl p-2 border-2 transition-all min-h-[110px] ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50/90 shadow-[0_4px_0_#6366f1] ring-2 ring-indigo-300'
                  : unlocked
                    ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                    : 'border-slate-200 bg-slate-100 opacity-60'
              }`}
            >
              {/* 選択中チェックマーク */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm z-10">
                  <Check size={13} strokeWidth={3} />
                </div>
              )}

              {/* レア度バッジ (タイポ py-0.2 を py-0.5 に修正) */}
              {opt.rarity && opt.rarity > 1 && (
                <div
                  className={`absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-black z-10 ${
                    opt.rarity === 3 ? 'bg-amber-400 text-amber-950 shadow-sm ring-1 ring-amber-500' : 'bg-sky-400 text-white shadow-sm'
                  }`}
                >
                  ★{opt.rarity}
                </div>
              )}

              {/* 試着ライブプレビュー（顔ズーム／全体自動切り替え） */}
              <div className="flex items-center justify-center my-0.5 w-16 h-16 shrink-0 overflow-hidden rounded-xl bg-slate-50 border border-slate-200/60 shadow-inner">
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
              </div>

              {/* アイテム名 (truncateを廃止し、line-clamp-2で長いひらがなも綺麗に改行表示) */}
              <span className="mt-1 text-[11px] font-black text-slate-700 text-center leading-tight line-clamp-2 w-full">
                {opt.name}
              </span>

              {/* 未解放時のロック表示 (z-index を z-20 にしてバッジやチェックマークの上に被せる) */}
              {!unlocked && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-slate-900/55 text-white p-1 backdrop-blur-[1px]">
                  <Lock size={18} className="mb-0.5 text-amber-300" />
                  <span className="text-[10px] font-bold text-center leading-tight">
                    {opt.gachaOnly ? 'ガチャげんてい' : 'ショップでゲット'}
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
