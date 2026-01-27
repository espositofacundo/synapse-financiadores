import * as React from "react"
import { cn } from "@/lib/utils"

export interface SynapseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "elevated"
}

const SynapseCard = React.forwardRef<HTMLDivElement, SynapseCardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground",
          variant === "outline" && "border-2",
          variant === "elevated" && "shadow-card",
          className
        )}
        {...props}
      />
    )
  }
)
SynapseCard.displayName = "SynapseCard"

const SynapseCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
SynapseCardHeader.displayName = "SynapseCardHeader"

const SynapseCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
SynapseCardTitle.displayName = "SynapseCardTitle"

const SynapseCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SynapseCardDescription.displayName = "SynapseCardDescription"

const SynapseCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
SynapseCardContent.displayName = "SynapseCardContent"

const SynapseCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
SynapseCardFooter.displayName = "SynapseCardFooter"

export {
  SynapseCard,
  SynapseCardHeader,
  SynapseCardFooter,
  SynapseCardTitle,
  SynapseCardDescription,
  SynapseCardContent,
}
