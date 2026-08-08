"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import { updateUserName, updateNotificationSchedule, inviteUser, respondToInvitation, switchHousehold, removeMember } from "@/lib/actions/user-actions";
import { addChore, addRoom, completeTask, assignTaskToSelf, deleteChore, deleteTaskInstance, updateChoreFrequency, updateChoreRoom, toggleFavoriteRoom as toggleFavoriteRoomAction, toggleFavoriteChore as toggleFavoriteChoreAction } from "@/lib/actions/chore-actions";
import { Mail, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MONTH_LABELS,
  getStartOfWeek,
  getWeekDays,
  isSameDay,
} from "@/lib/dashboard/date-utils";
import type {
  DbUser,
  Household,
  HouseholdMember,
  HouseholdUser,
  Invitation,
  Room,
  Task,
} from "@/lib/dashboard/types";
import { useStopwatch } from "@/lib/dashboard/hooks/useStopwatch";
import { useViewPreferences } from "@/lib/dashboard/hooks/useViewPreferences";
import { useTaskModals } from "@/lib/dashboard/hooks/useTaskModals";
import { useHouseholdSwitcher } from "@/lib/dashboard/hooks/useHouseholdSwitcher";
import { useInviteMember } from "@/lib/dashboard/hooks/useInviteMember";
import { useManageHousehold } from "@/lib/dashboard/hooks/useManageHousehold";
import { useAddTaskForm } from "@/lib/dashboard/hooks/useAddTaskForm";
import { useAddRoomForm } from "@/lib/dashboard/hooks/useAddRoomForm";
import { usePushNotifications } from "@/lib/dashboard/hooks/usePushNotifications";
import { useScheduleOptimization } from "@/lib/dashboard/hooks/useScheduleOptimization";
import type { ScheduleOptimizationRun } from "@/lib/actions/schedule-optimization-actions";
import { getGreeting, ICON_OPTIONS } from "@/app/dashboard/components/dashboard-ui-utils";
import DashboardHeader from "@/app/dashboard/components/DashboardHeader";
import WeekStrip from "@/app/dashboard/components/WeekStrip";
import RoomFilterBar from "@/app/dashboard/components/RoomFilterBar";
import TaskList from "@/app/dashboard/components/TaskList";
import CompleteTaskModal from "@/app/dashboard/components/modals/CompleteTaskModal";
import DeleteChoreConfirmDialog from "@/app/dashboard/components/modals/DeleteChoreConfirmDialog";
import EditFrequencyModal from "@/app/dashboard/components/modals/EditFrequencyModal";
import EditRoomModal from "@/app/dashboard/components/modals/EditRoomModal";
import AddTaskModal from "@/app/dashboard/components/modals/AddTaskModal";
import AddRoomModal from "@/app/dashboard/components/modals/AddRoomModal";
import ProfileModal from "@/app/dashboard/components/modals/ProfileModal";
import InviteMemberModal from "@/app/dashboard/components/modals/InviteMemberModal";
import ManageHouseholdModal from "@/app/dashboard/components/modals/ManageHouseholdModal";
import AiOptimizationSummaryModal from "@/app/dashboard/components/modals/AiOptimizationSummaryModal";

export type { DbUser, Household, HouseholdMember, HouseholdUser, Invitation, Room, Task } from "@/lib/dashboard/types";

/**
 * COMPONENTS
 */

interface DashboardClientProps {
  initialDbUser?: DbUser | null;
  initialTasks?: Task[];
  initialRooms?: Room[];
  initialUsers?: HouseholdUser[];
  initialHouseholds?: Household[];
  initialMembers?: HouseholdMember[];
  initialInvitations?: Invitation[];
  initialFavoriteRoomIds?: string[];
  initialFavoriteChoreIds?: string[];
  initialViewMode?: 'mine' | 'household';
  initialWeekStart?: string;
  initialSelectedDay?: string;
  initialSelectedRoom?: string;
  initialLastOptimizationRun?: ScheduleOptimizationRun | null;
}

