import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold uppercase tracking-wide " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 " +
  "transition-all duration-150 cursor-pointer " +
  "active:translate-y-[2px] active:shadow-pressed",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[4px_4px_8px_rgba(166,50,60,0.4),-4px_-4px_8px_rgba(255,100,110,0.4)] border border-white/20 hover:brightness-110",
        destructive:
          "bg-destructive text-destructive-foreground shadow-card border border-destructive-border hover:brightness-110",
        outline:
          "bg-background text-foreground shadow-card border border-transparent hover:text-primary",
        secondary:
          "bg-secondary text-secondary-foreground shadow-card border border-transparent hover:text-primary",
        ghost:
          "border border-transparent hover:bg-muted hover:shadow-recessed",
      },
      size: {
        default: "min-h-11 px-6 py-2",
        sm: "min-h-9 rounded-md px-4 text-xs",
        lg: "min-h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
