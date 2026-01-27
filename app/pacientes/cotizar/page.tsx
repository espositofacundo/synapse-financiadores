"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Calculator, CheckCircle2, AlertCircle, Info, DollarSign, AlertTriangle } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import Link from "next/link"

const PATOLOGIAS_CRONICAS = [
  'Diabetes tipo 2',
  'Hipertensión',
  'EPOC',
  'Asma',
  'Cardiopatía',
  'Insuficiencia renal',
  'Obesidad',
  'Artritis',
  'Osteoporosis',
  'Depresión',
  'Ansiedad'
]

export default function CotizarPacientePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'quote' | 'results' | 'create'>('quote')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [quoteId, setQuoteId] = useState<string | null>(null)
  const [quoteResult, setQuoteResult] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [caseId, setCaseId] = useState<string | null>(null)
  
  // Datos de cotización
  const [quoteData, setQuoteData] = useState({
    edad: '',
    sexo: '',
    provincia: '',
    patologiasCronicas: [] as string[],
    medicamentosCronicos: '0',
    consultasTotales: '0',
    consultasGuardia: '0',
    internaciones: '0',
    especialidadesDistintas: '0',
    reconsultasRapidas: false,
    tasaNoEfectivas: '0',
    planNombre: '' // Para pricing config
  })
  
  // Datos del paciente (para crear después de cotizar)
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
    notas: '',
    esCronico: false,
    patologias: [] as string[]
  })

  const handleCalculateQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Si ya tenemos un quoteId (de un caso existente), actualizar la quote
      if (quoteId) {
        const res = await fetch(`/api/patient-quotes/${quoteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            edad: parseInt(quoteData.edad),
            sexo: quoteData.sexo,
            provincia: quoteData.provincia,
            patologiasCronicas: quoteData.patologiasCronicas,
            medicamentosCronicos: parseInt(quoteData.medicamentosCronicos),
            consultasTotales: parseInt(quoteData.consultasTotales),
            consultasGuardia: parseInt(quoteData.consultasGuardia),
            internaciones: parseInt(quoteData.internaciones),
            especialidadesDistintas: parseInt(quoteData.especialidadesDistintas),
            reconsultasRapidas: quoteData.reconsultasRapidas,
            tasaNoEfectivas: parseFloat(quoteData.tasaNoEfectivas) / 100,
            planNombre: quoteData.planNombre || patientData.planNombre || undefined
          })
        })

        const data = await res.json()

        if (res.ok) {
          setQuoteResult({ ...data.quote, status: data.quote.status || 'DRAFT' })
          setStep('results')
        } else {
          alert(`Error: ${data.error}`)
        }
      } else {
        // Crear nueva quote
        const res = await fetch('/api/patient-quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            edad: parseInt(quoteData.edad),
            sexo: quoteData.sexo,
            provincia: quoteData.provincia,
            patologiasCronicas: quoteData.patologiasCronicas,
            medicamentosCronicos: parseInt(quoteData.medicamentosCronicos),
            consultasTotales: parseInt(quoteData.consultasTotales),
            consultasGuardia: parseInt(quoteData.consultasGuardia),
            internaciones: parseInt(quoteData.internaciones),
            especialidadesDistintas: parseInt(quoteData.especialidadesDistintas),
            reconsultasRapidas: quoteData.reconsultasRapidas,
            tasaNoEfectivas: parseFloat(quoteData.tasaNoEfectivas) / 100,
            planNombre: quoteData.planNombre || patientData.planNombre || undefined
          })
        })

        const data = await res.json()

        if (res.ok) {
          setQuoteId(data.quote.id)
          // Asegurar que status esté presente
          setQuoteResult({ ...data.quote, status: data.quote.status || 'DRAFT' })
          setStep('results')
        } else {
          alert(`Error: ${data.error}`)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al calcular cotización')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quoteId) return

    setLoading(true)

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...patientData,
          quoteId,
          patologias: quoteData.patologiasCronicas,
          esCronico: quoteData.patologiasCronicas.length > 0
        })
      })

      const data = await res.json()

      if (res.ok) {
        if (data.duplicadosProbables && data.duplicadosProbables.length > 0) {
          const confirmar = confirm(
            `Se encontraron ${data.duplicadosProbables.length} pacientes similares. ¿Desea continuar de todos modos?`
          )
          if (!confirmar) {
            setLoading(false)
            return
          }
        }
        router.push(`/pacientes/${data.patient.id}`)
      } else {
        alert(`Error: ${data.error}`)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear paciente')
      setLoading(false)
    }
  }

  const togglePatologia = (patologia: string) => {
    setQuoteData(prev => ({
      ...prev,
      patologiasCronicas: prev.patologiasCronicas.includes(patologia)
        ? prev.patologiasCronicas.filter(p => p !== patologia)
        : [...prev.patologiasCronicas, patologia]
    }))
  }

  const getRiskColor = (level: string) => {
    if (level === 'alto') return 'bg-red-100 text-red-800 border-red-300'
    if (level === 'medio') return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-green-100 text-green-800 border-green-300'
  }

  const getConfidenceColor = (confidence: string) => {
    if (confidence === 'Alta') return 'text-green-600'
    if (confidence === 'Media') return 'text-yellow-600'
    return 'text-red-600'
  }

  // Cargar quote existente si viene caseId o quoteId en URL
  useEffect(() => {
    const loadExistingQuote = async () => {
      const urlCaseId = searchParams?.get('caseId')
      const urlQuoteId = searchParams?.get('quoteId')
      
      if (urlCaseId) {
        setCaseId(urlCaseId)
        // Cargar caso específico por ID (buscar en todos los casos)
        try {
          const caseRes = await fetch(`/api/onboarding-cases`)
          const caseData = await caseRes.json()
          const foundCase = caseData.cases?.find((c: any) => c.id === urlCaseId)
          
          if (foundCase?.quoteId) {
            const quoteRes = await fetch(`/api/patient-quotes/${foundCase.quoteId}`)
            if (quoteRes.ok) {
              const quoteData = await quoteRes.json()
              setQuoteId(quoteData.quote.id)
              // Prellenar el formulario con los inputs (ya vienen parseados del endpoint)
              if (quoteData.quote.inputs) {
                const inputs = typeof quoteData.quote.inputs === 'string' 
                  ? JSON.parse(quoteData.quote.inputs) 
                  : quoteData.quote.inputs
                
                setQuoteData(prev => ({
                  ...prev,
                  edad: inputs.edad?.toString() || '',
                  sexo: inputs.sexo || '',
                  provincia: inputs.provincia || '',
                  patologiasCronicas: inputs.patologiasCronicas || [],
                  medicamentosCronicos: inputs.medicamentosCronicos?.toString() || '0',
                  consultasTotales: inputs.consultasTotales?.toString() || '0',
                  consultasGuardia: inputs.consultasGuardia?.toString() || '0',
                  internaciones: inputs.internaciones?.toString() || '0',
                  especialidadesDistintas: inputs.especialidadesDistintas?.toString() || '0',
                  reconsultasRapidas: inputs.reconsultasRapidas || false,
                  tasaNoEfectivas: inputs.tasaNoEfectivas ? (inputs.tasaNoEfectivas * 100).toString() : '0',
                  planNombre: inputs.planNombre || ''
                }))
              }
              setQuoteResult(quoteData.quote)
              // Si la quote ya tiene datos calculados, mostrar resultados; si no, mostrar formulario
              if (quoteData.quote.riskScore > 0) {
                setStep('results')
              }
            }
          }
        } catch (error) {
          console.error('Error cargando caso:', error)
        }
      } else if (urlQuoteId) {
        setQuoteId(urlQuoteId)
        try {
          const quoteRes = await fetch(`/api/patient-quotes/${urlQuoteId}`)
          if (quoteRes.ok) {
            const quoteData = await quoteRes.json()
            // Prellenar formulario si hay inputs
            if (quoteData.quote.inputs) {
              const inputs = typeof quoteData.quote.inputs === 'string' 
                ? JSON.parse(quoteData.quote.inputs) 
                : quoteData.quote.inputs
              
              setQuoteData(prev => ({
                ...prev,
                edad: inputs.edad?.toString() || '',
                sexo: inputs.sexo || '',
                provincia: inputs.provincia || '',
                patologiasCronicas: inputs.patologiasCronicas || [],
                medicamentosCronicos: inputs.medicamentosCronicos?.toString() || '0',
                consultasTotales: inputs.consultasTotales?.toString() || '0',
                consultasGuardia: inputs.consultasGuardia?.toString() || '0',
                internaciones: inputs.internaciones?.toString() || '0',
                especialidadesDistintas: inputs.especialidadesDistintas?.toString() || '0',
                reconsultasRapidas: inputs.reconsultasRapidas || false,
                tasaNoEfectivas: inputs.tasaNoEfectivas ? (inputs.tasaNoEfectivas * 100).toString() : '0',
                planNombre: inputs.planNombre || ''
              }))
            }
            setQuoteResult(quoteData.quote)
            if (quoteData.quote.riskScore > 0) {
              setStep('results')
            }
          }
        } catch (error) {
          console.error('Error cargando quote:', error)
        }
      }
    }
    
    loadExistingQuote()
  }, [searchParams])

  // Cargar usuario actual
  useEffect(() => {
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
    fetchUser()
  }, [])

  // Paso 1: Formulario de cotización
  if (step === 'quote') {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/pacientes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Cotizar Paciente (Pre-Alta)</h1>
            <p className="text-muted-foreground">Complete los datos clínicos para obtener una evaluación de riesgo y costo</p>
          </div>
        </div>

        <form onSubmit={handleCalculateQuote}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Datos Demográficos */}
            <Card>
              <CardHeader>
                <CardTitle>Datos Demográficos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Edad *</Label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={quoteData.edad}
                    onChange={(e) => setQuoteData({ ...quoteData, edad: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Sexo *</Label>
                  <Select
                    value={quoteData.sexo}
                    onValueChange={(value) => setQuoteData({ ...quoteData, sexo: value })}
                    required
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
                <div>
                  <Label>Provincia</Label>
                  <Input
                    value={quoteData.provincia}
                    onChange={(e) => setQuoteData({ ...quoteData, provincia: e.target.value })}
                    placeholder="Ej: Buenos Aires, Córdoba"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Historia Clínica */}
            <Card>
              <CardHeader>
                <CardTitle>Historia Clínica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Patologías Crónicas</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {PATOLOGIAS_CRONICAS.map(pat => (
                      <div key={pat} className="flex items-center space-x-2">
                        <Checkbox
                          checked={quoteData.patologiasCronicas.includes(pat)}
                          onCheckedChange={() => togglePatologia(pat)}
                        />
                        <Label className="text-sm font-normal">{pat}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Cantidad de Medicamentos Crónicos</Label>
                  <Input
                    type="number"
                    min="0"
                    value={quoteData.medicamentosCronicos}
                    onChange={(e) => setQuoteData({ ...quoteData, medicamentosCronicos: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Uso Reciente (12 meses) */}
            <Card>
              <CardHeader>
                <CardTitle>Uso Reciente (Últimos 12 meses)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Consultas Totales</Label>
                  <Input
                    type="number"
                    min="0"
                    value={quoteData.consultasTotales}
                    onChange={(e) => setQuoteData({ ...quoteData, consultasTotales: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Consultas por Guardia</Label>
                  <Input
                    type="number"
                    min="0"
                    value={quoteData.consultasGuardia}
                    onChange={(e) => setQuoteData({ ...quoteData, consultasGuardia: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Internaciones</Label>
                  <Input
                    type="number"
                    min="0"
                    value={quoteData.internaciones}
                    onChange={(e) => setQuoteData({ ...quoteData, internaciones: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Especialidades Distintas</Label>
                  <Input
                    type="number"
                    min="0"
                    value={quoteData.especialidadesDistintas}
                    onChange={(e) => setQuoteData({ ...quoteData, especialidadesDistintas: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Señales Adicionales */}
            <Card>
              <CardHeader>
                <CardTitle>Señales Adicionales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={quoteData.reconsultasRapidas}
                    onCheckedChange={(checked) => setQuoteData({ ...quoteData, reconsultasRapidas: checked === true })}
                  />
                  <Label>Reconsultas &lt; 72h</Label>
                </div>
                <div>
                  <Label>Tasa de Consultas No Efectivas (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={quoteData.tasaNoEfectivas}
                    onChange={(e) => setQuoteData({ ...quoteData, tasaNoEfectivas: e.target.value })}
                    placeholder="Ej: 30"
                  />
                </div>
                <div>
                  <Label>Plan (opcional, para pricing)</Label>
                  <Input
                    value={quoteData.planNombre}
                    onChange={(e) => setQuoteData({ ...quoteData, planNombre: e.target.value })}
                    placeholder="Ej: Plan Premium, Plan Básico"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Link href="/pacientes">
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              <Calculator className="mr-2 h-4 w-4" />
              {loading ? 'Calculando...' : 'Calcular Riesgo y Costo'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  // Paso 2: Resultados de cotización
  if (step === 'results' && quoteResult) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setStep('quote')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Editar Cotización
          </Button>
          <h1 className="text-3xl font-bold">Resultados de Cotización</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Score */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <div className="text-5xl font-bold mb-2">{quoteResult.riskScore}</div>
                <Badge className={`${getRiskColor(quoteResult.riskLevel)} text-lg px-4 py-2`}>
                  {quoteResult.riskLevel.toUpperCase()}
                </Badge>
                {quoteResult.status && (
                  <div className="mt-2">
                    <Badge 
                      className={
                        quoteResult.status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-300' :
                        quoteResult.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-300' :
                        quoteResult.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                        'bg-gray-100 text-gray-800 border-gray-300'
                      }
                    >
                      {quoteResult.status}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Costo Esperado */}
          <Card>
            <CardHeader>
              <CardTitle>Costo Esperado (12 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-muted-foreground">Escenario Base</div>
                  <div className="text-2xl font-bold">${quoteResult.expectedCost12m.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Escenario Alto (P95)</div>
                  <div className="text-xl font-semibold text-orange-600">${quoteResult.expectedCostP95.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categoría y Factor */}
          <Card>
            <CardHeader>
              <CardTitle>Recomendación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-muted-foreground">Categoría</div>
                  <div className="text-lg font-semibold">{quoteResult.priceCategory}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Factor de Riesgo</div>
                  <div className="text-2xl font-bold">{quoteResult.riskFactor}x</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Confianza</div>
                  <div className={`text-lg font-semibold ${getConfidenceColor(quoteResult.confidence)}`}>
                    {quoteResult.confidence}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Precio Sugerido del Plan */}
        {quoteResult.pricing && (
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Precio Sugerido del Plan (Mensual)
              </CardTitle>
              <CardDescription>
                Basado en costo esperado, confianza y configuración de pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Precio Principal */}
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Precio Mensual Sugerido</div>
                <div className="text-4xl font-bold text-blue-700">
                  ${quoteResult.pricing.suggestedPriceMonthly.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Rango: ${quoteResult.pricing.range.min.toLocaleString()} - ${quoteResult.pricing.range.max.toLocaleString()}
                </div>
              </div>

              {/* Warnings */}
              {(quoteResult.pricing.flags.clamped || quoteResult.pricing.flags.lowConfidence) && (
                <div className="space-y-2">
                  {quoteResult.pricing.flags.clamped && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-semibold text-yellow-800">Precio ajustado por límites</div>
                        <div className="text-yellow-700">
                          El precio calculado fue ajustado a los límites mínimo/máximo configurados.
                        </div>
                      </div>
                    </div>
                  )}
                  {quoteResult.pricing.flags.lowConfidence && (
                    <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                      <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-semibold text-orange-800">Confianza baja</div>
                        <div className="text-orange-700">
                          El precio incluye un recargo por baja confianza en los datos ingresados.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Breakdown Accordion */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="breakdown">
                  <AccordionTrigger className="text-sm font-medium">
                    Ver desglose del cálculo
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">Costo base mensual</span>
                        <span className="font-medium">${quoteResult.pricing.breakdown.baseCost.toLocaleString()}</span>
                      </div>
                      {quoteResult.pricing.breakdown.p95Adjustment !== 0 && (
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-muted-foreground">Ajuste por escenario P95</span>
                          <span className="font-medium text-orange-600">
                            {quoteResult.pricing.breakdown.p95Adjustment > 0 ? '+' : ''}
                            ${quoteResult.pricing.breakdown.p95Adjustment.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">Costo combinado</span>
                        <span className="font-medium">${quoteResult.pricing.breakdown.blendedCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">Carga administrativa</span>
                        <span className="font-medium">${quoteResult.pricing.breakdown.adminLoad.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">Margen</span>
                        <span className="font-medium">${quoteResult.pricing.breakdown.margin.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-sm text-muted-foreground">Pooling de riesgo</span>
                        <span className="font-medium">${quoteResult.pricing.breakdown.riskPooling.toLocaleString()}</span>
                      </div>
                      {quoteResult.pricing.breakdown.confidenceSurcharge > 0 && (
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="text-sm text-muted-foreground">Recargo por baja confianza</span>
                          <span className="font-medium text-orange-600">
                            +${quoteResult.pricing.breakdown.confidenceSurcharge.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2 border-b-2 border-blue-200 font-semibold">
                        <span>Subtotal</span>
                        <span>${quoteResult.pricing.breakdown.subtotal.toLocaleString()}</span>
                      </div>
                      {quoteResult.pricing.breakdown.clamped && (
                        <div className="flex justify-between items-center py-2 text-yellow-700">
                          <span className="text-sm">Ajuste por límites (min/max)</span>
                          <span className="font-medium">
                            ${quoteResult.pricing.breakdown.subtotal.toLocaleString()} → ${quoteResult.pricing.breakdown.finalPrice.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2 bg-blue-50 rounded-md px-3 font-bold text-lg">
                        <span>Precio Final Mensual</span>
                        <span className="text-blue-700">${quoteResult.pricing.breakdown.finalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Explicaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Por qué se calculó este valor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {quoteResult.reasons.map((reason: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-1 text-green-600 flex-shrink-0" />
                  <span className="text-sm">{reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setStep('quote')}>
            Editar y Recalcular
          </Button>
          
          {/* Botón "Enviar a aprobación" solo para COTIZADOR y si status es DRAFT */}
          {currentUser?.role === 'COTIZADOR' && quoteResult.status === 'DRAFT' && (
            <Button
              variant="default"
              onClick={async () => {
                if (!quoteId) return
                setSubmitting(true)
                try {
                  const res = await fetch(`/api/patient-quotes/${quoteId}/submit`, {
                    method: 'POST'
                  })
                  if (res.ok) {
                    // Recargar quote para actualizar status
                    const quoteRes = await fetch(`/api/patient-quotes/${quoteId}`)
                    if (quoteRes.ok) {
                      const quoteData = await quoteRes.json()
                      setQuoteResult(quoteData.quote)
                    }
                  } else {
                    const data = await res.json()
                    alert(`Error: ${data.error}`)
                  }
                } catch (error) {
                  alert('Error al enviar cotización')
                } finally {
                  setSubmitting(false)
                }
              }}
              disabled={submitting}
            >
              {submitting ? 'Enviando...' : 'Enviar a Aprobación'}
            </Button>
          )}
          
          {/* Botones de Aprobar/Rechazar para APROBADOR/ADMIN si status es SUBMITTED */}
          {currentUser && (currentUser.role === 'APROBADOR' || currentUser.role === 'ADMIN') && quoteResult.status === 'SUBMITTED' && (
            <>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!quoteId) return
                  const reason = prompt('Motivo de rechazo:')
                  if (!reason) return
                  try {
                    const res = await fetch(`/api/patient-quotes/${quoteId}/reject`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reason })
                    })
                    if (res.ok) {
                      const quoteRes = await fetch(`/api/patient-quotes/${quoteId}`)
                      if (quoteRes.ok) {
                        const quoteData = await quoteRes.json()
                        setQuoteResult(quoteData.quote)
                      }
                    } else {
                      const data = await res.json()
                      alert(`Error: ${data.error}`)
                    }
                  } catch (error) {
                    alert('Error al rechazar cotización')
                  }
                }}
              >
                Rechazar
              </Button>
              <Button
                onClick={async () => {
                  if (!quoteId) return
                  try {
                    const res = await fetch(`/api/patient-quotes/${quoteId}/approve`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ reason: 'Aprobado' })
                    })
                    if (res.ok) {
                      const quoteRes = await fetch(`/api/patient-quotes/${quoteId}`)
                      if (quoteRes.ok) {
                        const quoteData = await quoteRes.json()
                        setQuoteResult(quoteData.quote)
                      }
                    } else {
                      const data = await res.json()
                      alert(`Error: ${data.error}`)
                    }
                  } catch (error) {
                    alert('Error al aprobar cotización')
                  }
                }}
              >
                Aprobar
              </Button>
            </>
          )}
          
          {/* Mostrar mensaje si está APPROVED pero no es OFICINA */}
          {quoteResult.status === 'APPROVED' && currentUser && currentUser.role !== 'OFICINA' && currentUser.role !== 'ADMIN' && (
            <div className="text-sm text-muted-foreground">
              Esta cotización está aprobada. El personal de OFICINA completará el alta del paciente.
            </div>
          )}
        </div>
      </div>
    )
  }

  // Paso 3: Crear paciente
  if (step === 'create') {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setStep('results')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Resultados
          </Button>
          <h1 className="text-3xl font-bold">Completar Datos del Paciente</h1>
        </div>

        <form onSubmit={handleCreatePatient}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      value={patientData.sexo || quoteData.sexo}
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
                      value={patientData.provincia || quoteData.provincia}
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

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => setStep('results')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Paciente'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return null
}
