"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SynapseCard, SynapseCardContent, SynapseCardHeader, SynapseCardTitle } from "@/components/ui-synapse/synapse-card"
import { SynapseBadge } from "@/components/ui-synapse/synapse-badge"
import { SynapseStatCard } from "@/components/ui-synapse/synapse-stat-card"
import { PageHeader } from "@/components/ui-synapse/page-header"
import { AlertCircle, Clock, DollarSign, User, TrendingUp, Target, BarChart3, Edit, X, Plus, FileText, Hourglass, CheckCircle2, UserCheck, XCircle, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import type { OnboardingStatus } from "@/lib/onboarding-workflow"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface OnboardingCase {
  id: string
  displayName: string
  status: OnboardingStatus
  riskScore: number | null
  riskLevel: string | null
  suggestedPriceMonthly: number | null
  daysInColumn: number
  quote?: {
    id: string
    status: string
  } | null
  patient?: {
    id: string
    nombre: string
    apellido: string
  } | null
  createdBy?: {
    name: string
  } | null
  assignedTo?: {
    name: string
  } | null
}

interface Metrics {
  wipByStatus: Record<string, number>
  avgTimeByStatus: Record<string, { avg: number; median: number }>
  leadTime: { avg: number; p50: number; p90: number }
  throughput: { weekly: number; daily: number; total: number }
  aging: Array<{ id: string; displayName: string; status: string; hoursInColumn: number; riskLevel: string | null }>
  slaCompliance: Record<string, { inSla: number; outOfSla: number; total: number; percentage: number }>
  overallSlaPercentage: number
}

// Configuración centralizada de estados (estilo Jira)
const STATUS_CONFIG: Record<OnboardingStatus, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  borderColor: string
  bgColor: string
}> = {
  PENDIENTE_COTIZACION: {
    label: 'Pendiente Cotización',
    icon: FileText,
    color: 'text-muted-foreground',
    borderColor: 'border-l-muted-foreground',
    bgColor: 'bg-muted/30',
  },
  PENDIENTE_APROBACION: {
    label: 'Pendiente Aprobación',
    icon: Hourglass,
    color: 'text-yellow-600',
    borderColor: 'border-l-yellow-600',
    bgColor: 'bg-yellow-50/50',
  },
  APROBADO: {
    label: 'Aprobado',
    icon: CheckCircle2,
    color: 'text-blue-600',
    borderColor: 'border-l-blue-600',
    bgColor: 'bg-blue-50/50',
  },
  PERFIL_COMPLETO: {
    label: 'Perfil Completo',
    icon: UserCheck,
    color: 'text-green-600',
    borderColor: 'border-l-green-600',
    bgColor: 'bg-green-50/50',
  },
  RECHAZADO: {
    label: 'Rechazado',
    icon: XCircle,
    color: 'text-red-600',
    borderColor: 'border-l-red-600',
    bgColor: 'bg-red-50/50',
  },
}

const COLUMNS: Array<{ id: OnboardingStatus }> = [
  { id: 'PENDIENTE_COTIZACION' },
  { id: 'PENDIENTE_APROBACION' },
  { id: 'APROBADO' },
  { id: 'PERFIL_COMPLETO' },
  { id: 'RECHAZADO' },
]

function getRiskVariant(level: string | null): "bajo" | "medio" | "alto" {
  if (level === 'alto') return 'alto'
  if (level === 'medio') return 'medio'
  return 'bajo'
}

