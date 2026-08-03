"use client";

import React from "react";
import {
  Plus,
  User as UserIcon,
  Home,
  ChevronDown,
  LogOut,
  Settings,
  Loader2,
  Check,
  RefreshCw,
  Sparkles,
  Undo2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/dashboard/components/dashboard-ui-utils";
import type { Household, HouseholdUser } from "@/lib/dashboard/types";

interface DashboardHeaderProps {
  greeting: string;
  userName?: string | null;
  incompleteTasksCount: number;
  viewMode: 'mine' | 'household';
  setViewMode: (mode: 'mine' | 'household') => void;
  users: HouseholdUser[];
  households: Household[];
  activeHousehold: Household | null;
  isHouseholdMenuOpen: boolean;
  setIsHouseholdMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  switchingHouseholdId: string | null;
  handleSwitchHousehold: (householdId: string) => Promise<void>;
  isRefreshing: boolean;
  handleRefresh: () => Promise<void>;
  openProfileSettings: () => void;
  openAddTask: () => void;
  openInviteMember: () => void;
  isHouseholdAdmin: boolean;
  isOptimizingSchedule: boolean;
  hasUndoableOptimization: boolean;
  onOptimizeSchedule: () => void;
  onViewLastOptimization: () => void;
}

export default function DashboardHeader({
  greeting,
  userName,
  incompleteTasksCount,
  viewMode,
  setViewMode,
  users,
  households,
  activeHousehold,
  isHouseholdMenuOpen,
  setIsHouseholdMenuOpen,
  switchingHouseholdId,
  handleSwitchHousehold,
  isRefreshing,
  handleRefresh,
  openProfileSettings,
  openAddTask,
  openInviteMember,
  isHouseholdAdmin,
  isOptimizingSchedule,
  hasUndoableOptimization,
  onOptimizeSchedule,
  onViewLastOptimization,
}: Readonly<DashboardHeaderProps>) {
  return (
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

      {isHouseholdAdmin && (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={onOptimizeSchedule}
            disabled={isOptimizingSchedule}
            className="flex-1 flex items-center gap-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] justify-center"
          >
            {isOptimizingSchedule ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Optimizing schedule&hellip;
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Optimize with AI
              </>
            )}
          </button>
          {hasUndoableOptimization && !isOptimizingSchedule && (
            <button
              onClick={onViewLastOptimization}
              aria-label="View or undo last AI optimization"
              title="View or undo last AI optimization"
              className="p-2.5 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors shrink-0"
            >
              <Undo2 size={18} />
            </button>
          )}
        </div>
      )}

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
  );
}
