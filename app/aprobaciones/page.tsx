"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CheckCircle2, XCircle, AlertCircle, DollarSign } from "lucide-react"
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
  createdBy: {
    id: string
    name: string
    email: string
  } | null
}

export default function AprobacionesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approveDialogOpen, setApproveDialogOpen] = useState<string | null>(null)
  const [approveReason, setApproveReason] = useState('')

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/patient-quotes?status=SUBMITTED')
      const data = await res.json()

      if (res.ok) {
        setQuotes(data.quotes || [])
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

  const handleApprove = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/patient-quotes/${quoteId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: approveReason || 'Aprobado' })
      })

      if (res.ok) {
        setApproveDialogOpen(null)
        setApproveReason('')
        fetchQuotes()
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al aprobar cotización')
    }
  }

  const handleReject = async (quoteId: string) => {
    if (!rejectReason.trim()) {
      alert('El motivo de rechazo es requerido')
      return
    }

    try {
      const res = await fetch(`/api/patient-quotes/${quoteId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      })

      if (res.ok) {
        setRejectDialogOpen(null)
        setRejectReason('')
        fetchQuotes()
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al rechazar cotización')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'SUBMITTED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
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
        <div className="text-center">Cargando cotizaciones...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Aprobaciones de Cotizaciones</h1>
          <p className="text-muted-foreground mt-1">
            Revisar y aprobar/rechazar cotizaciones pendientes
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
            No hay cotizaciones pendientes de aprobación
          </CardContent>
        </Card>
      )}

      {quotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cotizaciones Pendientes ({quotes.length})</CardTitle>
            <CardDescription>
              Cotizaciones enviadas por cotizadores, pendientes de aprobación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Creada por</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Precio Sugerido</TableHead>
                  <TableHead>Estado</TableHead>
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
                      <Badge className={getStatusColor(quote.status)}>
                        {quote.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog open={approveDialogOpen === quote.id} onOpenChange={(open) => {
                          setApproveDialogOpen(open ? quote.id : null)
                          if (!open) setApproveReason('')
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="default" className="gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              Aprobar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Aprobar Cotización</DialogTitle>
                              <DialogDescription>
                                ¿Estás seguro de aprobar esta cotización? Una vez aprobada, se podrá crear el paciente.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <Label>Motivo (opcional)</Label>
                                <Textarea
                                  value={approveReason}
                                  onChange={(e) => setApproveReason(e.target.value)}
                                  placeholder="Ej: Cotización aprobada según criterios establecidos"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setApproveDialogOpen(null)}>
                                Cancelar
                              </Button>
                              <Button onClick={() => handleApprove(quote.id)}>
                                Confirmar Aprobación
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={rejectDialogOpen === quote.id} onOpenChange={(open) => {
                          setRejectDialogOpen(open ? quote.id : null)
                          if (!open) setRejectReason('')
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="gap-1">
                              <XCircle className="h-4 w-4" />
                              Rechazar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Rechazar Cotización</DialogTitle>
                              <DialogDescription>
                                Indica el motivo del rechazo. El cotizador podrá ver este motivo y editar la cotización.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <Label>Motivo de rechazo *</Label>
                                <Textarea
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="Ej: Precio sugerido fuera del rango aceptable"
                                  required
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setRejectDialogOpen(null)}>
                                Cancelar
                              </Button>
                              <Button variant="destructive" onClick={() => handleReject(quote.id)}>
                                Confirmar Rechazo
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
