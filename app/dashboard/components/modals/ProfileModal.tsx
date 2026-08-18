"use client";

import { X, User as UserIcon, Settings, Loader2, Bell, BellOff } from "lucide-react";
import { motion } from "framer-motion";
import { cn, HOUR_OPTIONS } from "@/app/dashboard/components/dashboard-ui-utils";
import { formatHourLabel } from "@/lib/dashboard/date-utils";

interface ProfileModalProps {
  profileName: string;
  setProfileName: (value: string) => void;
  isPushSupported: boolean;
  isSubscribing: boolean;
  isSubscribed: boolean;
  handleEnableNotifications: () => Promise<void>;
  morningNotificationHour: number;
  setMorningNotificationHour: (value: number) => void;
  eveningNotificationHour: number;
  setEveningNotificationHour: (value: number) => void;
  isSavingProfile: boolean;
  appVersion?: string | null;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export default function ProfileModal({
  profileName,
  setProfileName,
  isPushSupported,
  isSubscribing,
  isSubscribed,
  handleEnableNotifications,
  morningNotificationHour,
  setMorningNotificationHour,
  eveningNotificationHour,
  setEveningNotificationHour,
  isSavingProfile,
  appVersion,
  onClose,
  onSubmit,
}: Readonly<ProfileModalProps>) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
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
              onClick={onClose}
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
                onClick={onClose}
                disabled={isSavingProfile}
                className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-4 rounded-2xl font-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
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

            {appVersion && (
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                Chorez version{appVersion}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
