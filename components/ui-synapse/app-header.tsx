"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

export interface AppHeaderProps extends React.HTMLAttributes<HTMLElement> {
  productName?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  user?: {
    name: string
    role: string
    email?: string
  }
  actions?: React.ReactNode
}

const AppHeader = React.forwardRef<HTMLElement, AppHeaderProps>(
  ({ className, productName = "Synapse Financiadores", breadcrumbs, user, actions, ...props }, ref) => {
    const pathname = usePathname()

    return (
      <header
        ref={ref}
        className={cn(
          "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          className
        )}
        {...props}
      >
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-primary">{productName}</span>
            </Link>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="hover:text-foreground transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                    {index < breadcrumbs.length - 1 && (
                      <span className="text-muted-foreground">/</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {user.name} <span className="text-xs">({user.role})</span>
                </span>
              </div>
            )}
            {actions}
          </div>
        </div>
      </header>
    )
  }
)
AppHeader.displayName = "AppHeader"

export { AppHeader }
