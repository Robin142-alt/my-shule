"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useModalLayer } from "@/hooks/use-modal-layer";

import { Button } from "@/components/ui/button";

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
};

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(component: string) {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error(`${component} must be used inside Dialog`);
  }
  return context;
}

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const reactId = useId();

  return (
    <DialogContext.Provider
      value={{
        open,
        onOpenChange,
        titleId: `${reactId}-title`,
        descriptionId: `${reactId}-description`,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  children,
  asChild = false,
}: {
  children: ReactNode;
  asChild?: boolean;
}) {
  const { onOpenChange } = useDialogContext("DialogTrigger");

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ onClick?: React.MouseEventHandler }>;
    return cloneElement(child, {
      onClick: (event) => {
        child.props.onClick?.(event);
        if (!event.defaultPrevented) {
          onOpenChange(true);
        }
      },
    });
  }

  return (
    <Button type="button" onClick={() => onOpenChange(true)}>
      {children}
    </Button>
  );
}

export function DialogContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { open, onOpenChange, titleId, descriptionId } = useDialogContext("DialogContent");

  const dialogRef = useModalLayer<HTMLDivElement>(open, () => onOpenChange(false));

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="app-modal-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 px-4 pb-8 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`app-modal-panel relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-xl outline-none ${className}`}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close dialog"
          onClick={() => onOpenChange(false)}
          className="absolute right-2 top-2 z-10 h-11 w-11 shrink-0 rounded-full bg-white text-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="app-modal-body min-h-0 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function DialogHeader({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-4 space-y-1.5 border-b border-border pb-4 pr-10 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useDialogContext("DialogTitle");
  return (
    <h2 id={titleId} className={`text-base font-semibold text-foreground ${className}`} {...props}>
      {children}
    </h2>
  );
}

export function DialogDescription({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useDialogContext("DialogDescription");
  return (
    <p id={descriptionId} className={`text-sm text-muted ${className}`} {...props}>
      {children}
    </p>
  );
}

export function DialogFooter({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`app-modal-footer sticky -bottom-4 mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-white py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
