"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Loader2, CheckCircle, Eye } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

interface Finding {
  id: string
  severity: string
  category: string
  title: string
  description: string
  status: string
  confidence: number
  suggestedAction: string | null
  createdAt: string
  audit: { id: string; auditType: string; createdAt: string }
  consultation: { id: string; displayName: string; especialidad: string } | null
  invoice: { id: string; invoiceNumber: string; totalAmount: number } | null
  resolvedBy: { id: string; name: string } | null
}

const SEVERITIES = ['HIGH', 'MEDIUM', 'LOW']
const CATEGORIES = ['DUPLICADO', 'INCONSISTENCIA', 'SOBREPRACTICA', 'CLINICA', 'ADMIN']
const STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED']

export default function HallazgosPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('id')
  
  const [findings, setFindings] = useState<Finding[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userCanEdit, setUserCanEdit] = useState(false)

  // Filters
  const [filters, setFilters] = useState({
    severity: 'all',
    category: 'all',
    status: 'all'
  })

  // Detail dialog
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [filters])

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUserCanEdit(['APROBADOR', 'ADMIN'].includes(data.user?.role))
      }
    } catch (e) {
      console.error('Error fetching user:', e)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.severity !== 'all') params.set('severity', filters.severity)
      if (filters.category !== 'all') params.set('category', filters.category)
      if (filters.status !== 'all') params.set('status', filters.status)

      const res = await fetch(`/api/findings?${params}`)
      if (res.ok) {
        const data = await res.json()
        setFindings(data.findings || [])
        setTotal(data.total || 0)
      }
    } catch (e) {
      console.error('Error fetching findings:', e)
    } finally {
      setLoading(false)
    }
  }

  const openDetail = (finding: Finding) => {
    setSelectedFinding(finding)
    setDetailOpen(true)
  }

  const updateStatus = async (newStatus: string) => {
    if (!selectedFinding) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/findings/${selectedFinding.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        fetchData()
        setDetailOpen(false)
      } else {
        const data = await res.json()
        alert(data.error || 'Error al actualizar')
      }
    } catch (e) {
      console.error('Error updating:', e)
      alert('Error al actualizar')
    } finally {
      setUpdating(false)
    }
  }

  const severityVariant = (s: string) => s === 'HIGH' ? 'destructive' : s === 'MEDIUM' ? 'warning' : 'secondary'
  const statusVariant = (s: string) => s === 'OPEN' ? 'destructive' : s === 'IN_REVIEW' ? 'warning' : 'default'
  const statusLabel = (s: string) => s === 'OPEN' ? 'Abierto' : s === 'IN_REVIEW' ? 'En revisión' : 'Resuelto'

  // Stats
  const openCount = findings.filter(f => f.status === 'OPEN').length
  const highOpenCount = findings.filter(f => f.status === 'OPEN' && f.severity === 'HIGH').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-8 w-8" />
          Hallazgos
        </h1>
        <p className="text-muted-foreground mt-1">
          Bandeja de trabajo: revisá, clasificá y resolvé hallazgos de auditoría.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total hallazgos</CardDescription>
            <CardTitle className="text-2xl">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Abiertos</CardDescription>
            <CardTitle className="text-2xl text-destructive">{openCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Críticos abiertos</CardDescription>
            <CardTitle className="text-2xl text-destructive">{highOpenCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Acciones</CardDescription>
            <CardTitle>
              <Button size="sm" variant="outline" asChild>
                <Link href="/auditoria-ia">Nueva auditoría</Link>
              </Button>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Severidad</Label>
              <Select value={filters.severity} onValueChange={(v) => setFilters({ ...filters, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Estado</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => setFilters({ severity: 'all', category: 'all', status: 'all' })}>
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Hallazgos ({findings.length})</CardTitle>
          <CardDescription>
            Click en un hallazgo para ver detalle y cambiar estado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : findings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Sin hallazgos. Ejecutá auditorías desde Auditoría IA.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Consulta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {findings.map((f) => (
                  <TableRow 
                    key={f.id} 
                    className={`cursor-pointer hover:bg-muted/50 ${highlightId === f.id ? 'bg-primary/10' : ''}`}
                    onClick={() => openDetail(f)}
                  >
                    <TableCell>
                      <Badge variant={severityVariant(f.severity) as any}>{f.severity}</Badge>
                    </TableCell>
                    <TableCell>{f.category}</TableCell>
                    <TableCell>
                      <p className="font-medium">{f.title}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[250px]">{f.description}</p>
                    </TableCell>
                    <TableCell>
                      {f.consultation ? (
                        <span className="text-primary">{f.consultation.displayName?.slice(0, 20) || '—'}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(f.status) as any}>{statusLabel(f.status)}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(f.createdAt), 'dd/MM/yyyy', { locale: es })}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFinding && (
                <>
                  <Badge variant={severityVariant(selectedFinding.severity) as any}>
                    {selectedFinding.severity}
                  </Badge>
                  {selectedFinding.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedFinding?.category} • Confianza: {selectedFinding && Math.round(selectedFinding.confidence * 100)}%
            </DialogDescription>
          </DialogHeader>

          {selectedFinding && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Descripción</h4>
                <p className="text-sm text-muted-foreground">{selectedFinding.description}</p>
              </div>

              {selectedFinding.suggestedAction && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Acción sugerida</h4>
                  <p className="text-sm text-muted-foreground">{selectedFinding.suggestedAction}</p>
                </div>
              )}

              {selectedFinding.consultation && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Consulta asociada</h4>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/consultas-practicas/${selectedFinding.consultation.id}`}>
                      {selectedFinding.consultation.displayName}
                    </Link>
                  </Button>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium mb-1">Estado actual</h4>
                <Badge variant={statusVariant(selectedFinding.status) as any}>
                  {statusLabel(selectedFinding.status)}
                </Badge>
                {selectedFinding.resolvedBy && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Resuelto por {selectedFinding.resolvedBy.name}
                  </p>
                )}
              </div>

              {userCanEdit && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Cambiar estado</h4>
                  <div className="flex gap-2">
                    {selectedFinding.status !== 'OPEN' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus('OPEN')} disabled={updating}>
                        Marcar abierto
                      </Button>
                    )}
                    {selectedFinding.status !== 'IN_REVIEW' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus('IN_REVIEW')} disabled={updating}>
                        En revisión
                      </Button>
                    )}
                    {selectedFinding.status !== 'RESOLVED' && (
                      <Button size="sm" onClick={() => updateStatus('RESOLVED')} disabled={updating}>
                        {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolver
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
