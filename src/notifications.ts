import type { AppState, NotificationSettings } from './types';
import { toast } from './components/ui';
import { sound } from './sound';

/* ---------------- Web Notification API ---------------- */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

export function sendBrowserNotification(title: string, body: string, icon = '🔔'): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notif = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `otetsudai-${Date.now()}`,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch (err) {
    console.warn('ブラウザ通知の送信に失敗しました:', err);
  }
}

/* ---------------- 統合通知ディスパッチャー ---------------- */

export function notifyAction({
  title,
  message,
  icon,
  soundType = 'fanfare',
  settings,
}: {
  title: string;
  message: string;
  icon: string;
  soundType?: 'fanfare' | 'sparkle' | 'pop' | 'none';
  settings?: NotificationSettings;
}): void {
  // アプリ内トースト通知
  toast(message, icon);

  // 音声再生
  if (settings?.soundEnabled !== false && soundType !== 'none') {
    if (soundType === 'fanfare') sound.fanfare();
    else if (soundType === 'sparkle') sound.sparkle();
    else if (soundType === 'pop') sound.pop();
  }

  // ブラウザ通知（設定で許可されており、ブラウザ権限がある場合）
  if (settings?.browserNotification) {
    sendBrowserNotification(title, message, icon);
  }
}

/* ---------------- ステート差分監視＆自動通知エンジン ---------------- */

interface WatchContext {
  currentRole: 'parent' | 'kid' | 'select';
  currentChildId: string | null;
}

let lastObservedState: AppState | null = null;
let isFirstRun = true;

/**
 * ステート変化時に差分を検知して、適切な相手に通知を送る
 */
export function checkStateChangesAndNotify(
  newState: AppState,
  context: WatchContext
): void {
  if (!lastObservedState || isFirstRun) {
    lastObservedState = structuredClone(newState);
    isFirstRun = false;
    return;
  }

  const prev = lastObservedState;
  const curr = newState;
  const settings = curr.notificationSettings;

  // 1. 【こども ➔ 親】チケット使用通知（タイマー開始）
  if (settings.ticketUsed) {
    // 新規タイマーの検知
    const newTimers = curr.timers.filter(
      (ct) => !prev.timers.some((pt) => pt.ticketId === ct.ticketId)
    );
    for (const t of newTimers) {
      const child = curr.children.find((c) => c.id === t.childId);
      const childName = child?.name ?? 'こども';
      // 親画面を開いている、または自分がその子でない場合に親向け通知
      if (context.currentRole === 'parent' || context.currentChildId !== t.childId) {
        notifyAction({
          title: '🎟️ チケットがつかわれました',
          message: `${childName} が「${t.name}」をつかいはじめました！（${t.minutes}分）`,
          icon: '⏱️',
          soundType: 'pop',
          settings,
        });
      }
    }

    // リアルチケットの利用申請検知 (status が owned -> requested に変わったもの)
    const newRequestedTickets = curr.tickets.filter((ct) => {
      if (ct.status !== 'requested') return false;
      const prevTicket = prev.tickets.find((pt) => pt.id === ct.id);
      return !prevTicket || prevTicket.status !== 'requested';
    });

    for (const rt of newRequestedTickets) {
      const child = curr.children.find((c) => c.id === rt.childId);
      const childName = child?.name ?? 'こども';
      if (context.currentRole === 'parent' || context.currentChildId !== rt.childId) {
        notifyAction({
          title: '🎁 チケットがつかいたいそうです！',
          message: `${childName} が「${rt.name}」のおねがいをしてきました！`,
          icon: '💌',
          soundType: 'fanfare',
          settings,
        });
      }
    }
  }

  // 2. 【こども ➔ 親】お手伝い完了申請通知
  if (settings.questSubmitted) {
    const newSubmissions = curr.submissions.filter(
      (cs) => !prev.submissions.some((ps) => ps.id === cs.id)
    );
    for (const sub of newSubmissions) {
      const child = curr.children.find((c) => c.id === sub.childId);
      const quest = curr.quests.find((q) => q.id === sub.questId);
      const childName = child?.name ?? 'こども';
      const questTitle = quest?.title ?? 'おてつだい';

      if (context.currentRole === 'parent' || context.currentChildId !== sub.childId) {
        notifyAction({
          title: '📝 おてつだいがおわったよ！',
          message: `${childName} が「${questTitle}」をおわらせました！確認してね`,
          icon: '✨',
          soundType: 'pop',
          settings,
        });
      }
    }
  }

  // 3. 【親 ➔ こども】プレゼント・宝箱・承認通知
  // 新規宝箱の検知
  const newChests = curr.chests.filter(
    (cc) => !prev.chests.some((pc) => pc.id === cc.id)
  );

  for (const chest of newChests) {
    const isTargetKid = context.currentRole === 'kid' && context.currentChildId === chest.childId;
    // 子ども画面を開いており、その子宛ての宝箱の場合
    if (isTargetKid) {
      if (chest.ticketItemId) {
        const item = curr.shop.find((s) => s.id === chest.ticketItemId);
        notifyAction({
          title: '🎁 プレゼントがとどいたよ！',
          message: `おうちのひとから「${item?.name ?? 'ごほうびチケット'}」がとどいたよ！`,
          icon: '🎉',
          soundType: 'fanfare',
          settings,
        });
      } else if (chest.coins > 0) {
        notifyAction({
          title: '🪙 たからばこがとどいたよ！',
          message: `おてつだい承認！🪙 ${chest.coins} コインの宝箱が届きました！`,
          icon: '👑',
          soundType: 'fanfare',
          settings,
        });
      }
    }
  }

  // 最新ステートを保存して次回の差分比較に備える
  lastObservedState = structuredClone(curr);
}
