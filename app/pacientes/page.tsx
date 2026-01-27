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
import { format } from "date-fns"
import Link from "next/link"
import { Plus, Search, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Patient {
  id: string
  tipoDoc: string
  nroDoc: string
  nombre: string
  apellido: string
  fechaNac: string
  nroAfiliado: string
  planNombre: string | null
  estadoCobertura: string
  riskScore: number
  riskLevel: string
  riskReasons: Array<{
    ruleId: string
    label: string
    details: string
  }>
  ultimaConsulta: string | null
  totalConsultas: number
  consultas30d: number
  costo30d: number
  esCronico: boolean
  tags: string[]
}

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({
    plan: "all",
    estado: "all",
    riesgo: "all"
  })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchPatients()
  }, [search, filters, page])

  const fetchPatients = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      })
      if (search) params.append('search', search)
      if (filters.plan && filters.plan !== 'all') params.append('plan', filters.plan)
      if (filters.estado && filters.estado !== 'all') params.append('estado', filters.estado)
      if (filters.riesgo && filters.riesgo !== 'all') params.append('riesgo', filters.riesgo)

      const res = await fetch(`/api/patients?${params}`)
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`)
      }
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setPatients([])
      } else {
        setError(null)
        setPatients(data.patients || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (error: any) {
      console.error('Error fetching patients:', error)
      setError(error.message || 'Error al cargar pacientes')
      setPatients([])
      setTotalPages(1)
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const getRiskBadgeVariant = (level: string) => {
    if (level === 'alto') return 'destructive'
    if (level === 'medio') return 'warning'
    return 'secondary'
  }

  const getRiskColor = (level: string) => {
    if (level === 'alto') return 'text-red-600'
    if (level === 'medio') return 'text-yellow-600'
    return 'text-green-600'
  }

  if (loading && (!patients || patients.length === 0)) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Pacientes</h1>
        <div className="flex gap-2">
          <Link href="/pacientes/importar">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
          </Link>
          <Link href="/pacientes/cotizar">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Paciente
            </Button>
          </Link>
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Búsqueda y Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Documento, afiliado, nombre..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Plan</Label>
              <Select
                value={filters.plan || 'all'}
                onValueChange={(value) => {
                  setFilters({ ...filters, plan: value })
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Plan Básico">Plan Básico</SelectItem>
                  <SelectItem value="Plan Premium">Plan Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select
                value={filters.estado || 'all'}
                onValueChange={(value) => {
                  setFilters({ ...filters, estado: value })
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="pausada">Pausada</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
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
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="medio">Medio</SelectItem>
                  <SelectItem value="bajo">Bajo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Pacientes */}
      <Card>
        <CardHeader>
          <CardTitle>Pacientes</CardTitle>
          <CardDescription>
            {total} pacientes encontrados
            {error && <span className="text-red-600 ml-2">({error})</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Afiliado</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Riesgo</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Consultas 30d</TableHead>
                <TableHead>Costo 30d</TableHead>
                <TableHead>Última Consulta</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients && patients.length > 0 ? patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{patient.nombre} {patient.apellido}</div>
                      {patient.esCronico && (
                        <Badge variant="outline" className="mt-1">Crónico</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {patient.tipoDoc} {patient.nroDoc}
                  </TableCell>
                  <TableCell>{patient.nroAfiliado}</TableCell>
                  <TableCell>{patient.planNombre || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={patient.estadoCobertura === 'activa' ? 'success' : 'secondary'}>
                      {patient.estadoCobertura}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRiskBadgeVariant(patient.riskLevel)}>
                      {patient.riskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={getRiskColor(patient.riskLevel)}>
                      {patient.riskScore}
                    </span>
                  </TableCell>
                  <TableCell>{patient.consultas30d}</TableCell>
                  <TableCell>${patient.costo30d.toLocaleString()}</TableCell>
                  <TableCell>
                    {patient.ultimaConsulta
                      ? format(new Date(patient.ultimaConsulta), 'dd/MM/yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Link href={`/pacientes/${patient.id}`}>
                      <Button variant="outline" size="sm">Ver</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    {error ? `Error: ${error}` : 'No se encontraron pacientes'}
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
