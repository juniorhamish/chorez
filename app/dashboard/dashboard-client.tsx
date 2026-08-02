"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import { updateUserName, updateNotificationSchedule, inviteUser, respondToInvitation, switchHousehold } from "@/lib/actions/user-actions";
import { addChore, addRoom, completeTask, assignTaskToSelf, toggleFavoriteRoom as toggleFavoriteRoomAction, toggleFavoriteChore as toggleFavoriteChoreAction, type ChoreFrequency } from "@/lib/actions/chore-actions";
import { 
  Plus, 
  CheckCircle2,
  Star, 
  Clock, 
  User as UserIcon, 
  X,
  Bath,
  Armchair,
  Home,
  UtensilsCrossed,
  Sparkles,
  Bed,
  Tv,
  Briefcase,
  Dumbbell,
  Shirt,
  Baby,
  Car,
  Flower2,
  Search,
  MessageSquare,
  LogOut,
  Settings,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Mail,
  Bell,
  BellOff,
  RefreshCw,
  type LucideIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 
 * UTILS 
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Maps a room's `icon_name` (stored in the DB) to a Lucide icon component.
 * Falls back to `Home` when the name is missing or unrecognized.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  UtensilsCrossed,
  Bath,
  Armchair,
  Bed,
  Tv,
  Briefcase,
  Dumbbell,
  Shirt,
  Baby,
  Car,
  Flower2,
  Sparkles,
};

function getRoomIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return Home;
  return ICON_MAP[iconName] ?? Home;
}

const ICON_OPTIONS = Object.keys(ICON_MAP);

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const FREQUENCY_OPTIONS: { value: ChoreFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "every-x-days", label: "Every X Days" },
  { value: "every-x-weeks", label: "Every X Weeks" },
  { value: "on-demand", label: "On Demand" },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);

/** Formats a 24-hour value (0-23) as a friendly 12-hour clock label, e.g. 8 -> "8:00 AM". */
function formatHourLabel(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

/**
 * Returns the Monday of the week containing the given date (native Date only,
 * since date-fns is not installed in this project).
 */
function getStartOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDayDate(date: Date) {
  return `${MONTH_LABELS[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")}`;
}

function getDayLabel(date: Date) {
  return DAY_LABELS[(date.getDay() + 6) % 7];
}

/** Builds the 7 days (Mon-Sun) for the week starting at `weekStart`. */
function getWeekDays(weekStart: Date) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return {
      label: DAY_LABELS[i],
      date: formatDayDate(date),
      fullDate: date,
      isToday: isSameDay(date, today),
    };
  });
}

/** 
 * TYPES 
 */
export interface Task {
  id: string;
  chore_id: string;
  assigned_user_id: string | null;
  due_date: string | Date;
  status: string;
  title: string;
  estimated_duration_minutes: number | null;
  room_name: string | null;
  room_id: string | null;
  assigned_user_name: string | null;
  assigned_user_avatar: string | null;
  assigned_user_color: string | null;
  completed_at: string | Date | null;
  actual_duration_minutes: number | null;
  effort_rating: number | null;
  notes: string | null;
}

export interface Room {
  id: string;
  household_id?: string;
  name: string;
  icon_name?: string | null;
  created_at?: string;
}

export interface HouseholdUser {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string | null;
}

export interface DbUser {
  id?: string;
  full_name?: string | null;
  email?: string;
  active_household_id?: string | null;
  morning_notification_hour?: number | null;
  evening_notification_hour?: number | null;
}