function CaseCard({ case: caseItem, currentUser, onEdit }: { case: OnboardingCase; currentUser: any; onEdit?: (caseId: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: caseItem.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Determinar si el usuario puede editar este caso
  const canEdit = canUserEditCase(currentUser?.role, caseItem.status)

  // Extraer ID del caso del displayName (formato: "Caso #123")
  const caseIdMatch = caseItem.displayName.match(/#(\d+)/)
  const caseId = caseIdMatch ? caseIdMatch[1] : caseItem.id.slice(0, 8)

  return (
    <div ref={setNodeRef} style={style}>
      <SynapseCard className="mb-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing bg-gray-100" variant="elevated">
        <SynapseCardContent className="p-3">
          {/* Header: Caso #ID + Badge de riesgo */}
          <div className="flex items-start justify-between mb-3">
            <h4 className="font-semibold text-sm text-foreground">Caso #{caseId}</h4>
            {caseItem.riskLevel && (
              <SynapseBadge variant={getRiskVariant(caseItem.riskLevel)} className="text-xs">
                {caseItem.riskLevel.toUpperCase()}
              </SynapseBadge>
            )}
          </div>

          {/* Body: Risk score, Precio, Info adicional */}
          <div className="space-y-2 mb-3">
            {caseItem.riskScore !== null && (
              <div className="text-xs text-muted-foreground">
                Risk Score: <span className="font-semibold text-foreground">{caseItem.riskScore}</span>
              </div>
            )}
            
            {caseItem.suggestedPriceMonthly && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">${caseItem.suggestedPriceMonthly.toLocaleString()}/mes</span>
              </div>
            )}

            {/* Info adicional si está disponible */}
            {caseItem.patient && (
              <div className="text-xs text-muted-foreground">
                {caseItem.patient.nombre} {caseItem.patient.apellido}
              </div>
            )}
          </div>

          {/* Footer: Tiempo en columna + Responsable */}
          <div className="pt-2 border-t space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{caseItem.daysInColumn} días en columna</span>
            </div>
            
            {caseItem.assignedTo && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{caseItem.assignedTo.name}</span>
              </div>
            )}
          </div>

          {/* CTA: Botón Revisar */}
          {canEdit && onEdit && (
            <div className="pt-2 mt-2 border-t">
              <Button
                variant="default"
                size="sm"
                className="w-full text-xs h-7 bg-blue-500 hover:bg-blue-600 text-white border-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(caseItem.id)
                }}
              >
                Revisar <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          )}
        </SynapseCardContent>
      </SynapseCard>
    </div>
  )
}

/**
 * Determina si un usuario puede editar un caso según su rol y el estado del caso
 */
function canUserEditCase(userRole: string | undefined, caseStatus: OnboardingStatus): boolean {
  if (!userRole) return false
  
  switch (userRole) {
    case 'COTIZADOR':
      // Puede editar casos en PENDIENTE_COTIZACION (guardados pero no enviados),
      // PENDIENTE_APROBACION (para revertir) y RECHAZADO (para corregir)
      return caseStatus === 'PENDIENTE_COTIZACION' || caseStatus === 'PENDIENTE_APROBACION' || caseStatus === 'RECHAZADO'
    case 'APROBADOR':
      // Puede revisar casos en PENDIENTE_APROBACION y editar casos APROBADO
      return caseStatus === 'PENDIENTE_APROBACION' || caseStatus === 'APROBADO'
    case 'OFICINA':
      return caseStatus === 'APROBADO' || caseStatus === 'PERFIL_COMPLETO'
    case 'ADMIN':
      return true
    default:
      return false
  }
}

