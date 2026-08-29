import { useState } from "react";
import type { ChoreFrequency } from "@/lib/actions/chore-actions";
import type { Room } from "@/lib/dashboard/types";

/** Owns the Add Task modal's open/closed state and form fields. */
export function useAddTaskForm(selectableRooms: Room[]) {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskRoomId, setNewTaskRoomId] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState("");
  const [newTaskHasLastCompleted, setNewTaskHasLastCompleted] = useState(false);
  const [newTaskLastCompleted, setNewTaskLastCompleted] = useState("");
  const [newTaskFrequency, setNewTaskFrequency] = useState<ChoreFrequency>('weekly');
  const [newTaskFrequencyInterval, setNewTaskFrequencyInterval] = useState("1");
  const [newTaskIsPrivate, setNewTaskIsPrivate] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const openAddTask = (preselectedRoomId?: string) => {
    setNewTaskTitle("");
    const initialRoomId = typeof preselectedRoomId === "string" ? preselectedRoomId : selectableRooms[0]?.id ?? "";
    setNewTaskRoomId(initialRoomId);
    setNewTaskDuration("");
    setNewTaskHasLastCompleted(false);
    setNewTaskLastCompleted("");
    setNewTaskFrequency('weekly');
    setNewTaskFrequencyInterval("1");
    setNewTaskIsPrivate(false);
    setIsAddTaskOpen(true);
  };

  return {
    isAddTaskOpen,
    setIsAddTaskOpen,
    newTaskTitle,
    setNewTaskTitle,
    newTaskRoomId,
    setNewTaskRoomId,
    newTaskDuration,
    setNewTaskDuration,
    newTaskHasLastCompleted,
    setNewTaskHasLastCompleted,
    newTaskLastCompleted,
    setNewTaskLastCompleted,
    newTaskFrequency,
    setNewTaskFrequency,
    newTaskFrequencyInterval,
    setNewTaskFrequencyInterval,
    newTaskIsPrivate,
    setNewTaskIsPrivate,
    isAddingTask,
    setIsAddingTask,
    openAddTask,
  };
}
