import { useState, useEffect } from 'react';
import type { AppState, Child } from '../types';
import { Avatar } from '../components/Avatar';
import { AvatarMaker } from '../components/AvatarMaker';
import { ChestModal } from '../components/ChestModal';
import { GachaModal } from '../components/GachaModal';
import { KidQuests } from '../components/KidQuests';
import { KidShop } from '../components/KidShop';
import { KidTicketsTimer } from '../components/KidTicketsTimer';
import { KidNotices } from '../components/KidNotices';
import { Modal } from '../components/ui';
import { getRank, displayStreak, themeOf } from '../logic';
import { sound } from '../sound';
import { burst } from '../effects';
import { claimDailyLoginBonus } from '../actions';
import { Sparkles, Shirt, Award, Flame, Coins, Gift, Smartphone, Check } from 'lucide-react';

export function KidView({
  child,
  state,
}: {
  child: Child;
  state: AppState;
}) {
  const [activeTab, setActiveTab] = useState<'quests' | 'shop' | 'tickets'>('quests');
  const [showAvatarMaker, setShowAvatarMaker] = useState(false);
  const [showGacha, setShowGacha] = useState(false);
  const [showChestModal, setShowChestModal] = useState(true);
  const [showDailyBonusModal, setShowDailyBonusModal] = useState(false);

  // 対象の子どものデータ最新版
  const currentChild = state.children.find((c) => c.id === child.id) ?? child;

  // ログイン時に毎日ログインボーナス（タブレット1時間券）を判定・付与
  useEffect(() => {
    const isNewClaim = claimDailyLoginBonus(currentChild.id);
    if (isNewClaim) {
      sound.fanfare();
      burst();
      setShowDailyBonusModal(true);
    }
  }, [currentChild.id]);
  const myChests = state.chests.filter((c) => c.childId === currentChild.id);
  const rank = getRank(currentChild.totalQuests);
  const streak = displayStreak(currentChild);

  const tabs: { key: 'quests' | 'shop' | 'tickets'; label: string; icon: string; count?: number }[] = [
    {
      key: 'quests',
      label: 'おてつだい',
      icon: '⚔️',
      count: state.quests.filter((q) => q.assignedTo.includes(currentChild.id)).length,
    },
    {
      key: 'shop',
      label: 'ごほうびショップ',
      icon: '🏪',
    },
    {
      key: 'tickets',
      label: 'もちもの＆じかん',
      icon: '🎟️',
      count: state.tickets.filter((t) => t.childId === currentChild.id && t.status === 'owned').length,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 pb-20">
      {/* 画面中央にドーン！と出るサプライズ宝箱通知 */}
      {myChests.length > 0 && showChestModal && (
        <ChestModal
          chests={myChests}
          currentCoins={currentChild.coins}
          onClose={() => setShowChestModal(false)}
        />
      )}

      {/* マイページ ヘッダーカード */}
      <div
        className={`card relative overflow-hidden bg-gradient-to-r ${themeOf(
          currentChild.color
        )} p-5 sm:p-6 text-white shadow-lg border-4 border-white mb-6`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* アバター＆きせかえボタン */}
          <div className="relative group">
            <button
              onClick={() => {
                sound.tap();
                setShowAvatarMaker(true);
              }}
              className="btn-pop block"
              title="きせかえをする"
            >
              <Avatar
                config={currentChild.avatar}
                size={110}
                rounded="rounded-3xl shadow-xl border-4 border-white"
              />
              <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-slate-900 shadow-md">
                <Shirt size={16} />
              </span>
            </button>
          </div>

          {/* 子ども情報ステータス */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl sm:text-3xl font-black drop-shadow-sm">
                {currentChild.name}
              </h2>
              <span className="rounded-full bg-white/30 px-3 py-0.5 text-xs font-black backdrop-blur-sm">
                {currentChild.age}さい
              </span>
            </div>

            {/* ランク称号 */}
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-2xl bg-black/20 px-3 py-1 text-xs font-black backdrop-blur-sm">
              <Award size={16} className="text-yellow-300" />
              <span>しょうごう：{rank.name}</span>
            </div>

            {/* コイン・連続達成メーター */}
            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <div className="flex items-center gap-1.5 rounded-2xl bg-white/95 px-3.5 py-1.5 font-black text-amber-800 shadow-sm">
                <span className="text-xl">🪙</span>
                <span className="text-xl sm:text-2xl text-amber-600">
                  {currentChild.coins}
                </span>
                <span className="text-xs text-amber-900">コイン</span>
              </div>

              <div className="flex items-center gap-1 rounded-2xl bg-white/95 px-3 py-1.5 font-black text-rose-600 shadow-sm">
                <Flame size={18} className="text-rose-500" />
                <span className="text-base sm:text-lg">{streak}日</span>
                <span className="text-xs text-slate-500">れんぞく！</span>
              </div>

              {/* ガチャショートカットボタン */}
              <button
                onClick={() => {
                  sound.tap();
                  setShowGacha(true);
                }}
                className="btn-pop flex items-center gap-1 rounded-2xl bg-yellow-400 px-3 py-1.5 font-black text-amber-950 shadow-sm"
              >
                <span>🎰</span>
                <span className="text-xs">ガチャ！</span>
              </button>
            </div>
          </div>
        </div>

        {/* 未受け取り宝箱がある場合のお知らせバナー */}
        {myChests.length > 0 && !showChestModal && (
          <button
            onClick={() => {
              sound.tap();
              setShowChestModal(true);
            }}
            className="btn-pop mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-2.5 font-black text-amber-950 shadow-md animate-bounce"
          >
            <Gift size={20} />
            <span>まだ あけていない たからばこが {myChests.length}こ あるよ！タップしてあけよう！</span>
          </button>
        )}
      </div>

      {/* 親からの連絡・差し戻し通知 */}
      <div className="mb-5">
        <KidNotices notices={state.notices} childId={currentChild.id} />
      </div>

      {/* タブ切り替えボタン */}
      <div className="flex gap-2 sm:gap-3 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              sound.tap();
              setActiveTab(tab.key);
            }}
            className={`btn-pop flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-2xl sm:rounded-3xl py-3 px-2 text-center font-black transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-[0_5px_0_#c2410c]'
                : 'bg-white text-slate-600 hover:bg-slate-100 shadow-[0_4px_0_#cbd5e1] border border-slate-200'
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
            <span className="text-xs sm:text-base">{tab.label}</span>
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span
                className={`hidden sm:inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                  activeTab === tab.key ? 'bg-white text-amber-700' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div>
        {activeTab === 'quests' && (
          <KidQuests
            child={currentChild}
            quests={state.quests}
            submissions={state.submissions}
            doneRecords={state.done}
          />
        )}

        {activeTab === 'shop' && (
          <KidShop
            child={currentChild}
            shopItems={state.shop}
            onOpenGacha={() => setShowGacha(true)}
          />
        )}

        {activeTab === 'tickets' && (
          <KidTicketsTimer
            child={currentChild}
            tickets={state.tickets}
            activeTimers={state.timers}
          />
        )}
      </div>

      {/* アバター着せ替えモーダル */}
      <Modal
        open={showAvatarMaker}
        onClose={() => setShowAvatarMaker(false)}
        className="max-w-md"
      >
        <AvatarMaker
          child={currentChild}
          onClose={() => setShowAvatarMaker(false)}
        />
      </Modal>

      {/* ガチャモーダル */}
      <Modal
        open={showGacha}
        onClose={() => setShowGacha(false)}
        className="max-w-md"
      >
        <GachaModal
          child={currentChild}
          onClose={() => setShowGacha(false)}
        />
      </Modal>

      {/* まいにちログインボーナスモーダル */}
      <Modal
        open={showDailyBonusModal}
        onClose={() => setShowDailyBonusModal(false)}
        className="max-w-sm"
      >
        <div className="flex flex-col items-center p-2 sm:p-4 text-center">
          <div className="relative mb-3">
            <span className="text-6xl animate-bounce inline-block">🎁</span>
            <span className="absolute -top-1 -right-2 text-2xl animate-spin">✨</span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 mb-2">
            <Sparkles size={14} className="text-amber-600" />
            <span>まいにち ログインボーナス！</span>
          </span>

          <h3 className="text-2xl font-black text-slate-800">
            きょうのチケットが とどいたよ！
          </h3>

          <div className="my-4 flex w-full flex-col items-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 border-2 border-amber-300 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-4xl">📱</span>
              <div className="text-left">
                <div className="text-base font-black text-amber-950">
                  【まいにち】タブレット1時間券
                </div>
                <div className="text-xs font-bold text-amber-700">
                  たっぷり 60ぷん つかえるよ！
                </div>
              </div>
            </div>
            <div className="mt-3 w-full border-t border-amber-200/70 pt-2 text-[11px] font-bold text-slate-500">
              ※まいにち 1まい限定（つかわなかった分は たまらないよ）
            </div>
          </div>

          <button
            onClick={() => {
              sound.tap();
              setShowDailyBonusModal(false);
            }}
            className="btn-pop w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 py-3.5 text-base font-black text-white shadow-[0_4px_0_#c2410c] active:translate-y-1 active:shadow-none"
          >
            やったー！うけとる！✨
          </button>
        </div>
      </Modal>
    </div>
  );
}
