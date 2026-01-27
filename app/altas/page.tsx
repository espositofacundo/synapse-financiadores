"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertCircle, UserPlus, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Quote {
  id: string
  riskScore: number
  riskLevel: string
  expectedCost12m: number
  expectedCostP95: number
  suggestedPriceMonthly: number | null
  priceRangeMin: number | null
  priceRangeMax: number | null
  status: string
  createdAt: string
  patientId?: string | null
  createdBy: {
    id: string
    name: string
    email: string
  } | null
  approvedBy: {
    id: string
    name: string
    email: string
  } | null
  inputs: any
}

export default function AltasPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  
  const [patientData, setPatientData] = useState({
    tipoDoc: 'DNI',
    nroDoc: '',
    nombre: '',
    apellido: '',
    fechaNac: '',
    sexo: '',
    telefono: '',
    email: '',
    localidad: '',
    provincia: '',
    canalPreferido: '',
    planNombre: '',
    nroAfiliado: '',
    estadoCobertura: 'activa',
    notas: ''
  })

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/patient-quotes?status=APPROVED')
      const data = await res.json()

      if (res.ok) {
        // Filtrar solo las que no tienen patientId (el backend ya debería hacerlo, pero por seguridad)
        setQuotes((data.quotes || []).filter((q: any) => !q.patientId))
      } else {
        setError(data.error || 'Error al cargar cotizaciones')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error al cargar cotizaciones')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (quote: Quote) => {
    setSelectedQuote(quote)
    // Prellenar datos desde inputs de la cotización
    if (quote.inputs) {
      setPatientData(prev => ({
        ...prev,
        sexo: quote.inputs.sexo || prev.sexo,
        provincia: quote.inputs.provincia || prev.provincia
      }))
    }
    setDialogOpen(true)
  }

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedQuote) return

    setCreating(true)

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...patientData,
          quoteId: selectedQuote.id,
          patologias: selectedQuote.inputs?.patologiasCronicas || [],
          esCronico: (selectedQuote.inputs?.patologiasCronicas || []).length > 0
        })
      })

      const data = await res.json()

      if (res.ok) {
        if (data.duplicadosProbables && data.duplicadosProbables.length > 0) {
          const confirmar = confirm(
            `Se encontraron ${data.duplicadosProbables.length} pacientes similares. ¿Desea continuar de todos modos?`
          )
          if (!confirmar) {
            setCreating(false)
            return
          }
        }
        setDialogOpen(false)
        setSelectedQuote(null)
        fetchQuotes()
        router.push(`/pacientes/${data.patient.id}`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear paciente')
    } finally {
      setCreating(false)
    }
  }

  const getRiskColor = (level: string) => {
    if (level === 'alto') return 'text-red-600'
    if (level === 'medio') return 'text-yellow-600'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando cotizaciones aprobadas...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Altas de Pacientes</h1>
          <p className="text-muted-foreground mt-1">
            Completar alta administrativa de pacientes con cotizaciones aprobadas
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {quotes.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No hay cotizaciones aprobadas pendientes de alta
          </CardContent>
        </Card>
      )}

      {quotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cotizaciones Aprobadas ({quotes.length})</CardTitle>
            <CardDescription>
              Cotizaciones aprobadas pendientes de completar el alta del paciente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Creada por</TableHead>
                  <TableHead>Aprobada por</TableHead>
                  <TableHead>Fecha Aprobación</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Precio Sugerido</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-mono text-xs">{quote.id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      {quote.createdBy ? (
                        <div>
                          <div className="font-medium">{quote.createdBy.name}</div>
                          <div className="text-xs text-muted-foreground">{quote.createdBy.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {quote.approvedBy ? (
                        <div>
                          <div className="font-medium">{quote.approvedBy.name}</div>
                          <div className="text-xs text-muted-foreground">{quote.approvedBy.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(quote.createdAt), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${getRiskColor(quote.riskLevel)}`}>
                          {quote.riskScore}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {quote.riskLevel.toUpperCase()}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {quote.suggestedPriceMonthly ? (
                        <div>
                          <div className="font-semibold">
                            ${quote.suggestedPriceMonthly.toLocaleString()}
                          </div>
                          {quote.priceRangeMin && quote.priceRangeMax && (
                            <div className="text-xs text-muted-foreground">
                              ${quote.priceRangeMin.toLocaleString()} - ${quote.priceRangeMax.toLocaleString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleOpenDialog(quote)}
                        className="gap-1"
                      >
                        <UserPlus className="h-4 w-4" />
                        Completar Alta
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog para completar alta */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completar Alta de Paciente</DialogTitle>
            <DialogDescription>
              Complete los datos administrativos del paciente para finalizar el alta
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePatient}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
              {/* Datos Personales */}
              <Card>
                <CardHeader>
                  <CardTitle>Datos Personales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo Documento</Label>
                      <Select
                        value={patientData.tipoDoc}
                        onValueChange={(value) => setPatientData({ ...patientData, tipoDoc: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DNI">DNI</SelectItem>
                          <SelectItem value="LC">LC</SelectItem>
                          <SelectItem value="LE">LE</SelectItem>
                          <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Número Documento *</Label>
                      <Input
                        value={patientData.nroDoc}
                        onChange={(e) => setPatientData({ ...patientData, nroDoc: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Nombre *</Label>
                    <Input
                      value={patientData.nombre}
                      onChange={(e) => setPatientData({ ...patientData, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Apellido *</Label>
                    <Input
                      value={patientData.apellido}
                      onChange={(e) => setPatientData({ ...patientData, apellido: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fecha de Nacimiento *</Label>
                      <Input
                        type="date"
                        value={patientData.fechaNac}
                        onChange={(e) => setPatientData({ ...patientData, fechaNac: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Sexo</Label>
                      <Select
                        value={patientData.sexo || selectedQuote?.inputs?.sexo}
                        onValueChange={(value) => setPatientData({ ...patientData, sexo: value })}
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
                    <Label>Teléfono</Label>
                    <Input
                      type="tel"
                      value={patientData.telefono}
                      onChange={(e) => setPatientData({ ...patientData, telefono: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={patientData.email}
                      onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Localidad</Label>
                      <Input
                        value={patientData.localidad}
                        onChange={(e) => setPatientData({ ...patientData, localidad: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Provincia</Label>
                      <Input
                        value={patientData.provincia || selectedQuote?.inputs?.provincia}
                        onChange={(e) => setPatientData({ ...patientData, provincia: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cobertura */}
              <Card>
                <CardHeader>
                  <CardTitle>Cobertura</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Número de Afiliado *</Label>
                    <Input
                      value={patientData.nroAfiliado}
                      onChange={(e) => setPatientData({ ...patientData, nroAfiliado: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Plan</Label>
                    <Input
                      value={patientData.planNombre}
                      onChange={(e) => setPatientData({ ...patientData, planNombre: e.target.value })}
                      placeholder="Ej: Plan Básico, Plan Premium"
                    />
                  </div>
                  <div>
                    <Label>Estado de Cobertura</Label>
                    <Select
                      value={patientData.estadoCobertura}
                      onValueChange={(value) => setPatientData({ ...patientData, estadoCobertura: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activa">Activa</SelectItem>
                        <SelectItem value="pausada">Pausada</SelectItem>
                        <SelectItem value="baja">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Canal Preferido</Label>
                    <Select
                      value={patientData.canalPreferido}
                      onValueChange={(value) => setPatientData({ ...patientData, canalPreferido: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guardia">Guardia</SelectItem>
                        <SelectItem value="programada">Programada</SelectItem>
                        <SelectItem value="telemedicina">Telemedicina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notas</Label>
                    <textarea
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={patientData.notas}
                      onChange={(e) => setPatientData({ ...patientData, notas: e.target.value })}
                      placeholder="Notas internas sobre el paciente..."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creando...' : 'Crear Paciente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
