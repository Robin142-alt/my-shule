"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

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

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onOpenChange, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 px-4 pb-8 pt-[10vh] backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`dashboard-card w-full max-w-xl overflow-hidden rounded-[var(--radius-lg)] bg-white p-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] outline-none ${className}`}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close dialog"
          onClick={() => onOpenChange(false)}
          className="absolute right-[calc(50%-18rem)] top-[calc(10vh+0.75rem)] h-8 w-8 text-slate-500 hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export function DialogHeader({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-4 space-y-1.5 border-b border-border pb-4 ${className}`} {...props}>
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
    <p id={descriptionId} className={`text-sm text-muted-foreground ${className}`} {...props}>
      {children}
    </p>
  );
}

export function DialogFooter({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
