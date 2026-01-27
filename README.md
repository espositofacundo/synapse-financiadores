# Financiadores POC - Auditoría de Prestaciones

POC (Proof of Concept) para el vertical "Financiadores (Obras Sociales / Prepagas)" en una plataforma de salud. Esta demo funcional muestra visibilidad, control y auditoría asistida de prestaciones médicas.

## 🎯 Objetivo

Construir una demo funcional que demuestre:

1. **Visibilidad & Control**: Dashboard de prestaciones con métricas clave (volumen, costo, especialidad, canal, efectividad)
2. **Auditoría Asistida**: Sistema de reglas configurables + score de riesgo por consulta + alertas explicables
3. **Evidencia**: Detalle completo de cada consulta con "por qué fue marcada", trazabilidad y datos clínicos básicos (mock)
4. **Gestión de Pacientes**: Creación, gestión y clasificación de riesgo de pacientes (clínica y de uso/consumo)

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: API Routes en Next.js (route handlers)
- **Base de Datos**: SQLite con Prisma ORM
- **Autenticación**: Mock (solo 1 usuario "financiador")

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn

## 🚀 Instalación y Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar base de datos

```bash
# Generar cliente de Prisma
npm run db:generate

# Crear base de datos y aplicar schema
npm run db:push
```

### 3. Poblar base de datos con datos de prueba

```bash
npm run db:seed
```

Este comando creará:
- 1 financiador (Obra Social Demo)
- 100 afiliados
- 30 prestadores
- 550+ consultas simuladas con distribución realista

### 4. Iniciar servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## 📁 Estructura del Proyecto

```
├── app/
│   ├── api/                    # API Routes
│   │   ├── metrics/            # Endpoint de métricas y KPIs
│   │   ├── consultas/         # Endpoint de consultas (listado y detalle)
│   │   ├── rules/             # Endpoint de reglas de auditoría
│   │   └── auditoria/         # Endpoint para recalcular auditoría
│   ├── dashboard/             # Página principal con KPIs y gráficos
│   ├── auditoria/             # Página de auditoría con filtros y tabla
│   ├── consultas/[id]/        # Página de detalle de consulta
│   ├── layout.tsx             # Layout principal con navegación
│   └── globals.css            # Estilos globales
├── components/
│   ├── ui/                    # Componentes de shadcn/ui
│   └── navigation.tsx         # Componente de navegación
├── lib/
│   ├── auditoria.ts           # Lógica de cálculo de risk score
│   ├── prisma.ts             # Cliente de Prisma
│   └── utils.ts              # Utilidades
├── prisma/
│   ├── schema.prisma         # Schema de base de datos
│   └── seed.ts               # Script de seed
└── data/
    └── rules.json            # Archivo de reglas (se crea automáticamente)
```

## 🎨 Pantallas y Funcionalidades

### A) Gestión de Pacientes (`/pacientes`)

**Lista de pacientes:**
- Búsqueda por documento, afiliado, nombre
- Filtros: plan, estado de cobertura, nivel de riesgo
- Tabla con: datos personales, cobertura, risk score, consultas 30d, costo 30d
- Chips de riesgo (verde/amarillo/rojo)
- Acción: "Ver" para ir al perfil

**Crear paciente (`/pacientes/nuevo`):**
- Formulario completo con validaciones
- Detección de duplicados probables
- Validación de unicidad por documento/afiliado
- Normalización automática de documentos

**Perfil de paciente (`/pacientes/[id]`):**
- Datos personales y cobertura
- Clasificación de riesgo con explicación
- Motivos del riesgo (reglas disparadas)
- Timeline de consultas
- Estadísticas (consultas 7d/30d, costo 30d)
- Historial de riesgo
- Notas y tags

**Importación masiva (`/pacientes/importar`):**
- Carga de archivo CSV
- Vista previa de datos
- Validación y reporte de errores
- Resumen de creados/actualizados/rechazados

**Clasificación de riesgo de pacientes:**
- Risk score 0-100 calculado automáticamente
- Reglas configurables:
  - Reconsultas en 7/30 días
  - Uso excesivo de guardia
  - Costo elevado en 30 días
  - Derivaciones repetidas
  - Paciente crónico
  - Perfil incompleto
  - Cobertura inconsistente
- Recalculo automático al crear nuevas consultas

### B) Dashboard (`/dashboard`)

**KPIs principales:**
- Total de consultas
- Porcentaje de consultas efectivas
- Costo total
- Costo promedio
- Top especialidades por costo
- Reconsultas en últimos 7 días

**Gráficos:**
- Time series: Consultas y costo por día
- Barras: Volumen vs costo por especialidad
- Donut: Distribución por canal (guardia/programada/telemedicina)
- Tabla: Top alertas (consultas con riesgo alto)

**Filtros:**
- Rango de fechas (desde/hasta)

### C) Auditoría (`/auditoria`)

**Filtros:**
- Fecha (desde/hasta)
- Especialidad
- Canal
- Nivel de riesgo (bajo/medio/alto)

