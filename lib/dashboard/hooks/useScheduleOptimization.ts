import { useState } from "react";
import {
  triggerScheduleOptimization,
  undoScheduleOptimization,
  type ScheduleOptimizationRun,
} from "@/lib/actions/schedule-optimization-actions";
import type { AppliedActionResult, HouseholdOptimizationResult } from "@/lib/schedule-optimization";

/**
 * Owns the state for the admin-only "Optimize with AI" flow: kicking off the
 * (slow, ~30s) Gemini-backed optimization without blocking the rest of the
 * dashboard, surfacing a human-readable summary once it completes, and
 * letting the admin undo it afterwards (even after a page refresh, via
 * `initialLastRun`).
 */
export function useScheduleOptimization(initialLastRun: ScheduleOptimizationRun | null) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<HouseholdOptimizationResult | null>(null);
  const [lastRun, setLastRun] = useState<ScheduleOptimizationRun | null>(initialLastRun);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  const runOptimization = async () => {
    setIsOptimizing(true);
    setOptimizationError(null);
    try {
      const result = await triggerScheduleOptimization();
      setLastResult(result);
      setIsSummaryOpen(true);
      if (result.runId) {
        setLastRun({
          id: result.runId,
          weekStart: result.weekStart,
          weekEnd: result.weekEnd,
          tasksConsidered: result.tasksConsidered,
          appliedActions: result.appliedActions as AppliedActionResult[],
          createdAt: new Date().toISOString(),
        });
      } else {
        setLastRun(null);
      }
    } catch (error) {
      setOptimizationError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      setIsSummaryOpen(true);
    } finally {
      setIsOptimizing(false);
    }
  };

  const viewLastRun = () => {
    setOptimizationError(null);
    setLastResult(null);
    setIsSummaryOpen(true);
  };

  const closeSummary = () => setIsSummaryOpen(false);

  const undoLastRun = async () => {
    if (!lastRun) return;
    setIsUndoing(true);
    try {
      await undoScheduleOptimization(lastRun.id);
      setLastRun(null);
      setLastResult(null);
      setIsSummaryOpen(false);
    } catch (error) {
      setOptimizationError(error instanceof Error ? error.message : "Failed to undo. Please try again.");
    } finally {
      setIsUndoing(false);
    }
  };

  return {
    isOptimizing,
    optimizationError,
    lastResult,
    lastRun,
    isSummaryOpen,
    isUndoing,
    runOptimization,
    viewLastRun,
    closeSummary,
    undoLastRun,
  };
}
