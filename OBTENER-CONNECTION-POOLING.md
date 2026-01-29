# 🔗 Obtener Connection Pooling URI de Supabase

## 📍 Ubicación en Supabase

1. Ve a https://supabase.com
2. Selecciona tu proyecto `synapse-financiadores`
3. **Settings** (⚙️) → **Database**
4. Scroll hacia abajo hasta **"Connection pooling"**
5. Selecciona **"Session mode"**
6. Copia la **Connection String** (URI de pooling)

---

## 📋 Formato de la URI

La URI de Connection Pooling se ve así:

```
postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Características**:
- ✅ Puerto **6543** (no 5432)
- ✅ Host tiene `pooler.supabase.com`
- ✅ Termina con `?pgbouncer=true`
- ⚠️ Reemplaza `[PASSWORD]` con tu contraseña real

---

## 💡 Si Ya la Tienes Guardada

Si ya copiaste la URI antes, solo necesitas:
1. Reemplazar `[PASSWORD]` con tu contraseña real
2. Usarla en Vercel como variable `DATABASE_URL`

---

## 🔑 Tu Contraseña

Tu contraseña de Supabase es: **`synapse-financiadores`** (la que usaste cuando creaste el proyecto)

---

## ✅ Ejemplo Completo

Si tu Project ID es `tiyrzndfqjhydfrurbhz` y tu contraseña es `synapse-financiadores`, la URI sería:

```
postgresql://postgres.tiyrzndfqjhydfrurbhz:synapse-financiadores@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**⚠️ IMPORTANTE**: 
- El Project ID puede ser diferente
- La región puede ser diferente (no siempre `us-east-1`)
- Usa la URI exacta que te da Supabase

---

¿Necesitas obtenerla de nuevo o ya la tienes? 🚀
