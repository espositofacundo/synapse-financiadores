import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  backAction?: {
    label?: string
    href?: string
    onClick?: () => void
  }
  actions?: React.ReactNode
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, backAction, actions, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("mb-6 space-y-4", className)}
        {...props}
      >
        {backAction && (
          <div>
            {backAction.href ? (
              <a
                href={backAction.href}
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backAction.label || "Volver"}
              </a>
            ) : backAction.onClick ? (
              <button
                onClick={backAction.onClick}
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backAction.label || "Volver"}
              </button>
            ) : (
              <div className="inline-flex items-center text-sm text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backAction.label || "Volver"}
              </div>
            )}
          </div>
        )}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-2">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    )
  }
)
PageHeader.displayName = "PageHeader"

export { PageHeader }
