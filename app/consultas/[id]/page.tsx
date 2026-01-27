"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface ConsultaDetalle {
  id: string
  fecha: string
  especialidad: string
  canal: string
  costo: number
  duracion: number
  efectiva: boolean
  motivoNoEfectiva: string | null
  diagnostico: string | null
  motivoConsulta: string | null
  deriva: boolean
  tipoDerivacion: string | null
  prestadorDerivado: string | null
  riskScore: number
  riskLevel: string
  triggeredRules: Array<{
    ruleId: string
    label: string
    details: string
    value: number | string
    threshold: number | string
  }>
  trazabilidad: Array<{
    evento: string
    fecha: string
    usuario: string
  }>
  resumenClinico: string | null
  afiliado: {
    id: string
    nombre: string
    apellido: string
    dni: string
    edad: number
  }
  prestador: {
    id: string
    nombre: string
    matricula: string
  }
  financiador: {
    id: string
    nombre: string
  }
}

export default function ConsultaDetallePage() {
  const params = useParams()
  const [consulta, setConsulta] = useState<ConsultaDetalle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchConsulta()
    }
  }, [params.id])

  const fetchConsulta = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/consultas/${params.id}`)
      const data = await res.json()
      setConsulta(data)
    } catch (error) {
      console.error('Error fetching consulta:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando...</div>
      </div>
    )
  }

  if (!consulta) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Consulta no encontrada</div>
      </div>
    )
  }

  const getRiskBadgeVariant = (level: string) => {
    if (level === 'alto') return 'destructive'
    if (level === 'medio') return 'warning'
    return 'secondary'
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/auditoria">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Detalle de Consulta</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información General */}
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Fecha y Hora:</span>
              <p className="font-medium">
                {format(new Date(consulta.fecha), "dd/MM/yyyy 'a las' HH:mm")}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Especialidad:</span>
              <p className="font-medium">{consulta.especialidad}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Canal:</span>
              <p className="font-medium">{consulta.canal}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Duración:</span>
              <p className="font-medium">{consulta.duracion} minutos</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Costo:</span>
              <p className="font-medium text-lg">${consulta.costo.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Efectiva:</span>
              <div className="mt-1">
                <Badge variant={consulta.efectiva ? "success" : "destructive"}>
                  {consulta.efectiva ? "Sí" : "No"}
                </Badge>
                {!consulta.efectiva && consulta.motivoNoEfectiva && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Motivo: {consulta.motivoNoEfectiva}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Riesgo y Auditoría */}
        <Card>
          <CardHeader>
            <CardTitle>Riesgo y Auditoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Nivel de Riesgo:</span>
              <div className="mt-1">
                <Badge variant={getRiskBadgeVariant(consulta.riskLevel)} className="text-lg px-3 py-1">
                  {consulta.riskLevel.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Risk Score:</span>
              <p className="font-medium text-2xl">{consulta.riskScore}/100</p>
            </div>
            {consulta.triggeredRules.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Reglas Disparadas:</span>
                <div className="mt-2 space-y-2">
                  {consulta.triggeredRules.map((rule, idx) => (
                    <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="font-medium text-sm">{rule.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rule.details}</p>
                      <p className="text-xs mt-1">
                        Valor: <strong>{rule.value}</strong> | Umbral: <strong>{rule.threshold}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Datos del Afiliado */}
        <Card>
          <CardHeader>
            <CardTitle>Datos del Afiliado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Nombre:</span>
              <p className="font-medium">{consulta.afiliado.nombre} {consulta.afiliado.apellido}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">DNI (anonimizado):</span>
              <p className="font-medium">{consulta.afiliado.dni}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Edad:</span>
              <p className="font-medium">{consulta.afiliado.edad} años</p>
            </div>
          </CardContent>
        </Card>

        {/* Datos del Prestador */}
        <Card>
          <CardHeader>
            <CardTitle>Datos del Prestador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Nombre:</span>
              <p className="font-medium">{consulta.prestador.nombre}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Matrícula:</span>
              <p className="font-medium">{consulta.prestador.matricula}</p>
            </div>
          </CardContent>
        </Card>

        {/* Resumen Clínico */}
        {consulta.resumenClinico && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Resumen Clínico</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{consulta.resumenClinico}</p>
              {consulta.motivoConsulta && (
                <div className="mt-4">
                  <span className="text-sm text-muted-foreground">Motivo de Consulta:</span>
                  <p className="font-medium">{consulta.motivoConsulta}</p>
                </div>
              )}
              {consulta.diagnostico && (
                <div className="mt-4">
                  <span className="text-sm text-muted-foreground">Diagnóstico:</span>
                  <p className="font-medium">{consulta.diagnostico}</p>
                </div>
              )}
              {consulta.deriva && (
                <div className="mt-4">
                  <span className="text-sm text-muted-foreground">Derivación:</span>
                  <p className="font-medium">
                    {consulta.tipoDerivacion || 'Derivación realizada'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Trazabilidad */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Trazabilidad</CardTitle>
            <CardDescription>Historial de eventos de la consulta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {consulta.trazabilidad.map((evento, idx) => (
                <div key={idx} className="flex items-start gap-4 p-3 border rounded-md">
                  <div className="flex-1">
                    <p className="font-medium">{evento.evento}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(evento.fecha), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  <div>
                    <Badge variant="outline">{evento.usuario}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
