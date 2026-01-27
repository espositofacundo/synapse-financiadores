# Cotizador Pre-Alta de Pacientes

## Descripción

Feature que permite evaluar el riesgo sanitario y costo esperado de un paciente **antes** de darlo de alta en el sistema. El financiador debe completar una cotización obligatoria que incluye datos clínicos y de uso, y obtener una recomendación de precio/categoría.

## Flujo Funcional

1. **Usuario ingresa a "Nuevo Paciente"**
   - Redirige a `/pacientes/cotizar`

2. **Paso 1: Cotización**
   - Formulario con datos demográficos, historia clínica, uso reciente y señales adicionales
   - Usuario presiona "Calcular Riesgo y Costo"
   - Sistema ejecuta motor de cotización

3. **Paso 2: Resultados**
   - Muestra Risk Score (0-100) con nivel (Bajo/Medio/Alto)
   - Muestra Costo Esperado 12 meses (base y escenario P95)
   - Muestra Categoría recomendada y Factor de Riesgo
   - Muestra Nivel de Confianza
   - Lista de explicaciones ("Por qué se calculó este valor")
   - Opciones: "Editar y Recalcular" o "Confirmar Alta de Paciente"

4. **Paso 3: Crear Paciente**
   - Formulario de datos personales y cobertura
   - Al crear, se asocia la cotización al paciente
   - La cotización queda inmutable (solo lectura)

## Modelo de Datos

### PatientQuote

```typescript
{
  id: string
  inputs: JSON // Todos los datos ingresados
  riskScore: number // 0-100
  riskLevel: 'bajo' | 'medio' | 'alto'
  expectedCost12m: number
  expectedCostP95: number
  priceCategory: 'BAJO RIESGO' | 'MEDIO RIESGO' | 'ALTO RIESGO'
  riskFactor: number // 1.0, 1.3, 1.6
  confidence: 'Alta' | 'Media' | 'Baja'
  reasons: JSON // Array de explicaciones
  modelVersion: string // '1.0'
  patientId: string? // Se asigna al crear el paciente
  createdAt: DateTime
}
```

## Motor de Cotización

### Inputs Requeridos

- **Datos demográficos**: edad, sexo, provincia
- **Historia clínica**: patologías crónicas (array), medicamentos crónicos (cantidad)
- **Uso reciente (12 meses)**: consultas totales, consultas guardia, internaciones, especialidades distintas
- **Señales adicionales**: reconsultas < 72h (boolean), tasa no efectivas (%)

### Lógica de Cálculo

#### A) Risk Score (0-100)

- Edad > 65: +15 puntos
- Cada patología crónica: +10 puntos (máx 30)
- Consultas > 12: +2 puntos por consulta extra (máx 20)
- Guardia > 5: +3 puntos por guardia extra (máx 15)
- Internaciones: +10 puntos por internación (máx 20)
- Especialidades > 5: +2 puntos por especialidad extra (máx 10)
- Reconsultas rápidas: +10 puntos
- Tasa no efectivas > 30%: +20 puntos (máx 10)

**Clasificación:**
- 0-39: Bajo
- 40-69: Medio
- 70-100: Alto

#### B) Costo Esperado 12 meses

1. **Baseline por cohorte**:
   - Niños (< 5): $60,000
   - Adultos (18-65): $50,000
   - Adultos mayores (≥ 65): $80,000
   - Ajuste por región: +20% si provincia cara (Buenos Aires, CABA, Córdoba)

2. **Ajustes**:
   - Patologías: +15% por patología
   - Internaciones: +$150,000 por internación
   - Guardia extra (> 5): +$8,000 por guardia
   - Consultas extra (> 12): +$5,000 por consulta
   - Fragmentación (> 5 especialidades): +10%

3. **Escenario P95**: expected * 1.5

#### C) Precio / Categoría

- **BAJO RIESGO** (score < 40): factor 1.0x
- **MEDIO RIESGO** (score 40-69): factor 1.3x
- **ALTO RIESGO** (score ≥ 70): factor 1.6x

#### D) Confianza

- **Alta**: ≥ 80% de campos completos
- **Media**: 50-79% de campos completos
- **Baja**: < 50% de campos completos

## Endpoints API

### POST /api/patient-quotes

Calcula una cotización.

**Request:**
```json
{
  "edad": 34,
  "sexo": "M",
  "provincia": "Buenos Aires",
  "patologiasCronicas": ["Diabetes tipo 2", "Hipertensión"],
  "medicamentosCronicos": 3,
  "consultasTotales": 14,
  "consultasGuardia": 7,
  "internaciones": 0,
  "especialidadesDistintas": 9,
  "reconsultasRapidas": true,
  "tasaNoEfectivas": 0.36
}
```

**Response:**
```json
{
  "quote": {
    "id": "uuid",
    "riskScore": 82,
    "riskLevel": "alto",
    "expectedCost12m": 185000,
    "expectedCostP95": 277500,
    "priceCategory": "ALTO RIESGO",
    "riskFactor": 1.6,
    "confidence": "Alta",
    "reasons": ["..."],
    "modelVersion": "1.0",
    "createdAt": "2026-01-23T..."
  }
}
```

### GET /api/patient-quotes/[id]

Obtiene una cotización por ID.

### POST /api/patients

**Modificado**: Ahora requiere `quoteId` en el body.

```json
{
  "quoteId": "uuid",
  "tipoDoc": "DNI",
  "nroDoc": "36383630",
  ...
}
```

## UI

### Rutas

- `/pacientes/cotizar` - Flujo completo de cotización y creación

### Componentes

- Formulario de cotización (Paso 1)
- Pantalla de resultados con cards (Paso 2)
- Formulario de datos del paciente (Paso 3)

## Requisitos Cumplidos

✅ Explicabilidad obligatoria (lista de razones)  
✅ Guardar versión del modelo  
✅ No usar servicios externos  
✅ Todo funciona con datos mock/seed  
✅ UX clara, B2B, orientada a decisión  
✅ Cotización inmutable una vez asociada a paciente

## Próximos Pasos

1. Agregar historial de cotizaciones por paciente
2. Comparar cotizaciones (antes/después)
3. Exportar cotización a PDF
4. Integrar con motor de riesgo V2 para recalcular post-alta
5. Dashboard de cotizaciones rechazadas/aceptadas
