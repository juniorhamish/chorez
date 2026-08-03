import { useState } from "react";

/** Owns the Invite Member modal's open/closed state and form fields. */
export function useInviteMember() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const openInviteMember = () => {
    setInviteEmail("");
    setInviteError(null);
    setIsInviteOpen(true);
  };

  return {
    isInviteOpen,
    setIsInviteOpen,
    inviteEmail,
    setInviteEmail,
    isInviting,
    setIsInviting,
    inviteError,
    setInviteError,
    openInviteMember,
  };
}
