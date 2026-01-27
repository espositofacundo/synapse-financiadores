"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppHeader, AppSidebar, type SidebarItem } from "@/components/ui-synapse"
import { Button } from "@/components/ui/button"
import { LogOut, LayoutDashboard, FileSearch, Users, CheckCircle2, UserPlus, Kanban } from "lucide-react"
import { cn } from "@/lib/utils"

interface User {
  id: string
  name: string
  email: string
  role: string
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // No hacer fetch si ya está en login
    if (pathname === '/login') {
      setLoading(false)
      return
    }

    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        } else {
          if (pathname !== '/login') {
            router.push('/login')
          }
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          if (pathname !== '/login') {
            router.push('/login')
          }
        } else {
          console.error('Error obteniendo usuario:', error)
          if (pathname !== '/login') {
            router.push('/login')
          }
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [pathname, router])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error en logout:', error)
    }
  }

  // No mostrar shell en login
  if (pathname === '/login') {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return <>{children}</>
  }

  // Construir items del sidebar según permisos
  const sidebarItems: SidebarItem[] = []

  // Dashboard - todos los usuarios
  sidebarItems.push({
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  })

  // Auditoría - según permisos
  const rolePermissions: Record<string, string[]> = {
    COTIZADOR: ['quote:create', 'quote:read', 'quote:update', 'quote:submit', 'patient:read'],
    APROBADOR: ['quote:read', 'quote:approve', 'quote:reject', 'patient:read', 'audit:read'],
    OFICINA: ['quote:read', 'patient:create', 'patient:read'],
    ADMIN: ['quote:create', 'quote:read', 'quote:update', 'quote:submit', 'quote:approve', 'quote:reject', 'quote:override', 'patient:create', 'patient:read', 'config:read', 'config:update', 'users:manage', 'audit:read']
  }
  const userPermissions = rolePermissions[user.role as keyof typeof rolePermissions] || []

  if (userPermissions.includes('audit:read')) {
    sidebarItems.push({
      href: "/auditoria",
      label: "Auditoría",
      icon: FileSearch,
    })
  }

  // Pacientes - según permisos
  if (userPermissions.includes('patient:read')) {
    sidebarItems.push({
      href: "/pacientes",
      label: "Pacientes",
      icon: Users,
    })
  }

  // Aprobaciones - APROBADOR y ADMIN
  if (user.role === 'APROBADOR' || user.role === 'ADMIN') {
    sidebarItems.push({
      href: "/aprobaciones",
      label: "Aprobaciones",
      icon: CheckCircle2,
    })
  }

  // Altas - OFICINA y ADMIN
  if (user.role === 'OFICINA' || user.role === 'ADMIN') {
    sidebarItems.push({
      href: "/altas",
      label: "Altas",
      icon: UserPlus,
    })
  }

  // Kanban - todos los usuarios
  sidebarItems.push({
    href: "/kanban",
    label: "Kanban",
    icon: Kanban,
  })

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        items={sidebarItems}
        productName="Synapse Financiadores"
        user={{
          name: user.name,
          email: user.email,
          role: user.role,
        }}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader
          productName="Synapse Financiadores"
          user={{
            name: user.name,
            role: user.role,
            email: user.email,
          }}
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          }
        />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
