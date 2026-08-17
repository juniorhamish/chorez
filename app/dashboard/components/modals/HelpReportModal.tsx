"use client";

import { X, LifeBuoy, Loader2, CheckCircle2, MessageSquarePlus } from "lucide-react";
import { motion } from "framer-motion";
import type { HelpReportResult } from "@/lib/actions/feedback-actions";

interface HelpReportModalProps {
  reportMessage: string;
  setReportMessage: (value: string) => void;
  isSubmittingReport: boolean;
  reportError: string | null;
  reportResult: HelpReportResult | null;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export default function HelpReportModal({
  reportMessage,
  setReportMessage,
  isSubmittingReport,
  reportError,
  reportResult,
  onClose,
  onSubmit,
}: Readonly<HelpReportModalProps>) {
  const isValid = reportMessage.trim().length >= 10;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isSubmittingReport && onClose()}
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
              <LifeBuoy size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black">Report an Issue</h2>
              <p className="text-indigo-400 text-sm font-bold">Tell us what went wrong</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmittingReport}
            className="p-2 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-indigo-300" />
          </button>
        </div>

        {reportResult ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 size={28} />
              </div>
              <p className="font-black text-lg">
                {reportResult.action === "created" ? "Thanks! Issue reported." : "Thanks! Added to an existing report."}
              </p>
              <p className="text-indigo-400 text-sm font-bold leading-snug">
                {reportResult.action === "created"
                  ? `We opened issue #${reportResult.issueNumber} on your behalf.`
                  : `A similar report already existed, so we added yours to issue #${reportResult.issueNumber}.`}
              </p>
              <a
                href={reportResult.issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 text-sm font-black underline underline-offset-2"
              >
                View on GitHub
              </a>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-4xl font-black text-lg shadow-xl shadow-indigo-200 transition-all active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 ml-1">
                What&apos;s the issue?
              </label>
              <div className="relative">
                <MessageSquarePlus size={18} className="absolute left-5 top-5 text-indigo-300" />
                <textarea
                  rows={5}
                  placeholder="Describe the problem or suggestion in a sentence or two&hellip;"
                  value={reportMessage}
                  onChange={(e) => setReportMessage(e.target.value)}
                  className="w-full bg-indigo-50/50 border-2 border-transparent outline-none rounded-2xl pl-12 pr-5 py-4 font-bold text-base transition-all resize-none"
                />
              </div>
              <p className="text-[10px] text-indigo-400 mt-2 ml-1 font-bold leading-tight">
                This is posted anonymously as a GitHub issue on our project repository — no GitHub account needed.
              </p>
              {reportError && <p className="text-rose-500 text-sm font-bold mt-2 ml-1">{reportError}</p>}
            </div>

            <button
              onClick={onSubmit}
              disabled={isSubmittingReport || !isValid}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-4xl font-black text-lg shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSubmittingReport ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}
