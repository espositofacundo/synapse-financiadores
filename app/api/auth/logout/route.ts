import { NextRequest, NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'

/**
 * POST /api/auth/logout
 * Destruye la sesión actual
 */
export async function POST(request: NextRequest) {
  try {
    await destroySession()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error en logout:', error)
    return NextResponse.json(
      { error: error.message || 'Error al cerrar sesión' },
      { status: 500 }
    )
  }
}
