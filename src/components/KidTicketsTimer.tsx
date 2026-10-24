import { useEffect, useState, useRef } from 'react';
import type { ActiveTimer, Child, Ticket } from '../types';
import { finishTimer, markAlarmed, redeemTicket, pauseTimer, resumeTimer } from '../actions';
import { sound } from '../sound';
import { burst } from '../effects';
import { toast, Modal } from './ui';
import { pipTimer } from '../pip';
import { useNow, usePipActive } from '../hooks';
import {
  usePartCatalog,
  resolveChildEquippedParts,
  exportAvatarAsDataURL,
  PRESET_BODY_SRC,
} from '../features/avatar';
import { ensureNotificationPermission, notify } from '../notify';
import { BONUS_COINS, BONUS_WINDOW_MS } from '../logic';
import { formatClock, formatHMKana, todayKey } from '../utils';
import { KidIcon, SmartTicketIcon, resolveShopOrTicketIconKey } from './KidIcons';
import { Play, Pause, Sparkles, PictureInPicture2, CheckCircle, Layers } from 'lucide-react';

interface TicketStack {
  key: string;
  representative: Ticket;
  tickets: Ticket[];
  count: number;
  isDaily: boolean;
  isLeftover: boolean;
  priority: number;
}

function groupAndSortTickets(list: Ticket[]): TicketStack[] {
  const map = new Map<string, Ticket[]>();

  for (const t of list) {
    const iconKey = resolveShopOrTicketIconKey(t);
    const groupKey = [
      t.status,
      t.category,
      t.isDaily ? 'daily' : 'normal',
      t.name.trim(),
      t.minutes || 0,
      iconKey,
    ].join('::');

    const arr = map.get(groupKey);
    if (arr) {
      arr.push(t);
    } else {
      map.set(groupKey, [t]);
    }
  }

  const stacks: TicketStack[] = [];
  for (const [key, group] of map.entries()) {
    const rep = group[0];
    const isDaily = Boolean(rep.isDaily);
    const isLeftover = rep.name.includes('のこり');
    const isBoost =
      rep.name.includes('ちょい足し') ||
      rep.name.includes('追加') ||
      rep.name.includes('ついか');

    // 並び順の優先度（小さいほど上）
    // 0: おねがい中 (requested)
    // 1: 本日限定・まいにちチケット (isDaily)
    // 2: のこり時間チケット (中断返却分)
    // 3: 標準タブレット・ゲーム時間券 (分数が長い順)
    // 4: ちょい足し追加時間券
    // 5: おやつ・リアルごほうびチケット
    let priority = 5;
    if (rep.status === 'requested') {
      priority = 0;
    } else if (isDaily) {
      priority = 1;
    } else if (isLeftover) {
      priority = 2;
    } else if (rep.category === 'tablet') {
      priority = isBoost ? 4 : 3;
    } else {
      priority = 5;
    }

    stacks.push({
      key,
      representative: rep,
      tickets: group,
      count: group.length,
      isDaily,
      isLeftover,
      priority,
    });
  }

  return stacks.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    // タブレットチケット同士なら分数が大きい順
    if (a.representative.category === 'tablet' && b.representative.category === 'tablet') {
      if (b.representative.minutes !== a.representative.minutes) {
        return b.representative.minutes - a.representative.minutes;
      }
    }
    // 枚数が多い順 → 名前順
    if (b.count !== a.count) return b.count - a.count;
    return a.representative.name.localeCompare(b.representative.name, 'ja');
  });
}

