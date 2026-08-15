"use client";

import * as React from "react";
import { createPortal } from "react-dom";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  menuId: string;
  triggerId: string;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error("Dropdown menu parts must be rendered inside DropdownMenu.");
  }
  return context;
}

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const id = React.useId();
  const menuId = `${id}-menu`;
  const triggerId = `${id}-trigger`;

  React.useEffect(() => {
    if (!open) return;

    function closeAndRestoreFocus() {
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !contentRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAndRestoreFocus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, menuId, triggerId, triggerRef, contentRef }}>
      <div ref={rootRef} className="relative inline-block text-left">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

type TriggerChildProps = React.HTMLAttributes<HTMLElement> & {
  disabled?: boolean;
};

function DropdownMenuTrigger({ children, asChild = false }: { children: React.ReactNode; asChild?: boolean }) {
  const { open, setOpen, menuId, triggerId, triggerRef, contentRef } = useDropdownMenu();

  function focusFirstItem() {
    requestAnimationFrame(() => {
      contentRef.current
        ?.querySelector<HTMLElement>("[role='menuitem']:not([aria-disabled='true'])")
        ?.focus();
    });
  }

  function handleClick(event: React.MouseEvent<HTMLElement>) {
    triggerRef.current = event.currentTarget;
    setOpen((current) => {
      if (!current) focusFirstItem();
      return !current;
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      triggerRef.current = event.currentTarget;
      setOpen(true);
      focusFirstItem();
    }
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<TriggerChildProps>;
    return React.cloneElement(child, {
      id: triggerId,
      "aria-haspopup": "menu",
      "aria-expanded": open,
      "aria-controls": open ? menuId : undefined,
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        child.props.onClick?.(event);
        if (!event.defaultPrevented) handleClick(event);
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        child.props.onKeyDown?.(event);
        if (!event.defaultPrevented) handleKeyDown(event);
      },
    });
  }

  return (
    <button
      id={triggerId}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="min-h-11 cursor-pointer rounded-lg px-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200/70"
    >
      {children}
    </button>
  );
}

function DropdownMenuContent({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "end" | "right";
  className?: string;
}) {
  const { open, setOpen, menuId, triggerId, triggerRef, contentRef } = useDropdownMenu();
  const [position, setPosition] = React.useState({ top: 12, left: 12, maxHeight: 384 });

  React.useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const triggerBounds = triggerRef.current?.getBoundingClientRect();
      const contentBounds = contentRef.current?.getBoundingClientRect();
      if (!triggerBounds) return;

      const menuWidth = Math.min(
        contentBounds?.width || 192,
        Math.max(192, window.innerWidth - 24),
      );
      const menuHeight = contentBounds?.height || 240;
      const preferredLeft = align === "end" || align === "right"
        ? triggerBounds.right - menuWidth
        : triggerBounds.left;
      const left = Math.min(
        Math.max(12, preferredLeft),
        Math.max(12, window.innerWidth - menuWidth - 12),
      );
      const belowTop = triggerBounds.bottom + 8;
      const aboveTop = triggerBounds.top - menuHeight - 8;
      const top = belowTop + menuHeight <= window.innerHeight - 12 || aboveTop < 12
        ? Math.min(belowTop, Math.max(12, window.innerHeight - 96))
        : aboveTop;

      setPosition({
        top,
        left,
        maxHeight: Math.max(48, window.innerHeight - top - 12),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, contentRef, open, triggerRef]);

  React.useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      contentRef.current
        ?.querySelector<HTMLElement>("[role='menuitem']:not([aria-disabled='true'])")
        ?.focus();
    });
  }, [contentRef, open]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      contentRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']:not([aria-disabled='true'])") ?? [],
    );
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % items.length;
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (nextIndex !== null) {
      event.preventDefault();
      items[nextIndex]?.focus();
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={contentRef}
      id={open ? menuId : undefined}
      role={open ? "menu" : undefined}
      aria-labelledby={open ? triggerId : undefined}
      onKeyDown={open ? handleKeyDown : undefined}
      style={open ? { top: position.top, left: position.left, maxHeight: position.maxHeight } : undefined}
      className={open
        ? `fixed z-50 min-w-48 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl outline-none ${className}`
        : "contents"}
    >
      {children}
    </div>,
    document.body,
  );
}

type DropdownMenuItemProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  asChild?: boolean;
};

function DropdownMenuItem({
  children,
  disabled,
  className = "",
  asChild = false,
  onClick,
  ...props
}: DropdownMenuItemProps) {
  const { open, setOpen } = useDropdownMenu();
  const itemClassName = `relative flex min-h-11 w-full cursor-pointer select-none items-center rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground xl:min-h-9 ${disabled ? "pointer-events-none opacity-50" : ""} ${className}`;

  function handleSelect(event: React.MouseEvent<HTMLElement>) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
    if (!event.defaultPrevented) setOpen(false);
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<TriggerChildProps>;
    return React.cloneElement(child, {
      ...props,
      role: "menuitem",
      tabIndex: -1,
      hidden: !open,
      "aria-disabled": disabled || undefined,
      className: [itemClassName, child.props.className].filter(Boolean).join(" "),
      disabled: disabled || child.props.disabled,
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        child.props.onClick?.(event);
        if (!event.defaultPrevented) handleSelect(event);
      },
    });
  }

  return (
    <button
      {...props}
      type="button"
      role="menuitem"
      tabIndex={-1}
      hidden={!open}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      onClick={handleSelect}
      className={itemClassName}
    >
      {children}
    </button>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
};
