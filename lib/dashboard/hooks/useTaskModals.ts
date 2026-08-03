import { useState } from "react";
import type { ChoreFrequency } from "@/lib/actions/chore-actions";
import type { Task } from "@/lib/dashboard/types";

/**
 * Owns the open/close + form state for the task-related modals: completing a
 * task, deleting a chore/task instance, editing a chore's frequency, and
 * editing a chore's room. The actual server-action-calling handlers stay in
 * the component (they also touch other hooks, e.g. the stopwatch), but the
 * modal open/close and form-field state lives here.
 */
export function useTaskModals() {
  // Complete task modal state
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [rating, setRating] = useState(0);
  const [actualMinutes, setActualMinutes] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [isCompletingTask, setIsCompletingTask] = useState(false);

  const [isAssigningTask, setIsAssigningTask] = useState<string | null>(null);

  // Delete chore/instance modal state
  const [deletingChore, setDeletingChore] = useState<Task | null>(null);
  const [isDeletingChore, setIsDeletingChore] = useState(false);
  const [isDeletingInstance, setIsDeletingInstance] = useState(false);

  // Edit frequency modal state
  const [editingFrequencyTask, setEditingFrequencyTask] = useState<Task | null>(null);
  const [editFrequencyValue, setEditFrequencyValue] = useState<ChoreFrequency>('weekly');
  const [editFrequencyInterval, setEditFrequencyInterval] = useState("1");
  const [isUpdatingFrequency, setIsUpdatingFrequency] = useState(false);

  // Edit room modal state
  const [editingRoomTask, setEditingRoomTask] = useState<Task | null>(null);
  const [editRoomValue, setEditRoomValue] = useState("");
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);

  const openEditFrequency = (task: Task) => {
    setEditingFrequencyTask(task);
    setEditFrequencyValue(task.frequency);
    setEditFrequencyInterval(String(task.frequency_interval ?? 1));
  };

  const openEditRoom = (task: Task) => {
    setEditingRoomTask(task);
    setEditRoomValue(task.room_id ?? "");
  };

  return {
    completingTask,
    setCompletingTask,
    rating,
    setRating,
    actualMinutes,
    setActualMinutes,
    completionNotes,
    setCompletionNotes,
    isCompletingTask,
    setIsCompletingTask,
    isAssigningTask,
    setIsAssigningTask,
    deletingChore,
    setDeletingChore,
    isDeletingChore,
    setIsDeletingChore,
    isDeletingInstance,
    setIsDeletingInstance,
    editingFrequencyTask,
    setEditingFrequencyTask,
    editFrequencyValue,
    setEditFrequencyValue,
    editFrequencyInterval,
    setEditFrequencyInterval,
    isUpdatingFrequency,
    setIsUpdatingFrequency,
    openEditFrequency,
    editingRoomTask,
    setEditingRoomTask,
    editRoomValue,
    setEditRoomValue,
    isUpdatingRoom,
    setIsUpdatingRoom,
    openEditRoom,
  };
}