export default function DashboardClient({
  initialDbUser,
  initialTasks,
  initialRooms,
  initialUsers,
  initialHouseholds,
  initialMembers,
  initialInvitations,
  initialFavoriteRoomIds,
  initialFavoriteChoreIds,
  initialViewMode,
  initialWeekStart,
  initialSelectedDay,
  initialSelectedRoom,
  initialLastOptimizationRun,
}: Readonly<DashboardClientProps>) {
  const { user } = useUser();
  const router = useRouter();
  const userName = initialDbUser?.full_name || user?.given_name || user?.name;
  const greeting = getGreeting();

  const tasks = useMemo(() => initialTasks ?? [], [initialTasks]);
  const rooms = useMemo<Room[]>(
    () => [{ id: "all", name: "All", icon_name: null }, ...(initialRooms ?? [])],
    [initialRooms]
  );
  const selectableRooms = initialRooms ?? [];
  const users = useMemo(() => initialUsers ?? [], [initialUsers]);
  const households = useMemo(() => initialHouseholds ?? [], [initialHouseholds]);
  const members = useMemo(() => initialMembers ?? [], [initialMembers]);
  const invitations = useMemo(
    () => (initialInvitations ?? []).filter((inv) => inv.status === "pending"),
    [initialInvitations]
  );
  const activeHouseholdId = initialDbUser?.active_household_id;
  const activeHousehold = useMemo(
    () => households.find((h) => h.id === activeHouseholdId) ?? null,
    [households, activeHouseholdId]
  );

  const {
    viewMode,
    setViewMode,
    currentWeekStart,
    setCurrentWeekStart,
    selectedDay,
    setSelectedDay,
    selectedRoom,
    setSelectedRoom,
  } = useViewPreferences({ initialViewMode, initialWeekStart, initialSelectedDay, initialSelectedRoom });
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);
  const [favoriteRooms, setFavoriteRooms] = useState<string[]>(initialFavoriteRoomIds ?? []);
  const [favoriteTasks, setFavoriteTasks] = useState<string[]>(initialFavoriteChoreIds ?? []);

  const {
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
  } = useTaskModals();

  const {
    stopwatch,
    stopwatchDisplayMs,
    isStopwatchCapped,
    wasStopwatchCapped,
    setWasStopwatchCapped,
    startStopwatch,
    stopStopwatch,
  } = useStopwatch();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(userName ?? "");
  const [morningNotificationHour, setMorningNotificationHour] = useState(initialDbUser?.morning_notification_hour ?? 8);
  const [eveningNotificationHour, setEveningNotificationHour] = useState(initialDbUser?.evening_notification_hour ?? 18);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const {
    isHouseholdMenuOpen,
    setIsHouseholdMenuOpen,
    switchingHouseholdId,
    setSwitchingHouseholdId,
    respondingInvitationId,
    setRespondingInvitationId,
  } = useHouseholdSwitcher();

  const {
    isInviteOpen,
    setIsInviteOpen,
    inviteEmail,
    setInviteEmail,
    isInviting,
    setIsInviting,
    inviteError,
    setInviteError,
    openInviteMember,
  } = useInviteMember();

  const {
    isManageHouseholdOpen,
    setIsManageHouseholdOpen,
    removingMemberId,
    setRemovingMemberId,
    removeMemberError,
    setRemoveMemberError,
    openManageHousehold,
  } = useManageHousehold();

  const {
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
    newTaskIsPrivate,
    setNewTaskIsPrivate,
    isAddingTask,
    setIsAddingTask,
    openAddTask,
  } = useAddTaskForm(selectableRooms);

  const {
    isAddRoomOpen,
    setIsAddRoomOpen,
    isAddRoomFromTask,
    newRoomName,
    setNewRoomName,
    newRoomIconName,
    setNewRoomIconName,
    isAddingRoom,
    setIsAddingRoom,
    openAddRoom,
  } = useAddRoomForm(ICON_OPTIONS[0]);

  const {
    isPushSupported,
    isSubscribed,
    isSubscribing,
    handleEnableNotifications,
  } = usePushNotifications();

  const {
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
  } = useScheduleOptimization(initialLastOptimizationRun ?? null);
  const isHouseholdAdmin = activeHousehold?.role === 'admin';

  // Refresh state and handler
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      router.refresh();
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOptimizeSchedule = async () => {
    await runOptimization();
    router.refresh();
  };

  const handleUndoOptimization = async () => {
    await undoLastRun();
    router.refresh();
  };

  // Derived state
  const currentUserId = initialDbUser?.id;
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const taskDate = (task.status === 'completed' && task.completed_at)
        ? new Date(task.completed_at)
        : (task.due_date ? new Date(task.due_date) : null);
      const dayMatch = !!taskDate && isSameDay(taskDate, selectedDay);
      const roomMatch = selectedRoom === "all" || task.room_id === selectedRoom;
      const assignmentMatch = viewMode === 'household' || task.assigned_user_id === currentUserId;
      return dayMatch && roomMatch && assignmentMatch;
    });
  }, [tasks, selectedDay, selectedRoom, viewMode, currentUserId]);

  const incompleteTasksCount = useMemo(() => {
    return filteredTasks.filter(task => task.status !== 'completed').length;
  }, [filteredTasks]);

  const goToPreviousDay = () => {
    const previousDay = new Date(selectedDay);
    previousDay.setDate(selectedDay.getDate() - 1);
    setSelectedDay(previousDay);
    const previousDayWeekStart = getStartOfWeek(previousDay);
    if (!isSameDay(previousDayWeekStart, currentWeekStart)) {
      setCurrentWeekStart(previousDayWeekStart);
    }
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDay);
    nextDay.setDate(selectedDay.getDate() + 1);
    setSelectedDay(nextDay);
    const nextDayWeekStart = getStartOfWeek(nextDay);
    if (!isSameDay(nextDayWeekStart, currentWeekStart)) {
      setCurrentWeekStart(nextDayWeekStart);
    }
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
    setSelectedDay(new Date());
  };

  // Jumps the selected day/week to `date`, e.g. when previewing a suggested
  // related task that's due on a different day.
  const jumpToDay = (date: Date) => {
    setSelectedDay(date);
    const weekStart = getStartOfWeek(date);
    if (!isSameDay(weekStart, currentWeekStart)) {
      setCurrentWeekStart(weekStart);
    }
  };

  const weekRangeLabel = useMemo(() => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 6);
    const sameMonth = currentWeekStart.getMonth() === weekEnd.getMonth();
    const startLabel = `${MONTH_LABELS[currentWeekStart.getMonth()]} ${currentWeekStart.getDate()}`;
    const endLabel = sameMonth
      ? `${weekEnd.getDate()}`
      : `${MONTH_LABELS[weekEnd.getMonth()]} ${weekEnd.getDate()}`;
    return `${startLabel} - ${endLabel}`;
  }, [currentWeekStart]);

  const isCurrentWeek = useMemo(
    () => isSameDay(currentWeekStart, getStartOfWeek(new Date())),
    [currentWeekStart]
  );

  const toggleFavoriteRoom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const wasFavorite = favoriteRooms.includes(id);
    setFavoriteRooms(prev => 
      wasFavorite ? prev.filter(r => r !== id) : [...prev, id]
    );
    toggleFavoriteRoomAction(id).catch(() => {
      // Revert optimistic update if the request fails
      setFavoriteRooms(prev => 
        wasFavorite ? [...prev, id] : prev.filter(r => r !== id)
      );
    });
  };

  const toggleFavoriteTask = (choreId: string) => {
    const wasFavorite = favoriteTasks.includes(choreId);
    setFavoriteTasks(prev => 
      wasFavorite ? prev.filter(t => t !== choreId) : [...prev, choreId]
    );
    toggleFavoriteChoreAction(choreId).catch(() => {
      // Revert optimistic update if the request fails
      setFavoriteTasks(prev => 
        wasFavorite ? [...prev, choreId] : prev.filter(t => t !== choreId)
      );
    });
  };

  const openProfileSettings = () => {
    setProfileName(userName ?? "");
    setMorningNotificationHour(initialDbUser?.morning_notification_hour ?? 8);
    setEveningNotificationHour(initialDbUser?.evening_notification_hour ?? 18);
    setIsProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    const trimmedName = profileName.trim();
    if (!trimmedName) return;
    setIsSavingProfile(true);
    try {
      await Promise.all([
        updateUserName(trimmedName),
        updateNotificationSchedule(morningNotificationHour, eveningNotificationHour),
      ]);
      setIsProfileOpen(false);
      router.refresh();
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSwitchHousehold = async (householdId: string) => {
    if (householdId === activeHousehold?.id) {
      setIsHouseholdMenuOpen(false);
      return;
    }
    setSwitchingHouseholdId(householdId);
    try {
      await switchHousehold(householdId);
      setIsHouseholdMenuOpen(false);
      router.refresh();
    } finally {
      setSwitchingHouseholdId(null);
    }
  };

  const handleRespondInvitation = async (invitationId: string, status: 'accepted' | 'declined') => {
    setRespondingInvitationId(invitationId);
    try {
      await respondToInvitation(invitationId, status);
      router.refresh();
    } finally {
      setRespondingInvitationId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setRemovingMemberId(memberId);
    setRemoveMemberError(null);
    try {
      await removeMember(memberId);
      router.refresh();
    } catch (err) {
      setRemoveMemberError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const isInviteValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim());

  const handleInviteSubmit = async () => {
    if (!isInviteValid) return;
    setIsInviting(true);
    setInviteError(null);
    try {
      await inviteUser(inviteEmail.trim());
      setIsInviteOpen(false);
      router.refresh();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsInviting(false);
    }
  };

  const isCustomIntervalFrequency = newTaskFrequency === 'every-x-days' || newTaskFrequency === 'every-x-weeks';

  const isAddTaskValid =
    newTaskTitle.trim().length > 0 &&
    newTaskRoomId.length > 0 &&
    Number(newTaskDuration) > 0 &&
    !!newTaskLastCompleted &&
    (!isCustomIntervalFrequency || Number(newTaskFrequencyInterval) > 0);

  const handleAddTask = async () => {
    if (!isAddTaskValid) return;
    setIsAddingTask(true);
    try {
      await addChore({
        title: newTaskTitle.trim(),
        room_id: newTaskRoomId,
        estimated_duration_minutes: Number(newTaskDuration),
        last_completed_date: newTaskLastCompleted,
        frequency: newTaskFrequency,
        frequency_interval: isCustomIntervalFrequency ? Number(newTaskFrequencyInterval) : undefined,
        is_private: newTaskIsPrivate,
      });
      setIsAddTaskOpen(false);
      router.refresh();
    } finally {
      setIsAddingTask(false);
    }
  };

  const isAddRoomValid = newRoomName.trim().length > 0 && !!newRoomIconName;

  const handleAddRoom = async () => {
    if (!isAddRoomValid) return;
    setIsAddingRoom(true);
    try {
      const newRoom = await addRoom({
        name: newRoomName.trim(),
        icon_name: newRoomIconName,
      });
      if (isAddRoomFromTask) {
        // Auto-select the freshly created room back in the Add Task form.
        setNewTaskRoomId(newRoom.id);
      }
      setIsAddRoomOpen(false);
      router.refresh();
    } finally {
      setIsAddingRoom(false);
    }
  };

  const openCompleteTask = (task: Task, prefillMinutes?: number, capped: boolean = false) => {
    setRating(0);
    setActualMinutes(prefillMinutes != null ? String(prefillMinutes) : "");
    setCompletionNotes("");
    setWasStopwatchCapped(capped);
    setCompletingTask(task);
  };

  // Stops the running stopwatch for `task` and opens the completion dialog
  // pre-filled with the elapsed time (capped at MAX_STOPWATCH_MINUTES).
  const handleStopStopwatch = (task: Task) => {
    const result = stopStopwatch(task);
    if (!result) return;
    openCompleteTask(task, result.minutes, result.capped);
  };

  // Used by the "Done" button: if a stopwatch happens to be running for this
  // task, stop it and pre-fill the dialog instead of opening it empty.
  const handleFinishTask = (task: Task) => {
    if (stopwatch && stopwatch.taskId === task.id) {
      handleStopStopwatch(task);
    } else {
      openCompleteTask(task);
    }
  };

  const handleSubmitCompletion = async () => {
    if (!completingTask) return;
    setIsCompletingTask(true);
    try {
      const hasTime = actualMinutes.trim() !== "";
      await completeTask(completingTask.id, {
        actual_duration_minutes: hasTime ? Number(actualMinutes) : undefined,
        effort_rating: rating > 0 ? rating : undefined,
        notes: completionNotes.trim() || undefined,
        completionDate: new Date().toLocaleDateString('en-CA'),
      });
      setCompletingTask(null);
      router.refresh();
    } finally {
      setIsCompletingTask(false);
    }
  };

  const handleAssignToSelf = async (assignmentId: string) => {
    setIsAssigningTask(assignmentId);
    try {
      await assignTaskToSelf(assignmentId);
      router.refresh();
    } finally {
      setIsAssigningTask(null);
    }
  };

  const handleDeleteChore = async () => {
    if (!deletingChore) return;
    setIsDeletingChore(true);
    try {
      await deleteChore(deletingChore.chore_id);
      setDeletingChore(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete chore:", error);
    } finally {
      setIsDeletingChore(false);
    }
  };

  const handleDeleteTaskInstance = async () => {
    if (!deletingChore) return;
    setIsDeletingInstance(true);
    try {
      await deleteTaskInstance(deletingChore.id);
      setDeletingChore(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete task instance:", error);
    } finally {
      setIsDeletingInstance(false);
    }
  };

  const isEditCustomIntervalFrequency = editFrequencyValue === 'every-x-days' || editFrequencyValue === 'every-x-weeks';

  const isEditFrequencyValid =
    !isEditCustomIntervalFrequency || Number(editFrequencyInterval) > 0;

  const handleUpdateFrequency = async () => {
    if (!editingFrequencyTask || !isEditFrequencyValid) return;
    setIsUpdatingFrequency(true);
    try {
      await updateChoreFrequency(
        editingFrequencyTask.chore_id,
        editFrequencyValue,
        isEditCustomIntervalFrequency ? Number(editFrequencyInterval) : undefined
      );
      setEditingFrequencyTask(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to update chore frequency:", error);
    } finally {
      setIsUpdatingFrequency(false);
    }
  };

  const handleUpdateRoom = async () => {
    if (!editingRoomTask || !editRoomValue) return;
    setIsUpdatingRoom(true);
    try {
      await updateChoreRoom(editingRoomTask.chore_id, editRoomValue);
      setEditingRoomTask(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to update chore room:", error);
    } finally {
      setIsUpdatingRoom(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-[#2D336B] pb-20 font-sans selection:bg-indigo-100">
      {/* 0. PENDING INVITATIONS BANNER */}
      <AnimatePresence initial={false}>
        {invitations.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="overflow-hidden"
          >
            <div className="px-6 pt-6 space-y-3 bg-gradient-to-b from-indigo-900 to-indigo-800">
              {invitations.map((invitation) => {
                const isResponding = respondingInvitationId === invitation.id;
                return (
                  <motion.div
                    key={invitation.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="relative overflow-hidden bg-white/10 border border-white/15 rounded-3xl p-5 pb-4 backdrop-blur-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 shrink-0 rounded-2xl bg-amber-300 text-indigo-900 flex items-center justify-center shadow-lg">
                        <Mail size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black leading-snug">
                          Join &ldquo;{invitation.household_name}&rdquo;
                        </p>
                        <p className="text-indigo-200 text-sm font-medium">
                          {invitation.inviter_name} invited you to their household.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => handleRespondInvitation(invitation.id, 'declined')}
                        disabled={isResponding}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-indigo-100 py-2.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleRespondInvitation(invitation.id, 'accepted')}
                        disabled={isResponding}
                        className="flex-1 bg-amber-300 hover:bg-amber-200 text-indigo-900 py-2.5 rounded-2xl font-black text-sm shadow-lg shadow-black/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isResponding ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        Accept
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER */}
      <DashboardHeader
        greeting={greeting}
        userName={userName}
        incompleteTasksCount={incompleteTasksCount}
        viewMode={viewMode}
        setViewMode={setViewMode}
        users={users}
        households={households}
        activeHousehold={activeHousehold}
        isHouseholdMenuOpen={isHouseholdMenuOpen}
        setIsHouseholdMenuOpen={setIsHouseholdMenuOpen}
        switchingHouseholdId={switchingHouseholdId}
        handleSwitchHousehold={handleSwitchHousehold}
        isRefreshing={isRefreshing}
        handleRefresh={handleRefresh}
        openProfileSettings={openProfileSettings}
        openAddTask={openAddTask}
        openInviteMember={openInviteMember}
        openManageHousehold={openManageHousehold}
        isHouseholdAdmin={isHouseholdAdmin}
        isOptimizingSchedule={isOptimizing}
        hasUndoableOptimization={!!lastRun}
        onOptimizeSchedule={handleOptimizeSchedule}
        onViewLastOptimization={viewLastRun}
      />

      {/* 2. WEEKLY CALENDAR SLIDER */}
      <WeekStrip
        weekDays={weekDays}
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
        goToPreviousDay={goToPreviousDay}
        goToNextDay={goToNextDay}
        goToCurrentWeek={goToCurrentWeek}
        isCurrentWeek={isCurrentWeek}
        weekRangeLabel={weekRangeLabel}
      />

      {/* 3. ROOM TABS / CATEGORIES */}
      <RoomFilterBar
        rooms={rooms}
        selectedRoom={selectedRoom}
        setSelectedRoom={setSelectedRoom}
        favoriteRooms={favoriteRooms}
        toggleFavoriteRoom={toggleFavoriteRoom}
        openAddRoom={openAddRoom}
      />

      {/* 4. TASK LIST */}
      <TaskList
        viewMode={viewMode}
        filteredTasks={filteredTasks}
        allTasks={tasks}
        selectedDay={selectedDay}
        isRefreshing={isRefreshing}
        handleRefresh={handleRefresh}
        favoriteTasks={favoriteTasks}
        toggleFavoriteTask={toggleFavoriteTask}
        openEditFrequency={openEditFrequency}
        openEditRoom={openEditRoom}
        onDeleteChore={setDeletingChore}
        stopwatch={stopwatch}
        stopwatchDisplayMs={stopwatchDisplayMs}
        isStopwatchCapped={isStopwatchCapped}
        startStopwatch={startStopwatch}
        handleStopStopwatch={handleStopStopwatch}
        handleAssignToSelf={handleAssignToSelf}
        isAssigningTask={isAssigningTask}
        handleFinishTask={handleFinishTask}
        onJumpToDay={jumpToDay}
      />

      {/* 5. COMPLETE TASK MODAL (Drawer) */}
      <AnimatePresence>
        {completingTask && (
          <CompleteTaskModal
            task={completingTask}
            actualMinutes={actualMinutes}
            setActualMinutes={setActualMinutes}
            wasStopwatchCapped={wasStopwatchCapped}
            rating={rating}
            setRating={setRating}
            completionNotes={completionNotes}
            setCompletionNotes={setCompletionNotes}
            isCompletingTask={isCompletingTask}
            onClose={() => setCompletingTask(null)}
            onSubmit={handleSubmitCompletion}
          />
        )}
      </AnimatePresence>

      {/* DELETE CHORE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingChore && (
          <DeleteChoreConfirmDialog
            chore={deletingChore}
            isDeletingChore={isDeletingChore}
            isDeletingInstance={isDeletingInstance}
            onClose={() => setDeletingChore(null)}
            onDeleteTaskInstance={handleDeleteTaskInstance}
            onDeleteChore={handleDeleteChore}
          />
        )}
      </AnimatePresence>

      {/* EDIT FREQUENCY MODAL */}
      <AnimatePresence>
        {editingFrequencyTask && (
          <EditFrequencyModal
            task={editingFrequencyTask}
            editFrequencyValue={editFrequencyValue}
            setEditFrequencyValue={setEditFrequencyValue}
            editFrequencyInterval={editFrequencyInterval}
            setEditFrequencyInterval={setEditFrequencyInterval}
            isEditCustomIntervalFrequency={isEditCustomIntervalFrequency}
            isEditFrequencyValid={isEditFrequencyValid}
            isUpdatingFrequency={isUpdatingFrequency}
            onClose={() => setEditingFrequencyTask(null)}
            onSubmit={handleUpdateFrequency}
          />
        )}
      </AnimatePresence>

      {/* EDIT ROOM MODAL */}
      <AnimatePresence>
        {editingRoomTask && (
          <EditRoomModal
            task={editingRoomTask}
            selectableRooms={selectableRooms}
            editRoomValue={editRoomValue}
            setEditRoomValue={setEditRoomValue}
            isUpdatingRoom={isUpdatingRoom}
            onClose={() => setEditingRoomTask(null)}
            onSubmit={handleUpdateRoom}
          />
        )}
      </AnimatePresence>

      {/* 6. ADD TASK MODAL (Drawer) */}
      <AnimatePresence>
        {isAddTaskOpen && (
          <AddTaskModal
            selectableRooms={selectableRooms}
            newTaskTitle={newTaskTitle}
            setNewTaskTitle={setNewTaskTitle}
            newTaskRoomId={newTaskRoomId}
            setNewTaskRoomId={setNewTaskRoomId}
            newTaskDuration={newTaskDuration}
            setNewTaskDuration={setNewTaskDuration}
            newTaskFrequency={newTaskFrequency}
            setNewTaskFrequency={setNewTaskFrequency}
            newTaskFrequencyInterval={newTaskFrequencyInterval}
            setNewTaskFrequencyInterval={setNewTaskFrequencyInterval}
            newTaskLastCompleted={newTaskLastCompleted}
            setNewTaskLastCompleted={setNewTaskLastCompleted}
            newTaskIsPrivate={newTaskIsPrivate}
            setNewTaskIsPrivate={setNewTaskIsPrivate}
            isCustomIntervalFrequency={isCustomIntervalFrequency}
            isAddTaskValid={isAddTaskValid}
            isAddingTask={isAddingTask}
            onClose={() => setIsAddTaskOpen(false)}
            onSubmit={handleAddTask}
            onOpenAddRoom={() => openAddRoom(true)}
          />
        )}
      </AnimatePresence>

      {/* 7. ADD ROOM MODAL (Drawer) */}
      <AnimatePresence>
        {isAddRoomOpen && (
          <AddRoomModal
            newRoomName={newRoomName}
            setNewRoomName={setNewRoomName}
            newRoomIconName={newRoomIconName}
            setNewRoomIconName={setNewRoomIconName}
            isAddRoomValid={isAddRoomValid}
            isAddingRoom={isAddingRoom}
            onClose={() => setIsAddRoomOpen(false)}
            onSubmit={handleAddRoom}
          />
        )}
      </AnimatePresence>

      {/* 8. PROFILE SETTINGS MODAL */}
      <AnimatePresence>
        {isProfileOpen && (
          <ProfileModal
            profileName={profileName}
            setProfileName={setProfileName}
            isPushSupported={isPushSupported}
            isSubscribing={isSubscribing}
            isSubscribed={isSubscribed}
            handleEnableNotifications={handleEnableNotifications}
            morningNotificationHour={morningNotificationHour}
            setMorningNotificationHour={setMorningNotificationHour}
            eveningNotificationHour={eveningNotificationHour}
            setEveningNotificationHour={setEveningNotificationHour}
            isSavingProfile={isSavingProfile}
            onClose={() => setIsProfileOpen(false)}
            onSubmit={handleSaveProfile}
          />
        )}
      </AnimatePresence>

      {/* 9. INVITE MEMBER MODAL (Drawer) */}
      <AnimatePresence>
        {isInviteOpen && (
          <InviteMemberModal
            activeHousehold={activeHousehold}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            setInviteError={setInviteError}
            inviteError={inviteError}
            isInviting={isInviting}
            isInviteValid={isInviteValid}
            onClose={() => setIsInviteOpen(false)}
            onSubmit={handleInviteSubmit}
          />
        )}
      </AnimatePresence>

      {/* 9b. MANAGE HOUSEHOLD MODAL (Drawer) */}
      <AnimatePresence>
        {isManageHouseholdOpen && (
          <ManageHouseholdModal
            activeHousehold={activeHousehold}
            members={members}
            currentUserId={currentUserId}
            removingMemberId={removingMemberId}
            removeMemberError={removeMemberError}
            onClose={() => setIsManageHouseholdOpen(false)}
            onRemoveMember={handleRemoveMember}
          />
        )}
      </AnimatePresence>

      {/* 10. AI SCHEDULE OPTIMIZATION SUMMARY MODAL (Drawer) */}
      <AnimatePresence>
        {isSummaryOpen && (
          <AiOptimizationSummaryModal
            appliedActions={lastResult ? lastResult.appliedActions : lastRun?.appliedActions ?? null}
            tasksConsidered={lastResult ? lastResult.tasksConsidered : lastRun?.tasksConsidered ?? null}
            error={optimizationError}
            users={users}
            canUndo={!!lastRun}
            isUndoing={isUndoing}
            onClose={closeSummary}
            onUndo={handleUndoOptimization}
          />
        )}
      </AnimatePresence>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
