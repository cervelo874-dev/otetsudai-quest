export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** ユーザー操作（クリック）内で呼ぶこと */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const res = await Notification.requestPermission();
    return res === 'granted';
  } catch {
    return false;
  }
}

export function notify(title: string, body: string): void {
  if (!notificationSupported() || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      tag: 'otetsudai-timer',
      requireInteraction: true,
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏰</text></svg>",
    } as NotificationOptions);
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* Android Chrome など Service Worker 経由が必須の環境では無視 */
  }
}
