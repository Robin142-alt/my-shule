import * as React from "react"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex w-full rounded-[var(--radius-sm)] border border-border bg-white px-3.5 py-2.5 text-[14px] text-foreground outline-none transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-strong hover:not(:focus):border-border-strong hover:not(:focus):bg-white focus:border-accent focus:shadow-[0_0_0_4px_rgba(255,122,26,0.16)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
