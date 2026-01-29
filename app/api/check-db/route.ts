import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/check-db
 * Diagnóstico: verifica si la app se conecta a la base y cuántos usuarios hay.
 * Usar solo para depurar el login en producción (ej: Render).
 */
export async function GET() {
  try {
    await prisma.$connect()
    const userCount = await prisma.user.count()
    const emails = await prisma.user.findMany({
      select: { email: true },
      take: 10
    })
    return NextResponse.json({
      connected: true,
      userCount,
      sampleEmails: emails.map(u => u.email)
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { connected: false, error: message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
