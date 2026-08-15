"use client";

import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
  mobileFullScreen = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  mobileFullScreen?: boolean;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const requestClose = useEffectEvent(() => {
    onClose();
  });
  const restorePreviousFocus = useEffectEvent(() => {
    previousFocusRef.current?.focus();
  });

  function getFocusableElements() {
    if (!dialogRef.current) {
      return [] as HTMLElement[];
    }

    const selectors = [
      "button:not([disabled])",
      "a[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    return Array.from(dialogRef.current.querySelectorAll<HTMLElement>(selectors)).filter(
      (element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true",
    );
  }

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusableElements();

      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!activeElement || activeElement === first || activeElement === dialogRef.current) {
          event.preventDefault();
          last?.focus();
        }
        return;
      }

      if (!activeElement || activeElement === dialogRef.current) {
        event.preventDefault();
        first?.focus();
        return;
      }

      if (activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restorePreviousFocus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const sizeClass =
    size === "sm"
      ? "max-w-md"
      : size === "xl"
        ? "max-w-5xl"
        : size === "lg"
        ? "max-w-2xl"
        : "max-w-xl";
  const mobileSizeClass = mobileFullScreen
    ? size === "sm"
      ? "max-w-none sm:max-w-md"
      : size === "xl"
        ? "max-w-none sm:max-w-5xl"
        : size === "lg"
          ? "max-w-none sm:max-w-2xl"
          : "max-w-none sm:max-w-xl"
    : sizeClass;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 backdrop-blur-md transition-all duration-300 ${mobileFullScreen ? "p-0 sm:px-4 sm:pb-8 sm:pt-[10vh]" : "px-3 pb-4 pt-4 sm:px-4 sm:pb-8 sm:pt-[10vh]"}`}
      style={{ paddingBottom: mobileFullScreen ? undefined : "max(1rem, env(safe-area-inset-bottom))" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fade-in-panel glass-panel flex w-full flex-col ${mobileSizeClass} ${mobileFullScreen ? "min-h-[100dvh] max-h-[100dvh] rounded-none sm:min-h-0 sm:max-h-none sm:rounded-[var(--radius-lg)]" : "max-h-[calc(100dvh-2rem)] rounded-[var(--radius-lg)]"} outline-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] ring-1 ring-slate-200/50 transform transition-all duration-300 scale-100 opacity-100`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-white px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h3 id={titleId} className="text-[15px] font-semibold text-foreground">
              {title}
            </h3>
            {description ? (
              <p className="mt-0.5 text-[13px] text-muted line-clamp-2">{description}</p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close dialog"
            onClick={onClose}
            className="-mr-2 -mt-1 h-11 w-11 shrink-0 rounded-full text-muted transition-all duration-200 hover:rotate-90 hover:bg-surface-strong hover:text-foreground xl:-mr-1 xl:-mt-0.5 xl:h-9 xl:w-9"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className={`custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 ${mobileFullScreen ? "max-h-none sm:flex-none sm:max-h-[60vh]" : "max-h-[calc(100dvh-11rem)] sm:flex-none sm:max-h-[60vh]"}`}>{children}</div>
        <div
          className="flex shrink-0 flex-col-reverse items-stretch gap-2 rounded-b-[var(--radius-lg)] border-t border-border bg-surface px-4 py-3.5 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 sm:px-5 sm:py-4"
          style={{ paddingBottom: mobileFullScreen ? "max(0.875rem, env(safe-area-inset-bottom))" : undefined }}
        >
          {footer || (
            <Button variant="outline" onClick={onClose} className="w-full px-4 sm:w-auto">
              Close
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
