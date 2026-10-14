import { useEffect, useState } from 'react';
import type { ActiveTimer, Child, Ticket } from '../types';
import { finishTimer, markAlarmed, redeemTicket } from '../actions';
import { sound } from '../sound';
import { burst } from '../effects';
import { toast } from './ui';
import { pipTimer } from '../pip';
import { useNow, usePipActive } from '../hooks';
import { buildAvatarSvg } from '../avatar';
import { ensureNotificationPermission, notify } from '../notify';
import { BONUS_COINS, BONUS_WINDOW_MS } from '../logic';
import { formatClock, formatHMKana, todayKey } from '../utils';
import { Play, Sparkles, PictureInPicture2, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

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
  const [bonusModal, setBonusModal] = useState<{ bonus: boolean; coins: number } | null>(null);

  const currentTimer = activeTimers.find((t) => t.childId === child.id);
  const myTickets = tickets.filter((t) => t.childId === child.id);
  const unusedTickets = myTickets.filter((t) => t.status === 'owned');
  const requestedTickets = myTickets.filter((t) => t.status === 'requested');

  // PiPキャンバス描画の更新とアラーム・通知監視
  useEffect(() => {
    if (!currentTimer) return;

    // PiPコントローラの状態更新
    const svg = buildAvatarSvg(child.avatar, 200);
    pipTimer.update({
      svg,
      endsAt: currentTimer.endsAt,
      name: child.name,
    });

    // 終了時刻に達した際のアラーム＆通知（1度だけ）
    if (now >= currentTimer.endsAt && !currentTimer.alarmed) {
      markAlarmed(child.id);
      sound.alarm();
      notify(
        '⏰ じかんになりました！',
        `${child.name}ちゃん、タブレットの おしまいの じかんだよ！アプリにもどって＋${BONUS_COINS}コインを ゲットしよう！`
      );
    }
  }, [currentTimer, now, child]);

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

  // タイマー終了（おしまい！またね！ボタン）
  const handleFinishTimer = () => {
    if (!currentTimer) return;
    sound.tap();
    const res = finishTimer(child.id);
    if (res) {
      if (res.bonus) {
        sound.fanfare();
        burst();
        setBonusModal({ bonus: true, coins: BONUS_COINS });
      } else {
        sound.pop();
        setBonusModal({ bonus: false, coins: 0 });
      }
    }
  };

  // タイマー進捗計算
  const remainMs = currentTimer ? Math.max(0, currentTimer.endsAt - now) : 0;
  const isTimeOver = currentTimer ? now >= currentTimer.endsAt : false;
  const inBonusWindow = currentTimer
    ? Math.abs(now - currentTimer.endsAt) <= BONUS_WINDOW_MS
    : false;

  const totalDurationMs = currentTimer ? currentTimer.minutes * 60 * 1000 : 1;
  const progressRatio = currentTimer
    ? Math.max(0, Math.min(1, (currentTimer.endsAt - now) / totalDurationMs))
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
            <span className="text-3xl animate-bounce">
              {isTimeOver ? '⏰' : '📱'}
            </span>
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
              {formatHMKana(currentTimer.endsAt)} まで
            </div>
          </div>

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
              className={`btn-pop flex items-center justify-center gap-2 rounded-2xl px-8 py-3.5 text-lg font-black text-white shadow-lg w-full sm:w-auto ${
                inBonusWindow
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_5px_0_#c2410c] animate-pulse'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_5px_0_#0f766e]'
              }`}
            >
              <CheckCircle size={22} />
              <span>おしまい！またね！</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-sky-50/70 p-6 text-center border-2 border-dashed border-sky-200">
          <span className="text-4xl mb-2 inline-block">⏱️</span>
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
          <span>🎟️</span>
          <span>もっている チケット</span>
        </h3>

        {unusedTickets.length === 0 && requestedTickets.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <span className="text-4xl mb-2 inline-block">🎒</span>
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
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
                    {ticket.icon}
                  </span>
                  <div>
                    <div className="font-black text-slate-800">{ticket.name}</div>
                    <div className="text-xs font-bold text-amber-700">
                      おうちのひとに おねがい中…🍪
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-amber-200 px-3 py-1.5 text-xs font-black text-amber-900">
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
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl border ${
                        isDaily
                          ? 'bg-amber-100 border-amber-300 shadow-sm'
                          : 'bg-amber-50 border-amber-100'
                      }`}
                    >
                      {ticket.icon}
                    </span>
                    <div>
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
                    className={`btn-pop flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-black text-white ${
                      isDaily
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_3px_0_#9a3412]'
                        : 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-[0_3px_0_#c2410c]'
                    } active:shadow-none`}
                  >
                    <Play size={16} fill="white" />
                    <span>つかう！</span>
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

      {/* ボーナス獲得モーダル */}
      {bonusModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="animate-popin relative flex max-w-sm w-full flex-col items-center rounded-3xl bg-white p-6 text-center shadow-2xl">
            <span className="text-5xl mb-2 animate-bounce">
              {bonusModal.bonus ? '🌟' : '👋'}
            </span>
            <h3 className="text-2xl font-black text-slate-800">
              {bonusModal.bonus ? 'おやくそく まもれたね！' : 'またあそぼうね！'}
            </h3>

            {bonusModal.bonus ? (
              <div className="my-5 flex flex-col items-center rounded-2xl bg-amber-50 p-4 w-full border border-amber-200">
                <span className="text-xs font-bold text-amber-800">
                  じかんを しっかり まもった ごほうびだよ！
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-4xl">🪙</span>
                  <span className="text-4xl font-black text-amber-600">
                    +{bonusModal.coins}
                  </span>
                </div>
                <span className="mt-1 text-sm font-black text-amber-800">
                  ボーナスコイン ゲット！
                </span>
              </div>
            ) : (
              <p className="my-4 text-sm font-bold text-slate-500">
                タブレットを おしまいにしたよ！つぎも じかんを まもろうね！
              </p>
            )}

            <button
              onClick={() => {
                sound.tap();
                setBonusModal(null);
              }}
              className="btn-pop w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 py-3 text-base font-black text-white shadow-[0_4px_0_#3730a3]"
            >
              わかった！✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
