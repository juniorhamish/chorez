"use client";

import { X, Sparkles, UserIcon, CalendarClock, Undo2, Loader2, PartyPopper, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import type { AppliedActionResult } from "@/lib/schedule-optimization";
import type { HouseholdUser } from "@/lib/dashboard/types";
import { MONTH_LABELS } from "@/lib/dashboard/date-utils";

interface AiOptimizationSummaryModalProps {
  appliedActions: AppliedActionResult[] | null;
  tasksConsidered: number | null;
  error: string | null;
  users: HouseholdUser[];
  canUndo: boolean;
  isUndoing: boolean;
  onClose: () => void;
  onUndo: () => Promise<void>;
}

/** Formats a `YYYY-MM-DD` date string as e.g. "Mon 12". */
function formatShortDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
}

export default function AiOptimizationSummaryModal({
  appliedActions,
  tasksConsidered,
  error,
  users,
  canUndo,
  isUndoing,
  onClose,
  onUndo,
}: Readonly<AiOptimizationSummaryModalProps>) {
  const userName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    return users.find((u) => u.id === userId)?.name ?? "Someone";
  };

  const hasChanges = !!appliedActions && appliedActions.length > 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isUndoing && onClose()}
        className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-40"
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 z-50 shadow-2xl max-w-lg mx-auto border-t border-indigo-50 max-h-[85vh] overflow-y-auto"
      >
        <div className="w-12 h-1.5 bg-indigo-100 rounded-full mx-auto mb-8" />

        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-black leading-tight">AI Schedule Optimization</h2>
              {tasksConsidered != null && (
                <p className="text-indigo-400 font-bold text-sm">
                  Reviewed {tasksConsidered} task{tasksConsidered === 1 ? "" : "s"} this week
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUndoing}
            className="p-2 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-indigo-300" />
          </button>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="flex gap-3 bg-rose-50 border border-rose-100 p-5 rounded-3xl">
              <AlertTriangle size={20} className="text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-rose-700 font-bold mb-1">Couldn&apos;t optimize the schedule</p>
                <p className="text-rose-600/80 text-sm font-medium leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {!error && !hasChanges && (
            <div className="flex flex-col items-center text-center gap-3 bg-emerald-50 border border-emerald-100 p-8 rounded-3xl">
              <PartyPopper size={28} className="text-emerald-500" />
              <p className="text-emerald-700 font-bold">Your schedule is already optimized!</p>
              <p className="text-emerald-600/80 text-sm font-medium">No changes were needed this time.</p>
            </div>
          )}

          {!error && hasChanges && (
            <div className="space-y-3">
              {appliedActions!.map((action, index) => (
                <div
                  key={`${action.assignmentId}-${index}`}
                  className="bg-indigo-50/50 border border-indigo-50 p-4 rounded-3xl"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="font-bold text-sm leading-tight">{action.chore}</p>
                    {action.room && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-white px-2 py-0.5 rounded-md shrink-0">
                        {action.room}
                      </span>
                    )}
                  </div>
                  {action.type === "assign" ? (
                    <div className="flex items-center gap-1.5 text-sm font-bold text-indigo-600">
                      <UserIcon size={14} className="text-indigo-400 shrink-0" />
                      <span className="text-indigo-400 font-medium">{userName(action.previousUserId)}</span>
                      <span className="text-indigo-300">→</span>
                      <span>{userName(action.newUserId)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm font-bold text-indigo-600">
                      <CalendarClock size={14} className="text-indigo-400 shrink-0" />
                      <span className="text-indigo-400 font-medium">{formatShortDate(action.previousDueDate)}</span>
                      <span className="text-indigo-300">→</span>
                      <span>{formatShortDate(action.newDueDate)}</span>
                    </div>
                  )}
                  {action.reason && (
                    <p className="text-xs text-indigo-500/70 italic mt-2 leading-snug">{action.reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            {canUndo && (
              <button
                onClick={onUndo}
                disabled={isUndoing}
                className="w-full bg-rose-50 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed text-rose-600 py-4 rounded-4xl font-black text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isUndoing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Undoing...
                  </>
                ) : (
                  <>
                    <Undo2 size={18} />
                    Undo These Changes
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isUndoing}
              className="w-full bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-600 py-4 rounded-4xl font-bold transition-all active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
