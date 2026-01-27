"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ArrowLeft, Edit, RefreshCw } from "lucide-react"
import Link from "next/link"

interface PatientDetail {
  id: string
  tipoDoc: string
  nroDoc: string
  nombre: string
  apellido: string
  fechaNac: string
  sexo: string | null
  telefono: string | null
  email: string | null
  localidad: string | null
  provincia: string | null
  nroAfiliado: string
  planNombre: string | null
  estadoCobertura: string
  riskScore: number
  riskLevel: string
  riskReasons: Array<{
    ruleId: string
    label: string
    details: string
    value: number | string
    threshold: number | string
  }>
  esCronico: boolean
  tags: string[]
  patologias: string[]
  notas: string | null
  consultas: Array<{
    id: string
    fecha: string
    especialidad: string
    canal: string
    costo: number
    riskScore: number
    riskLevel: string
    prestador: {
      nombre: string
    }
  }>
  riskHistory: Array<{
    riskScore: number
    riskLevel: string
    calculatedAt: string
  }>
  estadisticas: {
    consultas30d: number
    costo30d: number
    consultas7d: number
    totalConsultas: number
  }
}

export default function PatientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [patient, setPatient] = useState<PatientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalculando, setRecalculando] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchPatient()
    }
  }, [params.id])

  const fetchPatient = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/patients/${params.id}`)
      const data = await res.json()
      setPatient(data)
    } catch (error) {
      console.error('Error fetching patient:', error)
    } finally {
      setLoading(false)
    }
  }

  const recalcularRiesgo = async () => {
    setRecalculando(true)
    try {
      await fetch(`/api/patients/${params.id}/risk`, { method: 'POST' })
      await fetchPatient()
    } catch (error) {
      console.error('Error recalculando riesgo:', error)
    } finally {
      setRecalculando(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando...</div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Paciente no encontrado</div>
      </div>
    )
  }

  const getRiskBadgeVariant = (level: string) => {
    if (level === 'alto') return 'destructive'
    if (level === 'medio') return 'warning'
    return 'secondary'
  }

  const edad = Math.floor((new Date().getTime() - new Date(patient.fechaNac).getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/pacientes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{patient.nombre} {patient.apellido}</h1>
            <p className="text-muted-foreground">
              {patient.tipoDoc} {patient.nroDoc} • {edad} años • Afiliado: {patient.nroAfiliado}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={recalcularRiesgo} disabled={recalculando}>
            <RefreshCw className={`mr-2 h-4 w-4 ${recalculando ? 'animate-spin' : ''}`} />
            Recalcular Riesgo
          </Button>
          <Link href={`/pacientes/${patient.id}/editar`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos Personales */}
          <Card>
            <CardHeader>
              <CardTitle>Datos Personales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Nombre completo</span>
                  <p className="font-medium">{patient.nombre} {patient.apellido}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Fecha de nacimiento</span>
                  <p className="font-medium">{format(new Date(patient.fechaNac), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Documento</span>
                  <p className="font-medium">{patient.tipoDoc} {patient.nroDoc}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Sexo</span>
                  <p className="font-medium">{patient.sexo || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Teléfono</span>
                  <p className="font-medium">{patient.telefono || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Email</span>
                  <p className="font-medium">{patient.email || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Localidad</span>
                  <p className="font-medium">{patient.localidad || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Provincia</span>
                  <p className="font-medium">{patient.provincia || '-'}</p>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Número de afiliado</span>
                  <p className="font-medium">{patient.nroAfiliado}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <p className="font-medium">{patient.planNombre || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Estado</span>
                  <Badge variant={patient.estadoCobertura === 'activa' ? 'success' : 'secondary'}>
                    {patient.estadoCobertura}
                  </Badge>
                </div>
                {patient.esCronico && (
                  <div>
                    <span className="text-sm text-muted-foreground">Tipo</span>
                    <Badge variant="outline">Paciente Crónico</Badge>
                  </div>
                )}
              </div>
              {patient.patologias && patient.patologias.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Patologías</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {patient.patologias.map((pat, idx) => (
                      <Badge key={idx} variant="outline">{pat}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {patient.tags && patient.tags.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Tags</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {patient.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline de Consultas */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Consultas</CardTitle>
              <CardDescription>
                {patient.estadisticas.totalConsultas} consultas totales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patient.consultas.slice(0, 10).map((consulta) => (
                  <div key={consulta.id} className="flex items-start gap-4 p-3 border rounded-md">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{consulta.especialidad}</p>
                        <Badge variant="outline">{consulta.canal}</Badge>
                        {consulta.riskLevel !== 'bajo' && (
                          <Badge variant={getRiskBadgeVariant(consulta.riskLevel)}>
                            {consulta.riskLevel}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(consulta.fecha), 'dd/MM/yyyy HH:mm')} • {consulta.prestador.nombre}
                      </p>
                      <p className="text-sm font-medium">${consulta.costo.toLocaleString()}</p>
                    </div>
                    <Link href={`/consultas/${consulta.id}`}>
                      <Button variant="outline" size="sm">Ver</Button>
                    </Link>
                  </div>
                ))}
                {patient.consultas.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Mostrando las últimas 10 de {patient.consultas.length} consultas
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Riesgo y Estadísticas */}
        <div className="space-y-6">
          {/* Riesgo */}
          <Card>
            <CardHeader>
              <CardTitle>Clasificación de Riesgo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Nivel de Riesgo</span>
                <div className="mt-1">
                  <Badge variant={getRiskBadgeVariant(patient.riskLevel)} className="text-lg px-3 py-1">
                    {patient.riskLevel.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Risk Score</span>
                <p className="font-medium text-2xl">{patient.riskScore}/100</p>
              </div>
              {patient.riskReasons.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Motivos del Riesgo</span>
                  <div className="mt-2 space-y-2">
                    {patient.riskReasons.map((reason, idx) => (
                      <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="font-medium text-sm">{reason.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{reason.details}</p>
                        <p className="text-xs mt-1">
                          Valor: <strong>{reason.value}</strong> | Umbral: <strong>{reason.threshold}</strong>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estadísticas */}
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Consultas últimos 7 días</span>
                <p className="font-medium text-xl">{patient.estadisticas.consultas7d}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Consultas últimos 30 días</span>
                <p className="font-medium text-xl">{patient.estadisticas.consultas30d}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Costo últimos 30 días</span>
                <p className="font-medium text-xl">${patient.estadisticas.costo30d.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Total consultas</span>
                <p className="font-medium text-xl">{patient.estadisticas.totalConsultas}</p>
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          {patient.notas && (
            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{patient.notas}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
