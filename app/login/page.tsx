"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { UmaLogo } from "@/components/uma-logo"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const from = searchParams.get('from') || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log('[LOGIN CLIENT] Intentando login con:', { email: formData.email, passwordLength: formData.password.length })
      
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password.trim()
        })
      })

      console.log('[LOGIN CLIENT] Respuesta recibida:', { status: res.status, ok: res.ok })

      let data
      try {
        data = await res.json()
        console.log('[LOGIN CLIENT] Datos recibidos:', data)
      } catch (parseError) {
        console.error('[LOGIN CLIENT] Error parseando JSON:', parseError)
        const text = await res.text()
        console.error('[LOGIN CLIENT] Respuesta como texto:', text.substring(0, 200))
        setError('Error en la respuesta del servidor')
        return
      }

      if (res.ok) {
        console.log('[LOGIN CLIENT] Login exitoso, redirigiendo...')
        // Redirigir a la página original o dashboard
        router.push(from)
        router.refresh()
      } else {
        console.log('[LOGIN CLIENT] Error en login:', data.error)
        setError(data.error || 'Credenciales inválidas')
      }
    } catch (error) {
      console.error('[LOGIN CLIENT] Error en fetch:', error)
      setError('Error al iniciar sesión. Ver consola para más detalles.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="text-center mb-4">
            <UmaLogo size="lg" className="justify-center" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@demo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>

            <div className="text-xs text-muted-foreground text-center space-y-1 pt-4 border-t">
              <p className="font-semibold">Usuarios demo:</p>
              <p>• cotizador@demo.com / demo123 (COTIZADOR)</p>
              <p>• aprobador@demo.com / demo123 (APROBADOR)</p>
              <p>• oficina@demo.com / demo123 (OFICINA)</p>
              <p>• auditor@demo.com / demo123 (AUDITOR)</p>
              <p>• admin@demo.com / demo123 (ADMIN)</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
