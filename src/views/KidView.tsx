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
import { GachaIcon } from '../components/GachaIcons';
import { KidIcon, SmartTicketIcon, type KidIconKey } from '../components/KidIcons';
import { claimDailyLoginBonus, canFreeGacha } from '../actions';
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
  const [gachaTab, setGachaTab] = useState<'spin' | 'exchange'>('spin');
  const [showChestModal, setShowChestModal] = useState(true);
  const [showDailyBonusModal, setShowDailyBonusModal] = useState(false);

  // 対象の子どものデータ最新版
  const currentChild = state.children.find((c) => c.id === child.id) ?? child;
  const isFreeGacha = canFreeGacha(currentChild);

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

  const tabs: {
    key: 'quests' | 'shop' | 'tickets';
    label: string;
    shortLabel: string;
    iconKey: KidIconKey;
    count?: number;
  }[] = [
    {
      key: 'quests',
      label: 'おてつだい',
      shortLabel: 'おてつだい',
      iconKey: 'tab_quests',
      count: state.quests.filter((q) => q.assignedTo.includes(currentChild.id)).length,
    },
    {
      key: 'shop',
      label: 'ごほうびショップ',
      shortLabel: 'ショップ',
      iconKey: 'tab_shop',
    },
    {
      key: 'tickets',
      label: 'もちもの＆じかん',
      shortLabel: 'もちもの',
      iconKey: 'tab_tickets',
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

      {/* マイページ ヘッダーカード（スマホでの縦伸びを解消し、スマートな2段レイアウトへ最適化） */}
      <div
        className={`card relative overflow-hidden bg-gradient-to-r ${themeOf(
          currentChild.color
        )} p-4 sm:p-6 text-white shadow-lg border-4 border-white mb-5 sm:mb-6`}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
          {/* 上段（スマホ時）: アバター ＆ 名前・称号 ＆ ガチャマシン */}
          <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-6 w-full sm:w-auto">
            {/* アバター＆きせかえボタン */}
            <div className="relative group shrink-0">
              <button
                onClick={() => {
                  sound.tap();
                  setShowAvatarMaker(true);
                }}
                className="btn-pop block"
                title="きせかえをする"
              >
                <Avatar
                  child={currentChild}
                  config={currentChild.avatar}
                  size={84}
                  rounded="rounded-2xl sm:rounded-3xl shadow-lg border-3 sm:border-4 border-white"
                  className="sm:w-[100px] sm:h-[100px]"
                />
                <span className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-amber-400 text-slate-900 shadow-md">
                  <Shirt size={15} />
                </span>
              </button>
            </div>

            {/* 子ども情報ステータス */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-3xl font-black drop-shadow-xs truncate">
                  {currentChild.name}
                </h2>
                <span className="rounded-full bg-white/30 px-2 py-0.5 text-[11px] sm:text-xs font-black backdrop-blur-xs whitespace-nowrap shrink-0">
                  {currentChild.age}さい
                </span>
              </div>

              {/* ランク称号 */}
              <div className="mt-1 sm:mt-1.5 inline-flex items-center gap-1 rounded-xl bg-black/20 px-2.5 py-0.5 text-[11px] sm:text-xs font-black backdrop-blur-xs max-w-full truncate">
                <Award size={14} className="text-yellow-300 shrink-0" />
                <span className="truncate">しょうごう：{rank.name}</span>
              </div>
            </div>

            {/* スマホ用ジュエルガチャボタン（右上に配置） */}
            <div className="sm:hidden flex flex-col items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  sound.tap();
                  setGachaTab('spin');
                  setShowGacha(true);
                }}
                className="btn-pop group relative flex flex-col items-center rounded-2xl bg-gradient-to-b from-indigo-950 via-purple-900 to-slate-900 px-2.5 py-1.5 border-2 border-amber-300/80 shadow-md focus:outline-none"
                title="ドリームジュエルガチャをひらく！"
              >
                {isFreeGacha && (
                  <span className="absolute -top-2 -right-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-1.5 py-0.2 text-[9px] font-black text-slate-950 shadow-xs">
                    無料✨
                  </span>
                )}
                <GachaIcon
                  type="box_closed"
                  size={40}
                  className="transition-transform group-hover:scale-110"
                />
                <span className="mt-0.5 text-[10px] font-black text-amber-200 whitespace-nowrap">
                  ジュエルガチャ
                </span>
              </button>
            </div>
          </div>

          {/* 下段（スマホ時）/ 中央（PC時）: コイン・スタージュエル・連続達成メーター */}
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-2.5 w-full sm:flex-1">
            {/* コイン */}
            <div className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-1.5 rounded-2xl bg-white/95 px-3 py-1.5 font-black text-amber-800 shadow-xs">
              <KidIcon iconKey="ui_coin" size={24} />
              <span className="text-base sm:text-2xl text-amber-600">
                {currentChild.coins}
              </span>
              <span className="text-[11px] sm:text-xs text-amber-900">コイン</span>
            </div>

            {/* 💎 スタージュエル（タップで交換所へ直行！） */}
            <button
              type="button"
              onClick={() => {
                sound.tap();
                setGachaTab('exchange');
                setShowGacha(true);
              }}
              className="flex-1 sm:flex-none btn-pop flex items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 px-3 py-1.5 font-black text-cyan-200 shadow-xs border border-cyan-300/60 hover:scale-105 transition-all"
              title="スタージュエル交換所をひらく"
            >
              <GachaIcon type="star_jewel" size={20} />
              <span className="text-sm sm:text-lg text-cyan-300">
                {currentChild.starShards ?? 0}
              </span>
              <span className="text-[11px] sm:text-xs text-cyan-100">ジュエル</span>
              <span className="text-[9px] sm:text-[10px] bg-gradient-to-r from-cyan-400 to-amber-300 text-slate-950 px-1.5 py-0.2 rounded-full font-black whitespace-nowrap">
                交換所➔
              </span>
            </button>

            {/* 連続記録 */}
            <div className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-2xl bg-white/95 px-3 py-1.5 font-black text-rose-600 shadow-xs">
              <Flame size={16} className="text-rose-500 shrink-0" />
              <span className="text-sm sm:text-lg">{streak}日</span>
              <span className="text-[11px] sm:text-xs text-slate-500 whitespace-nowrap">れんぞく！</span>
            </div>
          </div>

          {/* PC・タブレット用ジュエルガチャボックス（sm以上で右端に配置） */}
          <div className="hidden sm:flex flex-col items-center shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => {
                sound.tap();
                setGachaTab('spin');
                setShowGacha(true);
              }}
              className="btn-pop group relative flex flex-col items-center rounded-2xl bg-gradient-to-b from-indigo-950 via-purple-900 to-slate-950 px-4 py-2 border-2 border-amber-300/80 shadow-lg focus:outline-none"
              title="ドリームジュエルガチャをひらく！"
            >
              {isFreeGacha && (
                <span className="absolute -top-2.5 -right-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-2 py-0.5 text-[10px] font-black text-slate-950 shadow-sm animate-bounce">
                  🎁 無料1回！
                </span>
              )}
              <GachaIcon
                type="box_closed"
                size={54}
                className="transition-transform group-hover:scale-110"
              />
              <div className="mt-1 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 via-pink-300 to-cyan-300 px-2.5 py-0.5 text-[11px] font-black text-slate-950 shadow-sm">
                <span>✨ ジュエルガチャ</span>
              </div>
            </button>
          </div>
        </div>

        {/* 未受け取り宝箱がある場合のお知らせバナー */}
        {myChests.length > 0 && !showChestModal && (
          <button
            onClick={() => {
              sound.tap();
              setShowChestModal(true);
            }}
            className="btn-pop mt-3 sm:mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-2.5 font-black text-amber-950 shadow-md animate-bounce"
          >
            <Gift size={18} />
            <span className="text-xs sm:text-sm">まだ あけていない たからばこが {myChests.length}こ あるよ！タップしてあけよう！</span>
          </button>
        )}
      </div>

      {/* 親からの連絡・差し戻し通知 */}
      <div className="mb-4 sm:mb-5">
        <KidNotices notices={state.notices} childId={currentChild.id} />
      </div>

      {/* タブ切り替えボタン（Switch/あつ森風ぽってりピル型・スマホ短縮ラベル対応） */}
      <div className="flex gap-2 sm:gap-3 mb-5 sm:mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              sound.tap();
              setActiveTab(tab.key);
            }}
            className={`btn-pop flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-2xl sm:rounded-3xl py-2 sm:py-2.5 px-1.5 sm:px-3 text-center font-black transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-[0_4px_0_#c2410c]'
                : 'bg-white text-slate-600 hover:bg-slate-100 shadow-[0_3px_0_#cbd5e1] border border-slate-200'
            }`}
          >
            <KidIcon iconKey={tab.iconKey} size={32} className="shrink-0" />
            <span className="text-xs sm:text-base whitespace-nowrap">
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </span>
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span
                className={`inline-flex h-4 min-w-4 sm:h-5 sm:min-w-5 px-1 items-center justify-center rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
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
            onOpenGacha={() => {
              setGachaTab('spin');
              setShowGacha(true);
            }}
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
        className="max-w-3xl lg:max-w-4xl p-3 sm:p-5"
        hideClose={true}
      >
        <AvatarMaker
          child={currentChild}
          onClose={() => setShowAvatarMaker(false)}
          onOpenGacha={() => {
            setGachaTab('spin');
            setShowGacha(true);
          }}
        />
      </Modal>

      {/* ドリームジュエルガチャモーダル */}
      {showGacha && (
        <GachaModal
          child={currentChild}
          initialTab={gachaTab}
          onClose={() => setShowGacha(false)}
        />
      )}

      {/* まいにちログインボーナスモーダル */}
      <Modal
        open={showDailyBonusModal}
        onClose={() => setShowDailyBonusModal(false)}
        className="max-w-sm"
      >
        <div className="flex flex-col items-center p-2 sm:p-4 text-center">
          <div className="relative mb-3">
            <KidIcon iconKey="ui_chest" size={76} className="animate-bounce" />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 mb-2">
            <Sparkles size={14} className="text-amber-600" />
            <span>まいにち ログインボーナス！</span>
          </span>

          <h3 className="text-2xl font-black text-slate-800">
            きょうのチケットが とどいたよ！
          </h3>

          <div className="my-4 flex w-full flex-col items-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 border-2 border-amber-300 shadow-sm">
            <div className="flex items-center gap-3.5">
              <SmartTicketIcon
                item={{
                  name: '【まいにち】タブレット1時間券',
                  icon: 'ticket_tab_king',
                  category: 'tablet',
                  minutes: 60,
                  isDaily: true,
                }}
                size={56}
              />
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
