import { useState } from "react";
import { submitHelpReport, type HelpReportResult } from "@/lib/actions/feedback-actions";

/**
 * Owns the state for the "Help / Report an issue" modal: the message being
 * drafted, the in-flight submission, and either the resulting GitHub issue
 * (created or commented-on) or an error to show back to the user (e.g. a
 * rate limit or a rejected/gibberish report).
 */
export function useHelpReport() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportResult, setReportResult] = useState<HelpReportResult | null>(null);

  const openHelp = () => {
    setReportMessage("");
    setReportError(null);
    setReportResult(null);
    setIsHelpOpen(true);
  };

  const closeHelp = () => setIsHelpOpen(false);

  const submitReport = async () => {
    const trimmed = reportMessage.trim();
    if (!trimmed) return;
    setIsSubmittingReport(true);
    setReportError(null);
    try {
      const result = await submitHelpReport(trimmed);
      setReportResult(result);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return {
    isHelpOpen,
    setIsHelpOpen,
    reportMessage,
    setReportMessage,
    isSubmittingReport,
    reportError,
    setReportError,
    reportResult,
    openHelp,
    closeHelp,
    submitReport,
  };
}
