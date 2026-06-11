import * as React from "react"

const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  return <div className="relative inline-block text-left group">{children}</div>
}

const DropdownMenuTrigger = ({ children, asChild }: { children: React.ReactNode, asChild?: boolean }) => {
  return <div className="cursor-pointer">{children}</div>
}

const DropdownMenuContent = ({ children, align = "left", className = "" }: { children: React.ReactNode, align?: "left" | "end" | "right", className?: string }) => {
  const alignClass = align === "end" || align === "right" ? "right-0" : "left-0";
  return (
    <div className={`absolute z-50 mt-2 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md transition-all hidden group-hover:block ${alignClass} ${className}`}>
      {children}
    </div>
  )
}

const DropdownMenuItem = ({ children, disabled, className = "" }: { children: React.ReactNode, disabled?: boolean, className?: string }) => {
  const disabledClass = disabled ? "opacity-50 pointer-events-none" : "";
  return (
    <div className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${disabledClass} ${className}`}>
      {children}
    </div>
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
}
