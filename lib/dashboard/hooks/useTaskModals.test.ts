import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/dashboard/types";
import { useTaskModals } from "./useTaskModals";

const TASK: Task = {
  id: "task-1",
  chore_id: "chore-1",
  assigned_user_id: null,
  due_date: "2024-06-10",
  status: "pending",
  title: "Vacuum",
  estimated_duration_minutes: 20,
  frequency: "every-x-days",
  frequency_interval: 5,
  room_name: "Living Room",
  room_id: "room-1",
  assigned_user_name: null,
  assigned_user_avatar: null,
  assigned_user_avatar_url: null,
  assigned_user_color: null,
  completed_at: null,
  actual_duration_minutes: null,
  effort_rating: null,
  notes: null,
  private_to_user_id: null,
  is_private: false,
};

describe("useTaskModals", () => {
  it("starts with every modal closed and default form values", () => {
    const { result } = renderHook(() => useTaskModals());

    expect(result.current.completingTask).toBeNull();
    expect(result.current.rating).toBe(0);
    expect(result.current.actualMinutes).toBe("");
    expect(result.current.completionNotes).toBe("");
    expect(result.current.isCompletingTask).toBe(false);
    expect(result.current.isAssigningTask).toBeNull();
    expect(result.current.deletingChore).toBeNull();
    expect(result.current.isDeletingChore).toBe(false);
    expect(result.current.isDeletingInstance).toBe(false);
    expect(result.current.editingFrequencyTask).toBeNull();
    expect(result.current.editFrequencyValue).toBe("weekly");
    expect(result.current.editFrequencyInterval).toBe("1");
    expect(result.current.isUpdatingFrequency).toBe(false);
    expect(result.current.editingRoomTask).toBeNull();
    expect(result.current.editRoomValue).toBe("");
    expect(result.current.isUpdatingRoom).toBe(false);
  });

  it("setCompletingTask opens/closes the complete task modal", () => {
    const { result } = renderHook(() => useTaskModals());

    act(() => {
      result.current.setCompletingTask(TASK);
    });
    expect(result.current.completingTask).toBe(TASK);

    act(() => {
      result.current.setCompletingTask(null);
    });
    expect(result.current.completingTask).toBeNull();
  });

  it("setDeletingChore opens/closes the delete confirmation modal", () => {
    const { result } = renderHook(() => useTaskModals());

    act(() => {
      result.current.setDeletingChore(TASK);
    });
    expect(result.current.deletingChore).toBe(TASK);

    act(() => {
      result.current.setDeletingChore(null);
    });
    expect(result.current.deletingChore).toBeNull();
  });

  it("openEditFrequency pre-fills the frequency + interval from the given task", () => {
    const { result } = renderHook(() => useTaskModals());

    act(() => {
      result.current.openEditFrequency(TASK);
    });

    expect(result.current.editingFrequencyTask).toBe(TASK);
    expect(result.current.editFrequencyValue).toBe("every-x-days");
    expect(result.current.editFrequencyInterval).toBe("5");
  });

  it("openEditFrequency defaults the interval to '1' when the task has none", () => {
    const { result } = renderHook(() => useTaskModals());
    const taskWithoutInterval = { ...TASK, frequency_interval: null };

    act(() => {
      result.current.openEditFrequency(taskWithoutInterval);
    });

    expect(result.current.editFrequencyInterval).toBe("1");
  });

  it("openEditRoom pre-fills the room value from the given task", () => {
    const { result } = renderHook(() => useTaskModals());

    act(() => {
      result.current.openEditRoom(TASK);
    });

    expect(result.current.editingRoomTask).toBe(TASK);
    expect(result.current.editRoomValue).toBe("room-1");
  });

  it("openEditRoom defaults the room value to an empty string when the task has none", () => {
    const { result } = renderHook(() => useTaskModals());
    const taskWithoutRoom = { ...TASK, room_id: null };

    act(() => {
      result.current.openEditRoom(taskWithoutRoom);
    });

    expect(result.current.editRoomValue).toBe("");
  });
});
