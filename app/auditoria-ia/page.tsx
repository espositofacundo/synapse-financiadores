"use client"

import { useEffect, useState } from "react"
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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import { ScanSearch, Play, Loader2, DollarSign, AlertTriangle, CheckCircle, Target, Filter, Sparkles } from "lucide-react"
import { format, subDays } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

interface Metrics {
  totalAudits: number
  totalFindings: number
  totalConsultations: number
  auditedConsultations: number
  auditCoverage: number
  bySeverity: { LOW: number; MEDIUM: number; HIGH: number }
  byCategory: Record<string, number>
  byStatus: { OPEN: number; IN_REVIEW: number; RESOLVED: number }
  byScope: Record<string, number>
  estimatedSavings: number
  openHighSeverity: number
  topAuditsByFindings: Array<{
    id: string
    auditType: string
    auditScope: string
    createdAt: string
    findingsCount: number
    highCount: number
    estimatedSavings: number
  }>
}

interface Audit {
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
  maxSeverity: string
  targetConsultation?: { id: string; displayName: string } | null
  createdBy: { id: string; name: string }
}

interface RecommendedConsultation {
  id: string
  displayName: string | null
  fecha: string
  especialidad: string
  canal: string
  costo: number
  riskLevel: string
  invoicesCount: number
  priorityScore: number
  reasons: string[]
}

const AUDIT_TYPES = ['FACTURA', 'PRACTICA', 'ADMINISTRATIVA', 'CLINICA']
const ESPECIALIDADES = ['clínica', 'pediatría', 'gineco', 'cardio', 'traumatología', 'psiquiatría']
const SEVERITY_COLORS = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#ef4444' }

