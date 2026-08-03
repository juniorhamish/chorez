import { useCallback, useEffect, useState } from "react";
import type { Task } from "@/lib/dashboard/types";

/** localStorage key used to persist the running stopwatch across reloads (e.g. after the device locks). */
const STOPWATCH_STORAGE_KEY = "chorez_stopwatch";
/** Bumped whenever the shape of the persisted stopwatch payload changes, so old/mismatched entries are ignored instead of misread. */
const STOPWATCH_STORAGE_VERSION = 1;
/** Caps how long a single stopwatch run can count, so a forgotten timer never pre-fills a huge duration. */
const MAX_STOPWATCH_MINUTES = 180;

/**
 * Manages the running-task stopwatch: a wall-clock start time (not a running
 * counter) so the elapsed time stays correct even if the device is locked or
 * the app is fully reloaded while timing a task, persisted to localStorage so
 * it survives reloads.
 */
export function useStopwatch() {
  // Stopwatch: persisted as a wall-clock start time (not a running counter) so
  // the elapsed time stays correct even if the device is locked or the app
  // is fully reloaded while timing a task.
  const [stopwatch, setStopwatch] = useState<{ taskId: string; startedAt: number } | null>(null);
  const [stopwatchNow, setStopwatchNow] = useState(() => Date.now());
  const [wasStopwatchCapped, setWasStopwatchCapped] = useState(false);

  // Restore a running stopwatch (if any) after a reload — this is what lets timing
  // survive the device being locked and the app/tab being reopened later.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STOPWATCH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          parsed.version === STOPWATCH_STORAGE_VERSION &&
          typeof parsed.taskId === "string" &&
          typeof parsed.startedAt === "number"
        ) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setStopwatch({ taskId: parsed.taskId, startedAt: parsed.startedAt });
        }
      }
    } catch {
      // ignore corrupt/unavailable/legacy storage
    }
  }, []);

  // Keep the displayed elapsed time in sync with the wall clock while a stopwatch is
  // running. Recomputing from `startedAt` (rather than counting ticks) means the value
  // is still correct even after the tab was frozen/backgrounded for a while.
  useEffect(() => {
    if (!stopwatch) return;
    const sync = () => setStopwatchNow(Date.now());
    sync();
    const interval = setInterval(sync, 1000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", sync);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", sync);
    };
  }, [stopwatch]);

  const stopwatchElapsedMs = stopwatch ? Math.max(0, stopwatchNow - stopwatch.startedAt) : 0;
  const stopwatchCapMs = MAX_STOPWATCH_MINUTES * 60 * 1000;
  const stopwatchDisplayMs = Math.min(stopwatchElapsedMs, stopwatchCapMs);
  const isStopwatchCapped = stopwatchElapsedMs >= stopwatchCapMs;

  const clearStopwatch = useCallback(() => {
    setStopwatch(null);
    try {
      localStorage.removeItem(STOPWATCH_STORAGE_KEY);
    } catch {
      // ignore unavailable storage
    }
  }, []);

  const startStopwatch = useCallback((task: Task) => {
    const next = { taskId: task.id, startedAt: Date.now() };
    setStopwatch(next);
    setStopwatchNow(next.startedAt);
    try {
      localStorage.setItem(
        STOPWATCH_STORAGE_KEY,
        JSON.stringify({ version: STOPWATCH_STORAGE_VERSION, ...next })
      );
    } catch {
      // ignore unavailable storage
    }
  }, []);

  // Stops the running stopwatch for `task` (if it's the one running) and returns
  // the elapsed minutes (capped at MAX_STOPWATCH_MINUTES) plus whether it was capped,
  // so the caller can pre-fill the completion dialog. Returns null when `task` isn't
  // the one currently being timed.
  const stopStopwatch = useCallback((task: Task) => {
    if (!stopwatch || stopwatch.taskId !== task.id) return null;
    const rawElapsedMs = Date.now() - stopwatch.startedAt;
    const cappedMs = Math.min(rawElapsedMs, MAX_STOPWATCH_MINUTES * 60 * 1000);
    const minutes = Math.max(1, Math.round(cappedMs / 60000));
    const capped = rawElapsedMs > MAX_STOPWATCH_MINUTES * 60 * 1000;
    clearStopwatch();
    return { minutes, capped };
  }, [stopwatch, clearStopwatch]);

  return {
    stopwatch,
    stopwatchElapsedMs,
    stopwatchDisplayMs,
    isStopwatchCapped,
    wasStopwatchCapped,
    setWasStopwatchCapped,
    startStopwatch,
    stopStopwatch,
    clearStopwatch,
  };
}

export { STOPWATCH_STORAGE_KEY, STOPWATCH_STORAGE_VERSION, MAX_STOPWATCH_MINUTES };