**Tabla de consultas:**
- Fecha y hora
- Especialidad
- Canal
- Costo
- Nivel de riesgo (con badge de color)
- Risk score
- Estado (efectiva/no efectiva)
- Acción: "Ver detalle"

**Panel de Reglas:**
Configuración editable de reglas de auditoría:
- `maxConsultasPorAfiliadoEn7d`: Máximo de consultas por afiliado en 7 días (default: 3)
- `maxCostoPorConsultaPorEspecialidad`: Costo máximo por especialidad (mapa)
- `flagSiNoHayDiagnostico`: Alertar si no hay diagnóstico (bool)
- `flagSiDuracionMin`: Duración mínima de consulta en minutos (default: 3)
- `flagSiDerivaSiempreMismoPrestador`: Detectar patrón de derivación repetida (bool)

### D) Detalle de Consulta (`/consultas/[id]`)

**Información mostrada:**
- Datos generales: fecha, especialidad, canal, duración, costo, efectividad
- Riesgo y auditoría: nivel de riesgo, risk score, reglas disparadas con explicación
- Datos del afiliado (anonimizado): nombre, DNI parcial, edad
- Datos del prestador: nombre, matrícula
- Resumen clínico (mock): motivo de consulta, diagnóstico, derivación
- Trazabilidad: historial de eventos (creada, atendida, cerrada)

**"Por qué fue marcada":**
Lista explicable de reglas que dispararon, con valores y umbrales:
- Ejemplo: "Afiliado tuvo 5 consultas en 7 días > 3"
- Ejemplo: "Costo de $12,000 excede el máximo de $10,000 para psiquiatría"

## 🔍 Lógica de Auditoría

El sistema calcula un **risk score** (0-100) basado en las siguientes reglas:

1. **Reconsultas en 7 días** (+25 puntos)
   - Si el afiliado tiene más consultas que el umbral configurado en 7 días

2. **Costo alto por especialidad** (+25 puntos)
   - Si el costo excede el máximo configurado para esa especialidad

3. **Duración muy baja** (+15 puntos)
   - Si la duración es menor al mínimo configurado

4. **Sin diagnóstico** (+20 puntos)
   - Si la consulta no tiene diagnóstico registrado (si la regla está habilitada)

5. **Patrón de derivación repetida** (+15 puntos)
   - Si detecta derivaciones repetidas al mismo prestador (si la regla está habilitada)

**Clasificación de riesgo:**
- **0-39**: Bajo
- **40-69**: Medio
- **70-100**: Alto

## 📊 Datos de Seed

El seed genera:
- **50 pacientes** con datos completos
- **100 afiliados** (compatibilidad con sistema anterior)
- **30 prestadores**
- **550+ consultas** distribuidas en los últimos 90 días

**Distribución de consultas:**

**Especialidades:**
- clínica, pediatría, gineco, cardio, traumatología, psiquiatría

**Canales:**
- guardia (20% más caro)
- programada (precio base)
- telemedicina (30% más barato)

**Estados:**
- 85% efectivas
- 15% no efectivas (con motivos: paciente ausente, corte, cancelación, reprogramación)

**Costos por especialidad:**
- Cardio/Traumatología: $8,000 - $15,000
- Psiquiatría: $6,000 - $12,000
- Otras: $3,000 - $8,000

**Otros datos:**
- Duración: 10-60 minutos
- 25% con derivación
- Timestamps distribuidos en últimos 90 días
- Diagnósticos variados (algunos sin diagnóstico)
- 30% de consultas asociadas a pacientes (nuevo modelo)
- 70% de consultas asociadas a afiliados (compatibilidad)

**Pacientes generados:**
- 50 pacientes con datos completos
- 20% marcados como crónicos
- Varios con patologías y tags
- Risk score calculado automáticamente

## 🔄 Regenerar Seed

Para regenerar los datos de prueba:

```bash
# Limpiar y recrear base de datos
npm run db:push

# Ejecutar seed
npm run db:seed
```

**Nota:** El seed procesa automáticamente la auditoría para todas las consultas creadas.

## 🛣️ Rutas de la Aplicación

- `/` → Redirige a `/dashboard`
- `/dashboard` → Dashboard principal con KPIs y gráficos
- `/auditoria` → Página de auditoría con filtros y tabla
- `/pacientes` → Lista de pacientes con búsqueda y filtros
- `/pacientes/nuevo` → Crear nuevo paciente
- `/pacientes/[id]` → Perfil completo del paciente
- `/pacientes/importar` → Importación masiva de pacientes
- `/consultas/[id]` → Detalle completo de una consulta

## 🔌 API Endpoints

### `GET /api/metrics`
Obtiene métricas y KPIs para el dashboard.

**Query params:**
- `from` (opcional): Fecha desde (YYYY-MM-DD)
- `to` (opcional): Fecha hasta (YYYY-MM-DD)
- `especialidad` (opcional): Filtrar por especialidad
- `canal` (opcional): Filtrar por canal

**Response:**
```json
{
  "kpis": {
    "totalConsultas": 550,
    "porcentajeEfectivas": 85.5,
    "costoTotal": 3500000,
    "costoPromedio": 6363.64,
    "reconsultas7d": 45
  },
  "topEspecialidades": [...],
  "timeSeries": [...],
  "especialidadesChart": [...],
  "canalesChart": [...],
  "topAlertas": [...]
}
```