export default function AuditoriaIAPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [userCanRun, setUserCanRun] = useState(false)

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardMode, setWizardMode] = useState<'SINGLE' | 'BATCH' | 'RECOMMENDED'>('SINGLE')
  const [wizardType, setWizardType] = useState('PRACTICA')
  const [wizardSubmitting, setWizardSubmitting] = useState(false)

  // Single mode
  const [consultations, setConsultations] = useState<any[]>([])
  const [selectedConsultation, setSelectedConsultation] = useState<string | null>(null)
  const [searchFilters, setSearchFilters] = useState({
    especialidad: 'all',
    riskLevel: 'all',
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  })

  // Batch mode
  const [batchFilters, setBatchFilters] = useState({
    especialidad: 'all',
    canal: 'all',
    riskLevel: 'all',
    costAboveP95: false,
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  })
  const [batchPreview, setBatchPreview] = useState<{ count: number } | null>(null)

  // Recommended mode
  const [recommended, setRecommended] = useState<RecommendedConsultation[]>([])
  const [selectedRecommended, setSelectedRecommended] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [meRes, metricsRes, auditsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/v2/audit-metrics'),
        fetch('/api/v2/audits')
      ])
      if (meRes.ok) {
        const data = await meRes.json()
        setUserCanRun(['APROBADOR', 'ADMIN'].includes(data.user?.role))
      }
      if (metricsRes.ok) setMetrics(await metricsRes.json())
      if (auditsRes.ok) setAudits(await auditsRes.json())
    } catch (e) {
      console.error('Error fetching data:', e)
    } finally {
      setLoading(false)
    }
  }

  const openWizard = () => {
    setWizardStep(1)
    setWizardMode('SINGLE')
    setWizardType('PRACTICA')
    setSelectedConsultation(null)
    setSelectedRecommended([])
    setBatchPreview(null)
    setWizardOpen(true)
  }

  const fetchConsultationsForSearch = async () => {
    const params = new URLSearchParams({ limit: '50', auditStatus: 'NOT_AUDITED' })
    if (searchFilters.especialidad !== 'all') params.set('especialidad', searchFilters.especialidad)
    if (searchFilters.riskLevel !== 'all') params.set('riskLevel', searchFilters.riskLevel)
    if (searchFilters.from) params.set('from', searchFilters.from)
    if (searchFilters.to) params.set('to', searchFilters.to)
    
    const res = await fetch(`/api/consultations?${params}`)
    if (res.ok) {
      const data = await res.json()
      setConsultations(data.consultations || [])
    }
  }

  const fetchBatchPreview = async () => {
    const params = new URLSearchParams({ limit: '1' })
    if (batchFilters.especialidad !== 'all') params.set('especialidad', batchFilters.especialidad)
    if (batchFilters.canal !== 'all') params.set('canal', batchFilters.canal)
    if (batchFilters.riskLevel !== 'all') params.set('riskLevel', batchFilters.riskLevel)
    if (batchFilters.from) params.set('from', batchFilters.from)
    if (batchFilters.to) params.set('to', batchFilters.to)

    const res = await fetch(`/api/consultations?${params}`)
    if (res.ok) {
      const data = await res.json()
      setBatchPreview({ count: data.total || 0 })
    }
  }

  const fetchRecommended = async () => {
    const res = await fetch('/api/v2/audits/recommended?limit=20')
    if (res.ok) {
      const data = await res.json()
      setRecommended(data.recommended || [])
    }
  }

  const handleWizardNext = async () => {
    if (wizardStep === 1) {
      setWizardStep(2)
    } else if (wizardStep === 2) {
      if (wizardMode === 'SINGLE') {
        await fetchConsultationsForSearch()
      } else if (wizardMode === 'BATCH') {
        await fetchBatchPreview()
      } else if (wizardMode === 'RECOMMENDED') {
        await fetchRecommended()
      }
      setWizardStep(3)
    }
  }

  const handleSubmitAudit = async () => {
    setWizardSubmitting(true)
    try {
      const body: any = {
        auditType: wizardType,
        auditScope: wizardMode === 'SINGLE' ? 'SINGLE_CONSULTATION' :
                    wizardMode === 'BATCH' ? 'BATCH_FILTER' : 'RECOMMENDED_SET'
      }

      if (wizardMode === 'SINGLE') {
        body.targetConsultationId = selectedConsultation
      } else if (wizardMode === 'BATCH') {
        body.filterPayload = batchFilters
      } else if (wizardMode === 'RECOMMENDED') {
        body.consultationIds = selectedRecommended
        body.recommendedPayload = { selectedCount: selectedRecommended.length }
      }

      const res = await fetch('/api/v2/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        setWizardOpen(false)
        fetchData()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al crear auditoría')
      }
    } catch (e) {
      console.error('Error submitting audit:', e)
      alert('Error al crear auditoría')
    } finally {
      setWizardSubmitting(false)
    }
  }

  const severityVariant = (s: string) => s === 'HIGH' ? 'destructive' : s === 'MEDIUM' ? 'warning' : 'secondary'
  const scopeLabel = (s: string) => s === 'SINGLE_CONSULTATION' ? 'Única' : s === 'BATCH_FILTER' ? 'Batch' : 'Recomendada'

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const severityChartData = metrics ? [
    { name: 'Bajo', value: metrics.bySeverity.LOW, fill: SEVERITY_COLORS.LOW },
    { name: 'Medio', value: metrics.bySeverity.MEDIUM, fill: SEVERITY_COLORS.MEDIUM },
    { name: 'Alto', value: metrics.bySeverity.HIGH, fill: SEVERITY_COLORS.HIGH },
  ].filter(d => d.value > 0) : []

  const categoryChartData = metrics
    ? Object.entries(metrics.byCategory).map(([name, value]) => ({ name, value }))
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ScanSearch className="h-8 w-8" />
            Auditoría IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Synapse analiza la data, la IA encuentra problemas, se genera eficiencia.
          </p>
        </div>
        {userCanRun && (
          <Button onClick={openWizard} className="gap-2">
            <Play className="h-4 w-4" />
            Nueva auditoría
          </Button>
        )}
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="audits">Auditorías</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Auditorías</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalAudits ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Hallazgos</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalFindings ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.openHighSeverity ?? 0} críticos abiertos
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Cobertura</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.auditCoverage ?? 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.auditedConsultations ?? 0} / {metrics?.totalConsultations ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ahorro estimado</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(metrics?.estimatedSavings ?? 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">POC mock</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Por estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 text-xs">
                  <Badge variant="destructive">{metrics?.byStatus?.OPEN ?? 0} abier.</Badge>
                  <Badge variant="warning">{metrics?.byStatus?.IN_REVIEW ?? 0} rev.</Badge>
                  <Badge variant="secondary">{metrics?.byStatus?.RESOLVED ?? 0} res.</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Por severidad</CardTitle>
              </CardHeader>
              <CardContent>
                {severityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie 
                        data={severityChartData} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={80} 
                        label
                      >
                        {severityChartData.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Sin datos</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Por categoría</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Sin datos</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones rápidas</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button variant="outline" asChild>
                <Link href="/consultas-practicas">Ver consultas</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/hallazgos">Ver hallazgos</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audits Tab */}
        <TabsContent value="audits" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Auditorías ejecutadas</CardTitle>
              <CardDescription>
                Historial de auditorías con resultados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {audits.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay auditorías. Usá &quot;Nueva auditoría&quot; para crear una.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Alcance</TableHead>
                      <TableHead>Consultadas</TableHead>
                      <TableHead>Hallazgos</TableHead>
                      <TableHead>Sev. máx.</TableHead>
                      <TableHead>Ahorro est.</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audits.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{format(new Date(a.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                        <TableCell>{a.auditType}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{scopeLabel(a.auditScope)}</Badge>
                        </TableCell>
                        <TableCell>{a.consultationsAudited}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {a.findingsCountHigh > 0 && <Badge variant="destructive">{a.findingsCountHigh}H</Badge>}
                            {a.findingsCountMedium > 0 && <Badge variant="warning">{a.findingsCountMedium}M</Badge>}
                            {a.findingsCountLow > 0 && <Badge variant="secondary">{a.findingsCountLow}L</Badge>}
                            {a.findingsCountTotal === 0 && <span className="text-muted-foreground">0</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={severityVariant(a.maxSeverity) as any}>{a.maxSeverity}</Badge>
                        </TableCell>
                        <TableCell>${a.estimatedSavings.toLocaleString()}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/auditoria-ia/${a.id}`}>Ver</Link>
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
      </Tabs>

      {/* Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva auditoría - Paso {wizardStep}/3</DialogTitle>
            <DialogDescription>
              {wizardStep === 1 && 'Elegí el modo de auditoría'}
              {wizardStep === 2 && 'Elegí el tipo de auditoría'}
              {wizardStep === 3 && 'Seleccioná qué auditar'}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Mode */}
          {wizardStep === 1 && (
            <RadioGroup value={wizardMode} onValueChange={(v: any) => setWizardMode(v)} className="space-y-4">
              <div className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="SINGLE" id="single" />
                <div className="flex-1">
                  <Label htmlFor="single" className="flex items-center gap-2 cursor-pointer">
                    <Target className="h-4 w-4" />
                    Auditar una consulta puntual
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Seleccioná una consulta específica para auditar en detalle.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="BATCH" id="batch" />
                <div className="flex-1">
                  <Label htmlFor="batch" className="flex items-center gap-2 cursor-pointer">
                    <Filter className="h-4 w-4" />
                    Auditar un conjunto usando filtros
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aplicá filtros para auditar múltiples consultas a la vez.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="RECOMMENDED" id="recommended" />
                <div className="flex-1">
                  <Label htmlFor="recommended" className="flex items-center gap-2 cursor-pointer">
                    <Sparkles className="h-4 w-4" />
                    Recomendadas (Synapse sugiere)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Synapse calcula las consultas con mayor prioridad de auditoría.
                  </p>
                </div>
              </div>
            </RadioGroup>
          )}

          {/* Step 2: Type */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <Label>Tipo de auditoría</Label>
              <Select value={wizardType} onValueChange={setWizardType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {wizardType === 'FACTURA' && 'Busca duplicados, montos inconsistentes y errores de facturación.'}
                {wizardType === 'PRACTICA' && 'Detecta sobreutilización, prácticas sin justificación y duplicados.'}
                {wizardType === 'ADMINISTRATIVA' && 'Verifica datos de prestadores, matrículas y documentación.'}
                {wizardType === 'CLINICA' && 'Analiza brechas de tratamiento, diagnósticos inconsistentes.'}
              </p>
            </div>
          )}

          {/* Step 3: Selection */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              {/* Single mode */}
              {wizardMode === 'SINGLE' && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Especialidad</Label>
                      <Select 
                        value={searchFilters.especialidad} 
                        onValueChange={(v) => { setSearchFilters({ ...searchFilters, especialidad: v }); fetchConsultationsForSearch() }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {ESPECIALIDADES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Riesgo</Label>
                      <Select 
                        value={searchFilters.riskLevel} 
                        onValueChange={(v) => { setSearchFilters({ ...searchFilters, riskLevel: v }); fetchConsultationsForSearch() }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="alto">Alto</SelectItem>
                          <SelectItem value="medio">Medio</SelectItem>
                          <SelectItem value="bajo">Bajo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" onClick={fetchConsultationsForSearch}>Buscar</Button>
                  </div>
                  <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                    {consultations.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Sin resultados. Ajustá los filtros.</p>
                    ) : (
                      <Table>
                        <TableBody>
                          {consultations.map((c: any) => (
                            <TableRow 
                              key={c.id} 
                              className={`cursor-pointer ${selectedConsultation === c.id ? 'bg-primary/10' : ''}`}
                              onClick={() => setSelectedConsultation(c.id)}
                            >
                              <TableCell className="w-8">
                                <Checkbox checked={selectedConsultation === c.id} />
                              </TableCell>
                              <TableCell>{c.displayName || c.id.slice(0, 8)}</TableCell>
                              <TableCell>{c.especialidad}</TableCell>
                              <TableCell>
                                <Badge variant={c.riskLevel === 'alto' ? 'destructive' : 'secondary'}>
                                  {c.riskLevel}
                                </Badge>
                              </TableCell>
                              <TableCell>${c.costo.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </>
              )}

              {/* Batch mode */}
              {wizardMode === 'BATCH' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Especialidad</Label>
                      <Select value={batchFilters.especialidad} onValueChange={(v) => setBatchFilters({ ...batchFilters, especialidad: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {ESPECIALIDADES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Riesgo</Label>
                      <Select value={batchFilters.riskLevel} onValueChange={(v) => setBatchFilters({ ...batchFilters, riskLevel: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="alto">Alto</SelectItem>
                          <SelectItem value="medio">Medio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Desde</Label>
                      <Input type="date" value={batchFilters.from} onChange={(e) => setBatchFilters({ ...batchFilters, from: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Hasta</Label>
                      <Input type="date" value={batchFilters.to} onChange={(e) => setBatchFilters({ ...batchFilters, to: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="costAbove" 
                      checked={batchFilters.costAboveP95} 
                      onCheckedChange={(v) => setBatchFilters({ ...batchFilters, costAboveP95: !!v })} 
                    />
                    <Label htmlFor="costAbove" className="text-sm">Solo costo &gt; P95</Label>
                  </div>
                  <Button variant="outline" onClick={fetchBatchPreview}>Ver preview</Button>
                  {batchPreview && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium">Se auditarán {batchPreview.count} consultas</p>
                      <p className="text-sm text-muted-foreground">
                        (máximo 50 para POC)
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Recommended mode */}
              {wizardMode === 'RECOMMENDED' && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Synapse calculó prioridad basada en: costo alto, múltiples facturas, posibles duplicados, riesgo alto.
                  </p>
                  <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                    {recommended.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No hay recomendaciones. Importá más datos.
                      </p>
                    ) : (
                      <Table>
                        <TableBody>
                          {recommended.map((r) => (
                            <TableRow 
                              key={r.id}
                              className={`cursor-pointer ${selectedRecommended.includes(r.id) ? 'bg-primary/10' : ''}`}
                              onClick={() => {
                                setSelectedRecommended(prev => 
                                  prev.includes(r.id) 
                                    ? prev.filter(id => id !== r.id)
                                    : [...prev, r.id]
                                )
                              }}
                            >
                              <TableCell className="w-8">
                                <Checkbox checked={selectedRecommended.includes(r.id)} />
                              </TableCell>
                              <TableCell>{r.displayName || r.id.slice(0, 8)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">Score: {r.priorityScore}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {r.reasons.map((reason, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">{reason}</Badge>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedRecommended(recommended.slice(0, 10).map(r => r.id))}
                    >
                      Seleccionar Top 10
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedRecommended(recommended.map(r => r.id))}
                    >
                      Seleccionar todas
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            {wizardStep > 1 && (
              <Button variant="outline" onClick={() => setWizardStep(wizardStep - 1)}>
                Anterior
              </Button>
            )}
            {wizardStep < 3 ? (
              <Button onClick={handleWizardNext}>Siguiente</Button>
            ) : (
              <Button 
                onClick={handleSubmitAudit} 
                disabled={wizardSubmitting || 
                  (wizardMode === 'SINGLE' && !selectedConsultation) ||
                  (wizardMode === 'RECOMMENDED' && selectedRecommended.length === 0)
                }
              >
                {wizardSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ejecutar auditoría'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
