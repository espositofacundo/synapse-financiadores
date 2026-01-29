"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Loader2, Download } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

interface AuditDetail {
  id: string
  auditType: string
  auditScope: string
  status: string
  createdAt: string
  completedAt: string | null
  findingsCountTotal: number
  findingsCountHigh: number
  findingsCountMedium: number
  findingsCountLow: number
  estimatedSavings: number
  consultationsAudited: number
  filterPayload: any
  recommendedPayload: any
  maxSeverity: string
  findingsByCategory: Record<string, number>
  targetConsultation: { id: string; displayName: string; especialidad: string; costo: number; riskLevel: string } | null
  createdBy: { id: string; name: string; email: string }
  findings: Array<{
    id: string
    severity: string
    category: string
    title: string
    description: string
    status: string
    confidence: number
    suggestedAction: string | null
    consultation: { id: string; displayName: string; especialidad: string } | null
    invoice: { id: string; invoiceNumber: string; totalAmount: number } | null
  }>
}

export default function AuditDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [audit, setAudit] = useState<AuditDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAudit()
  }, [params.id])

  const fetchAudit = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v2/audits/${params.id}`)
      if (res.ok) {
        setAudit(await res.json())
      }
    } catch (e) {
      console.error('Error fetching audit:', e)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (!audit) return
    const rows = [
      ['Severidad', 'Categoría', 'Título', 'Descripción', 'Estado', 'Consulta', 'Acción sugerida'],
      ...audit.findings.map(f => [
        f.severity,
        f.category,
        f.title,
        f.description,
        f.status,
        f.consultation?.displayName || '',
        f.suggestedAction || ''
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-${audit.id.slice(0, 8)}-findings.csv`
    a.click()
  }

  const severityVariant = (s: string) => s === 'HIGH' ? 'destructive' : s === 'MEDIUM' ? 'warning' : 'secondary'
  const statusVariant = (s: string) => s === 'OPEN' ? 'destructive' : s === 'IN_REVIEW' ? 'warning' : 'default'
  const scopeLabel = (s: string) => s === 'SINGLE_CONSULTATION' ? 'Consulta única' : s === 'BATCH_FILTER' ? 'Batch por filtros' : 'Set recomendado'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!audit) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Auditoría no encontrada</p>
        <Button variant="link" asChild>
          <Link href="/auditoria-ia">Volver</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            Auditoría {audit.auditType}
          </h1>
          <p className="text-muted-foreground">
            {scopeLabel(audit.auditScope)} • {format(new Date(audit.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estado</CardDescription>
            <CardTitle>
              <Badge variant={audit.status === 'COMPLETED' ? 'default' : 'secondary'}>
                {audit.status}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Consultadas</CardDescription>
            <CardTitle className="text-2xl">{audit.consultationsAudited}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hallazgos</CardDescription>
            <CardTitle>
              <div className="flex gap-1">
                {audit.findingsCountHigh > 0 && <Badge variant="destructive">{audit.findingsCountHigh}H</Badge>}
                {audit.findingsCountMedium > 0 && <Badge variant="warning">{audit.findingsCountMedium}M</Badge>}
                {audit.findingsCountLow > 0 && <Badge variant="secondary">{audit.findingsCountLow}L</Badge>}
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Severidad máx.</CardDescription>
            <CardTitle>
              <Badge variant={severityVariant(audit.maxSeverity) as any}>{audit.maxSeverity}</Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ahorro estimado</CardDescription>
            <CardTitle className="text-2xl">${audit.estimatedSavings.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Target consultation (if single) */}
      {audit.targetConsultation && (
        <Card>
          <CardHeader>
            <CardTitle>Consulta auditada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{audit.targetConsultation.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {audit.targetConsultation.especialidad} • ${audit.targetConsultation.costo.toLocaleString()} • Riesgo {audit.targetConsultation.riskLevel}
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/consultas-practicas/${audit.targetConsultation.id}`}>Ver consulta</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters used (if batch) */}
      {audit.filterPayload && (
        <Card>
          <CardHeader>
            <CardTitle>Filtros aplicados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {audit.filterPayload.especialidad !== 'all' && (
                <Badge variant="outline">Especialidad: {audit.filterPayload.especialidad}</Badge>
              )}
              {audit.filterPayload.riskLevel !== 'all' && (
                <Badge variant="outline">Riesgo: {audit.filterPayload.riskLevel}</Badge>
              )}
              {audit.filterPayload.from && (
                <Badge variant="outline">Desde: {audit.filterPayload.from}</Badge>
              )}
              {audit.filterPayload.to && (
                <Badge variant="outline">Hasta: {audit.filterPayload.to}</Badge>
              )}
              {audit.filterPayload.costAboveP95 && (
                <Badge variant="outline">Costo &gt; P95</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories breakdown */}
      {Object.keys(audit.findingsByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(audit.findingsByCategory).map(([cat, count]) => (
                <Badge key={cat} variant="outline">{cat}: {count}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Findings table */}
      <Card>
        <CardHeader>
          <CardTitle>Hallazgos ({audit.findingsCountTotal})</CardTitle>
          <CardDescription>
            Detalle de problemas detectados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {audit.findings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Sin hallazgos</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Consulta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.findings.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Badge variant={severityVariant(f.severity) as any}>{f.severity}</Badge>
                    </TableCell>
                    <TableCell>{f.category}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{f.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[300px]">{f.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {f.consultation ? (
                        <Link href={`/consultas-practicas/${f.consultation.id}`} className="text-primary hover:underline">
                          {f.consultation.displayName?.slice(0, 20) || f.consultation.id.slice(0, 8)}
                        </Link>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(f.status) as any}>{f.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/hallazgos?id=${f.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
