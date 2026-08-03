"use client";

import { useMemo } from "react";
import { Search, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/dashboard/components/dashboard-ui-utils";
import { getDayLabel } from "@/lib/dashboard/date-utils";
import { getRelatedUpcomingTasks } from "@/lib/dashboard/related-tasks";
import type { Task } from "@/lib/dashboard/types";
import TaskCard from "@/app/dashboard/components/TaskCard";

interface TaskListProps {
  viewMode: 'mine' | 'household';
  filteredTasks: Task[];
  allTasks: Task[];
  selectedDay: Date;
  isRefreshing: boolean;
  handleRefresh: () => Promise<void>;
  favoriteTasks: string[];
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
  onJumpToDay: (date: Date) => void;
}

export default function TaskList({
  viewMode,
  filteredTasks,
  allTasks,
  selectedDay,
  isRefreshing,
  handleRefresh,
  favoriteTasks,
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
  onJumpToDay,
}: Readonly<TaskListProps>) {
  // For each visible task, find other pending tasks in the same room due
  // over the next few days, so they can be suggested as optional add-ons.
  // A chore is only ever suggested once across the whole list (tracked via
  // `shownChoreIds`), so e.g. a daily task isn't offered under every card.
  const relatedTasksByTaskId = useMemo(() => {
    const map = new Map<string, Task[]>();
    const shownChoreIds = new Set<string>();

    for (const task of filteredTasks) {
      if (task.status === 'completed') continue;

      const related = getRelatedUpcomingTasks(task, allTasks, { excludeChoreIds: shownChoreIds });
      if (related.length > 0) {
        map.set(task.id, related);
        related.forEach((r) => shownChoreIds.add(r.chore_id));
      }
    }

    return map;
  }, [filteredTasks, allTasks]);

  return (
    <section className="mt-6 px-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">
            {viewMode === 'mine' ? "My Tasks" : "Household Tasks"}
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh tasks"
            title="Refresh tasks"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={12} className={cn(isRefreshing && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase tracking-widest">
          {getDayLabel(selectedDay)}
        </span>
      </div>
      
      <AnimatePresence mode="popLayout">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isFavorite={favoriteTasks.includes(task.chore_id)}
              toggleFavoriteTask={toggleFavoriteTask}
              openEditFrequency={openEditFrequency}
              openEditRoom={openEditRoom}
              onDeleteChore={onDeleteChore}
              stopwatch={stopwatch}
              stopwatchDisplayMs={stopwatchDisplayMs}
              isStopwatchCapped={isStopwatchCapped}
              startStopwatch={startStopwatch}
              handleStopStopwatch={handleStopStopwatch}
              handleAssignToSelf={handleAssignToSelf}
              isAssigningTask={isAssigningTask}
              handleFinishTask={handleFinishTask}
              relatedTasks={relatedTasksByTaskId.get(task.id) ?? []}
              allTasks={allTasks}
              onJumpToDay={onJumpToDay}
            />
          ))
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="py-12 flex flex-col items-center text-center opacity-40"
          >
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <Search size={24} />
            </div>
            <p className="font-bold">No tasks found for this selection</p>
            <p className="text-sm">Enjoy your free time!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
