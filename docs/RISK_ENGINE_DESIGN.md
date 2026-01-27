# Diseño del Motor de Riesgo V2 - Respuestas a Preguntas Clave

## Preguntas de Diseño

### 1. ¿Querés que el score sea preventivo (antes de pagar) o detectivo (post)?

**Respuesta recomendada:** **Híbrido - Ambos**

- **Preventivo (Real-time)**: Cuando se crea una nueva consulta, calcular riesgo y alertar antes de autorizar/pagar
- **Detectivo (Batch)**: Recalcular periódicamente (diario/semanal) para detectar patrones que se desarrollan en el tiempo

**Implementación:**
- Hook en creación de consulta → cálculo rápido de señales críticas
- Job batch nocturno → recálculo completo de todos los pacientes
- API `/api/patients/[id]/risk` para recálculo manual

---

### 2. ¿Qué pesa más: falsos positivos (molestar) o falsos negativos (se te escapa gasto/fraude)?

**Respuesta recomendada:** **Balanceado con configuración**

Para un financiador B2B:
- **Falsos negativos** son más costosos (fraude no detectado = pérdida directa)
- **Falsos positivos** generan fricción (pacientes/auditores molestos)

**Estrategia:**
- **Thresholds configurables** por financiador
- **Niveles de alerta**: 
  - `Alto + Alta confianza` → Acción inmediata
  - `Medio + Media confianza` → Revisión prioritaria
  - `Bajo` → Solo reporte
- **Sistema de feedback**: Marcar falsos positivos para ajustar thresholds

---

### 3. ¿Cuánta data clínica real tenés hoy (diagnóstico/nota/derivación/recetas)?

**Estado actual del POC:**
- ✅ Diagnóstico (texto libre)
- ✅ Nota clínica (`resumenClinico`)
- ✅ Derivación (boolean + tipo + prestador)
- ❌ Recetas/órdenes (no implementado)
- ✅ Motivo de consulta
- ✅ Efectividad de consulta

**Recomendación:**
- Implementar señales que usen lo disponible HOY
- Diseñar señales futuras que requieren más data (marcadas como "requiere: recetas")
- Sistema de "confidence" bajo cuando falta data crítica

---

### 4. ¿El financiador quiere acción (bloqueo/derivación) o solo priorización (auditar primero)?

**Respuesta recomendada:** **Priorización con opción de acción**

**Nivel 1 (MVP):**
- Priorización: Lista de pacientes ordenados por riesgo
- Alertas visuales en dashboard
- Filtros por track de riesgo

**Nivel 2 (Futuro):**
- Workflow de revisión: Asignar a auditor
- Reglas de acción automática (solo para casos extremos + alta confianza)
- Integración con sistema de autorización

**Implementación inicial:**
- Dashboard con pacientes de alto riesgo destacados
- API de alertas
- Sistema de "flags" que pueden disparar workflows

---

### 5. ¿Necesitás explicabilidad "legal-friendly" (reasons bien auditables)?

**Respuesta: SÍ - Crítico para B2B**

**Requisitos:**
- ✅ Cada señal tiene `why` (explicación legible)
- ✅ `evidence` con valores exactos
- ✅ Historial completo de cambios de riesgo
- ✅ Versión de configuración usada
- ✅ Timestamp de cálculo
- ✅ Confidence y data coverage

**Implementación:**
- `PatientRiskHistory` guarda snapshot completo
- API `/api/patients/[id]/risk/history` para auditoría
- Export de reportes con explicación completa
- Log de cambios en configuración

---

## Arquitectura de Implementación

### Fase 1: Motor de Señales (Nivel 1) ✅
- Sistema de señales con scores 0-1
- 5 tracks de riesgo
- Ponderaciones configurables
- Explicabilidad completa

### Fase 2: Configuración Avanzada
- API de configuración por financiador/plan
- UI para gestionar thresholds y pesos
- Versionado de configuraciones

### Fase 3: Visualización y Analytics
- Dashboard con tracks desglosados
- Evolución temporal del riesgo
- Lista de alertas
- Comparación con cohortes

### Fase 4: Reglas Compuestas (Nivel 2)
- Señales que se combinan (guardia + costo)
- Boosts por interacción
- Mejora de precisión sin ML

### Fase 5: ML y Cohortes (Nivel 3) - Futuro
- Modelos por track
- Comparación con cohortes reales
- Features estandarizadas
- SHAP-like explanations

---

## Decisiones de Diseño

### Scoring
- **Global Score**: 0-100, combinación ponderada de tracks
- **Track Scores**: 0-100, promedio de señales del track
- **Signal Scores**: 0-1, normalizado

### Thresholds
- Configurables por financiador
- Valores por defecto basados en percentiles de cohorte
- Ajustables sin cambiar código

### Performance
- Cálculo incremental (solo nuevas consultas)
- Cache de resultados
- Batch processing para recálculo masivo

### Explicabilidad
- Top 5 reasons siempre disponibles
- Evidence con valores exactos
- Historial completo auditado
