import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-14 w-full rounded-lg border-none bg-background px-6 py-2 font-mono text-sm " +
          "shadow-recessed placeholder:text-muted-foreground/50 " +
          "focus-visible:outline-none focus-visible:shadow-[var(--shadow-recessed),0_0_0_2px_hsl(var(--accent))] " +
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
