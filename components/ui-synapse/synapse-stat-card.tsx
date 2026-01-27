import * as React from "react"
import { cn } from "@/lib/utils"
import { SynapseCard, SynapseCardContent, SynapseCardHeader, SynapseCardTitle } from "./synapse-card"
import { LucideIcon } from "lucide-react"

export interface SynapseStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: "default" | "primary" | "success" | "warning" | "danger"
}

const SynapseStatCard = React.forwardRef<HTMLDivElement, SynapseStatCardProps>(
  ({ className, title, value, description, icon: Icon, trend, variant = "default", ...props }, ref) => {
    const variantStyles = {
      default: "border-border",
      primary: "border-primary/20 bg-primary/5",
      success: "border-success/20 bg-success/5",
      warning: "border-warning/20 bg-warning/5",
      danger: "border-danger/20 bg-danger/5",
    }

    return (
      <SynapseCard
        ref={ref}
        className={cn(variantStyles[variant], className)}
        {...props}
      >
        <SynapseCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <SynapseCardTitle className="text-sm font-medium">
            {title}
          </SynapseCardTitle>
          {Icon && (
            <Icon className="h-4 w-4 text-muted-foreground" />
          )}
        </SynapseCardHeader>
        <SynapseCardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">
              {description}
            </p>
          )}
          {trend && (
            <div className={cn(
              "text-xs mt-2",
              trend.isPositive ? "text-success" : "text-danger"
            )}>
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </div>
          )}
        </SynapseCardContent>
      </SynapseCard>
    )
  }
)
SynapseStatCard.displayName = "SynapseStatCard"

export { SynapseStatCard }
