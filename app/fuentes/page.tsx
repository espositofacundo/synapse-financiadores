"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Database, Upload, Loader2, PlusCircle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface DataSource {
  id: string
  name: string
  type: string
  status: string
  recordsCount: number
  uploadedAt: string
  processedAt: string | null
  populationModels: Array<{ id: string; modelType: string; entitiesCount: number }>
}

export default function FuentesPage() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: "", type: "FACTURAS" })
  const [modelDialogOpen, setModelDialogOpen] = useState(false)
  const [modelSource, setModelSource] = useState<DataSource | null>(null)
  const [modelType, setModelType] = useState<"POBLACION" | "FACTURAS">("FACTURAS")
  const [creatingModel, setCreatingModel] = useState(false)

  useEffect(() => {
    fetchSources()
  }, [])

  const fetchSources = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/data-sources")
      if (res.ok) {
        const data = await res.json()
        setSources(data)
      } else {
        const data = await res.json()
        setError(data.error || "Error al cargar fuentes")
      }
    } catch (e) {
      console.error(e)
      setError("Error al cargar fuentes")
    } finally {
      setLoading(false)
    }
  }

  const openModelDialog = (s: DataSource) => {
    setModelSource(s)
    setModelType(s.type === "FACTURAS" ? "FACTURAS" : "POBLACION")
    setModelDialogOpen(true)
  }

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modelSource) return
    setCreatingModel(true)
    try {
      const res = await fetch("/api/population-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: modelSource.id, modelType }),
      })
      if (res.ok) {
        setModelDialogOpen(false)
        setModelSource(null)
        fetchSources()
      } else {
        const data = await res.json()
        alert(data.error || "Error al crear modelo")
      }
    } catch (e) {
      console.error(e)
      alert("Error al crear modelo")
    } finally {
      setCreatingModel(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/data-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), type: form.type }),
      })
      if (res.ok) {
        setDialogOpen(false)
        setForm({ name: "", type: "FACTURAS" })
        fetchSources()
      } else {
        const data = await res.json()
        alert(data.error || "Error al crear fuente")
      }
    } catch (e) {
      console.error(e)
      alert("Error al crear fuente")
    } finally {
      setSubmitting(false)
    }
  }

  const statusVariant = (s: string) =>
    s === "READY" ? "default" : s === "ERROR" ? "destructive" : "secondary"
  const typeLabel = (t: string) =>
    t === "FACTURAS" ? "Facturas" : t === "HISTORIA_CLINICA" ? "Historia clínica" : "Prácticas"

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fuentes de Datos</h1>
          <p className="text-muted-foreground mt-1">
            Conectá o subí fuentes para que Synapse las analice (POC: carga simulada).
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Conectar / Subir fuente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva fuente de datos</DialogTitle>
              <DialogDescription>
                Para la POC no se sube archivo real; se crea una fuente mock con cantidad de registros simulada.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej. Export facturación enero 2026"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FACTURAS">Facturas</SelectItem>
                    <SelectItem value="HISTORIA_CLINICA">Historia clínica</SelectItem>
                    <SelectItem value="PRACTICAS">Prácticas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear fuente"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Listado de fuentes
          </CardTitle>
          <CardDescription>
            Estado y métricas básicas. Una fuente READY permite crear modelos de población y ejecutar auditorías.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay fuentes. Creá una con &quot;Conectar / Subir fuente&quot;.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead>Subida</TableHead>
                  <TableHead>Modelos</TableHead>
                  <TableHead className="w-[120px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{typeLabel(s.type)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                    </TableCell>
                    <TableCell>{s.recordsCount.toLocaleString()}</TableCell>
                    <TableCell>
                      {format(new Date(s.uploadedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      {s.populationModels?.length
                        ? `${s.populationModels.length} (${s.populationModels.map((m) => m.modelType).join(", ")})`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {s.status === "READY" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => openModelDialog(s)}
                        >
                          <PlusCircle className="h-3 w-3" />
                          Crear modelo
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear modelo de población</DialogTitle>
            <DialogDescription>
              A partir de la fuente &quot;{modelSource?.name}&quot; se crea un modelo para ejecutar auditorías.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateModel} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de modelo</Label>
              <Select
                value={modelType}
                onValueChange={(v: "POBLACION" | "FACTURAS") => setModelType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POBLACION">Población</SelectItem>
                  <SelectItem value="FACTURAS">Facturas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModelDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creatingModel}>
                {creatingModel ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear modelo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