### `GET /api/consultas`
Obtiene lista de consultas con paginación.

**Query params:**
- `page` (default: 1)
- `limit` (default: 50)
- `from`, `to`, `especialidad`, `canal`, `riesgo` (filtros opcionales)

### `GET /api/consultas/[id]`
Obtiene detalle completo de una consulta.

### `GET /api/rules`
Obtiene las reglas de auditoría actuales.

### `POST /api/rules`
Guarda nuevas reglas de auditoría.

**Body:**
```json
{
  "maxConsultasPorAfiliadoEn7d": 3,
  "maxCostoPorConsultaPorEspecialidad": {
    "clínica": 5000,
    "pediatría": 5000,
    ...
  },
  "flagSiNoHayDiagnostico": true,
  "flagSiDuracionMin": 3,
  "flagSiDerivaSiempreMismoPrestador": true
}
```

### `POST /api/auditoria`
Recalcula la auditoría.

**Body (opcional):**
```json
{
  "consultaId": "uuid" // Si se proporciona, solo procesa esa consulta
}
```

### `GET /api/patients`
Obtiene lista de pacientes con paginación y filtros.

**Query params:**
- `page`, `limit` (paginación)
- `search` (búsqueda por doc, afiliado, nombre)
- `plan`, `estado`, `riesgo` (filtros)

### `POST /api/patients`
Crea un nuevo paciente.

**Body:**
```json
{
  "tipoDoc": "DNI",
  "nroDoc": "12345678",
  "nombre": "Juan",
  "apellido": "Pérez",
  "fechaNac": "1990-01-01",
  "nroAfiliado": "AF12345",
  "planNombre": "Plan Básico",
  "estadoCobertura": "activa"
}
```

### `GET /api/patients/[id]`
Obtiene detalle completo de un paciente.

### `PUT /api/patients/[id]`
Actualiza datos de un paciente.

### `POST /api/patients/[id]/risk`
Recalcula el riesgo de un paciente.

### `POST /api/patients/import`
Importa pacientes desde un archivo CSV.

**Body:**
```json
{
  "rows": [
    {
      "nroDoc": "12345678",
      "nombre": "Juan",
      "apellido": "Pérez",
      "fechaNac": "1990-01-01",
      "nroAfiliado": "AF12345"
    }
  ]
}
```

### `GET /api/patients/rules`
Obtiene las reglas de riesgo de pacientes.

### `POST /api/patients/rules`
Guarda las reglas de riesgo de pacientes.

## 📝 Supuestos y Decisiones de Diseño

1. **Base de datos**: Se usa SQLite para simplicidad y portabilidad. En producción se recomendaría PostgreSQL o MySQL.

2. **Autenticación**: Mock simple. En producción se implementaría con NextAuth.js o similar.

3. **Reglas de auditoría**: Se guardan en archivo JSON (`/data/rules.json`). En producción se usaría la base de datos.

4. **Anonimización**: El DNI se muestra parcialmente (primeros 2 y últimos 2 dígitos) en el detalle de consulta.

5. **Trazabilidad**: Se almacena como JSON en la base de datos. En producción se podría usar una tabla separada.

6. **Resumen clínico**: Datos mock generados automáticamente. En producción vendría de un sistema de historias clínicas.

7. **Cálculo de riesgo**: Se ejecuta al crear consultas en el seed. En producción se ejecutaría en tiempo real o mediante jobs.

8. **UI B2B**: Diseño limpio y profesional con cards, tablas, badges de riesgo y gráficos interactivos.

## 🐛 Troubleshooting

### Error: "Prisma Client not generated"
```bash
npm run db:generate
```

### Error: "Database not found"
```bash
npm run db:push
```

### Error: "No data in dashboard"
Asegúrate de haber ejecutado el seed:
```bash
npm run db:seed
```

### Las consultas no tienen risk score
Ejecuta el procesamiento de auditoría:
```bash
# Desde la UI: Configurar Reglas → Guardar y Recalcular
# O desde la API:
curl -X POST http://localhost:3000/api/auditoria
```

## 📦 Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Construye para producción
- `npm run start` - Inicia servidor de producción
- `npm run lint` - Ejecuta linter
- `npm run db:generate` - Genera cliente de Prisma
- `npm run db:push` - Aplica schema a la base de datos
- `npm run db:seed` - Ejecuta seed de datos

## 🚀 Próximos Pasos (Mejoras Futuras)

- [ ] Autenticación real con múltiples usuarios
- [ ] Exportación de reportes (PDF/Excel)
- [ ] Notificaciones en tiempo real
- [ ] Dashboard personalizable
- [ ] Integración con sistemas de historias clínicas
- [ ] Machine Learning para detección de anomalías
- [ ] Workflow de aprobación/rechazo de consultas
- [ ] Integración con sistemas de facturación

## 📄 Licencia

Este es un proyecto de demostración (POC) para fines educativos y de evaluación.

---

**Desarrollado con ❤️ para el vertical de Financiadores**
