import * as React from "react"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex min-h-11 w-full rounded-[var(--radius-sm)] border border-border-control bg-surface px-3.5 py-2.5 text-base text-foreground outline-none transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-strong hover:not(:focus):border-primary hover:not(:focus):bg-white focus:border-focus focus:shadow-[var(--shadow-focus)] aria-invalid:border-danger aria-invalid:focus:border-danger disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
