export function zonedDayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function countStampsOnLocalDay(times: string[], now: Date, timeZone: string): number {
  const today = zonedDayKey(now, timeZone);
  return times.filter((time) => zonedDayKey(new Date(time), timeZone) === today).length;
}

export function formatWhen(iso: string, now: Date): string {
  const delta = now.getTime() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return minutes === 1 ? '1 min ago' : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
}

export function formatWait(retryAt: string, now: Date): string {
  const ms = new Date(retryAt).getTime() - now.getTime();
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}
