"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import { UmaLogo } from "@/components/uma-logo"

export interface SidebarItem {
  href: string
  label: string
  icon?: LucideIcon
  badge?: string | number
  permission?: string
}

export interface AppSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: SidebarItem[]
  productName?: string
  user?: {
    name: string
    email?: string
    role?: string
  }
  onLogout?: () => void
  footerContent?: React.ReactNode
}

const AppSidebar = React.forwardRef<HTMLDivElement, AppSidebarProps>(
  ({ className, items, productName = "Synapse Financiadores", user, onLogout, footerContent, ...props }, ref) => {
    const pathname = usePathname()

    return (
      <div
        ref={ref}
        className={cn(
          "flex h-screen w-64 flex-col border-r bg-background",
          className
        )}
        {...props}
      >
        {/* Brand */}
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center">
            <UmaLogo size="md" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {Icon && <Icon className="h-5 w-5" />}
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          {user && (
            <div className="mb-4 px-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  {user.email && (
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <span>Cerrar sesión</span>
            </button>
          )}
          {footerContent}
        </div>
      </div>
    )
  }
)
AppSidebar.displayName = "AppSidebar"

export { AppSidebar }
