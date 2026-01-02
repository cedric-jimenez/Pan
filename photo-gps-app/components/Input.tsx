import { InputHTMLAttributes, forwardRef } from "react"
import clsx from "clsx"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="text-foreground mb-2 block text-sm font-medium">{label}</label>}
        <input
          ref={ref}
          className={clsx(
            "bg-input border-border text-foreground w-full rounded-lg border px-4 py-2",
            "focus:ring-ring focus:ring-2 focus:outline-none",
            "placeholder:text-muted-foreground",
            error && "border-destructive",
            className
          )}
          {...props}
        />
        {error && <p className="text-destructive mt-1 text-sm">{error}</p>}
      </div>
    )
  }
)

Input.displayName = "Input"

export default Input
