import { AppState } from 'react-native';

/** Refresh local-day data at midnight and whenever the app returns to the foreground. */
export function observeDailyRefresh(refresh: () => void): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;

  const schedule = () => {
    clearTimeout(timer);
    const now = new Date();
    // Use the next local midnight, including 23/25-hour daylight-saving days.
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    timer = setTimeout(() => {
      if (stopped) return;
      refresh();
      schedule();
    }, midnight.getTime() - now.getTime());
  };

  schedule();
  const subscription = AppState.addEventListener('change', (state) => {
    if (state !== 'active' || stopped) return;
    refresh();
    schedule();
  });

  return () => {
    stopped = true;
    clearTimeout(timer);
    subscription.remove();
  };
}
