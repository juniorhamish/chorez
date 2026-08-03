"use client";

import { X, User as UserIcon, Mail, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Household } from "@/lib/dashboard/types";

interface InviteMemberModalProps {
  activeHousehold: Household | null;
  inviteEmail: string;
  setInviteEmail: (value: string) => void;
  setInviteError: (value: string | null) => void;
  inviteError: string | null;
  isInviting: boolean;
  isInviteValid: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export default function InviteMemberModal({
  activeHousehold,
  inviteEmail,
  setInviteEmail,
  setInviteError,
  inviteError,
  isInviting,
  isInviteValid,
  onClose,
  onSubmit,
}: Readonly<InviteMemberModalProps>) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isInviting && onClose()}
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
            onClick={onClose}
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
            onClick={onSubmit}
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
  );
}