export function KidTicketsTimer({
  child,
  tickets,
  activeTimers,
}: {
  child: Child;
  tickets: Ticket[];
  activeTimers: ActiveTimer[];
}) {
  const now = useNow(500);
  const isPipActive = usePipActive();
  const [bonusModal, setBonusModal] = useState<{ bonus: boolean; coins: number; refundMinutes?: number } | null>(null);
  const lastAlarmTimeRef = useRef<number>(0);

  const { parts: catalogParts } = usePartCatalog();
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>(PRESET_BODY_SRC);

  // 子どもの新アバターからPiP用アイコン画像を生成
  useEffect(() => {
    let canceled = false;
    const equipped = resolveChildEquippedParts(child.avatarStudio ?? undefined, catalogParts);
    exportAvatarAsDataURL(equipped, {
      adjustments: child.avatarStudio?.adjustments,
      size: 200,
      faceOnly: true,
      circleClip: true,
    })
      .then((url) => {
        if (!canceled && url) {
          setAvatarDataUrl(url);
        }
      })
      .catch(() => {
        if (!canceled) {
          setAvatarDataUrl(PRESET_BODY_SRC);
        }
      });
    return () => {
      canceled = true;
    };
  }, [child.avatarStudio, catalogParts]);

  const currentTimer = activeTimers.find((t) => t.childId === child.id);
  const myTickets = tickets.filter((t) => t.childId === child.id);
  const unusedTickets = myTickets.filter((t) => t.status === 'owned');
  const requestedTickets = myTickets.filter((t) => t.status === 'requested');

  // PiPキャンバス描画の更新とアラーム・通知監視（約5秒おきのリピートアラーム）
  useEffect(() => {
    if (!currentTimer || currentTimer.isPaused) return;

    // PiPコントローラの状態更新
    pipTimer.update({
      imageSrc: avatarDataUrl,
      endsAt: currentTimer.endsAt,
      name: child.name,
    });

    // 終了時刻に達した際のアラーム＆通知
    if (now >= currentTimer.endsAt) {
      if (!currentTimer.alarmed) {
        markAlarmed(child.id);
        notify(
          '⏰ じかんになりました！',
          `${child.name}ちゃん、タブレットの おしまいの じかんだよ！アプリにもどって＋${BONUS_COINS}コインを ゲットしよう！`
        );
      }

      // 【約5秒ごとにピピピッ！とリピートアラーム】子どもが「おしまい」ボタンを押すまで継続
      if (now - lastAlarmTimeRef.current >= 4800) {
        lastAlarmTimeRef.current = now;
        sound.alarm();
      }
    }
  }, [currentTimer, now, child, avatarDataUrl]);

  // チケットを使用
  const handleUseTicket = async (ticket: Ticket) => {
    sound.tap();

    if (ticket.category === 'tablet') {
      // 通知パーミッションの要求をあらかじめ試みる
      await ensureNotificationPermission();
      pipTimer.prepare();
    }

    const res = redeemTicket(ticket.id);
    if (res === 'timer') {
      sound.pop();
      toast(`「${ticket.name}」スタート！`, ticket.icon);
    } else if (res === 'requested') {
      sound.pop();
      toast('おうちのひとに おねがいしたよ！', '🍪');
    } else if (res === 'busy') {
      sound.error();
      toast('いまは タイマーが うごいているよ！', '⚠️');
    } else if (res === 'daily_limit') {
      sound.error();
      toast('まいにちチケットは 1日1まいまで つかえるよ！あした またつかってね', '⚠️');
    }
  };

  // 小窓表示（Picture-in-Picture）の切り替え
  const handleTogglePip = async () => {
    if (!pipTimer.supported()) {
      toast('このブラウザでは 小窓モードが つかえません', '⚠️');
      return;
    }
    sound.tap();
    try {
      if (isPipActive) {
        await pipTimer.close();
      } else {
        await pipTimer.open();
      }
    } catch {
      toast('小窓の ひょうじに しっぱいしました', '⚠️');
    }
  };

  // タイマー一時停止・再開
  const handleTogglePause = () => {
    if (!currentTimer) return;
    sound.tap();
    if (currentTimer.isPaused) {
      resumeTimer(child.id);
      toast('タイマーを さいかいしたよ！▶️', '▶️');
    } else {
      pauseTimer(child.id);
      toast('タイマーを いちじていししたよ！⏸️', '⏸️');
    }
  };

  // タイマー終了（おしまい！またね！ボタン）
  const handleFinishTimer = () => {
    if (!currentTimer) return;
    sound.tap();
    const res = finishTimer(child.id);
    if (res) {
      if (res.bonus) {
        sound.fanfare();
        burst();
        setBonusModal({ bonus: true, coins: BONUS_COINS, refundMinutes: res.refundMinutes });
      } else {
        sound.pop();
        setBonusModal({ bonus: false, coins: 0, refundMinutes: res.refundMinutes });
      }
    }
  };

  // タイマー進捗計算
  const isPaused = Boolean(currentTimer?.isPaused);
  const remainMs = currentTimer
    ? isPaused
      ? (currentTimer.pausedRemainingMs ?? 0)
      : Math.max(0, currentTimer.endsAt - now)
    : 0;
  const isTimeOver = currentTimer ? (!isPaused && now >= currentTimer.endsAt) : false;
  const inBonusWindow = currentTimer && !isPaused
    ? Math.abs(now - currentTimer.endsAt) <= BONUS_WINDOW_MS
    : false;

  const totalDurationMs = currentTimer ? currentTimer.minutes * 60 * 1000 : 1;
  const progressRatio = currentTimer
    ? Math.max(0, Math.min(1, remainMs / totalDurationMs))
    : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* 稼働中タイマーバナー */}
      {currentTimer ? (
        <div
          className={`card relative overflow-hidden p-6 text-center border-4 shadow-xl transition-all ${
            isTimeOver
              ? 'border-rose-400 bg-gradient-to-b from-rose-100 to-orange-100'
              : 'border-sky-300 bg-gradient-to-b from-sky-100 to-indigo-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <KidIcon iconKey="ui_timer" size={38} className="animate-bounce" />
            <span className="text-xl font-black text-slate-800">
              {currentTimer.name}
            </span>
          </div>

          {/* 残り時間表示 */}
          <div className="my-3 flex flex-col items-center">
            <div
              className={`text-6xl sm:text-7xl font-black tracking-wider ${
                isTimeOver ? 'text-rose-600 animate-pulse' : 'text-sky-700'
              }`}
            >
              {isTimeOver ? 'おしまい！' : formatClock(remainMs)}
            </div>
            <div className="mt-1 text-sm font-bold text-slate-500">
              {isPaused ? '⏸️ タイマー一時停止中' : `${formatHMKana(currentTimer.endsAt)} まで`}
            </div>
          </div>

          {/* 一時停止中バナー */}
          {isPaused && (
            <div className="mx-auto my-2 inline-flex items-center gap-1.5 rounded-full bg-amber-200 px-3.5 py-1 text-xs font-black text-amber-900 animate-pulse">
              <Pause size={14} />
              <span>いちじていし中（じかんは へらないよ）</span>
            </div>
          )}

          {/* タイムバー */}
          {!isTimeOver && (
            <div className="mx-auto my-3 h-4 w-full max-w-sm rounded-full bg-sky-200 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-500"
                style={{ width: `${progressRatio * 100}%` }}
              />
            </div>
          )}

          {/* お約束ボーナス案内 */}
          {inBonusWindow && (
            <div className="mx-auto my-3 flex max-w-md items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-2 text-sm font-black text-amber-950 shadow-md animate-bounce">
              <Sparkles size={20} className="text-amber-800" />
              <span>いま おわると「おやくそく まもれたボーナス」＋15コイン！</span>
            </div>
          )}

          {/* アクションボタン */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* 一時停止 / 再開ボタン */}
            <button
              onClick={handleTogglePause}
              className={`btn-pop flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black shadow-[0_4px_0_#cbd5e1] border w-full sm:w-auto ${
                isPaused
                  ? 'bg-amber-400 text-amber-950 border-amber-300 shadow-[0_4px_0_#b45309]'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
              <span>{isPaused ? 'さいかいする！' : 'いちじていし'}</span>
            </button>

            {pipTimer.supported() && (
              <button
                onClick={handleTogglePip}
                className="btn-pop flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-[0_4px_0_#cbd5e1] border border-slate-200 w-full sm:w-auto"
              >
                <PictureInPicture2 size={20} className="text-sky-600" />
                <span>{isPipActive ? '小窓をとじる' : '小窓でひょうじ！'}</span>
              </button>
            )}

            <button
              onClick={handleFinishTimer}
              className={`btn-pop flex items-center justify-center gap-2 rounded-2xl px-6 sm:px-8 py-3.5 text-base sm:text-lg font-black text-white shadow-lg w-full sm:w-auto transition ${
                isTimeOver
                  ? 'bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 shadow-[0_5px_0_#991b1b] animate-bounce ring-4 ring-rose-300'
                  : inBonusWindow
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_5px_0_#c2410c] animate-pulse'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_5px_0_#0f766e]'
              }`}
            >
              <CheckCircle size={22} className="shrink-0" />
              <span className="whitespace-nowrap">
                {isTimeOver ? (
                  <>
                    <span className="hidden sm:inline">⏰ おしまい！（アラームをとめる）</span>
                    <span className="sm:hidden">⏰ おしまい！（とめる）</span>
                  </>
                ) : (
                  'おしまい！またね！'
                )}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-sky-50/70 p-6 text-center border-2 border-dashed border-sky-200 flex flex-col items-center">
          <KidIcon iconKey="ui_timer" size={58} className="mb-1.5" />
          <h4 className="text-base font-black text-slate-700">
            いまは タブレットを つかっていないよ
          </h4>
          <p className="mt-1 text-xs font-bold text-slate-400">
            したのチケットから えらんで つかってね！
          </p>
        </div>
      )}

      {/* もちものチケット一覧（重複スタック＆優先順ソート） */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-700 flex items-center gap-2">
            <KidIcon iconKey="tab_tickets" size={28} />
            <span>もっている チケット</span>
          </h3>
          {(unusedTickets.length > 0 || requestedTickets.length > 0) && (
            <span className="rounded-full bg-amber-100 border border-amber-200 px-3 py-0.5 text-xs font-black text-amber-800">
              ぜんぶで {unusedTickets.length + requestedTickets.length} まい
            </span>
          )}
        </div>

        {unusedTickets.length === 0 && requestedTickets.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm flex flex-col items-center">
            <KidIcon iconKey="tab_tickets" size={56} className="mb-2" />
            <p className="font-black text-slate-600">チケットは まだないよ</p>
            <p className="mt-1 text-xs font-bold text-slate-400">
              ショップで コインをつかって ゲットしよう！
            </p>
          </div>
        ) : (
          (() => {
            const allStacks = groupAndSortTickets([...requestedTickets, ...unusedTickets]);
            const specialStacks = allStacks.filter((s) => s.priority <= 2);
            const tabletStacks = allStacks.filter((s) => s.priority === 3 || s.priority === 4);
            const realStacks = allStacks.filter((s) => s.priority === 5);

            const renderStackCard = (stack: TicketStack) => {
              const ticket = stack.representative;
              const isRequested = ticket.status === 'requested';
              const isDaily = stack.isDaily;
              const isLeftover = stack.isLeftover;
              const hasMultiple = stack.count > 1;
              const hasThreeOrMore = stack.count >= 3;

              return (
                <div
                  key={stack.key}
                  className={`relative ${hasThreeOrMore ? 'pb-2.5 pr-1.5' : hasMultiple ? 'pb-1.5 pr-1' : ''}`}
                >
                  {/* 3枚以上あるときの2段目重なりカード背景 */}
                  {hasThreeOrMore && (
                    <div
                      aria-hidden
                      className={`pointer-events-none absolute inset-x-2.5 top-2.5 bottom-0 rounded-3xl border-2 transition-all ${
                        isRequested || isDaily
                          ? 'border-amber-300/80 bg-amber-100/70'
                          : isLeftover
                          ? 'border-emerald-300/80 bg-emerald-100/70'
                          : 'border-slate-300/80 bg-slate-200/75'
                      }`}
                    />
                  )}

                  {/* 2枚以上あるときの1段目重なりカード背景 */}
                  {hasMultiple && (
                    <div
                      aria-hidden
                      className={`pointer-events-none absolute inset-x-1.5 top-1.5 ${
                        hasThreeOrMore ? 'bottom-1' : 'bottom-0'
                      } rounded-3xl border-2 transition-all ${
                        isRequested || isDaily
                          ? 'border-amber-300 bg-amber-50'
                          : isLeftover
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-slate-200 bg-slate-100'
                      }`}
                    />
                  )}

                  {/* メインのチケットカード */}
                  <div
                    className={`card relative z-10 flex items-center justify-between p-4 border-2 transition-all ${
                      isRequested
                        ? 'border-amber-400 bg-amber-50/95 shadow-sm'
                        : isDaily
                        ? 'border-amber-400 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 shadow-md ring-2 ring-amber-300/50'
                        : isLeftover
                        ? 'border-emerald-300 bg-gradient-to-r from-emerald-50/80 to-teal-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* アイコン＋左上スタック枚数バッジ */}
                      <div
                        className={`relative flex h-15 w-15 shrink-0 items-center justify-center rounded-2xl border p-1 ${
                          isRequested || isDaily
                            ? 'bg-gradient-to-br from-amber-100 to-yellow-100 border-amber-300 shadow-xs'
                            : isLeftover
                            ? 'bg-gradient-to-br from-emerald-100 to-teal-100 border-emerald-300'
                            : 'bg-amber-50/80 border-amber-100'
                        }`}
                      >
                        <SmartTicketIcon item={ticket} size={48} />

                        {hasMultiple && (
                          <span className="absolute -top-2 -left-2 z-20 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-2 py-0.5 text-xs font-black text-white shadow-md ring-2 ring-white">
                            ×{stack.count}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-slate-800 text-sm sm:text-base">
                            {ticket.name}
                          </span>
                          {isDaily && (
                            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-900 animate-pulse">
                              👑 本日限定
                            </span>
                          )}
                          {isLeftover && (
                            <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-900">
                              ⏳ のこり時間
                            </span>
                          )}
                          {hasMultiple && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 border border-indigo-200 px-2 py-0.5 text-[11px] font-black text-indigo-800">
                              <Layers size={11} className="text-indigo-600" />
                              <span>{stack.count}まい</span>
                            </span>
                          )}
                        </div>

                        <div className="mt-0.5 text-xs font-bold text-slate-500">
                          {isRequested ? (
                            <span className="text-amber-700">
                              おうちのひとに おねがい中…✨
                            </span>
                          ) : ticket.category === 'tablet' ? (
                            <span>
                              {ticket.minutes}ふん つかえるよ
                              {isDaily && '（1日1まい・きょう中）'}
                            </span>
                          ) : (
                            <span>おうちのひとに みせてね</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isRequested ? (
                      <div className="rounded-xl bg-amber-200 px-3 py-1.5 text-xs font-black text-amber-900 shrink-0">
                        おねがい中
                        {hasMultiple ? ` (${stack.count})` : ''}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUseTicket(ticket)}
                        title="チケットをつかう"
                        className={`btn-pop flex items-center gap-1 shrink-0 rounded-2xl px-3.5 py-2.5 text-xs font-black text-white shadow-md active:translate-y-0.5 active:shadow-none transition ${
                          isDaily
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_3px_0_#9a3412]'
                            : isLeftover
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_3px_0_#0f766e]'
                            : 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-[0_3px_0_#c2410c]'
                        }`}
                      >
                        <Play size={15} fill="white" className="translate-x-0.2" />
                        <span className="whitespace-nowrap">1まいつかう</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <div className="flex flex-col gap-5">
                {/* 1. 最上部：とくべつなチケット（本日限定まいにち券・のこり時間券・おねがい中） */}
                {specialStacks.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 bg-amber-100/80 border border-amber-200/80 w-fit px-3 py-1 rounded-full">
                      <span>👑</span>
                      <span>とくべつ・すぐつかえる チケット</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {specialStacks.map(renderStackCard)}
                    </div>
                  </div>
                )}

                {/* 本日のまいにちチケット使用済み案内 */}
                {child.lastDailyTicketUsedDate === todayKey() &&
                  !unusedTickets.some((t) => t.isDaily) && (
                    <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-3 text-center">
                      <span className="text-xs font-black text-amber-800 flex items-center justify-center gap-1">
                        <span>✨</span>
                        <span>
                          きょうの「まいにちタブレット1時間券」は つかったよ！あした またとどくよ！
                        </span>
                      </span>
                    </div>
                  )}

                {/* 2. 中段：タブレット・ゲームのじかんチケット（分数順） */}
                {tabletStacks.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-black text-sky-800 bg-sky-100/80 border border-sky-200/80 w-fit px-3 py-1 rounded-full">
                      <span>📱</span>
                      <span>タブレット・ゲームの じかんチケット</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tabletStacks.map(renderStackCard)}
                    </div>
                  </div>
                )}

                {/* 3. 下段：おやつ・ごほうびのチケット */}
                {realStacks.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-black text-pink-800 bg-pink-100/80 border border-pink-200/80 w-fit px-3 py-1 rounded-full">
                      <span>🍪</span>
                      <span>おやつ・ごほうびの チケット</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {realStacks.map(renderStackCard)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* ボーナス獲得モーダル（共通Modalコンポーネント化） */}
      <Modal
        open={Boolean(bonusModal)}
        onClose={() => setBonusModal(null)}
        className="max-w-sm p-5 sm:p-6 text-center"
      >
        {bonusModal && (
          <div className="flex flex-col items-center">
            <span className="text-5xl mb-2 animate-bounce">
              {bonusModal.bonus ? '🌟' : '👋'}
            </span>
            <h3 className="text-2xl font-black text-slate-800">
              {bonusModal.bonus ? 'おやくそく まもれたね！' : 'またあそぼうね！'}
            </h3>

            {/* 残り時間返却の案内 */}
            {bonusModal.refundMinutes && bonusModal.refundMinutes >= 1 && (
              <div className="my-3 flex items-center gap-2.5 rounded-2xl bg-sky-50 border-2 border-sky-200 p-3 text-left w-full">
                <KidIcon iconKey="ticket_tab_std" size={38} />
                <div>
                  <div className="text-xs font-black text-sky-950">
                    のこりじかん（{bonusModal.refundMinutes}ぷん）を チケットに もどしたよ！
                  </div>
                  <div className="text-[11px] font-bold text-sky-700 mt-0.5">
                    あまったじかんは つぎに また つかえるよ✨
                  </div>
                </div>
              </div>
            )}

            {bonusModal.bonus ? (
              <div className="my-3 flex flex-col items-center rounded-2xl bg-amber-50 p-4 w-full border border-amber-200">
                <span className="text-xs font-bold text-amber-800">
                  じかんを しっかり まもった ごほうびだよ！
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <KidIcon iconKey="ui_coin" size={42} />
                  <span className="text-4xl font-black text-amber-600">
                    +{bonusModal.coins}
                  </span>
                </div>
                <span className="mt-1 text-sm font-black text-amber-800">
                  ボーナスコイン ゲット！
                </span>
              </div>
            ) : (
              <p className="my-3 text-sm font-bold text-slate-500">
                タブレットを おしまいにしたよ！つぎも じかんを まもろうね！
              </p>
            )}

            <button
              onClick={() => {
                sound.tap();
                setBonusModal(null);
              }}
              className="btn-pop mt-2 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 py-3.5 text-base font-black text-white shadow-[0_4px_0_#3730a3]"
            >
              わかった！✨
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
