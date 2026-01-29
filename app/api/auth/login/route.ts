import { NextRequest, NextResponse } from 'next/server'
import { authenticate, createSession } from '@/lib/auth'

/**
 * POST /api/auth/login
 * Autentica un usuario y crea una sesión
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { email, password } = body
    
    // Limpiar espacios en blanco
    email = email?.trim()
    password = password?.trim()
    
    console.log('[LOGIN] Intento de login:', { email, passwordLength: password?.length })
    
    if (!email || !password) {
      console.log('[LOGIN] Faltan email o password')
      return NextResponse.json(
        { error: 'Email y password son requeridos' },
        { status: 400 }
      )
    }
    
    const user = await authenticate(email, password)
    
    if (!user) {
      console.log('[LOGIN] Autenticación fallida para:', email)
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }
    
    console.log('[LOGIN] Usuario autenticado:', user.email, user.role)
    
    // Crear sesión
    await createSession(user)
    console.log('[LOGIN] Sesión creada para:', user.email)
    
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error: any) {
    console.error('[LOGIN] Error en login:', error)
    const isDbError = error?.name === 'PrismaClientInitializationError' ||
      error?.code === 'P1001' || error?.code === 'P1017'
    const message = isDbError
      ? 'No se pudo conectar a la base de datos. Revisá DATABASE_URL y que el proyecto Supabase esté activo.'
      : (error?.message || 'Error al autenticar')
    return NextResponse.json(
      { error: message },
      { status: isDbError ? 503 : 500 }
    )
  }
}
