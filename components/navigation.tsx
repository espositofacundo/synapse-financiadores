"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
}

export function Navigation() {
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
          // Si no está autenticado, redirigir a login (excepto si ya está en login)
          if (pathname !== '/login') {
            router.push('/login')
          }
        }
      } catch (error) {
        // Solo loggear error si no es un error de parsing JSON esperado (401)
        if (error instanceof SyntaxError) {
          // Error de parsing JSON - probablemente 401, no loggear
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

  const links = [
    { href: "/dashboard", label: "Dashboard", permission: null },
    { href: "/auditoria", label: "Auditoría", permission: 'audit:read' },
    { href: "/pacientes", label: "Pacientes", permission: 'patient:read' },
  ]

  // Filtrar links según permisos
  const visibleLinks = links.filter(link => {
    if (!link.permission) return true
    if (!user) return false
    const rolePermissions: Record<string, string[]> = {
      COTIZADOR: ['quote:create', 'quote:read', 'quote:update', 'quote:submit', 'patient:read'],
      APROBADOR: ['quote:read', 'quote:approve', 'quote:reject', 'patient:read', 'audit:read'],
      OFICINA: ['quote:read', 'patient:create', 'patient:read'],
      ADMIN: ['quote:create', 'quote:read', 'quote:update', 'quote:submit', 'quote:approve', 'quote:reject', 'quote:override', 'patient:create', 'patient:read', 'config:read', 'config:update', 'users:manage', 'audit:read']
    }
    const userPermissions = rolePermissions[user.role as keyof typeof rolePermissions] || []
    return userPermissions.includes(link.permission)
  })

  // Agregar link de aprobaciones si es APROBADOR o ADMIN
  if (user && (user.role === 'APROBADOR' || user.role === 'ADMIN')) {
    visibleLinks.push({ href: "/aprobaciones", label: "Aprobaciones", permission: null })
  }
  
  // Agregar link de altas si es OFICINA o ADMIN
  if (user && (user.role === 'OFICINA' || user.role === 'ADMIN')) {
    visibleLinks.push({ href: "/altas", label: "Altas", permission: null })
  }
  
  // Agregar link de Kanban para todos los roles
  if (user) {
    visibleLinks.push({ href: "/kanban", label: "Kanban", permission: null })
  }

  if (loading) {
    return (
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="text-xl font-bold text-primary">Financiadores POC</div>
            <div className="text-sm text-muted-foreground">Cargando...</div>
          </div>
        </div>
      </nav>
    )
  }

  // No mostrar nav en login
  if (pathname === '/login') {
    return null
  }

  if (!user) {
    return null // No mostrar nav si no hay usuario
  }

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold text-primary">
              Financiadores POC
            </Link>
            <div className="flex gap-4">
              {visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    pathname === link.href
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {user.name} <span className="text-xs">({user.role})</span>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