export interface Invitation {
  id: string;
  household_id: string;
  household_name: string;
  inviter_name: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface Household {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

/** 
 * COMPONENTS 
 */

interface DashboardClientProps {
  initialDbUser?: DbUser | null;
  initialTasks?: Task[];
  initialRooms?: Room[];
  initialUsers?: HouseholdUser[];
  initialHouseholds?: Household[];
  initialInvitations?: Invitation[];
  initialFavoriteRoomIds?: string[];
  initialFavoriteChoreIds?: string[];
  initialViewMode?: 'mine' | 'household';
  initialWeekStart?: string;
  initialSelectedDay?: string;
  initialSelectedRoom?: string;
}

export default function DashboardClient({
  initialDbUser,
  initialTasks,
  initialRooms,
  initialUsers,
  initialHouseholds,
  initialInvitations,
  initialFavoriteRoomIds,
  initialFavoriteChoreIds,
  initialViewMode,
  initialWeekStart,
  initialSelectedDay,
  initialSelectedRoom,
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
  const invitations = useMemo(
    () => (initialInvitations ?? []).filter((inv) => inv.status === "pending"),
    [initialInvitations]
  );
  const activeHousehold = useMemo(
    () => households.find((h) => h.id === initialDbUser?.active_household_id) ?? null,
    [households, initialDbUser]
  );

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    if (initialWeekStart) {
      try {
        const d = new Date(initialWeekStart);
        if (!isNaN(d.getTime())) return getStartOfWeek(d);
      } catch {}
    }
    return getStartOfWeek(new Date());
  });
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    if (initialSelectedDay) {
      try {
        const d = new Date(initialSelectedDay);
        if (!isNaN(d.getTime())) return d;
      } catch {}
    }
    return new Date();
  });
  const [selectedRoom, setSelectedRoom] = useState(() => initialSelectedRoom || "all");
  const [favoriteRooms, setFavoriteRooms] = useState<string[]>(initialFavoriteRoomIds ?? []);
  const [favoriteTasks, setFavoriteTasks] = useState<string[]>(initialFavoriteChoreIds ?? []);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [rating, setRating] = useState(0);
  const [actualMinutes, setActualMinutes] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [isAssigningTask, setIsAssigningTask] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(userName ?? "");
  const [morningNotificationHour, setMorningNotificationHour] = useState(initialDbUser?.morning_notification_hour ?? 8);
  const [eveningNotificationHour, setEveningNotificationHour] = useState(initialDbUser?.evening_notification_hour ?? 18);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [viewMode, setViewMode] = useState<'mine' | 'household'>(() => {
    if (initialViewMode === 'mine' || initialViewMode === 'household') return initialViewMode;
    return 'mine';
  });

  useEffect(() => {
    try {
      localStorage.setItem('chorez_view_mode', viewMode);
      localStorage.setItem('chorez_week_start', currentWeekStart.toISOString());
      localStorage.setItem('chorez_selected_day', selectedDay.toISOString());
      localStorage.setItem('chorez_selected_room', selectedRoom);

      document.cookie = `chorez_view_mode=${viewMode}; path=/; max-age=31536000`;
      document.cookie = `chorez_week_start=${currentWeekStart.toISOString()}; path=/; max-age=31536000`;
      document.cookie = `chorez_selected_day=${selectedDay.toISOString()}; path=/; max-age=31536000`;
      document.cookie = `chorez_selected_room=${selectedRoom}; path=/; max-age=31536000`;
    } catch {}
  }, [viewMode, currentWeekStart, selectedDay, selectedRoom]);

  // Household switcher state
  const [isHouseholdMenuOpen, setIsHouseholdMenuOpen] = useState(false);
  const [switchingHouseholdId, setSwitchingHouseholdId] = useState<string | null>(null);

  // Invitation banner state
  const [respondingInvitationId, setRespondingInvitationId] = useState<string | null>(null);

  // Invite Member modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Add Task form state
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskRoomId, setNewTaskRoomId] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState("");
  const [newTaskLastCompleted, setNewTaskLastCompleted] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [newTaskFrequency, setNewTaskFrequency] = useState<ChoreFrequency>('weekly');
  const [newTaskFrequencyInterval, setNewTaskFrequencyInterval] = useState("1");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Add Room form state
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isAddRoomFromTask, setIsAddRoomFromTask] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomIconName, setNewRoomIconName] = useState<string>(ICON_OPTIONS[0]);
  const [isAddingRoom, setIsAddingRoom] = useState(false);

  // Push notification state
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Register Service Worker and check subscription
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        document.cookie = `chorez_timezone=${encodeURIComponent(tz)}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {
      // ignore
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPushSupported(true);
      navigator.serviceWorker.register('/sw.js')
        .then(async (reg) => {
          const sub = await reg.pushManager.getSubscription();
          setIsSubscribed(!!sub);
        })
        .catch(err => console.error('SW registration failed:', err));
    }
  }, []);

  const handleEnableNotifications = useCallback(async () => {
    if (!isPushSupported) return;
    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permission not granted');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subscription,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
      });

      setIsSubscribed(true);
    } catch (error) {
      console.error('Push subscription failed:', error);
      alert('Failed to enable notifications. Please check your browser settings.');
    } finally {
      setIsSubscribing(false);
    }
  }, [isPushSupported]);

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

  // Derived state
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const taskDate = (task.status === 'completed' && task.completed_at)
        ? new Date(task.completed_at)
        : (task.due_date ? new Date(task.due_date) : null);
      const dayMatch = !!taskDate && isSameDay(taskDate, selectedDay);
      const roomMatch = selectedRoom === "all" || task.room_id === selectedRoom;
      const assignmentMatch = viewMode === 'household' || task.assigned_user_id === initialDbUser?.id;
      return dayMatch && roomMatch && assignmentMatch;
    });
  }, [tasks, selectedDay, selectedRoom, viewMode, initialDbUser]);

  const incompleteTasksCount = useMemo(() => {
    return filteredTasks.filter(task => task.status !== 'completed').length;
  }, [filteredTasks]);

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
    setSelectedDay(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
    setSelectedDay(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
    setSelectedDay(new Date());
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

  const openInviteMember = () => {
    setInviteEmail("");
    setInviteError(null);
    setIsInviteOpen(true);
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

  const openAddTask = () => {
    setNewTaskTitle("");
    setNewTaskRoomId(selectableRooms[0]?.id ?? "");
    setNewTaskDuration("");
    setNewTaskLastCompleted(new Date().toLocaleDateString('en-CA'));
    setNewTaskFrequency('weekly');
    setNewTaskFrequencyInterval("1");
    setIsAddTaskOpen(true);
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
      });
      setIsAddTaskOpen(false);
      router.refresh();
    } finally {
      setIsAddingTask(false);
    }
  };

  const openAddRoom = (fromTask: boolean) => {
    setNewRoomName("");
    setNewRoomIconName(ICON_OPTIONS[0]);
    setIsAddRoomFromTask(fromTask);
    setIsAddRoomOpen(true);
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

  const openCompleteTask = (task: Task) => {
    setRating(0);
    setActualMinutes("");
    setCompletionNotes("");
    setCompletingTask(task);
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
      <header className="px-6 pt-10 pb-6 bg-white/50 backdrop-blur-md sticky top-0 z-10 border-b border-indigo-50">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 suppressHydrationWarning className="text-2xl font-bold tracking-tight">
              {greeting}{userName ? `, ${userName}` : ''}! 👋
            </h1>
            <p className="text-indigo-600/70 font-medium">
              {viewMode === 'mine' ? (
                <>You have <span className="text-indigo-600 font-bold">{incompleteTasksCount} tasks</span> left today.</>
              ) : (
                <>Household has <span className="text-indigo-600 font-bold">{incompleteTasksCount} tasks</span> today.</>
              )}
            </p>
            {households.length > 1 && (
              <div className="relative mt-2 inline-block">
                <button
                  onClick={() => setIsHouseholdMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
                >
                  <Home size={12} />
                  {activeHousehold?.name ?? "Select Household"}
                  <ChevronDown
                    size={12}
                    className={cn("transition-transform", isHouseholdMenuOpen && "rotate-180")}
                  />
                </button>
                <AnimatePresence>
                  {isHouseholdMenuOpen && (
                    <>
                      <div
                        onClick={() => setIsHouseholdMenuOpen(false)}
                        className="fixed inset-0 z-20"
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-indigo-50 p-2 z-30"
                      >
                        {households.map((household) => {
                          const isActive = household.id === activeHousehold?.id;
                          const isSwitching = switchingHouseholdId === household.id;
                          return (
                            <button
                              key={household.id}
                              onClick={() => handleSwitchHousehold(household.id)}
                              disabled={isSwitching}
                              className={cn(
                                "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-colors disabled:opacity-50",
                                isActive ? "bg-indigo-600 text-white" : "hover:bg-indigo-50 text-indigo-700"
                              )}
                            >
                              <span className="min-w-0">
                                <span className="block font-bold text-sm truncate">{household.name}</span>
                                <span className={cn("block text-[10px] uppercase tracking-widest font-bold", isActive ? "text-indigo-200" : "text-indigo-400")}>
                                  {household.role}
                                </span>
                              </span>
                              {isSwitching ? (
                                <Loader2 size={14} className="animate-spin shrink-0" />
                              ) : isActive ? (
                                <Check size={14} className="shrink-0" />
                              ) : null}
                            </button>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh Tasks"
              title="Refresh Tasks"
              className="p-2.5 rounded-full text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={cn(isRefreshing && "animate-spin")} />
            </button>
            <button
              onClick={openProfileSettings}
              aria-label="Profile Settings"
              title="Profile Settings"
              className="p-2.5 rounded-full text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Settings size={18} />
            </button>
            <a
              href="/auth/logout"
              aria-label="Log Out"
              title="Log Out"
              className="p-2.5 rounded-full text-indigo-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
            >
              <LogOut size={18} />
            </a>
            <div aria-hidden="true" className="w-px h-6 bg-indigo-100" />
            <button
              onClick={openAddTask}
              aria-label="Add Task"
              title="Add Task"
              className="p-2 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
        <button
          onClick={openInviteMember}
          className="flex items-center gap-2 text-sm font-semibold bg-white border border-indigo-100 px-4 py-2 rounded-2xl shadow-sm hover:border-indigo-200 transition-colors w-full justify-center"
        >
          <UserIcon size={16} className="text-indigo-400" />
          Invite Member
        </button>

        <div className="flex bg-indigo-50/50 p-1 rounded-2xl mt-4 relative">
          <motion.div
            layoutId="activeTab"
            className="absolute inset-y-1 bg-white rounded-xl shadow-sm z-0"
            initial={false}
            animate={{
              left: viewMode === 'mine' ? '4px' : '50%',
              right: viewMode === 'mine' ? '50%' : '4px',
            }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
          <button
            onClick={() => setViewMode('mine')}
            className={cn(
              "flex-1 py-2 text-sm font-black rounded-xl transition-colors relative z-10",
              viewMode === 'mine' ? "text-indigo-600" : "text-indigo-400 hover:text-indigo-500"
            )}
          >
            My Tasks
          </button>
          <button
            onClick={() => setViewMode('household')}
            title={`${users.length} household member${users.length === 1 ? "" : "s"}`}
            className={cn(
              "flex-1 py-2 text-sm font-black rounded-xl transition-colors relative z-10",
              viewMode === 'household' ? "text-indigo-600" : "text-indigo-400 hover:text-indigo-500"
            )}
          >
            Household
          </button>
        </div>
      </header>

      {/* 2. WEEKLY CALENDAR SLIDER */}
      <section className="mt-8 overflow-hidden">
        <div className="flex items-center justify-between px-6 mb-3">
          <button
            onClick={goToPreviousWeek}
            aria-label="Previous Week"
            title="Previous Week"
            className="p-2 rounded-full text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors active:scale-90"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={goToCurrentWeek}
            disabled={isCurrentWeek}
            className={cn(
              "text-sm font-black tracking-tight transition-colors rounded-xl px-3 py-1",
              isCurrentWeek
                ? "text-indigo-900 cursor-default"
                : "text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
            )}
          >
            {weekRangeLabel}
          </button>
          <button
            onClick={goToNextWeek}
            aria-label="Next Week"
            title="Next Week"
            className="p-2 rounded-full text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors active:scale-90"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-4 scrollbar-hide snap-x">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day.fullDate, selectedDay);
            return (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day.fullDate)}
                className={cn(
                  "flex flex-col items-center min-w-17.5 py-4 rounded-3xl transition-all snap-center",
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-105" 
                    : "bg-white text-indigo-400 border border-indigo-50"
                )}
              >
                <span className="text-xs font-bold uppercase tracking-wider mb-1">{day.label}</span>
                <span className="text-lg font-bold">{day.date.split(" ")[1]}</span>
                {day.isToday && !isSelected && (
                  <div className="w-1 h-1 bg-indigo-600 rounded-full mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. ROOM TABS / CATEGORIES */}
      <section className="mt-8 px-6">
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {rooms.map((room) => {
            const isFav = favoriteRooms.includes(room.id);
            const Icon = getRoomIcon(room.icon_name);
            const isActive = selectedRoom === room.id;
            
            return (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all whitespace-nowrap group",
                  isActive
                    ? "bg-indigo-900 border-indigo-900 text-white shadow-lg"
                    : "bg-white border-indigo-50 text-indigo-600 hover:border-indigo-200"
                )}
              >
                <Icon size={18} className={cn(isActive ? "text-indigo-200" : "text-indigo-400")} />
                <span className="font-bold text-sm">{room.name}</span>
                {room.id !== "all" && (
                  <Star 
                    size={14} 
                    onClick={(e) => toggleFavoriteRoom(room.id, e)}
                    className={cn(
                      "ml-1 transition-colors",
                      isFav ? "fill-amber-400 text-amber-400" : "text-indigo-200 group-hover:text-indigo-300"
                    )} 
                  />
                )}
              </button>
            );
          })}
          <button
            onClick={() => openAddRoom(false)}
            aria-label="Add Room"
            title="Add Room"
            className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-indigo-200 text-indigo-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all whitespace-nowrap"
          >
            <Plus size={18} />
            <span className="font-bold text-sm">Add Room</span>
          </button>
        </div>
      </section>

      {/* 4. TASK LIST */}
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
            filteredTasks.map((task) => {
              const isFav = favoriteTasks.includes(task.chore_id);
              const isCompleted = task.status === 'completed';
              const avatarColor = task.assigned_user_color || "bg-indigo-100 text-indigo-700";
              const durationLabel = task.estimated_duration_minutes != null
                ? `${task.estimated_duration_minutes}m`
                : "—";
              
              const completedAtTime = task.completed_at 
                ? new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : null;

              return (
                <motion.div
                  key={task.id}
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
                                isFav ? "fill-amber-400 text-amber-400" : "text-indigo-100 hover:text-indigo-300"
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
                      </div>
                      <h3 className={cn(
                        "font-bold text-lg leading-tight transition-colors",
                        isCompleted ? "text-indigo-900/60" : "group-hover:text-indigo-600"
                      )}>
                        {task.title}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm", avatarColor)}>
                        {task.assigned_user_avatar ?? "?"}
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
                        <button 
                          onClick={() => openCompleteTask(task)}
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
            })
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

      {/* 5. COMPLETE TASK MODAL (Drawer) */}
      <AnimatePresence>
        {completingTask && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isCompletingTask && setCompletingTask(null)}
              className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-40"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 z-50 shadow-2xl max-w-lg mx-auto border-t border-indigo-50"
            >
              <div className="w-12 h-1.5 bg-indigo-100 rounded-full mx-auto mb-8" />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black mb-1">Finish Task</h2>
                  <p className="text-indigo-400 font-bold">{completingTask.title}</p>
                </div>
                <button 
                  onClick={() => setCompletingTask(null)}
                  disabled={isCompletingTask}
                  className="p-2 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
                >
                  <X size={20} className="text-indigo-300" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Duration Input */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                    Actual Minutes Taken
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="e.g. 20"
                      value={actualMinutes}
                      onChange={(e) => setActualMinutes(e.target.value)}
                      className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">min</div>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-3 ml-1">
                    Effort / Satisfaction
                  </label>
                  <div className="flex justify-between px-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        onClick={() => setRating(star)}
                        className="p-2 hover:scale-125 transition-transform active:scale-90"
                      >
                        <Star 
                          size={32} 
                          className={cn(
                            "transition-colors",
                            rating >= star ? "fill-amber-400 text-amber-400" : "text-indigo-100 hover:text-amber-200"
                          )} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                    Notes
                  </label>
                  <div className="relative">
                    <textarea 
                      placeholder="Any issues or things to note?"
                      rows={3}
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold transition-all resize-none"
                    />
                    <MessageSquare size={20} className="absolute right-5 top-5 text-indigo-200" />
                  </div>
                </div>

                {/* Submit */}
                <button 
                  onClick={handleSubmitCompletion}
                  disabled={isCompletingTask}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-4xl font-black text-lg shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                >
                  {isCompletingTask ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Completion"
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 6. ADD TASK MODAL (Drawer) */}
      <AnimatePresence>
        {isAddTaskOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isAddingTask && setIsAddTaskOpen(false)}
              className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-40"
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 z-50 shadow-2xl max-w-lg mx-auto border-t border-indigo-50 max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-indigo-100 rounded-full mx-auto mb-8" />

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black mb-1">Add Task</h2>
                  <p className="text-indigo-400 font-bold">Create a new chore</p>
                </div>
                <button
                  onClick={() => setIsAddTaskOpen(false)}
                  disabled={isAddingTask}
                  className="p-2 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
                >
                  <X size={20} className="text-indigo-300" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Task Name */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                    Task Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Clean the fridge"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all"
                  />
                </div>

                {/* Room */}
                <div>
                  <div className="flex items-center justify-between mb-2 ml-1 mr-1">
                    <label className="block text-xs font-black uppercase tracking-widest text-indigo-400">
                      Room
                    </label>
                    <button
                      type="button"
                      onClick={() => openAddRoom(true)}
                      className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      <Plus size={12} />
                      New Room
                    </button>
                  </div>
                  {selectableRooms.length > 0 ? (
                    <select
                      value={newTaskRoomId}
                      onChange={(e) => setNewTaskRoomId(e.target.value)}
                      className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all appearance-none"
                    >
                      {selectableRooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAddRoom(true)}
                      className="w-full bg-indigo-50/50 hover:bg-indigo-50 rounded-2xl px-5 py-4 font-bold text-indigo-400 hover:text-indigo-600 text-left transition-colors"
                    >
                      No rooms yet — tap to add one.
                    </button>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                    Time to Complete
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      placeholder="e.g. 20"
                      value={newTaskDuration}
                      onChange={(e) => setNewTaskDuration(e.target.value)}
                      className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">min</div>
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                    Frequency
                  </label>
                  <select
                    value={newTaskFrequency}
                    onChange={(e) => setNewTaskFrequency(e.target.value as typeof newTaskFrequency)}
                    className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all appearance-none"
                  >
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Interval */}
                {isCustomIntervalFrequency && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                      Repeat Every
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        placeholder="e.g. 3"
                        value={newTaskFrequencyInterval}
                        onChange={(e) => setNewTaskFrequencyInterval(e.target.value)}
                        className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all"
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">
                        {newTaskFrequency === 'every-x-weeks' ? 'weeks' : 'days'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Last Completed */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                    Date Last Completed
                  </label>
                  <input
                    type="date"
                    value={newTaskLastCompleted}
                    onChange={(e) => setNewTaskLastCompleted(e.target.value)}
                    className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleAddTask}
                  disabled={isAddingTask || !isAddTaskValid}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-4xl font-black text-lg shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                >
                  {isAddingTask ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Task"
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 7. ADD ROOM MODAL (Drawer) */}
      <AnimatePresence>
        {isAddRoomOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isAddingRoom && setIsAddRoomOpen(false)}
              className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-[55]"
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 z-[60] shadow-2xl max-w-lg mx-auto border-t border-indigo-50 max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-indigo-100 rounded-full mx-auto mb-8" />

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black mb-1">Add Room</h2>
                  <p className="text-indigo-400 font-bold">Create a new space</p>
                </div>
                <button
                  onClick={() => setIsAddRoomOpen(false)}
                  disabled={isAddingRoom}
                  className="p-2 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
                >
                  <X size={20} className="text-indigo-300" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Room Name */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                    Room Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Garage"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-5 py-4 font-bold text-lg transition-all"
                  />
                </div>

                {/* Icon Selection */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-3 ml-1">
                    Icon
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {ICON_OPTIONS.map((iconName) => {
                      const Icon = ICON_MAP[iconName];
                      const isSelected = newRoomIconName === iconName;
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setNewRoomIconName(iconName)}
                          aria-label={iconName}
                          title={iconName}
                          className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all active:scale-95",
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105"
                              : "bg-indigo-50/50 border-transparent text-indigo-400 hover:border-indigo-200"
                          )}
                        >
                          <Icon size={22} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleAddRoom}
                  disabled={isAddingRoom || !isAddRoomValid}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-4xl font-black text-lg shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                >
                  {isAddingRoom ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Room"
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 8. PROFILE SETTINGS MODAL */}
      <AnimatePresence>
        {isProfileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileOpen(false)}
              className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-40"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
            >
              <div
                className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-indigo-50"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Settings size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black">Profile Settings</h2>
                      <p className="text-indigo-400 text-sm font-bold">Update your details</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsProfileOpen(false)}
                    className="p-2 hover:bg-indigo-50 rounded-full transition-colors"
                  >
                    <X size={20} className="text-indigo-300" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Full Name Input */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-300" />
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Your name"
                        className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl pl-12 pr-5 py-4 font-bold text-lg transition-all"
                      />
                    </div>
                  </div>

                  {/* Notifications */}
                  {isPushSupported && (
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                        Daily Reminders
                      </label>
                      <button
                        onClick={handleEnableNotifications}
                        disabled={isSubscribing || isSubscribed}
                        className={cn(
                          "w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black transition-all active:scale-[0.98] border-2",
                          isSubscribed 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-600 cursor-default" 
                            : "bg-indigo-50 border-transparent text-indigo-600 hover:bg-indigo-100"
                        )}
                      >
                        {isSubscribing ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : isSubscribed ? (
                          <Bell size={18} />
                        ) : (
                          <BellOff size={18} />
                        )}
                        {isSubscribed ? "Notifications Enabled" : "Enable Daily Notifications"}
                      </button>
                      <p className="text-[10px] text-indigo-400 mt-2 ml-1 font-bold leading-tight">
                        Receive a morning task summary and evening reminders for outstanding chores.
                      </p>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                            Morning Summary
                          </label>
                          <select
                            value={morningNotificationHour}
                            onChange={(e) => setMorningNotificationHour(Number(e.target.value))}
                            className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-4 py-3 font-bold text-sm transition-all"
                          >
                            {HOUR_OPTIONS.map((hour) => (
                              <option key={hour} value={hour}>
                                {formatHourLabel(hour)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                            Evening Reminder
                          </label>
                          <select
                            value={eveningNotificationHour}
                            onChange={(e) => setEveningNotificationHour(Number(e.target.value))}
                            className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl px-4 py-3 font-bold text-sm transition-all"
                          >
                            {HOUR_OPTIONS.map((hour) => (
                              <option key={hour} value={hour}>
                                {formatHourLabel(hour)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setIsProfileOpen(false)}
                      disabled={isSavingProfile}
                      className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-4 rounded-2xl font-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile || !profileName.trim()}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 9. INVITE MEMBER MODAL (Drawer) */}
      <AnimatePresence>
        {isInviteOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isInviting && setIsInviteOpen(false)}
              className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-40"
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 z-50 shadow-2xl max-w-lg mx-auto border-t border-indigo-50"
            >
              <div className="w-12 h-1.5 bg-indigo-100 rounded-full mx-auto mb-8" />

              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <UserIcon size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Invite Member</h2>
                    <p className="text-indigo-400 text-sm font-bold">
                      {activeHousehold ? `Add someone to "${activeHousehold.name}"` : "Add someone to your household"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsInviteOpen(false)}
                  disabled={isInviting}
                  className="p-2 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
                >
                  <X size={20} className="text-indigo-300" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Invitee Email */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                    Invitee Email
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-300" />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        setInviteError(null);
                      }}
                      className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl pl-12 pr-5 py-4 font-bold text-lg transition-all"
                    />
                  </div>
                  {inviteError && (
                    <p className="text-rose-500 text-sm font-bold mt-2 ml-1">{inviteError}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  onClick={handleInviteSubmit}
                  disabled={isInviting || !isInviteValid}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-4xl font-black text-lg shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                >
                  {isInviting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Invite"
                  )}
                </button>
              </div>
            </motion.div>
          </>
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
