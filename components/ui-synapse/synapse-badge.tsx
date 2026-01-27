import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-danger text-danger-foreground hover:bg-danger/80",
        outline: "text-foreground",
        // Risk levels
        bajo: "border-transparent bg-success text-success-foreground",
        medio: "border-transparent bg-warning text-warning-foreground",
        alto: "border-transparent bg-danger text-danger-foreground",
        // Status variants
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        danger: "border-transparent bg-danger text-danger-foreground",
        info: "border-transparent bg-info text-info-foreground",
        // Status workflow
        draft: "border-transparent bg-muted text-muted-foreground",
        submitted: "border-transparent bg-info text-info-foreground",
        approved: "border-transparent bg-success text-success-foreground",
        rejected: "border-transparent bg-danger text-danger-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface SynapseBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function SynapseBadge({ className, variant, ...props }: SynapseBadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { SynapseBadge, badgeVariants }
