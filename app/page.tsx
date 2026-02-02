"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowRight, 
  Brain, 
  Shield, 
  BarChart3, 
  FileSearch, 
  Users, 
  Zap,
  CheckCircle,
  Database,
  Server,
  Layout,
  Lock,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  Sparkles
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-900">Synapse</h1>
              <p className="text-xs text-slate-500">Financiadores</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#features" className="text-sm text-slate-600 hover:text-slate-900 hidden sm:block">
              Características
            </Link>
            <Link href="#modules" className="text-sm text-slate-600 hover:text-slate-900 hidden sm:block">
              Módulos
            </Link>
            <Link href="#tech" className="text-sm text-slate-600 hover:text-slate-900 hidden sm:block">
              Tecnología
            </Link>
            <Button asChild>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6 px-4 py-2">
            <Sparkles className="h-3 w-3 mr-2" />
            Plataforma de Gestión Inteligente para Financiadores de Salud
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Auditoría con <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">Inteligencia Artificial</span> para Financiadores
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            Synapse analiza facturación, prácticas médicas y datos clínicos para detectar inconsistencias, 
            reducir costos y optimizar la operación de tu organización.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-lg px-8 py-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25">
              <Link href="/login" className="flex items-center gap-2">
                Probar la aplicación
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
              <Link href="#modules">Ver demo</Link>
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-6">
            Acceso demo disponible • Sin necesidad de registro
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-violet-400">$304K+</div>
              <div className="text-slate-400 mt-1">Ahorro estimado</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-violet-400">53</div>
              <div className="text-slate-400 mt-1">Hallazgos detectados</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-violet-400">789</div>
              <div className="text-slate-400 mt-1">Consultas analizadas</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-violet-400">4%</div>
              <div className="text-slate-400 mt-1">Cobertura de auditoría</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Características</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Potenciá la eficiencia operativa
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Una plataforma integral que combina análisis inteligente con flujos de trabajo optimizados.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-violet-600" />
                </div>
                <CardTitle>Auditoría con IA</CardTitle>
                <CardDescription>
                  Algoritmos que detectan duplicados, inconsistencias y sobreprácticas automáticamente.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Ahorro Estimado</CardTitle>
                <CardDescription>
                  Cuantificá el impacto económico de cada hallazgo y priorizá por potencial de recupero.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Control de Acceso</CardTitle>
                <CardDescription>
                  Roles diferenciados (Admin, Auditor, Aprobador, Oficina) con permisos granulares.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Gestión de Hallazgos</CardTitle>
                <CardDescription>
                  Flujo completo: Abierto → En Revisión → Resuelto. Trazabilidad total.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                  <FileSearch className="h-6 w-6 text-pink-600" />
                </div>
                <CardTitle>Filtros Avanzados</CardTitle>
                <CardDescription>
                  Buscá por médico, especialidad, lote, rango de fechas, riesgo y costo.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-cyan-600" />
                </div>
                <CardTitle>Dashboards en Tiempo Real</CardTitle>
                <CardDescription>
                  Métricas clave, gráficos interactivos y KPIs actualizados al instante.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Módulos</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Explorá cada módulo
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Una suite completa diseñada para financiadores de salud.
            </p>
          </div>

          {/* Module 1: Dashboard */}
          <div className="mb-16">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <Badge className="mb-4 bg-violet-100 text-violet-700 hover:bg-violet-100">Dashboard</Badge>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Panel de Control Ejecutivo</h3>
                <p className="text-slate-600 mb-6">
                  Visualización integral de KPIs, alertas críticas, tendencias de siniestralidad y métricas clave 
                  del negocio. Todo en un solo lugar para tomar decisiones informadas.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Métricas de población y siniestralidad
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Gráficos de tendencias mensuales
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Top alertas por severidad
                  </li>
                </ul>
              </div>
              <div className="bg-white rounded-2xl shadow-2xl p-4 border">
                <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                  <div className="text-center p-8">
                    <BarChart3 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Dashboard Principal</p>
                    <p className="text-sm text-slate-400 mt-2">KPIs • Gráficos • Alertas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Module 2: Consultas/Prácticas */}
          <div className="mb-16">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="order-2 lg:order-1 bg-white rounded-2xl shadow-2xl p-4 border">
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                  <div className="text-center p-8">
                    <ClipboardList className="h-16 w-16 text-indigo-400 mx-auto mb-4" />
                    <p className="text-indigo-600 font-medium">Consultas / Prácticas</p>
                    <p className="text-sm text-indigo-400 mt-2">Listado • Filtros • Importación</p>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">Consultas / Prácticas</Badge>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Gestión de Consultas Médicas</h3>
                <p className="text-slate-600 mb-6">
                  Centralizá todas las consultas y prácticas médicas. Importá datos de forma masiva, 
                  filtrá por múltiples criterios y accedé al detalle de cada caso.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Importación simulada de lotes
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Filtros por fecha, especialidad, prestador
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Vista detallada con facturas asociadas
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Module 3: Auditoría IA */}
          <div className="mb-16">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-100">Auditoría IA</Badge>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Motor de Auditoría Inteligente</h3>
                <p className="text-slate-600 mb-6">
                  El corazón de Synapse. Ejecutá auditorías sobre consultas seleccionadas, lotes completos 
                  o dejá que la IA recomiende qué auditar según prioridad de riesgo.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    3 modos: Puntual, Batch, Recomendadas
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    4 tipos: Factura, Práctica, Admin, Clínica
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Generación automática de hallazgos
                  </li>
                </ul>
              </div>
              <div className="bg-white rounded-2xl shadow-2xl p-4 border">
                <div className="aspect-video bg-gradient-to-br from-purple-50 to-violet-100 rounded-lg flex items-center justify-center">
                  <div className="text-center p-8">
                    <Brain className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                    <p className="text-purple-600 font-medium">Auditoría IA</p>
                    <p className="text-sm text-purple-400 mt-2">Dashboard • Wizard • Resultados</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Module 4: Hallazgos */}
          <div>
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="order-2 lg:order-1 bg-white rounded-2xl shadow-2xl p-4 border">
                <div className="aspect-video bg-gradient-to-br from-orange-50 to-red-100 rounded-lg flex items-center justify-center">
                  <div className="text-center p-8">
                    <AlertTriangle className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                    <p className="text-orange-600 font-medium">Hallazgos</p>
                    <p className="text-sm text-orange-400 mt-2">Listado • Estados • Acciones</p>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <Badge className="mb-4 bg-orange-100 text-orange-700 hover:bg-orange-100">Hallazgos</Badge>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Bandeja de Trabajo Operativa</h3>
                <p className="text-slate-600 mb-6">
                  Gestioná todos los hallazgos detectados por las auditorías. Filtrá por severidad, 
                  categoría o estado, y llevá cada caso hasta su resolución.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Estados: Abierto → En Revisión → Resuelto
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Severidad: Alta, Media, Baja
                  </li>
                  <li className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Acciones sugeridas por la IA
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section id="tech" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Tecnología</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Stack tecnológico moderno
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Construido con las mejores herramientas del ecosistema actual.
            </p>
          </div>

          {/* Architecture Diagram */}
          <Card className="mb-12 border-0 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle>Arquitectura de la Solución</CardTitle>
              <CardDescription>Diseño serverless, escalable y seguro</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 rounded-xl p-8">
                <div className="grid md:grid-cols-3 gap-8">
                  {/* Frontend */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
                      <Layout className="h-8 w-8 text-slate-700" />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-2">Frontend</h4>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">Next.js 14</p>
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">React 18</p>
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">Tailwind CSS</p>
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">shadcn/ui</p>
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">Recharts</p>
                    </div>
                  </div>

                  {/* Backend */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
                      <Server className="h-8 w-8 text-slate-700" />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-2">Backend</h4>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">Next.js API Routes</p>
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">Prisma ORM</p>
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">TypeScript</p>
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">JWT Auth</p>
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">RBAC</p>
                    </div>
                  </div>

                  {/* Database */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
                      <Database className="h-8 w-8 text-slate-700" />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-2">Base de Datos</h4>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">Supabase</p>
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">PostgreSQL</p>
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">Connection Pooling</p>
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">Row Level Security</p>
                      <p className="bg-white rounded-lg py-2 px-3 shadow-sm">Backups automáticos</p>
                    </div>
                  </div>
                </div>

                {/* Arrows */}
                <div className="hidden md:flex justify-center items-center mt-8 gap-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                  <div className="bg-violet-100 text-violet-700 px-4 py-2 rounded-full text-sm font-medium">
                    API REST + JSON
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tech Pills */}
          <div className="flex flex-wrap justify-center gap-3">
            <Badge variant="secondary" className="px-4 py-2 text-sm">Next.js 14</Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">React 18</Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">TypeScript</Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">Tailwind CSS</Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">Prisma</Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">Supabase</Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">PostgreSQL</Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">shadcn/ui</Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">Recharts</Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">JWT</Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">Vercel</Badge>
          </div>
        </div>
      </section>

      {/* Demo Credentials Section */}
      <section className="py-16 px-4 bg-slate-900 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Usuarios demo disponibles</h2>
          <p className="text-slate-400 mb-8">Probá la aplicación con diferentes roles y permisos</p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-violet-400 font-semibold mb-1">Admin</div>
              <div className="text-sm text-slate-400">admin@demo.com</div>
              <div className="text-xs text-slate-500">Acceso total</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-blue-400 font-semibold mb-1">Auditor</div>
              <div className="text-sm text-slate-400">auditor@demo.com</div>
              <div className="text-xs text-slate-500">Auditorías + Hallazgos</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-green-400 font-semibold mb-1">Aprobador</div>
              <div className="text-sm text-slate-400">aprobador@demo.com</div>
              <div className="text-xs text-slate-500">Aprobaciones + Auditorías</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-orange-400 font-semibold mb-1">Oficina</div>
              <div className="text-sm text-slate-400">oficina@demo.com</div>
              <div className="text-xs text-slate-500">Solo lectura</div>
            </div>
          </div>
          
          <p className="text-sm text-slate-500 mt-6">Contraseña para todos: <code className="bg-slate-800 px-2 py-1 rounded">demo123</code></p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-12 md:p-16 shadow-2xl shadow-violet-500/25">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              ¿Listo para ver Synapse en acción?
            </h2>
            <p className="text-violet-100 text-lg mb-8 max-w-xl mx-auto">
              Explorá todas las funcionalidades de la plataforma con datos demo reales.
            </p>
            <Button 
              size="lg" 
              asChild 
              className="text-lg px-10 py-7 bg-white text-violet-700 hover:bg-violet-50 shadow-xl"
            >
              <Link href="/login" className="flex items-center gap-3">
                <Zap className="h-6 w-6" />
                Probar ahora — Es gratis
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-slate-900">Synapse Financiadores</span>
            </div>
            <p className="text-sm text-slate-500">
              POC Demo • Construido con Next.js + Supabase
            </p>
            <div className="flex gap-4">
              <Link href="/login" className="text-sm text-slate-600 hover:text-violet-600">
                Iniciar sesión
              </Link>
              <Link href="#features" className="text-sm text-slate-600 hover:text-violet-600">
                Características
              </Link>
              <Link href="#tech" className="text-sm text-slate-600 hover:text-violet-600">
                Tecnología
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
