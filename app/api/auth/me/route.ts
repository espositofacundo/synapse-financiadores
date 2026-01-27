import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/auth/me
 * Obtiene el usuario actual autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        financiadorId: user.financiadorId
      }
    })
  } catch (error: any) {
    console.error('Error obteniendo usuario:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener usuario' },
      { status: 500 }
    )
  }
}
