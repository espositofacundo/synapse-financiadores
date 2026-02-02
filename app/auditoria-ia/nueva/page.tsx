"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Play, Loader2, Filter, Search, CheckSquare, Square } from "lucide-react"
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
  importBatch?: { id: string; name: string } | null
}

interface ImportBatch {
  id: string
  name: string
  recordsCountConsultations: number
}

const ESPECIALIDADES = ['clínica', 'pediatría', 'gineco', 'cardio', 'traumatología', 'psiquiatría']
const CANALES = ['guardia', 'programada', 'telemedicina']
const AUDIT_TYPES = [
  { value: 'FACTURA', label: 'Facturación', desc: 'Duplicados, montos inconsistentes, errores' },
  { value: 'PRACTICA', label: 'Prácticas médicas', desc: 'Sobreutilización, sin justificación, duplicados' },
  { value: 'ADMINISTRATIVA', label: 'Administrativa', desc: 'Prestadores, matrículas, documentación' },
  { value: 'CLINICA', label: 'Clínica', desc: 'Brechas de tratamiento, diagnósticos' },
]

export default function NuevaAuditoriaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Datos
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [providers, setProviders] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  
  // Selección
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  
  // Tipo de auditoría
  const [auditType, setAuditType] = useState('PRACTICA')
  
  // Filtros
  const [filters, setFilters] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    especialidad: 'all',
    canal: 'all',
    riskLevel: 'all',
    provider: 'all',
    importBatchId: 'all',
    auditStatus: 'NOT_AUDITED', // Por defecto solo sin auditar
    minCosto: '',
    maxCosto: ''
  })

  useEffect(() => {
    fetchBatches()
    fetchProviders()
  }, [])

  useEffect(() => {
    searchConsultations()
  }, []) // Solo al inicio, después con botón

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

  const fetchProviders = async () => {
    try {
      // Obtener lista única de prestadores
      const res = await fetch('/api/consultations?limit=500')
      if (res.ok) {
        const data = await res.json()
        const uniqueProviders = [...new Set(
          (data.consultations || [])
            .map((c: any) => c.providerName)
            .filter(Boolean)
        )] as string[]
        setProviders(uniqueProviders.sort())
      }
    } catch (e) {
      console.error('Error fetching providers:', e)
    }
  }

  const searchConsultations = async () => {
    setSearching(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      if (filters.especialidad !== 'all') params.set('especialidad', filters.especialidad)
      if (filters.canal !== 'all') params.set('canal', filters.canal)
      if (filters.riskLevel !== 'all') params.set('riskLevel', filters.riskLevel)
      if (filters.importBatchId !== 'all') params.set('importBatchId', filters.importBatchId)
      if (filters.auditStatus !== 'all') params.set('auditStatus', filters.auditStatus)

      const res = await fetch(`/api/consultations?${params}`)
      if (res.ok) {
        const data = await res.json()
        let results = data.consultations || []
        
        // Filtros adicionales client-side
        if (filters.provider !== 'all') {
          results = results.filter((c: Consultation) => c.providerName === filters.provider)
        }
        if (filters.minCosto) {
          results = results.filter((c: Consultation) => c.costo >= parseFloat(filters.minCosto))
        }
        if (filters.maxCosto) {
          results = results.filter((c: Consultation) => c.costo <= parseFloat(filters.maxCosto))
        }
        
        setConsultations(results)
        setTotal(results.length)
        setSelectedIds(new Set())
        setSelectAll(false)
      }
    } catch (e) {
      console.error('Error searching:', e)
    } finally {
      setSearching(false)
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
    setSelectAll(newSet.size === consultations.length && consultations.length > 0)
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set())
      setSelectAll(false)
    } else {
      setSelectedIds(new Set(consultations.map(c => c.id)))
      setSelectAll(true)
    }
  }

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      alert('Seleccioná al menos una consulta para auditar')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/v2/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditType,
          auditScope: selectedIds.size === 1 ? 'SINGLE_CONSULTATION' : 'BATCH_FILTER',
          targetConsultationId: selectedIds.size === 1 ? Array.from(selectedIds)[0] : undefined,
          consultationIds: selectedIds.size > 1 ? Array.from(selectedIds) : undefined,
          filterPayload: {
            ...filters,
            selectedCount: selectedIds.size
          }
        })
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/auditoria-ia/${data.audit.id}`)
      } else {
        const data = await res.json()
        alert(data.error || 'Error al crear auditoría')
      }
    } catch (e) {
      console.error('Error:', e)
      alert('Error al crear auditoría')
    } finally {
      setSubmitting(false)
    }
  }

  const riskVariant = (r: string) => r === 'alto' ? 'destructive' : r === 'medio' ? 'warning' : 'secondary'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/auditoria-ia"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Nueva Auditoría</h1>
          <p className="text-muted-foreground">
            Seleccioná las consultas que querés auditar usando los filtros
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Panel de filtros */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo de auditoría */}
            <div>
              <Label className="text-xs font-semibold">Tipo de auditoría</Label>
              <Select value={auditType} onValueChange={setAuditType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <div className="font-medium">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.desc}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <hr />

            {/* Rango de fechas */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Desde</Label>
                <Input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Hasta</Label>
                <Input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Lote de importación */}
            <div>
              <Label className="text-xs">Lote de importación</Label>
              <Select value={filters.importBatchId} onValueChange={(v) => setFilters({ ...filters, importBatchId: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los lotes</SelectItem>
                  {batches.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.recordsCountConsultations})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Especialidad */}
            <div>
              <Label className="text-xs">Especialidad</Label>
              <Select value={filters.especialidad} onValueChange={(v) => setFilters({ ...filters, especialidad: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las especialidades</SelectItem>
                  {ESPECIALIDADES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Médico/Prestador */}
            <div>
              <Label className="text-xs">Médico / Prestador</Label>
              <Select value={filters.provider} onValueChange={(v) => setFilters({ ...filters, provider: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los prestadores</SelectItem>
                  {providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Canal */}
            <div>
              <Label className="text-xs">Canal</Label>
              <Select value={filters.canal} onValueChange={(v) => setFilters({ ...filters, canal: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los canales</SelectItem>
                  {CANALES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Nivel de riesgo */}
            <div>
              <Label className="text-xs">Nivel de riesgo</Label>
              <Select value={filters.riskLevel} onValueChange={(v) => setFilters({ ...filters, riskLevel: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="medio">Medio</SelectItem>
                  <SelectItem value="bajo">Bajo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estado de auditoría */}
            <div>
              <Label className="text-xs">Estado auditoría</Label>
              <Select value={filters.auditStatus} onValueChange={(v) => setFilters({ ...filters, auditStatus: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="NOT_AUDITED">Sin auditar</SelectItem>
                  <SelectItem value="AUDITED">Auditadas</SelectItem>
                  <SelectItem value="HAS_FINDINGS">Con hallazgos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rango de costo */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Costo mín.</Label>
                <Input
                  type="number"
                  placeholder="$0"
                  value={filters.minCosto}
                  onChange={(e) => setFilters({ ...filters, minCosto: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Costo máx.</Label>
                <Input
                  type="number"
                  placeholder="$∞"
                  value={filters.maxCosto}
                  onChange={(e) => setFilters({ ...filters, maxCosto: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <Button onClick={searchConsultations} className="w-full gap-2" disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar consultas
            </Button>
          </CardContent>
        </Card>

        {/* Resultados */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Consultas encontradas ({total})</CardTitle>
                <CardDescription>
                  {selectedIds.size > 0 
                    ? `${selectedIds.size} seleccionadas para auditar`
                    : 'Seleccioná las consultas que querés auditar'
                  }
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleSelectAll}
                  disabled={consultations.length === 0}
                >
                  {selectAll ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
                  {selectAll ? 'Deseleccionar' : 'Seleccionar'} todas
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={selectedIds.size === 0 || submitting}
                  className="gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Ejecutar auditoría ({selectedIds.size})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {searching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : consultations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No se encontraron consultas con los filtros aplicados.</p>
                <p className="text-sm mt-2">Ajustá los filtros y volvé a buscar.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox 
                          checked={selectAll}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Caso</TableHead>
                      <TableHead>Especialidad</TableHead>
                      <TableHead>Prestador</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead>Riesgo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultations.map((c) => (
                      <TableRow 
                        key={c.id}
                        className={`cursor-pointer ${selectedIds.has(c.id) ? 'bg-primary/5' : ''}`}
                        onClick={() => toggleSelect(c.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={selectedIds.has(c.id)}
                            onCheckedChange={() => toggleSelect(c.id)}
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(c.fecha), 'dd/MM/yy', { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium max-w-[150px] truncate">
                          {c.displayName || `Consulta ${c.id.slice(0, 6)}`}
                        </TableCell>
                        <TableCell>{c.especialidad}</TableCell>
                        <TableCell className="max-w-[120px] truncate">
                          {c.providerName || '—'}
                        </TableCell>
                        <TableCell>{c.canal}</TableCell>
                        <TableCell className="text-right">${c.costo.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={riskVariant(c.riskLevel) as any} className="text-xs">
                            {c.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={c.auditStatus === 'HAS_FINDINGS' ? 'destructive' : 
                                    c.auditStatus === 'AUDITED' ? 'secondary' : 'outline'} 
                            className="text-xs"
                          >
                            {c.auditStatus === 'NOT_AUDITED' ? 'Pendiente' : 
                             c.auditStatus === 'AUDITED' ? 'Auditada' : 'Hallazgos'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
