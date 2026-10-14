import { useState } from 'react';
import type { AppState, Child, Quest, ShopItem } from '../types';
import {
  approveSubmission,
  approveAll,
  rejectSubmission,
  confirmRealTicket,
  stopTimerByParent,
  giftBonus,
  saveQuest,
  deleteQuest,
  saveShopItem,
  deleteShopItem,
  saveChild,
  deleteChild,
  setParentPin,
  resetAllData,
} from '../actions';
import { GameAvatar2D } from '../components/Avatar';
import { Modal } from '../components/ui';
import { sound } from '../sound';
import { toast } from '../components/ui';
import { useNow } from '../hooks';
import { formatClock, formatHM, uid } from '../utils';
import { rewardFor } from '../logic';
import { DEFAULT_AVATAR } from '../presets';
import {
  Check,
  RotateCcw,
  Gift,
  Plus,
  Trash2,
  Edit2,
  Clock,
  ShieldCheck,
  Lock,
  StopCircle,
  UserPlus,
  Wifi,
  WifiOff,
  Copy,
  Key,
  QrCode,
  Share2,
} from 'lucide-react';
import { useSyncStatus } from '../store';
import { getRoomId, setRoomId, isSupabaseConfigured, getInviteUrl } from '../supabase';

export function ParentView({ state }: { state: AppState }) {
  const now = useNow(1000);
  const syncStatus = useSyncStatus();
  const [activeTab, setActiveTab] = useState<'approvals' | 'children' | 'quests' | 'shop' | 'logs'>('approvals');

  // 家族のあいことば（ルームID）状態
  const [roomIdInput, setRoomIdInput] = useState(getRoomId);
  const [isEditingRoomId, setIsEditingRoomId] = useState(false);

  const handleSaveRoomId = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = roomIdInput.trim() || 'default-family';
    setRoomId(clean);
    setRoomIdInput(clean);
    setIsEditingRoomId(false);
    sound.fanfare();
    toast(`家族のあいことばを「${clean}」に設定しました！`, '🔑');
  };

  const handleCopyRoomId = () => {
    try {
      navigator.clipboard.writeText(getRoomId());
      sound.pop();
      toast('家族のあいことばをコピーしました', '📋');
    } catch {
      /* ignore */
    }
  };

  const handleCopyInviteUrl = () => {
    try {
      const url = getInviteUrl();
      navigator.clipboard.writeText(url);
      sound.fanfare();
      toast('招待URLをコピーしました！', '📋');
    } catch {
      /* ignore */
    }
  };

  // タブレット招待QRモーダル状態
  const [showQrModal, setShowQrModal] = useState(false);

  // サプライズボーナスモーダル状態
  const [surpriseTargetChildId, setSurpriseTargetChildId] = useState<string | null>(null);
  const [bonusCoins, setBonusCoins] = useState(50);
  const [bonusTicketId, setBonusTicketId] = useState<string>('');
  const [bonusMessage, setBonusMessage] = useState('いつも おてつだい ありがとう！');

  // クエスト編集モーダル状態
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);

  // ショップ編集モーダル状態
  const [editingShopItem, setEditingShopItem] = useState<ShopItem | null>(null);

  // 子ども編集モーダル状態
  const [editingChild, setEditingChild] = useState<Child | null>(null);

  // 親PIN変更モーダル状態
  const [newParentPin, setNewParentPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  /* ---------------- サプライズボーナス送信 ---------------- */
  const handleSendSurprise = () => {
    if (!surpriseTargetChildId) return;
    sound.fanfare();
    giftBonus(surpriseTargetChildId, bonusCoins, bonusTicketId || null, bonusMessage);
    toast('サプライズ宝箱をプレゼントしました！🎁', '✨');
    setSurpriseTargetChildId(null);
  };

  /* ---------------- クエスト保存 ---------------- */
  const handleSaveQuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuest || !editingQuest.title.trim()) return;
    sound.tap();
    saveQuest(editingQuest);
    toast(`「${editingQuest.title}」を保存しました`, '📝');
    setEditingQuest(null);
  };

  /* ---------------- ショップ商品保存 ---------------- */
  const handleSaveShopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShopItem || !editingShopItem.name.trim()) return;
    sound.tap();
    saveShopItem(editingShopItem);
    toast(`「${editingShopItem.name}」を保存しました`, '🏪');
    setEditingShopItem(null);
  };

  /* ---------------- 子ども情報保存 ---------------- */
  const handleSaveChildSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChild || !editingChild.name.trim()) return;
    sound.tap();
    saveChild(editingChild);
    toast(`${editingChild.name} のプロフィールを更新しました`, '👤');
    setEditingChild(null);
  };

  /* ---------------- 子ども新規作成 ---------------- */
  const handleAddNewChild = () => {
    sound.tap();
    const newChild: Child = {
      id: `c-${uid()}`,
      name: 'あたらしいこ',
      age: 6,
      pin: '1234',
      coins: 50,
      streak: 0,
      lastDoneDate: null,
      totalQuests: 0,
      avatar: { ...DEFAULT_AVATAR },
      ownedItems: [],
      lastFreeGacha: null,
      color: 'sky',
      allowQuickLogin: true,
    };
    setEditingChild(newChild);
  };

  const tabs: { key: 'approvals' | 'children' | 'quests' | 'shop' | 'logs'; label: string; icon: string; count?: number }[] = [
    {
      key: 'approvals',
      label: '承認センター',
      icon: '✅',
      count: state.submissions.length,
    },
    {
      key: 'children',
      label: '子ども＆タイマー',
      icon: '👥',
      count: state.timers.length > 0 ? state.timers.length : undefined,
    },
    {
      key: 'quests',
      label: 'お手伝い管理',
      icon: '📝',
    },
    {
      key: 'shop',
      label: 'ショップ管理',
      icon: '🏪',
    },
    {
      key: 'logs',
      label: '活動ログ・設定',
      icon: '📋',
    },
  ];

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 pb-20">
      {/* 親ダッシュボードヘッダー */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800">
            <ShieldCheck size={16} />
            <span>保護者ダッシュボード</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-800">
            おやモード管理画面
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPinModal(true)}
            className="btn-pop flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
          >
            <Lock size={15} />
            <span>PIN変更 (現在: {state.parentPin})</span>
          </button>
        </div>
      </div>

      {/* クラウドリアルタイム同期＆家族のあいことばカード */}
      <div className="mb-5 rounded-2xl bg-white border border-slate-200 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* 通信状態バッジ */}
          <div className="flex items-center gap-2">
            {syncStatus === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Wifi size={14} />
                <span>🟢 クラウドリアルタイム接続中</span>
              </span>
            ) : syncStatus === 'connecting' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                <Wifi size={14} />
                <span>🟡 クラウド接続中...</span>
              </span>
            ) : syncStatus === 'error' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-800">
                <WifiOff size={14} />
                <span>⚠️ 同期エラー（ローカル保存中）</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                <WifiOff size={14} />
                <span>⚪ ローカル保存モード</span>
              </span>
            )}

            <span className="text-xs text-slate-500 hidden sm:inline">
              {syncStatus === 'connected'
                ? '他端末と双方向リアルタイム同期中'
                : !isSupabaseConfigured
                ? '※Supabase未設定（ローカル単体で動作中）'
                : '接続状態を確認中'}
            </span>
          </div>

          {/* あいことば（ルームID） */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isEditingRoomId ? (
              <form onSubmit={handleSaveRoomId} className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Key size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)}
                    placeholder="家族のあいことば"
                    className="w-full rounded-xl border border-indigo-300 pl-8 pr-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="btn-pop rounded-xl bg-indigo-600 px-3 py-1 text-xs font-black text-white hover:bg-indigo-700"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRoomIdInput(getRoomId());
                    setIsEditingRoomId(false);
                  }}
                  className="btn-pop rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                >
                  取消
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1 rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs">
                  <Key size={13} className="text-amber-500" />
                  <span className="text-slate-500">あいことば:</span>
                  <span className="font-mono font-black text-slate-800">{getRoomId()}</span>
                </div>
                <button
                  onClick={handleCopyRoomId}
                  title="あいことばをコピー"
                  className="btn-pop rounded-xl bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200"
                >
                  <Copy size={13} />
                </button>
                <button
                  onClick={() => {
                    setRoomIdInput(getRoomId());
                    setIsEditingRoomId(true);
                  }}
                  className="btn-pop rounded-xl bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  合言葉を変更
                </button>
                <button
                  onClick={() => {
                    sound.tap();
                    setShowQrModal(true);
                  }}
                  title="タブレット招待用QRコード・URL"
                  className="btn-pop flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1 text-xs font-black text-white shadow-sm hover:from-emerald-600 hover:to-teal-700"
                >
                  <QrCode size={13} />
                  <span>📱 タブレット招待</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              sound.tap();
              setActiveTab(t.key);
            }}
            className={`btn-pop flex items-center gap-2 shrink-0 rounded-2xl px-4 py-2.5 text-sm font-black transition-all ${
              activeTab === t.key
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {typeof t.count === 'number' && t.count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs text-white">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---------------- 1. ワンタップ承認センター ---------------- */}
      {activeTab === 'approvals' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span>📬</span>
              <span>報告されたお手伝い（{state.submissions.length}件）</span>
            </h2>

            {state.submissions.length > 1 && (
              <button
                onClick={() => {
                  sound.fanfare();
                  approveAll();
                  toast('すべて承認しました！🎉', '✅');
                }}
                className="btn-pop rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-white shadow-[0_3px_0_#047857]"
              >
                すべてまとめて承認！
              </button>
            )}
          </div>

          {state.submissions.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center border-2 border-slate-100 shadow-sm">
              <span className="text-4xl mb-2 inline-block">📭</span>
              <p className="font-bold text-slate-600">現在、未承認の報告はありません</p>
              <p className="text-xs text-slate-400 mt-1">
                子どもが「できた！✨」ボタンを押すとここに表示されます
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {state.submissions.map((sub) => {
                const child = state.children.find((c) => c.id === sub.childId);
                const quest = state.quests.find((q) => q.id === sub.questId);
                if (!child || !quest) return null;

                const reward = rewardFor(quest, child.id);

                return (
                  <div
                    key={sub.id}
                    className="card flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 border-2 border-amber-200 bg-amber-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <GameAvatar2D config={child.avatar} size={54} rounded="rounded-2xl" interactive={false} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800 text-base">
                            {child.name}
                          </span>
                          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-black text-amber-900">
                            +{reward} コイン
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                          <span className="text-xl">{quest.icon}</span>
                          <span>{quest.title}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 sm:mt-0 flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          sound.tap();
                          rejectSubmission(sub.id);
                          toast('もう一度やってみようと伝えました', '💪');
                        }}
                        className="btn-pop flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-300"
                      >
                        <RotateCcw size={15} />
                        <span>もう一度</span>
                      </button>

                      <button
                        onClick={() => {
                          sound.coin();
                          approveSubmission(sub.id);
                          toast(`${child.name}の報告を承認しました！🎁`, '✅');
                        }}
                        className="btn-pop flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-[0_3px_0_#047857]"
                      >
                        <Check size={17} strokeWidth={3} />
                        <span>ありがとう！（承認）</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------- 2. 子ども別ステータス＆タイマー監視・子ども管理 ---------------- */}
      {activeTab === 'children' && (
        <div className="flex flex-col gap-6">
          {/* おねがいされたおやつ・リアルチケットの消し込み */}
          {state.tickets.some((t) => t.status === 'requested') && (
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-3">
                <span>🍪</span>
                <span>おねがいされた おやつ・リアルチケット</span>
              </h2>

              <div className="flex flex-col gap-2.5">
                {state.tickets
                  .filter((t) => t.status === 'requested')
                  .map((t) => {
                    const child = state.children.find((c) => c.id === t.childId);
                    return (
                      <div
                        key={t.id}
                        className="card flex items-center justify-between p-4 border-2 border-orange-200 bg-orange-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{t.icon}</span>
                          <div>
                            <span className="text-sm font-black text-orange-950">
                              {child?.name} が「{t.name}」を使いたいそうです！
                            </span>
                            <div className="text-xs text-orange-700">
                              準備ができたら「渡したよ」を押してください
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            sound.fanfare();
                            confirmRealTicket(t.id);
                            toast(`「${t.name}」を消し込みました`, '🤝');
                          }}
                          className="btn-pop rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white shadow-[0_3px_0_#c2410c]"
                        >
                          渡したよ！
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 子ども一覧ヘッダーと新規追加ボタン */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span>👥</span>
              <span>子どもプロフィール＆タイマー監視</span>
            </h2>

            <button
              onClick={handleAddNewChild}
              className="btn-pop flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-black text-white shadow-sm hover:bg-indigo-700"
            >
              <UserPlus size={16} />
              <span>子どもを追加</span>
            </button>
          </div>

          {/* 子ども一覧カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {state.children.map((child) => {
              const activeTimer = state.timers.find((t) => t.childId === child.id);
              const timerRemainMs = activeTimer ? Math.max(0, activeTimer.endsAt - now) : 0;
              const isOver = activeTimer ? now >= activeTimer.endsAt : false;

              return (
                <div
                  key={child.id}
                  className="card p-5 border-2 border-slate-100 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <GameAvatar2D config={child.avatar} size={54} rounded="rounded-2xl" interactive={false} />
                        <div>
                          <div className="font-black text-slate-800 text-lg flex items-center gap-1">
                            <span>{child.name}</span>
                          </div>
                          <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 flex-wrap">
                            <span>{child.age}歳</span>
                            <span>•</span>
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold">PIN: {child.pin}</span>
                            {child.allowQuickLogin !== false ? (
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                                かんたんログインON
                              </span>
                            ) : (
                              <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-700">
                                PIN必須
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingChild(child)}
                          className="btn-pop p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                          title="名前・PIN・プロフィール編集"
                        >
                          <Edit2 size={16} />
                        </button>
                        {state.children.length > 1 && (
                          <button
                            onClick={() => {
                              if (confirm(`「${child.name}」を削除してもよろしいですか？`)) {
                                sound.tap();
                                deleteChild(child.id);
                                toast(`${child.name}を削除しました`, '🗑️');
                              }
                            }}
                            className="btn-pop p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="削除"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-3">
                      <div className="rounded-xl bg-amber-50 p-2 text-center border border-amber-100">
                        <div className="text-[11px] font-bold text-amber-700">所持コイン</div>
                        <div className="text-xl font-black text-amber-600">
                          🪙 {child.coins}
                        </div>
                      </div>
                      <div className="rounded-xl bg-rose-50 p-2 text-center border border-rose-100">
                        <div className="text-[11px] font-bold text-rose-700">連続日数</div>
                        <div className="text-xl font-black text-rose-600">
                          🔥 {child.streak}日
                        </div>
                      </div>
                    </div>

                    {/* タブレットタイマー状況 */}
                    <div className="mt-3">
                      {activeTimer ? (
                        <div
                          className={`rounded-2xl p-3 border-2 ${
                            isOver
                              ? 'bg-rose-50 border-rose-300 text-rose-900'
                              : 'bg-sky-50 border-sky-300 text-sky-900'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-black">
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              <span>タブレット使用中</span>
                            </span>
                            <span className="font-mono text-sm">
                              {isOver ? '時間超過！' : formatClock(timerRemainMs)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            終了予定: {formatHM(activeTimer.endsAt)}
                          </div>
                          <button
                            onClick={() => {
                              sound.tap();
                              stopTimerByParent(child.id);
                              toast(`${child.name}のタイマーを停止しました`, '⏹️');
                            }}
                            className="btn-pop mt-2 flex w-full items-center justify-center gap-1 rounded-xl bg-rose-500 py-1.5 text-xs font-black text-white"
                          >
                            <StopCircle size={14} />
                            <span>強制ストップ</span>
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-xl bg-slate-50 p-2.5 text-center text-xs font-bold text-slate-400">
                          タブレットは未使用です
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setSurpriseTargetChildId(child.id)}
                    className="btn-pop mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 py-2.5 text-xs font-black text-white shadow-[0_3px_0_#c2410c]"
                  >
                    <Gift size={16} />
                    <span>サプライズ宝箱を贈る</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- 3. お手伝い（クエスト）管理 ---------------- */}
      {activeTab === 'quests' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span>📝</span>
              <span>お手伝い（クエスト）一覧・年齢別コイン調整</span>
            </h2>

            <button
              onClick={() => {
                sound.tap();
                setEditingQuest({
                  id: `q-${uid()}`,
                  title: '',
                  icon: '⭐',
                  reward: 50,
                  assignedTo: state.children.map((c) => c.id),
                  rewardOverrides: {},
                });
              }}
              className="btn-pop flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm"
            >
              <Plus size={16} />
              <span>新しいお手伝い</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {state.quests.map((quest) => (
              <div
                key={quest.id}
                className="card p-4 sm:p-5 border-2 border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
                    {quest.icon}
                  </span>
                  <div>
                    <div className="font-black text-slate-800 text-base">
                      {quest.title}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        基準: 🪙 {quest.reward}
                      </span>
                      <span className="text-slate-400">担当:</span>
                      {quest.assignedTo.map((cid) => {
                        const child = state.children.find((c) => c.id === cid);
                        const over = quest.rewardOverrides[cid];
                        return (
                          <span
                            key={cid}
                            className="rounded-full bg-slate-100 px-2.5 py-0.5 font-bold text-slate-600 text-[11px]"
                          >
                            {child?.name}
                            {typeof over === 'number' && ` (${over}コイン)`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => setEditingQuest(quest)}
                    className="btn-pop rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                    title="編集"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`「${quest.title}」を削除してもよろしいですか？`)) {
                        sound.tap();
                        deleteQuest(quest.id);
                        toast('お手伝いを削除しました', '🗑️');
                      }
                    }}
                    className="btn-pop rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                    title="削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- 4. ショップ管理 ---------------- */}
      {activeTab === 'shop' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span>🏪</span>
              <span>ショップ商品・価格設定</span>
            </h2>

            <button
              onClick={() => {
                sound.tap();
                setEditingShopItem({
                  id: `sh-${uid()}`,
                  name: '',
                  icon: '🎁',
                  price: 50,
                  category: 'real',
                  minutes: 0,
                  avatarItemId: null,
                });
              }}
              className="btn-pop flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm"
            >
              <Plus size={16} />
              <span>商品を追加</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {state.shop.map((item) => (
              <div
                key={item.id}
                className="card p-4 border-2 border-slate-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl border border-amber-100">
                    {item.icon}
                  </span>
                  <div>
                    <div className="font-black text-slate-800 text-sm">{item.name}</div>
                    <div className="text-xs font-bold text-amber-600">
                      🪙 {item.price} コイン
                      {item.category === 'tablet' && ` / ${item.minutes}分`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingShopItem(item)}
                    className="btn-pop rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`「${item.name}」を削除しますか？`)) {
                        sound.tap();
                        deleteShopItem(item.id);
                        toast('商品を削除しました', '🗑️');
                      }
                    }}
                    className="btn-pop rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- 5. ログ・設定 ---------------- */}
      {activeTab === 'logs' && (
        <div className="flex flex-col gap-6">
          {/* 最近のアクティビティログ */}
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-3">
              <span>📋</span>
              <span>最近のアクティビティ</span>
            </h2>

            <div className="card divide-y divide-slate-100 p-2 max-h-72 overflow-y-auto">
              {state.logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{log.icon}</span>
                    <span className="font-bold text-slate-700">{log.text}</span>
                  </div>
                  <span className="text-slate-400 shrink-0 ml-2">
                    {formatHM(log.at)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* データリセット */}
          <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-5">
            <h3 className="text-base font-black text-rose-900">
              全データの初期化
            </h3>
            <p className="mt-1 text-xs text-rose-700">
              お手伝いやコイン、アバター状態をすべて初期プリセット状態に戻します。
            </p>
            <button
              onClick={() => {
                if (confirm('すべてのデータを初期化してよろしいですか？この操作は取り消せません。')) {
                  sound.tap();
                  resetAllData();
                  toast('全データをリセットしました', '🔄');
                }
              }}
              className="btn-pop mt-3 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-sm"
            >
              初期データに戻す
            </button>
          </div>
        </div>
      )}

      {/* ---------------- サプライズボーナスモーダル ---------------- */}
      <Modal
        open={Boolean(surpriseTargetChildId)}
        onClose={() => setSurpriseTargetChildId(null)}
      >
        {surpriseTargetChildId && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Gift size={22} className="text-amber-500" />
              <span>サプライズ宝箱をプレゼント！</span>
            </h3>

            <div>
              <label className="label">付与コイン数</label>
              <input
                type="number"
                value={bonusCoins === 0 ? '' : bonusCoins}
                onChange={(e) => setBonusCoins(e.target.value === '' ? 0 : Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                className="input font-bold"
                placeholder="0"
              />
            </div>

            <div>
              <label className="label">チケットを一緒に同封する（任意）</label>
              <select
                value={bonusTicketId}
                onChange={(e) => setBonusTicketId(e.target.value)}
                className="input font-bold"
              >
                <option value="">なし（コインのみ）</option>
                {state.shop
                  .filter((s) => s.category !== 'avatar')
                  .map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.icon} {it.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="label">メッセージ</label>
              <input
                type="text"
                value={bonusMessage}
                onChange={(e) => setBonusMessage(e.target.value)}
                className="input font-bold"
                placeholder="いつも おてつだい ありがとう！"
              />
            </div>

            <button
              onClick={handleSendSurprise}
              className="btn-pop mt-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-base font-black text-white shadow-[0_4px_0_#c2410c]"
            >
              宝箱を届ける！🎁
            </button>
          </div>
        )}
      </Modal>

      {/* ---------------- クエスト編集モーダル ---------------- */}
      <Modal open={Boolean(editingQuest)} onClose={() => setEditingQuest(null)}>
        {editingQuest && (
          <form onSubmit={handleSaveQuestSubmit} className="flex flex-col gap-4">
            <h3 className="text-xl font-black text-slate-800">
              {state.quests.some((q) => q.id === editingQuest.id) ? 'お手伝いの編集' : '新しいお手伝い'}
            </h3>

            <div>
              <label className="label">タイトル（子ども向けひらがな推奨）</label>
              <input
                type="text"
                value={editingQuest.title}
                onChange={(e) => setEditingQuest({ ...editingQuest, title: e.target.value })}
                required
                className="input font-bold"
                placeholder="例: くつを そろえる"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">アイコン（絵文字）</label>
                <input
                  type="text"
                  value={editingQuest.icon}
                  onChange={(e) => setEditingQuest({ ...editingQuest, icon: e.target.value })}
                  required
                  className="input font-bold text-center text-2xl"
                />
              </div>

              <div>
                <label className="label">基本報酬コイン</label>
                <input
                  type="number"
                  value={editingQuest.reward === 0 ? '' : editingQuest.reward}
                  onChange={(e) =>
                    setEditingQuest({
                      ...editingQuest,
                      reward: e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
                  onFocus={(e) => e.target.select()}
                  required
                  min={1}
                  className="input font-bold"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="label">担当する子ども（複数選択可）</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {state.children.map((c) => {
                  const assigned = editingQuest.assignedTo.includes(c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => {
                        const next = assigned
                          ? editingQuest.assignedTo.filter((x) => x !== c.id)
                          : [...editingQuest.assignedTo, c.id];
                        setEditingQuest({ ...editingQuest, assignedTo: next });
                      }}
                      className={`btn-pop rounded-xl px-3 py-1.5 text-xs font-black ${
                        assigned
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 子ども別コイン個別調整 */}
            <div>
              <label className="label">子ども別コイン個別調整（任意）</label>
              <div className="flex flex-col gap-2 mt-1">
                {editingQuest.assignedTo.map((cid) => {
                  const child = state.children.find((c) => c.id === cid);
                  const val = editingQuest.rewardOverrides[cid] ?? '';

                  return (
                    <div key={cid} className="flex items-center justify-between text-xs font-bold">
                      <span>{child?.name}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder={`${editingQuest.reward} (基本)`}
                          value={val}
                          onChange={(e) => {
                            const copy = { ...editingQuest.rewardOverrides };
                            if (e.target.value === '') {
                              delete copy[cid];
                            } else {
                              copy[cid] = Number(e.target.value);
                            }
                            setEditingQuest({ ...editingQuest, rewardOverrides: copy });
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right"
                        />
                        <span>コイン</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="btn-pop mt-2 rounded-2xl bg-indigo-600 py-3 text-base font-black text-white shadow-[0_4px_0_#3730a3]"
            >
              保存する
            </button>
          </form>
        )}
      </Modal>

      {/* ---------------- ショップ商品編集モーダル ---------------- */}
      <Modal open={Boolean(editingShopItem)} onClose={() => setEditingShopItem(null)}>
        {editingShopItem && (
          <form onSubmit={handleSaveShopSubmit} className="flex flex-col gap-4">
            <h3 className="text-xl font-black text-slate-800">
              商品の編集・追加
            </h3>

            <div>
              <label className="label">商品名</label>
              <input
                type="text"
                value={editingShopItem.name}
                onChange={(e) => setEditingShopItem({ ...editingShopItem, name: e.target.value })}
                required
                className="input font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">アイコン</label>
                <input
                  type="text"
                  value={editingShopItem.icon}
                  onChange={(e) => setEditingShopItem({ ...editingShopItem, icon: e.target.value })}
                  required
                  className="input font-bold text-center text-2xl"
                />
              </div>

              <div>
                <label className="label">価格（コイン）</label>
                <input
                  type="number"
                  value={editingShopItem.price === 0 ? '' : editingShopItem.price}
                  onChange={(e) =>
                    setEditingShopItem({
                      ...editingShopItem,
                      price: e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
                  onFocus={(e) => e.target.select()}
                  required
                  min={1}
                  className="input font-bold"
                  placeholder="0"
                />
              </div>
            </div>

            {editingShopItem.category === 'tablet' && (
              <div>
                <label className="label">タイマー使用分数（分）</label>
                <input
                  type="number"
                  value={editingShopItem.minutes === 0 ? '' : editingShopItem.minutes}
                  onChange={(e) =>
                    setEditingShopItem({
                      ...editingShopItem,
                      minutes: e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
                  onFocus={(e) => e.target.select()}
                  required
                  min={1}
                  className="input font-bold"
                  placeholder="0"
                />
              </div>
            )}

            <button
              type="submit"
              className="btn-pop mt-2 rounded-2xl bg-indigo-600 py-3 text-base font-black text-white shadow-[0_4px_0_#3730a3]"
            >
              保存する
            </button>
          </form>
        )}
      </Modal>

      {/* ---------------- 子ども編集モーダル（名前・PIN・年齢・カラー・コイン） ---------------- */}
      <Modal open={Boolean(editingChild)} onClose={() => setEditingChild(null)}>
        {editingChild && (
          <form onSubmit={handleSaveChildSubmit} className="flex flex-col gap-4">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <span>👤</span>
              <span>
                {state.children.some((c) => c.id === editingChild.id)
                  ? `${editingChild.name} のプロフィール変更`
                  : '新しい子どもの登録'}
              </span>
            </h3>

            <div>
              <label className="label">子どものなまえ（キャラ名・ニックネーム可）</label>
              <input
                type="text"
                value={editingChild.name}
                onChange={(e) => setEditingChild({ ...editingChild, name: e.target.value })}
                required
                className="input font-bold"
                placeholder="例: ねえね、そうた、ゆい"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                変更すると、子ども画面のヘッダーやログイン画面にリアルタイムで反映されます
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">年齢</label>
                <input
                  type="number"
                  value={editingChild.age || ''}
                  onChange={(e) =>
                    setEditingChild({
                      ...editingChild,
                      age: e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
                  onFocus={(e) => e.target.select()}
                  required
                  min={1}
                  max={18}
                  className="input font-bold"
                  placeholder="例: 7"
                />
              </div>

              <div>
                <label className="label">PINコード（4桁数字）</label>
                <input
                  type="text"
                  maxLength={4}
                  value={editingChild.pin}
                  onChange={(e) => setEditingChild({ ...editingChild, pin: e.target.value })}
                  onFocus={(e) => e.target.select()}
                  required
                  className="input font-bold text-center tracking-widest text-lg"
                  placeholder="1234"
                />
              </div>
            </div>

            {/* かんたんログイン設定 */}
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-3.5">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-xs font-black text-slate-800 block">
                    かんたんログイン（数字なしで入る）を許可する
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    ONにすると、ログイン画面で暗証番号を入力せずにワンタップで入れるボタンを表示します。
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={editingChild.allowQuickLogin !== false}
                  onChange={(e) =>
                    setEditingChild({ ...editingChild, allowQuickLogin: e.target.checked })
                  }
                  className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 ml-3 shrink-0"
                />
              </label>
            </div>

            <div>
              <label className="label">テーマカラー</label>
              <div className="flex gap-2 mt-1">
                {[
                  { key: 'pink', bg: 'bg-pink-400', label: 'ピンク' },
                  { key: 'sky', bg: 'bg-sky-400', label: 'スカイ' },
                  { key: 'lime', bg: 'bg-lime-400', label: 'ライム' },
                  { key: 'amber', bg: 'bg-amber-400', label: 'オレンジ' },
                  { key: 'violet', bg: 'bg-violet-400', label: 'パープル' },
                ].map((tc) => (
                  <button
                    type="button"
                    key={tc.key}
                    onClick={() => setEditingChild({ ...editingChild, color: tc.key })}
                    className={`btn-pop flex-1 py-2 rounded-xl text-xs font-black text-white ${tc.bg} ${
                      editingChild.color === tc.key ? 'ring-4 ring-slate-800' : 'opacity-70'
                    }`}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">所持コインの調整</label>
              <input
                type="number"
                value={editingChild.coins === 0 ? '' : editingChild.coins}
                onChange={(e) =>
                  setEditingChild({
                    ...editingChild,
                    coins: e.target.value === '' ? 0 : Number(e.target.value),
                  })
                }
                onFocus={(e) => e.target.select()}
                className="input font-bold"
                placeholder="0"
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="submit"
                className="btn-pop flex-1 rounded-2xl bg-indigo-600 py-3 text-base font-black text-white shadow-[0_4px_0_#3730a3]"
              >
                保存する
              </button>
              {state.children.some((c) => c.id === editingChild.id) && state.children.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`本当に「${editingChild.name}」を削除しますか？`)) {
                      sound.tap();
                      deleteChild(editingChild.id);
                      toast(`${editingChild.name}を削除しました`, '🗑️');
                      setEditingChild(null);
                    }
                  }}
                  className="btn-pop rounded-2xl bg-rose-100 px-4 py-3 text-sm font-black text-rose-600 hover:bg-rose-200"
                >
                  削除
                </button>
              )}
            </div>
          </form>
        )}
      </Modal>

      {/* ---------------- 親PIN変更モーダル ---------------- */}
      <Modal open={showPinModal} onClose={() => setShowPinModal(false)}>
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-black text-slate-800">
            保護者パスコードの変更
          </h3>
          <p className="text-xs text-slate-500">
            おやモードに入るための新しい4桁の数字を入力してください。
          </p>

          <input
            type="text"
            maxLength={4}
            value={newParentPin}
            onChange={(e) => setNewParentPin(e.target.value)}
            placeholder="例: 0000"
            className="input font-bold text-center text-2xl tracking-widest"
          />

          <button
            onClick={() => {
              if (newParentPin.length === 4) {
                sound.tap();
                setParentPin(newParentPin);
                toast('パスコードを変更しました', '🔐');
                setShowPinModal(false);
                setNewParentPin('');
              } else {
                sound.error();
                toast('4桁で入力してください', '⚠️');
              }
            }}
            className="btn-pop rounded-2xl bg-indigo-600 py-3 text-base font-black text-white shadow-[0_4px_0_#3730a3]"
          >
            変更する
          </button>
        </div>
      </Modal>

      {/* ---------------- タブレット招待QRコードモーダル ---------------- */}
      <Modal open={showQrModal} onClose={() => setShowQrModal(false)}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <QrCode size={28} />
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-800">
              タブレット・別端末の招待
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              子どものタブレットのカメラでQRコードを読み取るか、URLを開くだけで自動接続されます！
            </p>
          </div>

          {/* QRコード画像 */}
          <div className="relative rounded-2xl bg-white p-3 shadow-md border-2 border-emerald-200">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                getInviteUrl()
              )}`}
              alt="タブレット招待QRコード"
              className="h-48 w-48 rounded-xl object-contain"
            />
          </div>

          {/* あいことば表示 */}
          <div className="flex w-full items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs">
            <span className="font-bold text-slate-500">家族のあいことば:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-slate-800 text-sm">
                {getRoomId()}
              </span>
              <button
                type="button"
                onClick={handleCopyRoomId}
                className="btn-pop rounded-lg bg-white border border-slate-200 p-1 text-slate-600 hover:bg-slate-100"
                title="あいことばをコピー"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>

          {/* 招待URLコピーボタン */}
          <div className="flex w-full flex-col gap-2">
            <button
              type="button"
              onClick={handleCopyInviteUrl}
              className="btn-pop flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-black text-white shadow-[0_4px_0_#0d9488] active:translate-y-1 active:shadow-none"
            >
              <Share2 size={16} />
              <span>招待URLをコピー</span>
            </button>
            <p className="text-[11px] text-slate-400 break-all px-2 font-mono">
              {getInviteUrl()}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
