import type { Child, Quest, Submission, DoneRecord } from '../types';
import { rewardFor } from '../logic';
import { submitQuest } from '../actions';
import { sound } from '../sound';
import { burstFromElement } from '../effects';
import { todayKey } from '../utils';
import { KidIcon, resolveQuestIconKey } from './KidIcons';
import { CheckCircle2, Clock, Sparkles } from 'lucide-react';

export function KidQuests({
  child,
  quests,
  submissions,
  doneRecords,
}: {
  child: Child;
  quests: Quest[];
  submissions: Submission[];
  doneRecords: DoneRecord[];
}) {
  const today = todayKey();

  // 自分に割り当てられたクエストのみ抽出
  const myQuests = quests.filter((q) => q.assignedTo.includes(child.id));

  const handleDone = (quest: Quest, e: React.MouseEvent<HTMLButtonElement>) => {
    sound.success();
    burstFromElement(e.currentTarget);
    submitQuest(child.id, quest.id);
  };

  if (myQuests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-sm">
        <span className="text-5xl mb-3">🏖️</span>
        <h3 className="text-xl font-black text-slate-700">いまは おてつだい がないよ！</h3>
        <p className="mt-1 text-sm font-bold text-slate-400">
          おうちのひとに おてつだいを つくってもらおう！
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {myQuests.map((quest) => {
        const reward = rewardFor(quest, child.id);
        const isSubmitted = submissions.some(
          (s) => s.childId === child.id && s.questId === quest.id
        );
        const isDoneToday = doneRecords.some(
          (d) => d.childId === child.id && d.questId === quest.id && d.date === today
        );

        return (
          <div
            key={quest.id}
            className={`card flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 transition-all border-2 ${
              isDoneToday
                ? 'border-emerald-200 bg-emerald-50/50 opacity-90'
                : isSubmitted
                  ? 'border-amber-200 bg-amber-50/60'
                  : 'border-slate-100 bg-white hover:border-amber-200 shadow-md'
            }`}
          >
            <div className="flex items-center gap-3.5 w-full sm:w-auto min-w-0 flex-1">
              <div className="flex h-13 w-13 sm:h-15 sm:w-15 shrink-0 items-center justify-center rounded-2xl bg-amber-50/90 shadow-inner border border-amber-200/70 p-1">
                <KidIcon iconKey={resolveQuestIconKey(quest)} size={46} />
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-base sm:text-lg font-black text-slate-800 break-words leading-tight">
                  {quest.title}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <KidIcon iconKey="ui_coin" size={16} />
                    <span className="whitespace-nowrap">+{reward} コイン</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 sm:mt-0 w-full sm:w-auto flex justify-center sm:justify-end shrink-0">
              {isDoneToday ? (
                <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-100/90 border-2 border-emerald-300 px-5 py-2.5 sm:py-3 font-black text-emerald-800 text-sm sm:text-base w-full sm:w-auto shadow-xs">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                  <span className="whitespace-nowrap">きょうは かんりょう！💮</span>
                </div>
              ) : isSubmitted ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-amber-100/90 border-2 border-amber-300 px-5 py-2.5 sm:py-3 font-black text-amber-900 text-sm sm:text-base w-full sm:w-auto animate-pulse shadow-xs">
                  <Clock size={18} className="text-amber-700 shrink-0" />
                  <span className="whitespace-nowrap">おうちのひとに ほうこくちゅう…💌</span>
                </div>
              ) : (
                <button
                  onClick={(e) => handleDone(quest, e)}
                  className="btn-pop flex items-center justify-center gap-2 w-full sm:w-auto rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 sm:px-7 py-2.5 sm:py-3 text-base sm:text-lg font-black text-white shadow-[0_4px_0_#0f766e] active:translate-y-1 active:shadow-none hover:brightness-105 transition"
                >
                  <Sparkles size={18} className="animate-spin-slow shrink-0" />
                  <span className="whitespace-nowrap">できた！✨</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
