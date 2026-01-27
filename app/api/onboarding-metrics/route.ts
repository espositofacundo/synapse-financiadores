import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { SLA_BY_STATUS, type OnboardingStatus } from '@/lib/onboarding-workflow'

/**
 * GET /api/onboarding-metrics
 * Calcula KPIs del Kanban de onboarding
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    const searchParams = request.nextUrl.searchParams
    const fromDate = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // últimos 90 días por defecto
    const toDate = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date()
    const financiadorId = searchParams.get('financiadorId')
    
    const where: any = {
      createdAt: {
        gte: fromDate,
        lte: toDate
      }
    }
    
    if (financiadorId) {
      where.financiadorId = financiadorId
    } else if (user.financiadorId) {
      where.financiadorId = user.financiadorId
    }
    
    // 1. WIP por columna (casos actuales, no filtrados por fecha)
    const wipWhere: any = {
      status: {
        not: 'PERFIL_COMPLETO'
      }
    }
    
    if (financiadorId) {
      wipWhere.financiadorId = financiadorId
    } else if (user.financiadorId) {
      wipWhere.financiadorId = user.financiadorId
    }
    
    const wipByStatus = await prisma.onboardingCase.groupBy({
      by: ['status'],
      where: wipWhere,
      _count: {
        id: true
      }
    })
    
    const wipMap: Record<string, number> = {}
    wipByStatus.forEach(item => {
      wipMap[item.status] = item._count.id
    })
    
    // 2. Tiempo medio por columna (basado en status_history)
    const statusHistoryWhere: any = {
      changedAt: {
        gte: fromDate,
        lte: toDate
      },
      durationSeconds: {
        not: null
      }
    }
    
    if (financiadorId) {
      statusHistoryWhere.case = { financiadorId }
    } else if (user.financiadorId) {
      statusHistoryWhere.case = { financiadorId: user.financiadorId }
    }
    
    const statusHistory = await prisma.onboardingCaseStatusHistory.findMany({
      where: statusHistoryWhere,
      select: {
        toStatus: true,
        durationSeconds: true
      }
    })
    
    const timeByStatus: Record<string, number[]> = {}
    statusHistory.forEach(entry => {
      if (entry.durationSeconds && entry.toStatus) {
        if (!timeByStatus[entry.toStatus]) {
          timeByStatus[entry.toStatus] = []
        }
        timeByStatus[entry.toStatus].push(entry.durationSeconds)
      }
    })
    
    const avgTimeByStatus: Record<string, { avg: number; median: number }> = {}
    Object.keys(timeByStatus).forEach(status => {
      const times = timeByStatus[status]
      const avg = times.reduce((a, b) => a + b, 0) / times.length / 3600 // convertir a horas
      const sorted = [...times].sort((a, b) => a - b)
      const median = sorted.length > 0 
        ? sorted[Math.floor(sorted.length / 2)] / 3600 
        : 0
      avgTimeByStatus[status] = { avg, median }
    })
    
    // 3. Lead Time (tiempo total end-to-end)
    const completedWhere: any = {
      status: 'PERFIL_COMPLETO',
      createdAt: {
        gte: fromDate,
        lte: toDate
      }
    }
    
    if (financiadorId) {
      completedWhere.financiadorId = financiadorId
    } else if (user.financiadorId) {
      completedWhere.financiadorId = user.financiadorId
    }
    
    const completedCases = await prisma.onboardingCase.findMany({
      where: completedWhere,
      select: {
        id: true,
        createdAt: true,
        statusHistory: {
          where: {
            toStatus: 'PERFIL_COMPLETO'
          },
          orderBy: { changedAt: 'desc' },
          take: 1,
          select: {
            changedAt: true
          }
        }
      }
    })
    
    const leadTimes = completedCases
      .filter(c => c.statusHistory.length > 0)
      .map(c => {
        const completedAt = c.statusHistory[0].changedAt
        return (completedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60) // horas
      })
    
    const avgLeadTime = leadTimes.length > 0
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
      : 0
    
    const sortedLeadTimes = [...leadTimes].sort((a, b) => a - b)
    const p50LeadTime = sortedLeadTimes.length > 0
      ? sortedLeadTimes[Math.floor(sortedLeadTimes.length / 2)]
      : 0
    const p90LeadTime = sortedLeadTimes.length > 0
      ? sortedLeadTimes[Math.floor(sortedLeadTimes.length * 0.9)]
      : 0
    
    // 4. Throughput (casos completados por semana)
    const weeks = Math.ceil((toDate.getTime() - fromDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const throughputWeekly = weeks > 0 ? completedCases.length / weeks : 0
    
    // Throughput diario
    const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000))
    const throughputDaily = days > 0 ? completedCases.length / days : 0
    
    // 5. Aging (top 10 casos con más tiempo en columna actual)
    const agingWhere: any = {
      status: {
        not: 'PERFIL_COMPLETO'
      }
    }
    
    if (financiadorId) {
      agingWhere.financiadorId = financiadorId
    } else if (user.financiadorId) {
      agingWhere.financiadorId = user.financiadorId
    }
    
    const allCases = await prisma.onboardingCase.findMany({
      where: agingWhere,
      select: {
        id: true,
        displayName: true,
        status: true,
        currentStatusEnteredAt: true,
        riskLevel: true
      },
      orderBy: { currentStatusEnteredAt: 'asc' },
      take: 10
    })
    
    const now = new Date()
    const agingCases = allCases.map(c => {
      const hoursInColumn = (now.getTime() - c.currentStatusEnteredAt.getTime()) / (1000 * 60 * 60)
      return {
        id: c.id,
        displayName: c.displayName,
        status: c.status,
        hoursInColumn: Math.round(hoursInColumn * 10) / 10,
        riskLevel: c.riskLevel
      }
    }).sort((a, b) => b.hoursInColumn - a.hoursInColumn)
    
    // 6. SLA compliance
    const slaCompliance: Record<string, { inSla: number; outOfSla: number; total: number; percentage: number }> = {}
    
    allCases.forEach(c => {
      const status = c.status as OnboardingStatus
      const slaHours = SLA_BY_STATUS[status] || 0
      
      if (slaHours > 0) {
        const hoursInColumn = (now.getTime() - c.currentStatusEnteredAt.getTime()) / (1000 * 60 * 60)
        const inSla = hoursInColumn <= slaHours
        
        if (!slaCompliance[status]) {
          slaCompliance[status] = { inSla: 0, outOfSla: 0, total: 0, percentage: 0 }
        }
        
        slaCompliance[status].total++
        if (inSla) {
          slaCompliance[status].inSla++
        } else {
          slaCompliance[status].outOfSla++
        }
      }
    })
    
    // Calcular porcentajes
    Object.keys(slaCompliance).forEach(status => {
      const comp = slaCompliance[status]
      comp.percentage = comp.total > 0 ? (comp.inSla / comp.total) * 100 : 0
    })
    
    // SLA total
    const totalInSla = Object.values(slaCompliance).reduce((sum, c) => sum + c.inSla, 0)
    const totalCases = Object.values(slaCompliance).reduce((sum, c) => sum + c.total, 0)
    const overallSlaPercentage = totalCases > 0 ? (totalInSla / totalCases) * 100 : 0
    
    return NextResponse.json({
      wipByStatus: wipMap,
      avgTimeByStatus,
      leadTime: {
        avg: Math.round(avgLeadTime * 10) / 10,
        p50: Math.round(p50LeadTime * 10) / 10,
        p90: Math.round(p90LeadTime * 10) / 10
      },
      throughput: {
        weekly: Math.round(throughputWeekly * 10) / 10,
        daily: Math.round(throughputDaily * 10) / 10,
        total: completedCases.length
      },
      aging: agingCases,
      slaCompliance,
      overallSlaPercentage: Math.round(overallSlaPercentage * 10) / 10,
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      }
    })
  } catch (error: any) {
    console.error('Error calculando métricas:', error)
    return NextResponse.json(
      { error: error.message || 'Error al calcular métricas' },
      { status: 500 }
    )
  }
}
