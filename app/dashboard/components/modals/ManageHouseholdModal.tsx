"use client";

import { useState } from "react";
import { X, Users, Loader2, UserMinus, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/dashboard/components/dashboard-ui-utils";
import type { Household, HouseholdMember } from "@/lib/dashboard/types";

interface ManageHouseholdModalProps {
  activeHousehold: Household | null;
  members: HouseholdMember[];
  currentUserId?: string;
  removingMemberId: string | null;
  removeMemberError: string | null;
  onClose: () => void;
  onRemoveMember: (memberId: string) => Promise<void>;
}

export default function ManageHouseholdModal({
  activeHousehold,
  members,
  currentUserId,
  removingMemberId,
  removeMemberError,
  onClose,
  onRemoveMember,
}: Readonly<ManageHouseholdModalProps>) {
  const [confirmingMemberId, setConfirmingMemberId] = useState<string | null>(null);
  const isBusy = removingMemberId !== null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isBusy && onClose()}
        className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm z-40"
      />

      {/* Drawer */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[3rem] p-8 z-50 shadow-2xl max-w-lg mx-auto border-t border-indigo-50 max-h-[85vh] overflow-y-auto"
      >
        <div className="w-12 h-1.5 bg-indigo-100 rounded-full mx-auto mb-8" />

        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black">Manage Household</h2>
              <p className="text-indigo-400 text-sm font-bold">
                {activeHousehold ? `Members of "${activeHousehold.name}"` : "Members"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="p-2 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-indigo-300" />
          </button>
        </div>

        {removeMemberError && (
          <p className="text-rose-500 text-sm font-bold mb-4 ml-1">{removeMemberError}</p>
        )}

        <div className="space-y-3">
          {members.map((member) => {
            const isSelf = member.id === currentUserId;
            const isRemoving = removingMemberId === member.id;
            const isConfirming = confirmingMemberId === member.id;

            return (
              <div
                key={member.id}
                className="flex items-center gap-4 bg-indigo-50/50 border border-indigo-50 p-4 rounded-3xl"
              >
                <div
                  className={cn(
                    "w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center font-black text-sm",
                    member.color ?? "bg-indigo-100 text-indigo-700"
                  )}
                >
                  {member.avatar ?? member.name?.charAt(0) ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-tight truncate">
                    {member.name ?? member.email}
                    {isSelf && <span className="text-indigo-400 font-medium"> (you)</span>}
                  </p>
                  <p className="text-indigo-400 text-xs font-medium truncate">{member.email}</p>
                </div>
                {member.role === 'admin' && (
                  <span
                    title="Admin"
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-100 px-2 py-1 rounded-full shrink-0"
                  >
                    <ShieldCheck size={12} />
                    Admin
                  </span>
                )}
                {!isSelf && (
                  isConfirming ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setConfirmingMemberId(null)}
                        disabled={isRemoving}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-500 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          await onRemoveMember(member.id);
                          setConfirmingMemberId(null);
                        }}
                        disabled={isRemoving}
                        className="px-3 py-1.5 rounded-xl text-xs font-black text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isRemoving ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingMemberId(member.id)}
                      disabled={isBusy}
                      aria-label={`Remove ${member.name ?? member.email}`}
                      title="Remove from household"
                      className="p-2.5 rounded-2xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50 shrink-0"
                    >
                      <UserMinus size={18} />
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}
