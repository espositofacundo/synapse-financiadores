"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileSearch, Loader2, ExternalLink, Play } from "lucide-react"
import { format, subDays } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

interface Consultation {
  id: string
  displayName: string | null
  fecha: string
  especialidad: string
  canal: string
  costo: number
  riskLevel: string
  riskScore: number
  auditStatus: string
  providerName: string | null
  invoicesCount: number
  findingsCount: number
  auditsCount: number
}

interface ImportBatch {
  id: string
  name: string
  type: string
  status: string
  recordsCountConsultations: number
  recordsCountInvoices: number
  createdAt: string
}

const ESPECIALIDADES = ['clínica', 'pediatría', 'gineco', 'cardio', 'traumatología', 'psiquiatría']
const CANALES = ['guardia', 'programada', 'telemedicina']
const RISK_LEVELS = ['bajo', 'medio', 'alto']
const AUDIT_STATUSES = ['NOT_AUDITED', 'AUDITED', 'HAS_FINDINGS']

export default function ConsultasPracticasPage() {
  const router = useRouter()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  
  // Filtros
  const [filters, setFilters] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    especialidad: 'all',
    canal: 'all',
    riskLevel: 'all',
    auditStatus: 'all',
    importBatchId: 'all',
    hasInvoices: 'all'
  })

  // Import dialog
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importForm, setImportForm] = useState({ name: '', type: 'MIXTA' })

  useEffect(() => {
    fetchData()
  }, [filters])

  useEffect(() => {
    fetchBatches()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      if (filters.especialidad !== 'all') params.set('especialidad', filters.especialidad)
      if (filters.canal !== 'all') params.set('canal', filters.canal)
      if (filters.riskLevel !== 'all') params.set('riskLevel', filters.riskLevel)
      if (filters.auditStatus !== 'all') params.set('auditStatus', filters.auditStatus)
      if (filters.importBatchId !== 'all') params.set('importBatchId', filters.importBatchId)
      if (filters.hasInvoices !== 'all') params.set('hasInvoices', filters.hasInvoices)

      const res = await fetch(`/api/consultations?${params}`)
      if (res.ok) {
        const data = await res.json()
        setConsultations(data.consultations || [])
        setTotal(data.total || 0)
      }
    } catch (e) {
      console.error('Error fetching consultations:', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/import-batches')
      if (res.ok) {
        const data = await res.json()
        setBatches(data || [])
      }
    } catch (e) {
      console.error('Error fetching batches:', e)
    }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setImporting(true)
    try {
      const res = await fetch('/api/import-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: importForm.name || `Importación ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
          type: importForm.type
        })
      })
      if (res.ok) {
        setImportOpen(false)
        setImportForm({ name: '', type: 'MIXTA' })
        fetchBatches()
        fetchData()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al importar')
      }
    } catch (e) {
      console.error('Error importing:', e)
      alert('Error al importar')
    } finally {
      setImporting(false)
    }
  }

  const auditStatusLabel = (s: string) => {
    switch (s) {
      case 'NOT_AUDITED': return 'Sin auditar'
      case 'AUDITED': return 'Auditada'
      case 'HAS_FINDINGS': return 'Con hallazgos'
      default: return s
    }
  }

  const auditStatusVariant = (s: string) => {
    switch (s) {
      case 'NOT_AUDITED': return 'outline'
      case 'AUDITED': return 'secondary'
      case 'HAS_FINDINGS': return 'destructive'
      default: return 'outline'
    }
  }

  const riskVariant = (r: string) => {
    switch (r) {
      case 'alto': return 'destructive'
      case 'medio': return 'warning'
      default: return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileSearch className="h-8 w-8" />
            Consultas / Prácticas
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualizá consultas y sus facturas asociadas. Ejecutá auditorías sobre lo cargado.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Importar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar datos (POC)</DialogTitle>
                <DialogDescription>
                  Crea una importación simulada con consultas y facturas mock.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleImport} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del lote</Label>
                  <Input
                    value={importForm.name}
                    onChange={(e) => setImportForm({ ...importForm, name: e.target.value })}
                    placeholder={`Importación ${format(new Date(), 'dd/MM/yyyy')}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={importForm.type}
                    onValueChange={(v) => setImportForm({ ...importForm, type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONSULTAS">Solo consultas</SelectItem>
                      <SelectItem value="FACTURAS">Solo facturas</SelectItem>
                      <SelectItem value="MIXTA">Mixta (consultas + facturas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={importing}>
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear importación'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" asChild>
            <Link href="/auditoria-ia" className="gap-2">
              <Play className="h-4 w-4" />
              Nueva auditoría
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div>
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Especialidad</Label>
              <Select value={filters.especialidad} onValueChange={(v) => setFilters({ ...filters, especialidad: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {ESPECIALIDADES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Canal</Label>
              <Select value={filters.canal} onValueChange={(v) => setFilters({ ...filters, canal: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {CANALES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Riesgo</Label>
              <Select value={filters.riskLevel} onValueChange={(v) => setFilters({ ...filters, riskLevel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Estado auditoría</Label>
              <Select value={filters.auditStatus} onValueChange={(v) => setFilters({ ...filters, auditStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {AUDIT_STATUSES.map(s => <SelectItem key={s} value={s}>{auditStatusLabel(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Con facturas</Label>
              <Select value={filters.hasInvoices} onValueChange={(v) => setFilters({ ...filters, hasInvoices: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Sí</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Importación</Label>
              <Select value={filters.importBatchId} onValueChange={(v) => setFilters({ ...filters, importBatchId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Consultas ({total})</CardTitle>
          <CardDescription>
            Click en una fila para ver detalle, facturas y hallazgos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : consultations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay consultas. Usá &quot;Importar&quot; para cargar datos simulados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Caso</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Prestador</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead>Facturas</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultations.map((c) => (
                  <TableRow 
                    key={c.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/consultas-practicas/${c.id}`)}
                  >
                    <TableCell>{format(new Date(c.fecha), 'dd/MM/yyyy', { locale: es })}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {c.displayName || `Consulta ${c.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell>{c.especialidad}</TableCell>
                    <TableCell>{c.canal}</TableCell>
                    <TableCell>{c.providerName || '—'}</TableCell>
                    <TableCell className="text-right">${c.costo.toLocaleString()}</TableCell>
                    <TableCell>
                      {c.invoicesCount > 0 ? (
                        <Badge variant="outline">{c.invoicesCount}</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={riskVariant(c.riskLevel) as any}>
                        {c.riskLevel} ({c.riskScore})
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={auditStatusVariant(c.auditStatus) as any}>
                        {auditStatusLabel(c.auditStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/consultas-practicas/${c.id}`)
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
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
