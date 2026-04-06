export function formatMinutesToClock(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (safeMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatSecondsToClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/** Hours (unpadded) : MM : SS — e.g. `1:05:03`, `0:29:00`. */
export function formatSecondsAsHMS(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = safeSeconds % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function getElapsedMinutes(startedAt?: string | null) {
  if (!startedAt) {
    return 0;
  }
  const startMs = new Date(startedAt).getTime();
  if (Number.isNaN(startMs)) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - startMs) / 60000));
}

