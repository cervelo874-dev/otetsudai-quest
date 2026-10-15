import {
  isNotificationSupported,
  requestNotificationPermission,
  sendBrowserNotification,
} from './notifications';

export const notificationSupported = isNotificationSupported;
export const ensureNotificationPermission = requestNotificationPermission;

export function notify(title: string, body: string): void {
  sendBrowserNotification(title, body, '⏰');
}
