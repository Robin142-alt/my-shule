"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useModalLayer } from "@/hooks/use-modal-layer";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function HeaderPopover({
  label,
  triggerLabel,
  title,
  icon,
  badge,
  headerAccessory,
  children,
  desktopWidth = "sm:w-80",
}: {
  label: string;
  triggerLabel?: string;
  title: string;
  icon: ReactNode;
  badge?: ReactNode;
  headerAccessory?: ReactNode;
  children: ReactNode;
  desktopWidth?: "sm:w-80" | "sm:w-96";
}) {
  const [open, setOpen] = useState(false);
  const [compactViewport, setCompactViewport] = useState(true);
  const [anchorPosition, setAnchorPosition] = useState({ top: 64, left: 12, maxHeight: 480 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusOnCloseRef = useRef(true);
  const titleId = useId();
  const close = useCallback(() => setOpen(false), []);
  const panelRef = useModalLayer<HTMLDivElement>(open, close, { lockScroll: compactViewport, restoreFocus: () => restoreFocusOnCloseRef.current });

  useEffect(() => {
    if (!open) return;

    restoreFocusOnCloseRef.current = true;

    function updatePosition() {
      const compact = window.innerWidth < 640;
      const triggerBounds = triggerRef.current?.getBoundingClientRect();
      setCompactViewport(compact);
      if (triggerBounds) {
        const panelWidth = desktopWidth === "sm:w-96" ? 384 : 320;
        const preferredLeft = triggerBounds.right - panelWidth;
        const preferredTop = triggerBounds.bottom + 8;
        const top = Math.min(preferredTop, Math.max(12, window.innerHeight - 96));
        setAnchorPosition({
          top,
          left: Math.min(
            Math.max(12, preferredLeft),
            Math.max(12, window.innerWidth - panelWidth - 12),
          ),
          maxHeight: Math.max(48, window.innerHeight - top - 12),
        });
      }
    }

    updatePosition();
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        restoreFocusOnCloseRef.current = false;
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [close, desktopWidth, open, panelRef]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel ?? label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative grid h-11 w-11 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200/70 xl:h-10 xl:w-10"
      >
        {icon}
        {badge}
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <>
          {compactViewport ? (
          <div
            aria-hidden="true"
            onPointerDown={close}
            className="fixed inset-0 z-40 cursor-default bg-slate-950/25 backdrop-blur-[2px]"
          />
          ) : null}
          <div
            ref={panelRef}
            role="dialog"
            aria-modal={compactViewport || undefined}
            tabIndex={-1}
            aria-labelledby={titleId}
            style={compactViewport ? undefined : { top: anchorPosition.top, left: anchorPosition.left, maxHeight: anchorPosition.maxHeight }}
            className={`fixed z-50 flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 outline-none ${compactViewport ? "app-popover-sheet inset-3" : desktopWidth}`}
          >
            <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-4 backdrop-blur">
              <h3 id={titleId} className="font-semibold text-slate-800">{title}</h3>
              <div className="flex items-center gap-2">
                {headerAccessory}
                <button
                  type="button"
                  aria-label={`Close ${label.toLowerCase()}`}
                  onClick={close}
                  className="grid h-11 w-11 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200/70 xl:h-9 xl:w-9"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </div>
        </>,
        document.body,
      )
      : null}
    </div>
  );
}
