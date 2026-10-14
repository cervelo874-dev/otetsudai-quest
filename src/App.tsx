import { useState, useEffect } from 'react';
import { useStore } from './store';
import type { Child } from './types';
import { TopNav } from './components/TopNav';
import { ToastHost, Modal } from './components/ui';
import { PinPad } from './components/PinPad';
import { LoginView } from './views/LoginView';
import { KidView } from './views/KidView';
import { ParentView } from './views/ParentView';
import { sound } from './sound';
import { checkStateChangesAndNotify } from './notifications';

interface DeviceSession {
  mode: 'login' | 'kid' | 'parent';
  activeChildId: string | null;
}

const DEVICE_SESSION_KEY = 'otetsudai-device-session';

function loadDeviceSession(): DeviceSession {
  try {
    const raw = localStorage.getItem(DEVICE_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.mode === 'login' || parsed.mode === 'kid' || parsed.mode === 'parent')) {
        return {
          mode: parsed.mode,
          activeChildId: typeof parsed.activeChildId === 'string' ? parsed.activeChildId : null,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return { mode: 'login', activeChildId: null };
}

function saveDeviceSession(mode: 'login' | 'kid' | 'parent', activeChildId: string | null) {
  try {
    localStorage.setItem(DEVICE_SESSION_KEY, JSON.stringify({ mode, activeChildId }));
  } catch {
    /* ignore */
  }
}

export default function App() {
  const state = useStore();
  const [initialSession] = useState(loadDeviceSession);
  const [mode, setModeState] = useState<'login' | 'kid' | 'parent'>(initialSession.mode);
  const [activeChildId, setActiveChildIdState] = useState<string | null>(initialSession.activeChildId);

  // 端末ローカルセッションの更新
  const updateSession = (newMode: 'login' | 'kid' | 'parent', newChildId: string | null) => {
    setModeState(newMode);
    setActiveChildIdState(newChildId);
    saveDeviceSession(newMode, newChildId);
  };

  // 最初のインタラクションで Web Audio API をロック解除
  useEffect(() => {
    const unlock = () => {
      sound.unlock();
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  // 端末間同期・ステート変化によるアクション通知の監視
  useEffect(() => {
    checkStateChangesAndNotify(state, {
      currentRole: mode === 'parent' ? 'parent' : mode === 'kid' ? 'kid' : 'select',
      currentChildId: activeChildId,
    });
  }, [state, mode, activeChildId]);

  // 選択中の子ども情報を取得
  const currentChild = activeChildId
    ? state.children.find((c) => c.id === activeChildId) ?? state.children[0]
    : null;

  // 子ども選択ログイン時
  const handleSelectChild = (child: Child) => {
    updateSession('kid', child.id);
  };

  const [showParentPinModal, setShowParentPinModal] = useState(false);

  // おやモードログイン時
  const handleEnterParent = () => {
    updateSession('parent', activeChildId);
  };

  // 上部バーからの切り替え
  const handleSwitchMode = (target: 'kid' | 'parent') => {
    if (target === 'kid') {
      const childId = activeChildId || (state.children.length > 0 ? state.children[0].id : null);
      updateSession('kid', childId);
    } else {
      // おやがめんへの切り替え時は保護者PIN認証を要求
      setShowParentPinModal(true);
    }
  };

  const handleParentPinSubmit = (pin: string): boolean => {
    if (pin === state.parentPin) {
      sound.fanfare();
      setShowParentPinModal(false);
      updateSession('parent', activeChildId);
      return true;
    }
    sound.error();
    return false;
  };

  const handleBackToSelect = () => {
    updateSession('login', null);
  };

  return (
    <div className="min-h-screen bg-[#FFF8EC] text-slate-800 font-sans selection:bg-amber-200">
      {/* トースト表示ホスト */}
      <ToastHost />

      {/* 常設ワンタップ切替バー */}
      <TopNav
        mode={mode}
        onSwitchMode={handleSwitchMode}
        currentChildName={currentChild?.name}
        onBackToSelect={handleBackToSelect}
      />

      <main className="w-full">
        {mode === 'login' && (
          <LoginView
            childrenList={state.children}
            parentPin={state.parentPin}
            onSelectChild={handleSelectChild}
            onEnterParent={handleEnterParent}
          />
        )}

        {mode === 'kid' && currentChild && (
          <KidView
            child={currentChild}
            state={state}
          />
        )}

        {mode === 'parent' && (
          <ParentView state={state} />
        )}
      </main>

      {/* ヘッダーからのおやモードPIN認証モーダル */}
      <Modal open={showParentPinModal} onClose={() => setShowParentPinModal(false)}>
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