function KanbanColumn({ 
  column, 
  cases, 
  currentUser,
  onEdit
}: { 
  column: typeof COLUMNS[0]
  cases: OnboardingCase[]
  currentUser: any
  onEdit?: (caseId: string) => void
}) {
  const columnCases = cases.filter(c => c.status === column.id)
  const sortableIds = columnCases.map(c => c.id)
  const statusConfig = STATUS_CONFIG[column.id]
  const Icon = statusConfig.icon
  
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  return (
    <div ref={setNodeRef} className="flex-1 min-w-[280px]">
      <SynapseCard 
        className={`h-full border-l-4 ${statusConfig.borderColor} ${isOver ? 'ring-2 ring-primary' : ''}`} 
        variant="elevated"
      >
        {/* Header estilo Jira: Icono + Título + Contador */}
        <SynapseCardHeader className={`pb-3 ${statusConfig.bgColor} border-b`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${statusConfig.color}`} />
              <SynapseCardTitle className={`text-sm font-semibold ${statusConfig.color}`}>
                {statusConfig.label}
              </SynapseCardTitle>
            </div>
            <SynapseBadge variant="outline" className="text-xs font-semibold">
              {columnCases.length}
            </SynapseBadge>
          </div>
        </SynapseCardHeader>
        <SynapseCardContent className="p-3">
          <div className="space-y-2 min-h-[200px]">
            {columnCases.length > 0 ? (
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                {columnCases.map(caseItem => (
                  <CaseCard key={caseItem.id} case={caseItem} currentUser={currentUser} onEdit={onEdit} />
                ))}
              </SortableContext>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-8">
                Sin casos
              </div>
            )}
          </div>
        </SynapseCardContent>
      </SynapseCard>
    </div>
  )
}

export default function KanbanPage() {
  const router = useRouter()
  const [cases, setCases] = useState<OnboardingCase[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30')
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<any>({})
  const [editLoading, setEditLoading] = useState(false)
  const [editingCase, setEditingCase] = useState<any>(null)
  const [editReason, setEditReason] = useState('')
  const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchUser()
    fetchCases()
    fetchMetrics()
  }, [dateRange])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setCurrentUser(data.user)
      }
    } catch (error) {
      console.error('Error obteniendo usuario:', error)
    }
  }

  const fetchCases = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/onboarding-cases')
      const data = await res.json()

      if (res.ok) {
        setCases(data.cases || [])
      } else {
        setError(data.error || 'Error al cargar casos')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error al cargar casos')
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    try {
      const days = parseInt(dateRange)
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const to = new Date()
      
      const res = await fetch(
        `/api/onboarding-metrics?from=${from.toISOString()}&to=${to.toISOString()}`
      )
      const data = await res.json()

      if (res.ok) {
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error obteniendo métricas:', error)
    }
  }

  const handleCreateNewCase = async () => {
    try {
      const res = await fetch('/api/onboarding-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const data = await res.json()

      if (res.ok) {
        // Optimistic update: agregar caso a la lista local
        if (data.case) {
          setCases(prev => [{
            ...data.case,
            daysInColumn: 0,
            quote: data.quote ? {
              id: data.quote.id,
              status: data.quote.status
            } : null
          }, ...prev])
        }
        
        // Navegar a la pantalla de cotización
        if (data.caseId || data.case?.id) {
          const caseId = data.caseId || data.case.id
          router.push(`/pacientes/cotizar?caseId=${caseId}`)
        } else {
          // Fallback: navegar sin caseId si no está disponible
          router.push('/pacientes/cotizar')
        }
      } else {
        alert(`Error: ${data.error || 'Error al crear caso'}`)
      }
    } catch (error) {
      console.error('Error creando caso:', error)
      alert('Error al crear caso')
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const caseId = active.id as string
    const targetId = over.id as string
    
    // Verificar si el drop fue en una columna (no en otra card)
    const isColumn = COLUMNS.some(col => col.id === targetId)
    if (!isColumn) return

    const newStatus = targetId as OnboardingStatus
    const currentCase = cases.find(c => c.id === caseId)
    if (!currentCase || currentCase.status === newStatus) return

    try {
      const res = await fetch(`/api/onboarding-cases/${caseId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus: newStatus })
      })

      const data = await res.json()

      if (res.ok) {
        // Actualizar caso localmente
        setCases(prev => prev.map(c => 
          c.id === caseId ? { ...data.case, daysInColumn: 0 } : c
        ))
        fetchMetrics() // Refrescar métricas
      } else {
        alert(`Error: ${data.error}`)
        // Refrescar casos para revertir UI
        fetchCases()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al mover caso')
      fetchCases()
    }
  }

  const onEditCase = async (caseId: string) => {
    try {
      // Obtener datos completos del caso
      const res = await fetch(`/api/onboarding-cases/${caseId}`)
      const data = await res.json()
      
      if (res.ok && data.case) {
        const caseData = data.case
        
        // Si es COTIZADOR y el caso está en PENDIENTE_COTIZACION o PENDIENTE_APROBACION, redirigir a página de cotización
        if ((currentUser?.role === 'COTIZADOR' || currentUser?.role === 'ADMIN') && 
            (caseData.status === 'PENDIENTE_COTIZACION' || caseData.status === 'PENDIENTE_APROBACION')) {
          router.push(`/pacientes/cotizar?caseId=${caseId}`)
          return
        }
        
        // Si es APROBADOR y el caso está en PENDIENTE_APROBACION, redirigir a página de cotización para ver cotización y riesgo
        if ((currentUser?.role === 'APROBADOR' || currentUser?.role === 'ADMIN') && 
            caseData.status === 'PENDIENTE_APROBACION') {
          router.push(`/pacientes/cotizar?caseId=${caseId}`)
          return
        }
        
        // Para otros casos o roles, abrir modal de edición
        setEditingCase(caseData)
        setEditingCaseId(caseId)
        
        // Inicializar formulario según rol
        if (currentUser?.role === 'COTIZADOR' || currentUser?.role === 'ADMIN') {
          const quoteInputs = caseData.quote?.inputs ? JSON.parse(caseData.quote.inputs) : {}
          setEditFormData({
            quoteInputs: {
              edad: quoteInputs.edad?.toString() || '',
              sexo: quoteInputs.sexo || '',
              provincia: quoteInputs.provincia || '',
              patologiasCronicas: quoteInputs.patologiasCronicas || [],
              medicamentosCronicos: quoteInputs.medicamentosCronicos?.toString() || '0',
              consultasTotales: quoteInputs.consultasTotales?.toString() || '0',
              consultasGuardia: quoteInputs.consultasGuardia?.toString() || '0',
              internaciones: quoteInputs.internaciones?.toString() || '0',
              especialidadesDistintas: quoteInputs.especialidadesDistintas?.toString() || '0',
              reconsultasRapidas: quoteInputs.reconsultasRapidas || false,
              tasaNoEfectivas: quoteInputs.tasaNoEfectivas?.toString() || '0',
              planNombre: quoteInputs.planNombre || ''
            }
          })
        } else if (currentUser?.role === 'APROBADOR' || currentUser?.role === 'ADMIN') {
          setEditFormData({
            quoteAdjustments: {
              priceCategory: caseData.quote?.priceCategory || '',
              riskFactor: caseData.quote?.riskFactor?.toString() || '',
              suggestedPriceMonthly: caseData.quote?.suggestedPriceMonthly?.toString() || ''
            }
          })
        } else if (currentUser?.role === 'OFICINA' || currentUser?.role === 'ADMIN') {
          setEditFormData({
            patientData: {
              nombre: caseData.patient?.nombre || '',
              apellido: caseData.patient?.apellido || '',
              telefono: caseData.patient?.telefono || '',
              email: caseData.patient?.email || '',
              localidad: caseData.patient?.localidad || '',
              provincia: caseData.patient?.provincia || '',
              nroAfiliado: caseData.patient?.nroAfiliado || '',
              planNombre: caseData.patient?.planNombre || '',
              notas: caseData.patient?.notas || ''
            }
          })
        }
        setEditReason('')
      } else {
        alert('Error al cargar datos del caso')
      }
    } catch (error) {
      console.error('Error cargando caso:', error)
      alert('Error al cargar caso')
    }
  }

  const handleSaveEdit = async () => {
    if (!editingCaseId || !currentUser) return

    // Validar motivo para APROBADOR
    if ((currentUser.role === 'APROBADOR' || currentUser.role === 'ADMIN') && 
        editingCase?.status === 'APROBADO' && !editReason.trim()) {
      alert('El motivo del ajuste es obligatorio')
      return
    }

    setEditLoading(true)
    try {
      const body: any = { ...editFormData }
      if (editReason.trim()) {
        body.reason = editReason
      }

      const res = await fetch(`/api/onboarding-cases/${editingCaseId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (res.ok) {
        // Actualizar caso en la lista
        setCases(prev => prev.map(c => 
          c.id === editingCaseId ? { 
            ...data.case, 
            daysInColumn: data.case.daysInColumn || 0 
          } : c
        ))
        
        // Mostrar mensaje de éxito
        if (data.statusChanged) {
          setEditSuccessMessage(`Caso editado exitosamente. Estado cambiado a: ${data.newStatus}`)
        } else {
          setEditSuccessMessage('Caso editado exitosamente')
        }
        
        // Cerrar diálogo después de 2 segundos
        setTimeout(() => {
          setEditingCaseId(null)
          setEditingCase(null)
          setEditFormData({})
          setEditReason('')
          setEditSuccessMessage(null)
          fetchCases() // Refrescar casos
          fetchMetrics() // Refrescar métricas
        }, 2000)
      } else {
        alert(`Error: ${data.error || 'Error al editar caso'}`)
      }
    } catch (error) {
      console.error('Error editando caso:', error)
      alert('Error al editar caso')
    } finally {
      setEditLoading(false)
    }
  }

  const handleCloseEdit = () => {
    setEditingCaseId(null)
    setEditingCase(null)
    setEditFormData({})
    setEditReason('')
    setEditSuccessMessage(null)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando Kanban...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Kanban de Altas"
        description="Gestión visual del flujo de onboarding de pacientes"
        actions={
          <>
            <div className="flex gap-2">
              <Button
                variant={dateRange === '7' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange('7')}
              >
                7 días
              </Button>
              <Button
                variant={dateRange === '30' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange('30')}
              >
                30 días
              </Button>
              <Button
                variant={dateRange === '90' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange('90')}
              >
                90 días
              </Button>
            </div>
            {(currentUser?.role === 'COTIZADOR' || currentUser?.role === 'ADMIN') && (
              <Button
                onClick={handleCreateNewCase}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Nuevo caso
              </Button>
            )}
          </>
        }
      />

      {error && (
        <SynapseCard className="border-danger/20 bg-danger/5">
          <SynapseCardContent className="pt-6">
            <div className="flex items-center gap-2 text-danger">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </SynapseCardContent>
        </SynapseCard>
      )}

      {/* KPIs Panel */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SynapseStatCard
            title="WIP Total"
            value={Object.values(metrics.wipByStatus).reduce((a, b) => a + b, 0)}
            description="Casos en proceso"
            icon={BarChart3}
            variant="default"
          />
          <SynapseStatCard
            title="Lead Time Promedio"
            value={`${metrics.leadTime.avg.toFixed(1)}h`}
            description={`P50: ${metrics.leadTime.p50.toFixed(1)}h | P90: ${metrics.leadTime.p90.toFixed(1)}h`}
            icon={Clock}
            variant="primary"
          />
          <SynapseStatCard
            title="Throughput Semanal"
            value={metrics.throughput.weekly.toFixed(1)}
            description={`${metrics.throughput.total} completados en el período`}
            icon={TrendingUp}
            variant="success"
          />
          <SynapseStatCard
            title="% SLA Cumplido"
            value={`${metrics.overallSlaPercentage.toFixed(1)}%`}
            description="Casos dentro de SLA"
            icon={Target}
            variant="warning"
          />
        </div>
      )}

      {/* Aging Cases */}
      {metrics && metrics.aging.length > 0 && (
        <SynapseCard variant="elevated">
          <SynapseCardHeader>
            <SynapseCardTitle className="text-sm">Casos Envejecidos (Top 10)</SynapseCardTitle>
            <p className="text-sm text-muted-foreground">Casos con mayor tiempo en columna actual</p>
          </SynapseCardHeader>
          <SynapseCardContent>
            <div className="space-y-2">
              {metrics.aging.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <span className="font-medium">{item.displayName}</span>
                  <div className="flex items-center gap-4">
                    <SynapseBadge variant="outline">{item.status}</SynapseBadge>
                    {item.riskLevel && (
                      <SynapseBadge variant={getRiskVariant(item.riskLevel)}>
                        {item.riskLevel.toUpperCase()}
                      </SynapseBadge>
                    )}
                    <span className="text-muted-foreground">
                      {item.hoursInColumn.toFixed(1)}h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SynapseCardContent>
        </SynapseCard>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(column => (
            <KanbanColumn 
              key={column.id} 
              column={column} 
              cases={cases} 
              currentUser={currentUser}
              onEdit={onEditCase}
            />
          ))}
        </div>
        <DragOverlay>
          {activeId ? (
            <Card className="w-64 shadow-lg">
              <CardContent className="p-4">
                <div className="font-semibold text-sm">
                  {cases.find(c => c.id === activeId)?.displayName}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Diálogo de Edición */}
      <Dialog open={editingCaseId !== null} onOpenChange={handleCloseEdit}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Caso: {editingCase?.displayName}</DialogTitle>
            <DialogDescription>
              {currentUser?.role === 'COTIZADOR' && editingCase?.status === 'PENDIENTE_COTIZACION' && 'Edita los datos de cotización. El caso permanecerá en PENDIENTE_COTIZACION.'}
              {currentUser?.role === 'COTIZADOR' && editingCase?.status !== 'PENDIENTE_COTIZACION' && 'Edita los datos de cotización. El caso volverá a PENDIENTE_COTIZACION.'}
              {currentUser?.role === 'APROBADOR' && 'Ajusta la aprobación. El estado se mantiene en APROBADO.'}
              {currentUser?.role === 'OFICINA' && 'Edita los datos administrativos del paciente.'}
              {currentUser?.role === 'ADMIN' && 'Edita cualquier campo del caso.'}
            </DialogDescription>
          </DialogHeader>

          {editSuccessMessage ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
              {editSuccessMessage}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Formulario para COTIZADOR */}
              {(currentUser?.role === 'COTIZADOR' || currentUser?.role === 'ADMIN') && 
               (editingCase?.status === 'PENDIENTE_COTIZACION' || editingCase?.status === 'PENDIENTE_APROBACION' || editingCase?.status === 'RECHAZADO') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Edad</Label>
                      <Input
                        type="number"
                        value={editFormData.quoteInputs?.edad || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          quoteInputs: { ...editFormData.quoteInputs, edad: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Sexo</Label>
                      <Select
                        value={editFormData.quoteInputs?.sexo || ''}
                        onValueChange={(value) => setEditFormData({
                          ...editFormData,
                          quoteInputs: { ...editFormData.quoteInputs, sexo: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Femenino</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Provincia</Label>
                    <Input
                      value={editFormData.quoteInputs?.provincia || ''}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        quoteInputs: { ...editFormData.quoteInputs, provincia: e.target.value }
                      })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Consultas Totales</Label>
                      <Input
                        type="number"
                        value={editFormData.quoteInputs?.consultasTotales || '0'}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          quoteInputs: { ...editFormData.quoteInputs, consultasTotales: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Consultas Guardia</Label>
                      <Input
                        type="number"
                        value={editFormData.quoteInputs?.consultasGuardia || '0'}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          quoteInputs: { ...editFormData.quoteInputs, consultasGuardia: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Internaciones</Label>
                      <Input
                        type="number"
                        value={editFormData.quoteInputs?.internaciones || '0'}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          quoteInputs: { ...editFormData.quoteInputs, internaciones: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Especialidades Distintas</Label>
                      <Input
                        type="number"
                        value={editFormData.quoteInputs?.especialidadesDistintas || '0'}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          quoteInputs: { ...editFormData.quoteInputs, especialidadesDistintas: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Medicamentos Crónicos</Label>
                      <Input
                        type="number"
                        value={editFormData.quoteInputs?.medicamentosCronicos || '0'}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          quoteInputs: { ...editFormData.quoteInputs, medicamentosCronicos: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Tasa No Efectivas</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editFormData.quoteInputs?.tasaNoEfectivas || '0'}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          quoteInputs: { ...editFormData.quoteInputs, tasaNoEfectivas: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="reconsultasRapidas"
                      checked={editFormData.quoteInputs?.reconsultasRapidas || false}
                      onCheckedChange={(checked) => setEditFormData({
                        ...editFormData,
                        quoteInputs: { ...editFormData.quoteInputs, reconsultasRapidas: checked === true }
                      })}
                    />
                    <Label htmlFor="reconsultasRapidas">Reconsultas Rápidas</Label>
                  </div>
                </div>
              )}

              {/* Formulario para APROBADOR */}
              {(currentUser?.role === 'APROBADOR' || currentUser?.role === 'ADMIN') && 
               editingCase?.status === 'APROBADO' && (
                <div className="space-y-4">
                  <div>
                    <Label>Motivo del Ajuste *</Label>
                    <Textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      placeholder="Explica el motivo del ajuste..."
                      required
                    />
                  </div>

                  <div>
                    <Label>Categoría de Precio</Label>
                    <Select
                      value={editFormData.quoteAdjustments?.priceCategory || ''}
                      onValueChange={(value) => setEditFormData({
                        ...editFormData,
                        quoteAdjustments: { ...editFormData.quoteAdjustments, priceCategory: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BAJO RIESGO">Bajo Riesgo</SelectItem>
                        <SelectItem value="MEDIO RIESGO">Medio Riesgo</SelectItem>
                        <SelectItem value="ALTO RIESGO">Alto Riesgo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Factor de Riesgo</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editFormData.quoteAdjustments?.riskFactor || ''}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        quoteAdjustments: { ...editFormData.quoteAdjustments, riskFactor: e.target.value }
                      })}
                    />
                  </div>

                  <div>
                    <Label>Precio Mensual Sugerido</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editFormData.quoteAdjustments?.suggestedPriceMonthly || ''}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        quoteAdjustments: { ...editFormData.quoteAdjustments, suggestedPriceMonthly: e.target.value }
                      })}
                    />
                  </div>
                </div>
              )}

              {/* Formulario para OFICINA */}
              {(currentUser?.role === 'OFICINA' || currentUser?.role === 'ADMIN') && 
               (editingCase?.status === 'APROBADO' || editingCase?.status === 'PERFIL_COMPLETO') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        value={editFormData.patientData?.nombre || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          patientData: { ...editFormData.patientData, nombre: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Apellido</Label>
                      <Input
                        value={editFormData.patientData?.apellido || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          patientData: { ...editFormData.patientData, apellido: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Teléfono</Label>
                      <Input
                        value={editFormData.patientData?.telefono || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          patientData: { ...editFormData.patientData, telefono: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={editFormData.patientData?.email || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          patientData: { ...editFormData.patientData, email: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Localidad</Label>
                      <Input
                        value={editFormData.patientData?.localidad || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          patientData: { ...editFormData.patientData, localidad: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Provincia</Label>
                      <Input
                        value={editFormData.patientData?.provincia || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          patientData: { ...editFormData.patientData, provincia: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nro. Afiliado</Label>
                      <Input
                        value={editFormData.patientData?.nroAfiliado || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          patientData: { ...editFormData.patientData, nroAfiliado: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Plan</Label>
                      <Input
                        value={editFormData.patientData?.planNombre || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          patientData: { ...editFormData.patientData, planNombre: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Notas</Label>
                    <Textarea
                      value={editFormData.patientData?.notas || ''}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        patientData: { ...editFormData.patientData, notas: e.target.value }
                      })}
                      placeholder="Notas internas..."
                    />
                  </div>
                </div>
              )}

              {/* Campo de motivo opcional para otros roles */}
              {currentUser?.role !== 'APROBADOR' && (
                <div>
                  <Label>Motivo de la Edición (opcional)</Label>
                  <Textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Explica el motivo de la edición..."
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!editSuccessMessage && (
              <>
                <Button variant="outline" onClick={handleCloseEdit} disabled={editLoading}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={editLoading}>
                  {editLoading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
