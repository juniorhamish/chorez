import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_STOPWATCH_MINUTES,
  STOPWATCH_STORAGE_KEY,
  STOPWATCH_STORAGE_VERSION,
  useStopwatch,
} from "./useStopwatch";

const TASK = { id: "task-1" } as import("@/lib/dashboard/types").Task;
const OTHER_TASK = { id: "task-2" } as import("@/lib/dashboard/types").Task;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-06-10T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useStopwatch", () => {
  it("starts with no running stopwatch", () => {
    const { result } = renderHook(() => useStopwatch());
    expect(result.current.stopwatch).toBeNull();
    expect(result.current.stopwatchElapsedMs).toBe(0);
    expect(result.current.isStopwatchCapped).toBe(false);
  });

  it("starting the stopwatch records the task and persists it to localStorage", () => {
    const { result } = renderHook(() => useStopwatch());

    act(() => {
      result.current.startStopwatch(TASK);
    });

    expect(result.current.stopwatch).toEqual({ taskId: "task-1", startedAt: Date.now() });
    expect(JSON.parse(localStorage.getItem(STOPWATCH_STORAGE_KEY)!)).toEqual({
      version: STOPWATCH_STORAGE_VERSION,
      taskId: "task-1",
      startedAt: Date.now(),
    });
  });

  it("restores a running stopwatch from localStorage on mount", () => {
    localStorage.setItem(
      STOPWATCH_STORAGE_KEY,
      JSON.stringify({ version: STOPWATCH_STORAGE_VERSION, taskId: "task-1", startedAt: Date.now() - 5000 })
    );

    const { result } = renderHook(() => useStopwatch());

    expect(result.current.stopwatch).toEqual({ taskId: "task-1", startedAt: Date.now() - 5000 });
  });

  it("ignores corrupt localStorage content when restoring on mount", () => {
    localStorage.setItem(STOPWATCH_STORAGE_KEY, "not-json");

    const { result } = renderHook(() => useStopwatch());

    expect(result.current.stopwatch).toBeNull();
  });

  it("ignores a legacy/mismatched-version payload when restoring on mount", () => {
    localStorage.setItem(
      STOPWATCH_STORAGE_KEY,
      JSON.stringify({ taskId: "task-1", startedAt: Date.now() - 5000 }) // no `version` field, e.g. pre-versioning format
    );

    const { result } = renderHook(() => useStopwatch());

    expect(result.current.stopwatch).toBeNull();
  });

  it("stopping the stopwatch for the running task clears it, removes it from localStorage, and returns the elapsed minutes", () => {
    const { result } = renderHook(() => useStopwatch());

    act(() => {
      result.current.startStopwatch(TASK);
    });
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
    });

    let stopResult: { minutes: number; capped: boolean } | null = null;
    act(() => {
      stopResult = result.current.stopStopwatch(TASK);
    });

    expect(stopResult).toEqual({ minutes: 5, capped: false });
    expect(result.current.stopwatch).toBeNull();
    expect(localStorage.getItem(STOPWATCH_STORAGE_KEY)).toBeNull();
  });

  it("stopping the stopwatch for a task that isn't running returns null and leaves the stopwatch untouched", () => {
    const { result } = renderHook(() => useStopwatch());

    act(() => {
      result.current.startStopwatch(TASK);
    });

    let stopResult: { minutes: number; capped: boolean } | null = null;
    act(() => {
      stopResult = result.current.stopStopwatch(OTHER_TASK);
    });

    expect(stopResult).toBeNull();
    expect(result.current.stopwatch).toEqual({ taskId: "task-1", startedAt: Date.now() });
  });

  it("caps the elapsed/display time and reports it as capped once past MAX_STOPWATCH_MINUTES", () => {
    const { result } = renderHook(() => useStopwatch());

    act(() => {
      result.current.startStopwatch(TASK);
    });
    act(() => {
      vi.advanceTimersByTime((MAX_STOPWATCH_MINUTES + 30) * 60 * 1000);
    });

    expect(result.current.isStopwatchCapped).toBe(true);
    expect(result.current.stopwatchDisplayMs).toBe(MAX_STOPWATCH_MINUTES * 60 * 1000);
    expect(result.current.stopwatchElapsedMs).toBe((MAX_STOPWATCH_MINUTES + 30) * 60 * 1000);

    let stopResult: { minutes: number; capped: boolean } | null = null;
    act(() => {
      stopResult = result.current.stopStopwatch(TASK);
    });

    expect(stopResult).toEqual({ minutes: MAX_STOPWATCH_MINUTES, capped: true });
  });

  it("exposes wasStopwatchCapped as independent state that can be toggled", () => {
    const { result } = renderHook(() => useStopwatch());

    expect(result.current.wasStopwatchCapped).toBe(false);

    act(() => {
      result.current.setWasStopwatchCapped(true);
    });

    expect(result.current.wasStopwatchCapped).toBe(true);
  });

  it("clearStopwatch clears the running stopwatch and removes it from localStorage", () => {
    const { result } = renderHook(() => useStopwatch());

    act(() => {
      result.current.startStopwatch(TASK);
    });
    act(() => {
      result.current.clearStopwatch();
    });

    expect(result.current.stopwatch).toBeNull();
    expect(localStorage.getItem(STOPWATCH_STORAGE_KEY)).toBeNull();
  });
});
