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
import { KidIcon, SmartTicketIcon } from './KidIcons';
import { Play, Pause, Sparkles, PictureInPicture2, CheckCircle } from 'lucide-react';

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

      {/* もちものチケット一覧 */}
      <div>
        <h3 className="mb-3 text-lg font-black text-slate-700 flex items-center gap-2">
          <KidIcon iconKey="tab_tickets" size={28} />
          <span>もっている チケット</span>
        </h3>

        {unusedTickets.length === 0 && requestedTickets.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm flex flex-col items-center">
            <KidIcon iconKey="tab_tickets" size={56} className="mb-2" />
            <p className="font-black text-slate-600">チケットは まだないよ</p>
            <p className="mt-1 text-xs font-bold text-slate-400">
              ショップで コインをつかって ゲットしよう！
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* おねがい中のチケット */}
            {requestedTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="card flex items-center justify-between p-4 border-2 border-amber-300 bg-amber-50/70"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100/90 border border-amber-200 p-1">
                    <SmartTicketIcon item={ticket} size={46} />
                  </div>
                  <div>
                    <div className="font-black text-slate-800">{ticket.name}</div>
                    <div className="text-xs font-bold text-amber-700">
                      おうちのひとに おねがい中…✨
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-amber-200 px-3 py-1.5 text-xs font-black text-amber-900 shrink-0">
                  おねがい中
                </div>
              </div>
            ))}

            {/* 未使用チケット */}
            {unusedTickets.map((ticket) => {
              const isDaily = Boolean(ticket.isDaily);
              return (
                <div
                  key={ticket.id}
                  className={`card flex items-center justify-between p-4 border-2 transition-all ${
                    isDaily
                      ? 'border-amber-400 bg-gradient-to-r from-amber-50/90 to-yellow-50/90 shadow-md ring-2 ring-amber-300/40'
                      : 'border-slate-100 hover:border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border p-1 ${
                        isDaily
                          ? 'bg-gradient-to-br from-amber-100 to-yellow-100 border-amber-300 shadow-xs'
                          : 'bg-amber-50/80 border-amber-100'
                      }`}
                    >
                      <SmartTicketIcon item={ticket} size={46} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-slate-800">{ticket.name}</span>
                        {isDaily && (
                          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-900 animate-pulse">
                            ⭐ 本日限定
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-400">
                        {ticket.category === 'tablet'
                          ? `${ticket.minutes}ふん つかえるよ`
                          : 'おうちのひとに みせてね'}
                        {isDaily && '（1日1まい・きょう中）'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUseTicket(ticket)}
                    title="チケットをつかう"
                    className={`btn-pop flex items-center gap-1 shrink-0 rounded-2xl px-3.5 py-2 text-xs font-black text-white shadow-md active:translate-y-0.5 active:shadow-none transition ${
                      isDaily
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_3px_0_#9a3412]'
                        : 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-[0_3px_0_#c2410c]'
                    }`}
                  >
                    <Play size={15} fill="white" className="translate-x-0.2" />
                    <span className="whitespace-nowrap">つかう</span>
                  </button>
                </div>
              );
            })}

            {/* 本日のまいにちチケット使用済み案内 */}
            {child.lastDailyTicketUsedDate === todayKey() && !unusedTickets.some((t) => t.isDaily) && (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-3.5 text-center sm:col-span-2">
                <span className="text-xs font-black text-amber-800 flex items-center justify-center gap-1">
                  <span>✨</span>
                  <span>きょうの「まいにちタブレット1時間券」は つかったよ！あした またとどくよ！</span>
                </span>
              </div>
            )}
          </div>
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
