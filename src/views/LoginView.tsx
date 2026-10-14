import { useState } from 'react';
import type { Child } from '../types';
import { Avatar } from '../components/Avatar';
import { PinPad } from '../components/PinPad';
import { Modal, toast } from '../components/ui';
import { sound } from '../sound';
import { Shield, Sparkles, UserCheck, Key, Lock, Rocket } from 'lucide-react';
import { useSyncStatus } from '../store';
import { setRoomId, hasConfiguredRoomId } from '../supabase';
import { setParentPin } from '../actions';

export function LoginView({
  childrenList,
  parentPin,
  onSelectChild,
  onEnterParent,
}: {
  childrenList: Child[];
  parentPin: string;
  onSelectChild: (child: Child) => void;
  onEnterParent: () => void;
}) {
  const syncStatus = useSyncStatus();
  const [selectedChildForPin, setSelectedChildForPin] = useState<Child | null>(null);
  const [showParentModal, setShowParentModal] = useState(false);

  // 初回セットアップモーダル（未設定の端末で最初に開いた場合のみ表示）
  const [showSetupModal, setShowSetupModal] = useState(() => !hasConfiguredRoomId());
  const [setupRoomInput, setSetupRoomInput] = useState('');
  const [setupPinInput, setSetupPinInput] = useState('');

  const handleCompleteSetup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoom = setupRoomInput.trim();
    const cleanPin = setupPinInput.trim();

    if (!cleanRoom) {
      sound.error();
      toast('家族のあいことばを入力してください', '⚠️');
      return;
    }

    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      sound.error();
      toast('保護者PINは4桁の数字で入力してください', '⚠️');
      return;
    }

    sound.fanfare();
    setRoomId(cleanRoom);
    setParentPin(cleanPin);
    setShowSetupModal(false);
    toast('初期設定が完了しました！冒険をはじめよう！', '🎉');
  };

  const handleChildClick = (child: Child) => {
    sound.tap();
    setSelectedChildForPin(child);
  };

  const handleChildPinSubmit = (pin: string): boolean => {
    if (!selectedChildForPin) return false;
    if (pin === selectedChildForPin.pin) {
      sound.fanfare();
      const target = selectedChildForPin;
      setSelectedChildForPin(null);
      onSelectChild(target);
      return true;
    }
    return false;
  };

  const handleQuickLogin = () => {
    if (!selectedChildForPin) return;
    sound.fanfare();
    const target = selectedChildForPin;
    setSelectedChildForPin(null);
    onSelectChild(target);
  };

  const handleParentPinSubmit = (pin: string): boolean => {
    if (pin === parentPin) {
      sound.fanfare();
      setShowParentModal(false);
      onEnterParent();
      return true;
    }
    return false;
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-between p-4 sm:p-8">
      <div className="w-full max-w-4xl text-center">
        {/* タイトルバナー */}
        <div className="my-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-200/80 px-4 py-1.5 text-sm font-black text-amber-900 mb-3 shadow-sm">
            <Sparkles size={18} className="text-amber-600" />
            <span>ファミリー向け ゲーミフィケーション習慣化アプリ</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-800 tracking-tight">
            だれが あそぶかな？
          </h1>
          <p className="mt-2 text-base font-bold text-slate-500">
            じぶんの アバターを タップしてね！
          </p>
        </div>

        {/* こどもアバター一覧 */}
        <div className="my-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {childrenList.map((child) => (
            <button
              key={child.id}
              onClick={() => handleChildClick(child)}
              className="btn-pop group relative flex flex-col items-center rounded-3xl bg-white p-6 shadow-[0_10px_0_rgba(0,0,0,0.06)] border-4 border-amber-200/60 hover:border-amber-400 hover:shadow-xl transition-all"
            >
              <div className="relative">
                <Avatar
                  config={child.avatar}
                  size={140}
                  rounded="rounded-3xl shadow-lg group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-2 -right-2 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950 shadow-md">
                  {child.age}さい
                </span>
              </div>

              <div className="mt-4 text-2xl font-black text-slate-800">
                {child.name}
              </div>

              <div className="mt-2 flex items-center gap-3">
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                  <span>🪙</span>
                  <span>{child.coins}</span>
                </span>
                <span className="flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-800">
                  <span>🔥</span>
                  <span>{child.streak}日</span>
                </span>
              </div>

              <div className="mt-5 w-full rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 py-3 text-sm font-black text-white shadow-[0_4px_0_#3730a3]">
                タップして はいる！✨
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* おやモード入口 */}
      <div className="my-6 flex flex-col items-center gap-2.5">
        <button
          onClick={() => {
            sound.tap();
            setShowParentModal(true);
          }}
          className="btn-pop flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-600 shadow-md border-2 border-slate-200 hover:bg-slate-50"
        >
          <Shield size={18} className="text-indigo-600" />
          <span>おやモード（保護者ダッシュボード）はこちら</span>
        </button>
      </div>

      {/* ---------------- 初回ウェルカム・セットアップモーダル ---------------- */}
      <Modal open={showSetupModal} onClose={() => {}}>
        <div className="p-4 sm:p-6 text-center max-w-sm mx-auto">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200">
            <Rocket size={30} />
          </div>
          <h3 className="text-xl font-black text-slate-800">
            ようこそ おてつだいクエストへ！🏰
          </h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            家族みんなでリアルタイム同期して楽しむための<strong>「家族のあいことば」</strong>と、おやモードを開くための<strong>「保護者パスコード（4桁）」</strong>を設定してください。
          </p>

          <form onSubmit={handleCompleteSetup} className="mt-5 flex flex-col gap-4 text-left">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1 flex items-center gap-1">
                <Key size={14} className="text-amber-500" />
                <span>家族のあいことば（家族専用の合言葉）</span>
              </label>
              <input
                type="text"
                value={setupRoomInput}
                onChange={(e) => setSetupRoomInput(e.target.value)}
                placeholder="例: yamada-family"
                className="w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                autoFocus
              />
              <p className="mt-1 text-[11px] text-slate-400">
                ※他端末（子どものタブレット等）は後からQRコードで自動接続できます。
              </p>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1 flex items-center gap-1">
                <Lock size={14} className="text-indigo-600" />
                <span>保護者パスコード（数字4桁）</span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={setupPinInput}
                onChange={(e) => setSetupPinInput(e.target.value)}
                placeholder="例: 1234"
                className="w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 text-center text-lg font-black tracking-widest text-slate-800 focus:border-indigo-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                ※お手伝いの承認や設定画面を開くときに使います。
              </p>
            </div>

            <button
              type="submit"
              className="btn-pop mt-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3 text-sm font-black text-white shadow-[0_4px_0_#3730a3] active:translate-y-1 active:shadow-none"
            >
              <Sparkles size={18} />
              <span>設定を完了して はじめる！</span>
            </button>
          </form>
        </div>
      </Modal>

      {/* こどもPINモーダル */}
      <Modal
        open={Boolean(selectedChildForPin)}
        onClose={() => setSelectedChildForPin(null)}
      >
        {selectedChildForPin && (
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <Avatar config={selectedChildForPin.avatar} size={84} />
            </div>

            <PinPad
              title={`${selectedChildForPin.name}の 暗証番号`}
              subtitle="4けたの すうじを おしてね"
              onSubmit={handleChildPinSubmit}
              footer={
                selectedChildForPin.allowQuickLogin !== false ? (
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={handleQuickLogin}
                      className="btn-pop flex items-center justify-center gap-1.5 rounded-2xl bg-amber-100 py-3 text-sm font-black text-amber-900 hover:bg-amber-200"
                    >
                      <UserCheck size={18} />
                      <span>かんたんログイン（すうじなしではいる）</span>
                    </button>
                  </div>
                ) : undefined
              }
            />
          </div>
        )}
      </Modal>

      {/* おやPINモーダル */}
      <Modal open={showParentModal} onClose={() => setShowParentModal(false)}>
        <PinPad
          title="おやモード パスコード"
          subtitle="保護者の4けたの数字を入力してください"
          onSubmit={handleParentPinSubmit}
          tone="parent"
        />
      </Modal>
    </div>
  );
}
