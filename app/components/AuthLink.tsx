"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { LogIn, LogOut } from "lucide-react";

interface AuthLinkProps {
  className: string;
}

/**
 * Small client island rendering the login/logout link. Isolated from the
 * (otherwise fully static) landing page sections so only this bit of UI
 * needs `useUser()` and ships as client JS.
 */
export default function AuthLink({ className }: AuthLinkProps) {
  const { user, isLoading } = useUser();

  if (isLoading) return null;

  return (
    <a
      href={user ? "/auth/logout" : "/auth/login?returnTo=/dashboard"}
      className={className}
    >
      {user ? <LogOut size={16} /> : <LogIn size={16} />}
      {user ? "Log Out" : "Log In"}
    </a>
  );
}
