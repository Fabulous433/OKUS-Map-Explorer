import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "shadcn-card rounded-xl bg-background text-card-foreground shadow-card relative transition-all duration-300 hover:-translate-y-1 hover:shadow-floating",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

/** Corner screw decoration — place inside Card as first child */
function CardScrews() {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-xl"
      style={{
        background: [
          "radial-gradient(circle at 12px 12px, rgba(0,0,0,0.12) 2px, transparent 3px)",
          "radial-gradient(circle at calc(100% - 12px) 12px, rgba(0,0,0,0.12) 2px, transparent 3px)",
          "radial-gradient(circle at 12px calc(100% - 12px), rgba(0,0,0,0.12) 2px, transparent 3px)",
          "radial-gradient(circle at calc(100% - 12px) calc(100% - 12px), rgba(0,0,0,0.12) 2px, transparent 3px)",
        ].join(", "),
      }}
      aria-hidden="true"
    />
  );
}

/** Vent slots decoration — place in CardHeader top-right */
function CardVents() {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-6 w-1 rounded-full bg-muted shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]" />
      ))}
    </div>
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardScrews,
  CardVents,
}
