"use client";

import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useModalLayer } from "@/hooks/use-modal-layer";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function ActionDrawer({ isOpen, onClose, title, children, footer }: DrawerProps) {
  const titleId = useId();
  const ref = useModalLayer<HTMLDivElement>(isOpen, onClose);
  if (!isOpen || typeof document === "undefined") return null;
  return createPortal(
    <div className="app-modal-backdrop app-action-backdrop fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="app-modal-panel flex h-full w-full max-w-md flex-col bg-white shadow-xl outline-none sm:!max-h-full sm:rounded-none">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
          <h2 id={titleId} className="min-w-0 text-base font-semibold text-slate-900">{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600">
            <X size={20} />
          </button>
        </div>
        <div className="app-modal-body min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
        {footer && <div className="app-modal-footer flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-white p-4 sm:p-6">{footer}</div>}
      </div>
    </div>, document.body,
  );
}
