# Synapse Financiadores - Design System

## Producto
**Nombre:** Synapse Financiadores  
**Descripción:** Plataforma de gestión y control para financiadores

## Design Tokens

### Colores

Los colores están definidos como variables CSS en `app/globals.css` y se acceden mediante clases de Tailwind.

#### Colores Base
- `background`: Fondo principal de la aplicación
- `foreground`: Color de texto principal
- `surface`: Superficie de cards y contenedores
- `border`: Color de bordes
- `muted`: Color para texto secundario

#### Colores Primarios
- `primary`: Color principal de la marca (Synapse Blue)
- `primary-foreground`: Texto sobre fondo primary

#### Colores Semánticos
- `success`: Verde para estados exitosos
- `warning`: Amarillo para advertencias
- `danger`: Rojo para errores y estados críticos
- `info`: Azul para información

### Radius
- `radius-sm`: 0.25rem (4px)
- `radius-md`: 0.5rem (8px)
- `radius-lg`: 0.75rem (12px)

### Shadows
- `shadow-card`: Sombra para cards
- `shadow-popover`: Sombra para popovers y dropdowns

## Componentes Base

### SynapseCard
Card estándar con variantes:
- `default`: Card básico con borde
- `outline`: Card con borde más grueso
- `elevated`: Card con sombra

**Uso:**
```tsx
import { SynapseCard, SynapseCardHeader, SynapseCardTitle, SynapseCardContent } from "@/components/ui-synapse"

<SynapseCard variant="elevated">
  <SynapseCardHeader>
    <SynapseCardTitle>Título</SynapseCardTitle>
  </SynapseCardHeader>
  <SynapseCardContent>
    Contenido
  </SynapseCardContent>
</SynapseCard>
```

### SynapseBadge
Badge para estados y niveles de riesgo.

**Variantes:**
- `default`, `secondary`, `outline`: Variantes básicas
- `bajo`, `medio`, `alto`: Niveles de riesgo
- `success`, `warning`, `danger`, `info`: Estados semánticos
- `draft`, `submitted`, `approved`, `rejected`: Estados de workflow

**Uso:**
```tsx
import { SynapseBadge } from "@/components/ui-synapse"

<SynapseBadge variant="bajo">BAJO</SynapseBadge>
<SynapseBadge variant="approved">APROBADO</SynapseBadge>
```

### SynapseStatCard
Card para mostrar KPIs y métricas.

**Props:**
- `title`: Título del KPI
- `value`: Valor principal (string o number)
- `description`: Descripción opcional
- `icon`: Icono de Lucide React
- `trend`: Objeto con `value` y `isPositive` para mostrar tendencia
- `variant`: `default` | `primary` | `success` | `warning` | `danger`

**Uso:**
```tsx
import { SynapseStatCard } from "@/components/ui-synapse"
import { BarChart3 } from "lucide-react"

<SynapseStatCard
  title="WIP Total"
  value={42}
  description="Casos en proceso"
  icon={BarChart3}
  variant="primary"
/>
```

### PageHeader
Header estándar para todas las páginas.

**Props:**
- `title`: Título principal
- `description`: Descripción opcional
- `backAction`: Acción de volver (opcional)
- `actions`: Elementos de acción (botones, etc.)

**Uso:**
```tsx
import { PageHeader } from "@/components/ui-synapse"
import { Button } from "@/components/ui/button"

<PageHeader
  title="Kanban de Altas"
  description="Gestión visual del flujo"
  actions={
    <Button>Nuevo caso</Button>
  }
/>
```

### AppHeader
Header de la aplicación con branding y breadcrumbs.

**Props:**
- `productName`: Nombre del producto (default: "Synapse Financiadores")
- `breadcrumbs`: Array de breadcrumbs
- `user`: Información del usuario
- `actions`: Acciones del header

### AppSidebar
Sidebar de navegación principal.

**Props:**
- `items`: Array de items de navegación
- `productName`: Nombre del producto
- `user`: Información del usuario
- `onLogout`: Función de logout

### EmptyState
Estado vacío para listas y tablas.

**Props:**
- `icon`: Icono de Lucide React
- `title`: Título
- `description`: Descripción opcional
- `action`: Acción opcional con `label` y `onClick`

## Reglas de Uso

### ✅ Hacer
- Usar tokens de color en lugar de colores hardcodeados
- Usar componentes del Design System para consistencia
- Usar `PageHeader` en todas las páginas
- Usar `SynapseBadge` para estados y niveles de riesgo
- Usar `SynapseCard` para contenedores

### ❌ No Hacer
- No usar colores hardcodeados (ej: `bg-blue-500`, `text-red-600`)
- No crear componentes similares sin usar los base
- No usar clases de Tailwind para colores directamente (usar tokens)
- No mezclar estilos antiguos con nuevos componentes

## Migración

### Etapa 1: ✅ Completada
- Shell + tokens + componentes base
- Aplicado en `/kanban`

### Etapa 2: Pendiente
- Aplicar en `/pacientes/cotizar`
- Aplicar en `/aprobaciones`

### Etapa 3: Pendiente
- Aplicar en `/dashboard`
- Aplicar en `/auditoria`
- Aplicar en listados restantes

## Personalización Futura

Cuando se reciba el manual de marca oficial, actualizar:

1. **Colores en `app/globals.css`:**
   - Reemplazar valores HSL de `--primary`, `--success`, etc.
   - Ajustar colores semánticos según especificaciones

2. **Logo:**
   - Reemplazar placeholder "Synapse Financiadores" con logo real
   - Actualizar en `AppHeader` y `AppSidebar`

3. **Tipografía:**
   - Si se especifica una fuente diferente, actualizar en `app/layout.tsx`

4. **Espaciado:**
   - Ajustar valores de `--radius-*` si es necesario
   - Ajustar shadows si se especifican valores diferentes

## Archivos Clave

- `app/globals.css`: Variables CSS (tokens)
- `tailwind.config.ts`: Configuración de Tailwind
- `components/ui-synapse/`: Componentes del Design System
- `components/app-shell.tsx`: Shell principal de la aplicación
