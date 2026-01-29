/**
 * Sistema de Autenticación y Autorización (RBAC)
 * 
 * Define roles, permisos y funciones helper para verificar acceso.
 */

import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export type UserRole = 'COTIZADOR' | 'APROBADOR' | 'OFICINA' | 'ADMIN' | 'AUDITOR'
export type QuoteStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PATIENT_CREATED'

export type Permission =
  | 'quote:create'
  | 'quote:read'
  | 'quote:update'
  | 'quote:submit'
  | 'quote:approve'
  | 'quote:reject'
  | 'quote:override'
  | 'patient:create'
  | 'patient:read'
  | 'config:read'
  | 'config:update'
  | 'users:manage'
  | 'audit:read'
  | 'audit:run'
  | 'data_sources:read'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  financiadorId: string | null
  isActive: boolean
}

// Mapeo de roles a permisos
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  COTIZADOR: [
    'quote:create',
    'quote:read',
    'quote:update',
    'quote:submit',
    'patient:read'
  ],
  APROBADOR: [
    'quote:read',
    'quote:approve',
    'quote:reject',
    'patient:read',
    'audit:read',
    'audit:run',
    'data_sources:read'
  ],
  OFICINA: [
    'quote:read',
    'patient:create',
    'patient:read',
    'audit:read'
  ],
  AUDITOR: [
    'audit:read',
    'audit:run',
    'data_sources:read',
    'patient:read'
  ],
  ADMIN: [
    'quote:create',
    'quote:read',
    'quote:update',
    'quote:submit',
    'quote:approve',
    'quote:reject',
    'quote:override',
    'patient:create',
    'patient:read',
    'config:read',
    'config:update',
    'users:manage',
    'audit:read',
    'audit:run',
    'data_sources:read'
  ]
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function can(user: User | null, permission: Permission): boolean {
  if (!user || !user.isActive) return false
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || []
  return userPermissions.includes(permission)
}

/**
 * Verifica si un usuario tiene alguno de los permisos
 */
export function canAny(user: User | null, permissions: Permission[]): boolean {
  return permissions.some(permission => can(user, permission))
}

/**
 * Verifica si un usuario tiene todos los permisos
 */
export function canAll(user: User | null, permissions: Permission[]): boolean {
  return permissions.every(permission => can(user, permission))
}

/**
 * Obtiene el usuario actual desde la sesión
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session_token')?.value
    
    if (!sessionToken) return null
    
    // Buscar sesión en BD (simplificado: usar email como token por ahora)
    // En producción, usar tabla Session con token hash
    const user = await prisma.user.findUnique({
      where: { email: sessionToken },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        financiadorId: true,
        isActive: true
      }
    })
    
    if (!user || !user.isActive) return null
    
    return user as User
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error)
    return null
  }
}

/**
 * Autentica un usuario con email y password
 */
export async function authenticate(email: string, password: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        financiadorId: true,
        isActive: true
      }
    })
    
    if (!user) {
      console.log('[AUTH] Usuario no encontrado:', email)
      return null
    }
    
    if (!user.isActive) {
      console.log('[AUTH] Usuario inactivo:', email)
      return null
    }
    
    console.log('[AUTH] Comparando password para:', email)
    const isValid = await bcrypt.compare(password, user.passwordHash)
    console.log('[AUTH] Resultado de comparación:', isValid)
    
    if (!isValid) {
      console.log('[AUTH] Password inválido para:', email)
      return null
    }
    
    // Retornar sin passwordHash
    const { passwordHash, ...userWithoutPassword } = user
    console.log('[AUTH] Usuario autenticado exitosamente:', email)
    return userWithoutPassword as User
  } catch (error: any) {
    console.error('[AUTH] Error en authenticate:', error)
    // No devolver "Credenciales inválidas" cuando falla la conexión a la BD
    const isDbError = error?.name === 'PrismaClientInitializationError' ||
      error?.code === 'P1001' || // Can't reach
      error?.code === 'P1017'    // Server closed connection
    if (isDbError) throw error
    return null
  }
}

/**
 * Crea una sesión para el usuario
 */
export async function createSession(user: User): Promise<void> {
  try {
    const cookieStore = await cookies()
    // Por simplicidad, usar email como token. En producción, generar token único
    cookieStore.set('session_token', user.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 días
    })
    console.log('[AUTH] Cookie de sesión creada para:', user.email)
  } catch (error) {
    console.error('[AUTH] Error creando sesión:', error)
    throw error
  }
}

/**
 * Destruye la sesión actual
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('session_token')
}

/**
 * Hashea una contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Requiere que el usuario esté autenticado
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Requiere que el usuario tenga un permiso específico
 */
export async function requirePermission(permission: Permission): Promise<User> {
  const user = await requireAuth()
  if (!can(user, permission)) {
    throw new Error('Forbidden: Insufficient permissions')
  }
  return user
}
