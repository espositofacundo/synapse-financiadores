"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format, subDays } from "date-fns"
import { es } from "date-fns/locale"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"

interface Metrics {
  kpis: {
    totalConsultas: number
    porcentajeEfectivas: number
    costoTotal: number
    costoPromedio: number
    reconsultas7d: number
  }
  topEspecialidades: Array<{ especialidad: string; costo: number; volumen: number }>
  timeSeries: Array<{ fecha: string; consultas: number; costo: number }>
  especialidadesChart: Array<{ especialidad: string; volumen: number; costo: number }>
  canalesChart: Array<{ canal: string; count: number }>
  topAlertas: Array<{
    id: string
    fecha: string
    especialidad: string
    canal: string
    costo: number
    riskScore: number
    afiliado: string
    prestador: string
  }>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  })

  useEffect(() => {
    fetchMetrics()
  }, [dateRange])

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to
      })
      const res = await fetch(`/api/metrics?${params}`)
      const data = await res.json()
      setMetrics(data)
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !metrics) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard de Prestaciones</h1>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="px-3 py-2 border rounded-md"
          />
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Consultas</CardDescription>
            <CardTitle className="text-3xl">{metrics.kpis.totalConsultas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>% Efectivas</CardDescription>
            <CardTitle className="text-3xl">{metrics.kpis.porcentajeEfectivas.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Costo Total</CardDescription>
            <CardTitle className="text-3xl">${(metrics.kpis.costoTotal / 1000).toFixed(0)}k</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Costo Promedio</CardDescription>
            <CardTitle className="text-3xl">${metrics.kpis.costoPromedio.toFixed(0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reconsultas 7d</CardDescription>
            <CardTitle className="text-3xl">{metrics.kpis.reconsultas7d}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series */}
        <Card>
          <CardHeader>
            <CardTitle>Consultas y Costo por Día</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="consultas"
                  stroke="#3b82f6"
                  name="Consultas"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="costo"
                  stroke="#10b981"
                  name="Costo ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Canales */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.canalesChart}
                  dataKey="count"
                  nameKey="canal"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {metrics.canalesChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Especialidades */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Volumen y Costo por Especialidad</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.especialidadesChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="especialidad" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="volumen" fill="#3b82f6" name="Volumen" />
                <Bar yAxisId="right" dataKey="costo" fill="#10b981" name="Costo ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Top Alertas - Consultas con Riesgo Alto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Fecha</th>
                  <th className="text-left p-2">Especialidad</th>
                  <th className="text-left p-2">Canal</th>
                  <th className="text-left p-2">Costo</th>
                  <th className="text-left p-2">Risk Score</th>
                  <th className="text-left p-2">Afiliado</th>
                  <th className="text-left p-2">Prestador</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topAlertas.map((alerta) => (
                  <tr key={alerta.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{format(new Date(alerta.fecha), 'dd/MM/yyyy')}</td>
                    <td className="p-2">{alerta.especialidad}</td>
                    <td className="p-2">{alerta.canal}</td>
                    <td className="p-2">${alerta.costo.toLocaleString()}</td>
                    <td className="p-2">
                      <Badge variant={alerta.riskScore >= 70 ? "destructive" : "warning"}>
                        {alerta.riskScore}
                      </Badge>
                    </td>
                    <td className="p-2">{alerta.afiliado}</td>
                    <td className="p-2">{alerta.prestador}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
