"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import type { ExperienceAudience } from "@/lib/auth/experience-audience";
import { useExperienceSession } from "@/lib/auth/use-experience-session";

type SessionSignOutButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onClick" | "type"
> & {
  audience: ExperienceAudience;
  children?: ReactNode;
  pendingLabel?: ReactNode;
  onSignOutError?: (error: unknown) => void;
  browserLoginPath?: string;
};

export function SessionSignOutButton({
  audience,
  children = "Sign out",
  pendingLabel = "Signing out…",
  disabled,
  onSignOutError,
  browserLoginPath,
  ...buttonProps
}: SessionSignOutButtonProps) {
  const session = useExperienceSession(audience, { logoutPath: browserLoginPath });

  const signOut = async () => {
    try {
      await session.logout();
    } catch (error) {
      onSignOutError?.(error);
    }
  };

  return (
    <>
      <button
        {...buttonProps}
        type="button"
        disabled={disabled || session.isSubmitting}
        aria-busy={session.isSubmitting}
        onClick={() => void signOut()}
      >
        {session.isSubmitting ? pendingLabel : children}
      </button>
      {session.error ? (
        <span
          className="fixed bottom-4 left-4 right-4 z-[90] rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-700 shadow-xl sm:left-auto sm:max-w-sm"
          role="alert"
        >
          {session.error}
        </span>
      ) : null}
    </>
  );
}
