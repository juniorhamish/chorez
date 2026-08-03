"use client";

import { useState } from "react";
import { ChevronDown, Layers, Clock, MessageSquare, CalendarClock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/dashboard/components/dashboard-ui-utils";
import { formatRelativeDueDate, getLastCompletedInstance } from "@/lib/dashboard/related-tasks";
import type { Task } from "@/lib/dashboard/types";

interface RelatedTasksStackProps {
  relatedTasks: Task[];
  allTasks: Task[];
  onJumpToDay: (date: Date) => void;
}

/**
 * Shown underneath a task card when other pending tasks in the same room
 * are coming up in the next few days. Renders as a collapsed "stack" of
 * peeking cards that clearly reads as an optional suggestion, and expands
 * so each suggested task can be opened to see more detail (notes from the
 * last time it was done).
 */
export default function RelatedTasksStack({ relatedTasks, allTasks, onJumpToDay }: Readonly<RelatedTasksStackProps>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  if (relatedTasks.length === 0) return null;

  const toggleTaskDetails = (taskId: string) => {
    setOpenTaskId((current) => (current === taskId ? null : taskId));
  };

  return (
    <div className="mt-2 -mx-1">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="relative w-full text-left pt-2"
          aria-expanded={false}
        >
          {/* Peeking stacked cards, purely decorative */}
          <div
            aria-hidden
            className="absolute inset-x-3 -top-1 h-3 rounded-t-3xl bg-indigo-50 border border-indigo-100/80"
          />
          <div
            aria-hidden
            className="absolute inset-x-1.5 top-0.5 h-3 rounded-t-3xl bg-indigo-50/80 border border-indigo-100/60"
          />
          <div className="relative flex items-center justify-between gap-2 px-4 py-2.5 rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 transition-colors">
            <div className="flex items-center gap-2 text-indigo-500">
              <Layers size={15} />
              <span className="text-xs font-bold">
                {relatedTasks.length} more {relatedTasks.length === 1 ? "task" : "tasks"} needed soon in this room
              </span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-300">
              Suggested
              <ChevronDown size={14} />
            </span>
          </div>
        </button>
      ) : (
        <div className="rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3 space-y-2">
          <button
            onClick={() => setIsExpanded(false)}
            aria-expanded={true}
            className="w-full flex items-center justify-between gap-2 px-1 pb-1 text-indigo-500"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={12} className="text-amber-400" />
              Optional — while you&apos;re in this room
            </span>
            <ChevronDown size={14} className="rotate-180" />
          </button>

          {relatedTasks.map((related) => {
            const isOpen = openTaskId === related.id;
            const lastCompleted = isOpen ? getLastCompletedInstance(related.chore_id, allTasks) : null;

            return (
              <div
                key={related.id}
                className="bg-white rounded-2xl border border-indigo-50 overflow-hidden"
              >
                <button
                  onClick={() => toggleTaskDetails(related.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-indigo-900 truncate">{related.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] font-bold text-indigo-400">
                      <span className="flex items-center gap-1">
                        <CalendarClock size={11} />
                        {formatRelativeDueDate(related.due_date)}
                      </span>
                      {related.estimated_duration_minutes != null && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {related.estimated_duration_minutes}m
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    size={16}
                    className={cn("shrink-0 text-indigo-300 transition-transform", isOpen && "rotate-180")}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 space-y-3 border-t border-indigo-50">
                        {lastCompleted ? (
                          <div className="pt-3 space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                              Last time
                            </p>
                            <div className="flex items-center gap-3 text-xs font-bold text-indigo-400">
                              {lastCompleted.actual_duration_minutes != null && (
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  Took {lastCompleted.actual_duration_minutes}m
                                </span>
                              )}
                            </div>
                            {lastCompleted.notes && (
                              <div className="flex gap-2 text-sm text-indigo-600/70 italic bg-indigo-50/50 p-2 rounded-xl">
                                <MessageSquare size={14} className="shrink-0 mt-0.5 opacity-50" />
                                <p className="leading-tight">{lastCompleted.notes}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="pt-3 text-xs font-bold text-indigo-300">
                            No history yet for this task.
                          </p>
                        )}
                        <button
                          onClick={() => onJumpToDay(new Date(related.due_date))}
                          className="text-xs font-bold text-indigo-500 hover:text-indigo-700 underline underline-offset-2"
                        >
                          View that day
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
