"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { format, subDays } from "date-fns"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AuditoriaRules } from "@/lib/auditoria"

interface Consulta {
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
  riskScore: number
  riskLevel: string
  triggeredRules: Array<{
    ruleId: string
    label: string
    details: string
    value: number | string
    threshold: number | string
  }>
  afiliado: {
    id: string
    nombre: string
    dni: string
    edad: number
  }
  prestador: {
    id: string
    nombre: string
    matricula: string
  }
}

const especialidades = ['clínica', 'pediatría', 'gineco', 'cardio', 'traumatología', 'psiquiatría']
const canales = ['guardia', 'programada', 'telemedicina']
const nivelesRiesgo = ['bajo', 'medio', 'alto']

export default function AuditoriaPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rules, setRules] = useState<AuditoriaRules | null>(null)
  const [filters, setFilters] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    especialidad: 'all',
    canal: 'all',
    riesgo: 'all'
  })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchRules()
    fetchConsultas()
  }, [filters, page])

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/rules')
      const data = await res.json()
      setRules(data)
    } catch (error) {
      console.error('Error fetching rules:', error)
    }
  }

  const fetchConsultas = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      })
      if (filters.from) params.append('from', filters.from)
      if (filters.to) params.append('to', filters.to)
      if (filters.especialidad && filters.especialidad !== 'all') params.append('especialidad', filters.especialidad)
      if (filters.canal && filters.canal !== 'all') params.append('canal', filters.canal)
      if (filters.riesgo && filters.riesgo !== 'all') params.append('riesgo', filters.riesgo)

      const res = await fetch(`/api/consultas?${params}`)
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`)
      }
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setConsultas([])
      } else {
        setError(null)
        setConsultas(data.consultas || [])
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (error: any) {
      console.error('Error fetching consultas:', error)
      setError(error.message || 'Error al cargar consultas')
      setConsultas([]) // Asegurar que siempre sea un array
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const saveRules = async (newRules: AuditoriaRules) => {
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRules)
      })
      if (res.ok) {
        setRules(newRules)
        // Recalcular auditoría
        await fetch('/api/auditoria', { method: 'POST' })
        fetchConsultas()
      }
    } catch (error) {
      console.error('Error saving rules:', error)
    }
  }

  const getRiskBadgeVariant = (level: string) => {
    if (level === 'alto') return 'destructive'
    if (level === 'medio') return 'warning'
    return 'secondary'
  }

  if (loading && (!consultas || consultas.length === 0)) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Auditoría de Consultas</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Configurar Reglas</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configurar Reglas de Auditoría</DialogTitle>
              <DialogDescription>
                Ajusta los parámetros de las reglas de auditoría. Los cambios se aplicarán a todas las consultas.
              </DialogDescription>
            </DialogHeader>
            {rules && (
              <Tabs defaultValue="general" className="w-full">
                <TabsList>
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="costos">Costos</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="space-y-4">
                  <div>
                    <Label>Máximo consultas por afiliado en 7 días</Label>
                    <Input
                      type="number"
                      value={rules.maxConsultasPorAfiliadoEn7d}
                      onChange={(e) => setRules({
                        ...rules,
                        maxConsultasPorAfiliadoEn7d: parseInt(e.target.value) || 3
                      })}
                    />
                  </div>
                  <div>
                    <Label>Duración mínima de consulta (minutos)</Label>
                    <Input
                      type="number"
                      value={rules.flagSiDuracionMin}
                      onChange={(e) => setRules({
                        ...rules,
                        flagSiDuracionMin: parseInt(e.target.value) || 3
                      })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rules.flagSiNoHayDiagnostico}
                      onChange={(e) => setRules({
                        ...rules,
                        flagSiNoHayDiagnostico: e.target.checked
                      })}
                    />
                    <Label>Alertar si no hay diagnóstico</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rules.flagSiDerivaSiempreMismoPrestador}
                      onChange={(e) => setRules({
                        ...rules,
                        flagSiDerivaSiempreMismoPrestador: e.target.checked
                      })}
                    />
                    <Label>Detectar patrón de derivación repetida</Label>
                  </div>
                </TabsContent>
                <TabsContent value="costos" className="space-y-4">
                  {Object.entries(rules.maxCostoPorConsultaPorEspecialidad).map(([esp, costo]) => (
                    <div key={esp}>
                      <Label>Costo máximo - {esp}</Label>
                      <Input
                        type="number"
                        value={costo}
                        onChange={(e) => setRules({
                          ...rules,
                          maxCostoPorConsultaPorEspecialidad: {
                            ...rules.maxCostoPorConsultaPorEspecialidad,
                            [esp]: parseInt(e.target.value) || 0
                          }
                        })}
                      />
                    </div>
                  ))}
                </TabsContent>
                <div className="flex justify-end gap-2 pt-4">
                  <Button onClick={() => saveRules(rules)}>Guardar y Recalcular</Button>
                </div>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Desde</Label>
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => {
                  setFilters({ ...filters, from: e.target.value })
                  setPage(1)
                }}
              />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => {
                  setFilters({ ...filters, to: e.target.value })
                  setPage(1)
                }}
              />
            </div>
            <div>
              <Label>Especialidad</Label>
              <Select
                value={filters.especialidad || 'all'}
                onValueChange={(value) => {
                  setFilters({ ...filters, especialidad: value })
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {especialidades.map(esp => (
                    <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Canal</Label>
              <Select
                value={filters.canal || 'all'}
                onValueChange={(value) => {
                  setFilters({ ...filters, canal: value })
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {canales.map(canal => (
                    <SelectItem key={canal} value={canal}>{canal}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Riesgo</Label>
              <Select
                value={filters.riesgo || 'all'}
                onValueChange={(value) => {
                  setFilters({ ...filters, riesgo: value })
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {nivelesRiesgo.map(nivel => (
                    <SelectItem key={nivel} value={nivel}>{nivel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Consultas</CardTitle>
          <CardDescription>
            {consultas?.length || 0} consultas encontradas
            {error && <span className="text-red-600 ml-2">({error})</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Riesgo</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Efectiva</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultas && consultas.length > 0 ? consultas.map((consulta) => (
                <TableRow key={consulta.id}>
                  <TableCell>
                    {format(new Date(consulta.fecha), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>{consulta.especialidad}</TableCell>
                  <TableCell>{consulta.canal}</TableCell>
                  <TableCell>${consulta.costo.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={getRiskBadgeVariant(consulta.riskLevel)}>
                      {consulta.riskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>{consulta.riskScore}</TableCell>
                  <TableCell>
                    <Badge variant={consulta.efectiva ? "success" : "destructive"}>
                      {consulta.efectiva ? "Sí" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/consultas/${consulta.id}`}>
                      <Button variant="outline" size="sm">Ver Detalle</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No se encontraron consultas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="flex items-center px-4">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
