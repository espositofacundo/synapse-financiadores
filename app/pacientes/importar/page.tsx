"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, FileText } from "lucide-react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function ImportarPacientesPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<any>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    // Leer CSV
    if (selectedFile.name.endsWith('.csv')) {
      const text = await selectedFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      
      const rows = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim())
        const row: any = {}
        headers.forEach((header, idx) => {
          row[header] = values[idx] || ''
        })
        return row
      })

      setPreview(rows)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const row: any = {}
        headers.forEach((header, idx) => {
          row[header] = values[idx] || ''
        })
        return row
      })

      const res = await fetch('/api/patients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      })

      const data = await res.json()
      setResultado(data)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al importar pacientes')
    } finally {
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
        <h1 className="text-3xl font-bold">Importar Pacientes</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subir Archivo</CardTitle>
          <CardDescription>
            Sube un archivo CSV con los datos de los pacientes. El archivo debe tener las siguientes columnas:
            nroDoc, nombre, apellido, fechaNac, nroAfiliado, planNombre (opcional), estadoCobertura (opcional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Archivo CSV</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
          </div>

          {preview.length > 0 && (
            <div>
              <Label>Vista Previa (primeras 5 filas)</Label>
              <div className="mt-2 border rounded-md overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(preview[0] || {}).map(key => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, idx) => (
                      <TableRow key={idx}>
                        {Object.values(row).map((val: any, i) => (
                          <TableCell key={i}>{val}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <Button onClick={handleImport} disabled={!file || loading}>
            <Upload className="mr-2 h-4 w-4" />
            {loading ? 'Importando...' : 'Importar Pacientes'}
          </Button>
        </CardContent>
      </Card>

      {resultado && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado de la Importación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Creados</span>
                  <p className="text-2xl font-bold text-green-600">{resultado.creados}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Actualizados</span>
                  <p className="text-2xl font-bold text-blue-600">{resultado.actualizados}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Rechazados</span>
                  <p className="text-2xl font-bold text-red-600">{resultado.rechazados}</p>
                </div>
              </div>

              {resultado.errores && resultado.errores.length > 0 && (
                <div>
                  <Label>Errores</Label>
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                    {resultado.errores.map((error: any, idx: number) => (
                      <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <strong>Fila {error.row}:</strong> {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Formato del Archivo CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Columnas requeridas:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><code>nroDoc</code> - Número de documento (sin puntos ni guiones)</li>
              <li><code>nombre</code> - Nombre del paciente</li>
              <li><code>apellido</code> - Apellido del paciente</li>
              <li><code>fechaNac</code> - Fecha de nacimiento (YYYY-MM-DD)</li>
              <li><code>nroAfiliado</code> - Número de afiliado</li>
            </ul>
            <p className="mt-4"><strong>Columnas opcionales:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><code>tipoDoc</code> - Tipo de documento (default: DNI)</li>
              <li><code>sexo</code> - M, F u Otro</li>
              <li><code>telefono</code> - Teléfono</li>
              <li><code>email</code> - Email</li>
              <li><code>localidad</code> - Localidad</li>
              <li><code>provincia</code> - Provincia</li>
              <li><code>planNombre</code> - Nombre del plan</li>
              <li><code>estadoCobertura</code> - activa, pausada, baja (default: activa)</li>
              <li><code>esCronico</code> - true/false</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
