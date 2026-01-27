# 🔧 Helper: Generar Connection String de Supabase

Este es un helper visual para copiar la Connection String correctamente.

## 📍 Ubicación en Supabase Dashboard

```
┌─────────────────────────────────────────┐
│  Supabase Dashboard                    │
├─────────────────────────────────────────┤
│                                         │
│  [Table Editor]  [SQL Editor]          │
│                                         │
│  ⚙️ Settings  ← Click aquí             │
│    ├─ General                           │
│    ├─ Database  ← Click aquí           │
│    │   └─ Connection string            │
│    │       └─ [URI]  ← Click aquí      │
│    │           └─ postgresql://...     │
│    ├─ API                               │
│    └─ ...                               │
└─────────────────────────────────────────┘
```

## 🔑 Pasos Rápidos

1. **Settings** (⚙️) en el menú lateral
2. **Database** en el submenú
3. Scroll hacia abajo hasta **"Connection string"**
4. Click en la pestaña **"URI"**
5. Verás: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
6. **Reemplaza `[YOUR-PASSWORD]`** con tu contraseña real
7. Copia toda la URI

## ⚠️ Importante

- `[YOUR-PASSWORD]` NO es tu contraseña real, es un placeholder
- Debes reemplazarlo con la contraseña que creaste al crear el proyecto
- Si no la recuerdas, usa "Reset database password" en la misma página

## ✅ Formato Final

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD_REAL@db.xxxxx.supabase.co:5432/postgres"
```
