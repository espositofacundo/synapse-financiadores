/**
 * Reglas de workflow para Onboarding Cases
 * Define transiciones válidas y permisos por rol
 */

import { UserRole } from './auth'

export type OnboardingStatus = 
  | 'PENDIENTE_COTIZACION'
  | 'PENDIENTE_APROBACION'
  | 'APROBADO'
  | 'PERFIL_COMPLETO'
  | 'RECHAZADO'

export interface StatusTransition {
  from: OnboardingStatus | null
  to: OnboardingStatus
  allowedRoles: UserRole[]
  requiresQuoteStatus?: string
  requiresPatientId?: boolean
  requiresNote?: boolean
}

// Transiciones válidas
export const VALID_TRANSITIONS: StatusTransition[] = [
  {
    from: 'PENDIENTE_COTIZACION',
    to: 'PENDIENTE_APROBACION',
    allowedRoles: ['COTIZADOR', 'ADMIN'],
    requiresQuoteStatus: 'SUBMITTED'
  },
  {
    from: 'PENDIENTE_APROBACION',
    to: 'APROBADO',
    allowedRoles: ['APROBADOR', 'ADMIN'],
    requiresQuoteStatus: 'APPROVED'
  },
  {
    from: 'PENDIENTE_APROBACION',
    to: 'RECHAZADO',
    allowedRoles: ['APROBADOR', 'ADMIN'],
    requiresQuoteStatus: 'REJECTED',
    requiresNote: true
  },
  {
    from: 'APROBADO',
    to: 'PERFIL_COMPLETO',
    allowedRoles: ['OFICINA', 'ADMIN'],
    requiresPatientId: true
  },
  {
    from: 'RECHAZADO',
    to: 'PENDIENTE_COTIZACION',
    allowedRoles: ['COTIZADOR', 'ADMIN']
  }
]

// SLA por columna (en horas)
export const SLA_BY_STATUS: Record<OnboardingStatus, number> = {
  PENDIENTE_COTIZACION: 24,
  PENDIENTE_APROBACION: 48,
  APROBADO: 24,
  PERFIL_COMPLETO: 0, // No aplica
  RECHAZADO: 0 // No aplica
}

/**
 * Verifica si una transición es válida
 */
export function isValidTransition(
  from: OnboardingStatus | null,
  to: OnboardingStatus,
  userRole: UserRole,
  quoteStatus?: string | null,
  hasPatientId?: boolean
): { valid: boolean; reason?: string } {
  const transition = VALID_TRANSITIONS.find(t => t.from === from && t.to === to)
  
  if (!transition) {
    return { valid: false, reason: `Transición de ${from || 'inicial'} a ${to} no está permitida` }
  }
  
  if (!transition.allowedRoles.includes(userRole)) {
    return { valid: false, reason: `El rol ${userRole} no puede realizar esta transición` }
  }
  
  if (transition.requiresQuoteStatus && quoteStatus !== transition.requiresQuoteStatus) {
    return { valid: false, reason: `La cotización debe estar en estado ${transition.requiresQuoteStatus}` }
  }
  
  if (transition.requiresPatientId && !hasPatientId) {
    return { valid: false, reason: 'Se requiere que el paciente esté creado' }
  }
  
  return { valid: true }
}

/**
 * Obtiene las transiciones posibles desde un estado dado
 */
export function getPossibleTransitions(
  from: OnboardingStatus,
  userRole: UserRole
): OnboardingStatus[] {
  return VALID_TRANSITIONS
    .filter(t => t.from === from && t.allowedRoles.includes(userRole))
    .map(t => t.to)
}
