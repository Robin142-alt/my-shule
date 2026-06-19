"use client";

import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";
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
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      // Focus the dialog on open
      requestAnimationFrame(() => dialogRef.current?.focus());
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 pt-[10vh] pb-8 backdrop-blur-md transition-all duration-300 overflow-y-auto"
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
        aria-labelledby="modal-title"
        className={`fade-in-panel glass-panel w-full ${sizeClass} rounded-[var(--radius-lg)] outline-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] ring-1 ring-slate-200/50 transform transition-all duration-300 scale-100 opacity-100`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border bg-white px-5 py-3.5">
          <div className="min-w-0">
            <h3 id="modal-title" className="text-[15px] font-semibold text-foreground">
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
            className="shrink-0 -mr-1 -mt-0.5 h-8 w-8 rounded-full text-muted hover:text-foreground hover:bg-surface-strong hover:rotate-90 transition-all duration-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-5 py-5 custom-scrollbar max-h-[60vh] overflow-y-auto">{children}</div>
        <div className="flex flex-wrap items-center justify-end gap-3 rounded-b-[var(--radius-lg)] border-t border-border bg-surface px-5 py-4 backdrop-blur-sm">
          {footer || (
            <Button variant="outline" onClick={onClose} className="px-4">
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
