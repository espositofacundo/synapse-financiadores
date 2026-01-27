"use client"

import { useEffect, useState } from "react"

interface CanProps {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Componente para mostrar contenido condicionalmente basado en permisos
 * 
 * Uso:
 * <Can permission="quote:submit">
 *   <Button>Enviar</Button>
 * </Can>
 */
export function Can({ permission, children, fallback = null }: CanProps) {
  const [hasPermission, setHasPermission] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkPermission() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          const user = data.user

          // Verificar permiso (simplificado: verificar en cliente)
          // En producción, esto debería venir del servidor
          const rolePermissions: Record<string, string[]> = {
            COTIZADOR: ['quote:create', 'quote:read', 'quote:update', 'quote:submit', 'patient:read'],
            APROBADOR: ['quote:read', 'quote:approve', 'quote:reject', 'patient:create', 'patient:read', 'audit:read'],
            ADMIN: ['quote:create', 'quote:read', 'quote:update', 'quote:submit', 'quote:approve', 'quote:reject', 'quote:override', 'patient:create', 'patient:read', 'config:read', 'config:update', 'users:manage', 'audit:read']
          }

          const userPermissions = rolePermissions[user.role] || []
          setHasPermission(userPermissions.includes(permission))
        }
      } catch (error) {
        console.error('Error verificando permisos:', error)
        setHasPermission(false)
      } finally {
        setLoading(false)
      }
    }

    checkPermission()
  }, [permission])

  if (loading) {
    return null
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>
}
