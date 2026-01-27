"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NuevoPacientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
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
    planId: '',
    planNombre: '',
    nroAfiliado: '',
    estadoCobertura: 'activa',
    notas: '',
    esCronico: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/pacientes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Nuevo Paciente</h1>
      </div>

      <form onSubmit={handleSubmit}>
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
                    value={formData.tipoDoc}
                    onValueChange={(value) => setFormData({ ...formData, tipoDoc: value })}
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
                    value={formData.nroDoc}
                    onChange={(e) => setFormData({ ...formData, nroDoc: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Apellido *</Label>
                <Input
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha de Nacimiento *</Label>
                  <Input
                    type="date"
                    value={formData.fechaNac}
                    onChange={(e) => setFormData({ ...formData, fechaNac: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Sexo</Label>
                  <Select
                    value={formData.sexo}
                    onValueChange={(value) => setFormData({ ...formData, sexo: value })}
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
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Localidad</Label>
                  <Input
                    value={formData.localidad}
                    onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Provincia</Label>
                  <Input
                    value={formData.provincia}
                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
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
                  value={formData.nroAfiliado}
                  onChange={(e) => setFormData({ ...formData, nroAfiliado: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Plan</Label>
                <Input
                  value={formData.planNombre}
                  onChange={(e) => setFormData({ ...formData, planNombre: e.target.value })}
                  placeholder="Ej: Plan Básico, Plan Premium"
                />
              </div>
              <div>
                <Label>Estado de Cobertura</Label>
                <Select
                  value={formData.estadoCobertura}
                  onValueChange={(value) => setFormData({ ...formData, estadoCobertura: value })}
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
                  value={formData.canalPreferido}
                  onValueChange={(value) => setFormData({ ...formData, canalPreferido: value })}
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.esCronico}
                  onChange={(e) => setFormData({ ...formData, esCronico: e.target.checked })}
                />
                <Label>Paciente Crónico</Label>
              </div>
              <div>
                <Label>Notas</Label>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Notas internas sobre el paciente..."
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
            {loading ? 'Guardando...' : 'Crear Paciente'}
          </Button>
        </div>
      </form>
    </div>
  )
}
