"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Play, FileText, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

interface Consultation {
  id: string
  displayName: string | null
  fecha: string
  especialidad: string
  canal: string
  costo: number
  duracion: number
  efectiva: boolean
  diagnostico: string | null
  riskLevel: string
  riskScore: number
  auditStatus: string
  providerName: string | null
  resumenClinico: string | null
  prestador: { id: string; nombre: string } | null
  patient: { id: string; nombre: string; apellido: string; nroDoc: string } | null
  afiliado: { id: string; nombre: string; apellido: string; dni: string } | null
  importBatch: { id: string; name: string; type: string } | null
  invoices: Array<{
    id: string
    invoiceNumber: string
    issuedAt: string
    totalAmount: number
    status: string
    providerName: string | null
  }>
  auditFindings: Array<{
    id: string
    severity: string
    category: string
    title: string
    description: string
    status: string
    audit: { id: string; auditType: string; createdAt: string }
  }>
  targetedAudits: Array<{
    id: string
    auditType: string
    auditScope: string
    status: string
    createdAt: string
    _count: { findings: number }
  }>
}

export default function ConsultationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [loading, setLoading] = useState(true)
  const [auditing, setAuditing] = useState(false)

  useEffect(() => {
    fetchConsultation()
  }, [params.id])

  const fetchConsultation = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/consultations/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setConsultation(data.consultation)
      }
    } catch (e) {
      console.error('Error fetching consultation:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAuditSingle = async () => {
    if (!consultation) return
    setAuditing(true)
    try {
      const res = await fetch('/api/v2/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditType: 'PRACTICA',
          auditScope: 'SINGLE_CONSULTATION',
          targetConsultationId: consultation.id
        })
      })
      if (res.ok) {
        fetchConsultation()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al auditar')
      }
    } catch (e) {
      console.error('Error auditing:', e)
      alert('Error al auditar')
    } finally {
      setAuditing(false)
    }
  }

  const severityVariant = (s: string) => {
    switch (s) {
      case 'HIGH': return 'destructive'
      case 'MEDIUM': return 'warning'
      default: return 'secondary'
    }
  }

  const statusVariant = (s: string) => {
    switch (s) {
      case 'OPEN': return 'destructive'
      case 'IN_REVIEW': return 'warning'
      case 'RESOLVED': return 'default'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!consultation) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Consulta no encontrada</p>
        <Button variant="link" asChild>
          <Link href="/consultas-practicas">Volver</Link>
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
            {consultation.displayName || `Consulta ${consultation.id.slice(0, 8)}`}
          </h1>
          <p className="text-muted-foreground">
            {consultation.especialidad} • {format(new Date(consultation.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
          </p>
        </div>
        <Button
          onClick={handleAuditSingle}
          disabled={auditing}
          className="gap-2"
        >
          {auditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Auditar esta consulta
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Costo</CardDescription>
            <CardTitle className="text-2xl">${consultation.costo.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Riesgo</CardDescription>
            <CardTitle>
              <Badge variant={consultation.riskLevel === 'alto' ? 'destructive' : consultation.riskLevel === 'medio' ? 'warning' : 'secondary'}>
                {consultation.riskLevel.toUpperCase()} ({consultation.riskScore})
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Facturas</CardDescription>
            <CardTitle className="text-2xl">{consultation.invoices.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hallazgos</CardDescription>
            <CardTitle className="text-2xl">{consultation.auditFindings.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Detalle</TabsTrigger>
          <TabsTrigger value="invoices">Facturas ({consultation.invoices.length})</TabsTrigger>
          <TabsTrigger value="audits">Auditorías ({consultation.targetedAudits.length})</TabsTrigger>
          <TabsTrigger value="findings">Hallazgos ({consultation.auditFindings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Especialidad</dt>
                  <dd className="font-medium">{consultation.especialidad}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Canal</dt>
                  <dd className="font-medium">{consultation.canal}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Duración</dt>
                  <dd className="font-medium">{consultation.duracion} min</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Efectiva</dt>
                  <dd className="font-medium">{consultation.efectiva ? 'Sí' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Prestador</dt>
                  <dd className="font-medium">{consultation.prestador?.nombre || consultation.providerName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Diagnóstico</dt>
                  <dd className="font-medium">{consultation.diagnostico || '—'}</dd>
                </div>
                {consultation.patient && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Paciente</dt>
                    <dd className="font-medium">
                      {consultation.patient.nombre} {consultation.patient.apellido} ({consultation.patient.nroDoc})
                    </dd>
                  </div>
                )}
                {consultation.importBatch && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Importación</dt>
                    <dd className="font-medium">{consultation.importBatch.name}</dd>
                  </div>
                )}
              </dl>
              {consultation.resumenClinico && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Resumen clínico</h4>
                  <p className="text-sm text-muted-foreground">{consultation.resumenClinico}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {consultation.invoices.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Sin facturas asociadas</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nro. Factura</TableHead>
                      <TableHead>Fecha emisión</TableHead>
                      <TableHead>Prestador</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultation.invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{format(new Date(inv.issuedAt), 'dd/MM/yyyy', { locale: es })}</TableCell>
                        <TableCell>{inv.providerName || '—'}</TableCell>
                        <TableCell className="text-right">${inv.totalAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{inv.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {consultation.targetedAudits.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Sin auditorías ejecutadas</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Alcance</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Hallazgos</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultation.targetedAudits.map((audit) => (
                      <TableRow key={audit.id}>
                        <TableCell>{format(new Date(audit.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                        <TableCell>{audit.auditType}</TableCell>
                        <TableCell>{audit.auditScope}</TableCell>
                        <TableCell>
                          <Badge variant={audit.status === 'COMPLETED' ? 'default' : 'secondary'}>
                            {audit.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{audit._count.findings}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/auditoria-ia/${audit.id}`}>Ver</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="findings" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {consultation.auditFindings.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Sin hallazgos</p>
              ) : (
                <div className="space-y-4">
                  {consultation.auditFindings.map((finding) => (
                    <div key={finding.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={severityVariant(finding.severity) as any}>
                              {finding.severity}
                            </Badge>
                            <Badge variant="outline">{finding.category}</Badge>
                            <Badge variant={statusVariant(finding.status) as any}>
                              {finding.status}
                            </Badge>
                          </div>
                          <h4 className="font-medium mt-2">{finding.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{finding.description}</p>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/hallazgos?id=${finding.id}`}>Ver</Link>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Auditoría {finding.audit.auditType} del {format(new Date(finding.audit.createdAt), 'dd/MM/yyyy', { locale: es })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
