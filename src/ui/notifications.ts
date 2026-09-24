// Local notifications, kept deliberately thin.
//
// There is no server and no push subscription: a notification can only be
// raised while the app is alive (open, or running in the background). Callers
// must not promise more than that, and every failure here is silent — a
// reminder is a convenience, never something the app depends on.

export type NotificationSupport = 'unsupported' | 'denied' | 'prompt' | 'granted';

export function notificationSupport(): NotificationSupport {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  const permission = Notification.permission;
  return permission === 'denied' || permission === 'granted' ? permission : 'prompt';
}

export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission === 'denied' || permission === 'granted' ? permission : 'prompt';
  } catch {
    return 'unsupported';
  }
}

/** Raises one notification. `tag` keeps repeats from stacking up. */
export function showLocalNotification(title: string, body: string, tag: string): void {
  if (notificationSupport() !== 'granted') return;
  const options = { body, tag, badge: undefined, icon: undefined };
  const serviceWorker = navigator.serviceWorker;
  if (serviceWorker !== undefined) {
    void serviceWorker.ready
      .then((registration) => registration.showNotification(title, options))
      .catch(() => {
        // No registration (or the platform refused): fall through silently.
      });
    return;
  }
  try {
    new Notification(title, options);
  } catch {
    // Notification constructors throw on some platforms; nothing to report.
  }
}
