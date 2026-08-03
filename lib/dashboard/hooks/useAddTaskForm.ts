import { useState } from "react";
import type { ChoreFrequency } from "@/lib/actions/chore-actions";
import type { Room } from "@/lib/dashboard/types";

/** Owns the Add Task modal's open/closed state and form fields. */
export function useAddTaskForm(selectableRooms: Room[]) {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskRoomId, setNewTaskRoomId] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState("");
  const [newTaskLastCompleted, setNewTaskLastCompleted] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [newTaskFrequency, setNewTaskFrequency] = useState<ChoreFrequency>('weekly');
  const [newTaskFrequencyInterval, setNewTaskFrequencyInterval] = useState("1");
  const [isAddingTask, setIsAddingTask] = useState(false);

  const openAddTask = () => {
    setNewTaskTitle("");
    setNewTaskRoomId(selectableRooms[0]?.id ?? "");
    setNewTaskDuration("");
    setNewTaskLastCompleted(new Date().toLocaleDateString('en-CA'));
    setNewTaskFrequency('weekly');
    setNewTaskFrequencyInterval("1");
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
    newTaskLastCompleted,
    setNewTaskLastCompleted,
    newTaskFrequency,
    setNewTaskFrequency,
    newTaskFrequencyInterval,
    setNewTaskFrequencyInterval,
    isAddingTask,
    setIsAddingTask,
    openAddTask,
  };
}
