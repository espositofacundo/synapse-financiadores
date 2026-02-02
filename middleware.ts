import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware para proteger rutas privadas
 */
export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value
  
  // Rutas públicas
  const publicPaths = ['/login', '/api/auth/login']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  // La landing page (/) es pública
  const isLandingPage = request.nextUrl.pathname === '/'
  
  if (isPublicPath || isLandingPage) {
    return NextResponse.next()
  }
  
  // Si no hay sesión
  if (!sessionToken) {
    // Para rutas API, devolver 401 en lugar de redirigir
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }
    
    // Para rutas de páginas, redirigir a login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
