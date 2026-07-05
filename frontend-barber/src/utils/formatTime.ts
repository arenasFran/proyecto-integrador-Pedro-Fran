export function formatTime(time: string): string {
  const [h, m] = time.split(':');
  return `${h}:${m}`;
}
