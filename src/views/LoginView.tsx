import { useState } from 'react';
import type { Child } from '../types';
import { Avatar } from '../components/Avatar';
import { PinPad } from '../components/PinPad';
import { Modal, toast } from '../components/ui';
import { sound } from '../sound';
import { Shield, Sparkles, UserCheck, Key, Wifi, WifiOff } from 'lucide-react';
import { useSyncStatus } from '../store';
import { getRoomId, setRoomId } from '../supabase';

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
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomInput, setRoomInput] = useState(getRoomId);

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

      {/* おやモード入口 ＆ 家族のあいことば設定 */}
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

        {/* 家族の合言葉確認・変更ボタン */}
        <button
          onClick={() => {
            setRoomInput(getRoomId());
            setShowRoomModal(true);
          }}
          className="btn-pop flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 hover:bg-white hover:text-slate-700 shadow-sm"
        >
          {syncStatus === 'connected' ? (
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          ) : (
            <span className="flex h-2 w-2 rounded-full bg-slate-400"></span>
          )}
          <Key size={13} className="text-amber-500" />
          <span>家族のあいことば: <strong className="text-slate-800">{getRoomId()}</strong></span>
        </button>
      </div>

      {/* 家族のあいことば変更モーダル */}
      <Modal open={showRoomModal} onClose={() => setShowRoomModal(false)}>
        <div className="p-4 sm:p-6 text-center max-w-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Key size={24} />
          </div>
          <h3 className="text-lg font-black text-slate-800">家族のあいことば設定</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            親のスマホや他のタブレットでも同じ「あいことば」を入力すると、リアルタイムにデータが同期されます。
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = roomInput.trim() || 'default-family';
              setRoomId(clean);
              setShowRoomModal(false);
              sound.fanfare();
              toast(`家族のあいことばを「${clean}」に設定しました！`, '🔑');
            }}
            className="mt-4 flex flex-col gap-3"
          >
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="例: yamada-family"
              className="w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 text-center text-sm font-black text-slate-800 focus:border-amber-400 focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowRoomModal(false)}
                className="btn-pop flex-1 rounded-2xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="btn-pop flex-1 rounded-2xl bg-amber-400 py-2.5 text-xs font-black text-slate-900 shadow-md hover:bg-amber-300"
              >
                合言葉を変更
              </button>
            </div>
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
              subtitle={`4けたの すうじ（初期値: ${selectedChildForPin.pin}）`}
              onSubmit={handleChildPinSubmit}
              footer={
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleQuickLogin}
                    className="btn-pop flex items-center justify-center gap-1.5 rounded-2xl bg-amber-100 py-3 text-sm font-black text-amber-900 hover:bg-amber-200"
                  >
                    <UserCheck size={18} />
                    <span>かんたんログイン（すうじなしではいる）</span>
                  </button>
                </div>
              }
            />
          </div>
        )}
      </Modal>

      {/* おやPINモーダル */}
      <Modal open={showParentModal} onClose={() => setShowParentModal(false)}>
        <PinPad
          title="おやモード パスコード"
          subtitle="4けたの数字を入力してください（初期値: 0000）"
          onSubmit={handleParentPinSubmit}
          tone="parent"
        />
      </Modal>
    </div>
  );
}
