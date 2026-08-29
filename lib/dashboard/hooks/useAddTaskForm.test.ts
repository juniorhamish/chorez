import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Room } from "@/lib/dashboard/types";
import { useAddTaskForm } from "./useAddTaskForm";

const ROOMS: Room[] = [
  { id: "room-1", name: "Kitchen", icon_name: "kitchen" },
  { id: "room-2", name: "Bathroom", icon_name: "bathroom" },
];

describe("useAddTaskForm", () => {
  it("starts with the modal closed and default form values", () => {
    const { result } = renderHook(() => useAddTaskForm(ROOMS));

    expect(result.current.isAddTaskOpen).toBe(false);
    expect(result.current.newTaskTitle).toBe("");
    expect(result.current.newTaskRoomId).toBe("");
    expect(result.current.newTaskDuration).toBe("");
    expect(result.current.newTaskHasLastCompleted).toBe(false);
    expect(result.current.newTaskLastCompleted).toBe("");
    expect(result.current.newTaskFrequency).toBe("weekly");
    expect(result.current.newTaskFrequencyInterval).toBe("1");
    expect(result.current.newTaskIsPrivate).toBe(false);
    expect(result.current.isAddingTask).toBe(false);
  });

  it("openAddTask opens the modal and resets the form, defaulting the room to the first selectable room", () => {
    const { result } = renderHook(() => useAddTaskForm(ROOMS));

    act(() => {
      result.current.setNewTaskTitle("Stale title");
      result.current.setNewTaskRoomId("room-2");
      result.current.setNewTaskDuration("45");
      result.current.setNewTaskHasLastCompleted(true);
      result.current.setNewTaskLastCompleted("2024-01-01");
      result.current.setNewTaskFrequency("monthly");
      result.current.setNewTaskFrequencyInterval("3");
      result.current.setNewTaskIsPrivate(true);
    });

    act(() => {
      result.current.openAddTask();
    });

    expect(result.current.isAddTaskOpen).toBe(true);
    expect(result.current.newTaskTitle).toBe("");
    expect(result.current.newTaskRoomId).toBe("room-1");
    expect(result.current.newTaskDuration).toBe("");
    expect(result.current.newTaskHasLastCompleted).toBe(false);
    expect(result.current.newTaskLastCompleted).toBe("");
    expect(result.current.newTaskFrequency).toBe("weekly");
    expect(result.current.newTaskFrequencyInterval).toBe("1");
    expect(result.current.newTaskIsPrivate).toBe(false);
  });

  it("openAddTask seeds the room with the given preselectedRoomId when provided", () => {
    const { result } = renderHook(() => useAddTaskForm(ROOMS));

    act(() => {
      result.current.openAddTask("room-2");
    });

    expect(result.current.isAddTaskOpen).toBe(true);
    expect(result.current.newTaskRoomId).toBe("room-2");
  });

  it("openAddTask defaults the room id to an empty string when there are no selectable rooms", () => {
    const { result } = renderHook(() => useAddTaskForm([]));

    act(() => {
      result.current.openAddTask();
    });

    expect(result.current.newTaskRoomId).toBe("");
  });

  it("setIsAddTaskOpen(false) closes the modal", () => {
    const { result } = renderHook(() => useAddTaskForm(ROOMS));

    act(() => {
      result.current.openAddTask();
    });
    expect(result.current.isAddTaskOpen).toBe(true);

    act(() => {
      result.current.setIsAddTaskOpen(false);
    });
    expect(result.current.isAddTaskOpen).toBe(false);
  });

  it("setIsAddingTask tracks the in-flight submission state", () => {
    const { result } = renderHook(() => useAddTaskForm(ROOMS));

    act(() => {
      result.current.setIsAddingTask(true);
    });
    expect(result.current.isAddingTask).toBe(true);

    act(() => {
      result.current.setIsAddingTask(false);
    });
    expect(result.current.isAddingTask).toBe(false);
  });
});
