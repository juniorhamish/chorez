"use client";

import { memo, type Ref } from "react";
import {
  CheckCircle2,
  Star,
  Clock,
  User as UserIcon,
  Check,
  Repeat,
  Trash2,
  Loader2,
  MessageSquare,
  Timer,
  Square,
  DoorOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/dashboard/components/dashboard-ui-utils";
import { formatStopwatchTime } from "@/lib/dashboard/date-utils";
import type { Task } from "@/lib/dashboard/types";

interface TaskCardProps {
  task: Task;
  isFavorite: boolean;
  toggleFavoriteTask: (choreId: string) => void;
  openEditFrequency: (task: Task) => void;
  openEditRoom: (task: Task) => void;
  onDeleteChore: (task: Task) => void;
  stopwatch: { taskId: string; startedAt: number } | null;
  stopwatchDisplayMs: number;
  isStopwatchCapped: boolean;
  startStopwatch: (task: Task) => void;
  handleStopStopwatch: (task: Task) => void;
  handleAssignToSelf: (assignmentId: string) => Promise<void>;
  isAssigningTask: string | null;
  handleFinishTask: (task: Task) => void;
  ref?: Ref<HTMLDivElement>;
}

function TaskCard({
  task,
  isFavorite,
  toggleFavoriteTask,
  openEditFrequency,
  openEditRoom,
  onDeleteChore,
  stopwatch,
  stopwatchDisplayMs,
  isStopwatchCapped,
  startStopwatch,
  handleStopStopwatch,
  handleAssignToSelf,
  isAssigningTask,
  handleFinishTask,
  ref,
}: Readonly<TaskCardProps>) {
  const isCompleted = task.status === 'completed';
  const avatarColor = task.assigned_user_color || "bg-indigo-100 text-indigo-700";
  const durationLabel = task.estimated_duration_minutes != null
    ? `${task.estimated_duration_minutes}m`
    : "—";

  const completedAtTime = task.completed_at 
    ? new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const isTimingThisTask = stopwatch?.taskId === task.id;
  const isTimingOtherTask = !!stopwatch && !isTimingThisTask;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "p-5 rounded-4xl border transition-all group",
        isCompleted 
          ? "bg-indigo-50/30 border-indigo-100 opacity-80" 
          : "bg-white border-indigo-50 shadow-sm hover:shadow-md"
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-md">
              {task.room_name ?? "No Room"}
            </span>
            {!isCompleted && (
              <button onClick={() => toggleFavoriteTask(task.chore_id)}>
                <Star 
                  size={16} 
                  className={cn(
                    "transition-all active:scale-125",
                    isFavorite ? "fill-amber-400 text-amber-400" : "text-indigo-100 hover:text-indigo-300"
                  )} 
                />
              </button>
            )}
            {isCompleted && (
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Check size={10} />
                Done
              </span>
            )}
            <button 
              onClick={() => openEditFrequency(task)}
              aria-label="Edit frequency"
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity p-1 -m-1 text-indigo-300 md:text-indigo-200 hover:text-indigo-500 active:scale-125"
              title="Edit frequency"
            >
              <Repeat size={16} />
            </button>
            <button 
              onClick={() => openEditRoom(task)}
              aria-label="Change room"
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity p-1 -m-1 text-indigo-300 md:text-indigo-200 hover:text-indigo-500 active:scale-125"
              title="Change room"
            >
              <DoorOpen size={16} />
            </button>
            <button 
              onClick={() => onDeleteChore(task)}
              aria-label="Delete chore template"
              className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity p-1 -m-1 text-indigo-300 md:text-indigo-200 hover:text-rose-400 active:scale-125"
              title="Delete chore template"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <h3 className={cn(
            "font-bold text-lg leading-tight transition-colors",
            isCompleted ? "text-indigo-900/60" : "group-hover:text-indigo-600"
          )}>
            {task.title}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={cn("w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center font-black text-sm shadow-sm", avatarColor)}>
            {task.assigned_user_avatar_url ? (
              <img
                src={task.assigned_user_avatar_url}
                alt={task.assigned_user_name ?? "Assigned user"}
                className="w-full h-full object-cover"
              />
            ) : (
              task.assigned_user_avatar ?? "?"
            )}
          </div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">
            {isCompleted ? (
              <>Completed by {task.assigned_user_name?.split(' ')[0] ?? "User"}</>
            ) : (
              task.assigned_user_name ?? "Unassigned"
            )}
          </span>
        </div>
      </div>

      {isCompleted && (
        <div className="mt-4 space-y-3 p-4 bg-white/50 rounded-2xl border border-indigo-50/50">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Clock size={12} />
                Took {task.actual_duration_minutes}m
              </div>
              {completedAtTime && (
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  {task.effort_rating}/5
                </div>
              )}
            </div>
            <div suppressHydrationWarning className="text-[10px] uppercase tracking-wider">{completedAtTime}</div>
          </div>
          {task.notes && (
            <div className="flex gap-2 text-sm text-indigo-600/70 italic bg-indigo-50/30 p-2 rounded-xl">
              <MessageSquare size={14} className="shrink-0 mt-0.5 opacity-50" />
              <p className="leading-tight">{task.notes}</p>
            </div>
          )}
        </div>
      )}

      {!isCompleted && (
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-4 text-indigo-400">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Clock size={14} />
              {durationLabel}
            </div>
            {isTimingThisTask && (
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-black tabular-nums",
                isStopwatchCapped ? "text-rose-500" : "text-emerald-600"
              )}>
                <Timer size={14} className={cn(!isStopwatchCapped && "animate-pulse")} />
                {formatStopwatchTime(stopwatchDisplayMs)}
                {isStopwatchCapped && <span className="uppercase tracking-wide">Maxed</span>}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {!task.assigned_user_id && (
              <button 
                onClick={() => handleAssignToSelf(task.id)}
                disabled={isAssigningTask === task.id}
                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isAssigningTask === task.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <UserIcon size={16} />
                )}
                Assign to Me
              </button>
            )}
            {isTimingThisTask ? (
              <button
                onClick={() => handleStopStopwatch(task)}
                aria-label="Stop stopwatch"
                title="Stop timer"
                className="bg-amber-100 hover:bg-amber-200 text-amber-700 p-2.5 rounded-2xl transition-all active:scale-95"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                onClick={() => startStopwatch(task)}
                disabled={isTimingOtherTask}
                aria-label="Start stopwatch"
                title={isTimingOtherTask ? "Stop the other running timer first" : "Time this task"}
                className="bg-indigo-100 hover:bg-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed text-indigo-700 p-2.5 rounded-2xl transition-all active:scale-95"
              >
                <Timer size={16} />
              </button>
            )}
            <button 
              onClick={() => handleFinishTask(task)}
              className="bg-[#88A47C] hover:bg-[#748D69] text-white px-6 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              Done
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default memo(TaskCard);
