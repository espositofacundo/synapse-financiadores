# ⚡ Quick Start: Supabase en 5 Minutos

## 🎯 Objetivo
Conectar tu aplicación a Supabase y tenerla funcionando en 5 minutos.

---

## Paso 1: Crear Proyecto en Supabase (2 min)

1. Ve a https://supabase.com → **"Start your project"**
2. Registrate (puedes usar GitHub)
3. **"New Project"**
4. Completa:
   - **Name**: `synapse-financiadores`
   - **Password**: (guarda esta contraseña ⚠️)
   - **Region**: Elige la más cercana
5. Click **"Create new project"**
6. Espera 2-3 minutos

---

## Paso 2: Obtener Connection String (1 min)

1. En Supabase Dashboard → **Settings** (⚙️) → **Database**
2. Busca **"Connection string"** → Pestaña **"URI"**
3. Copia la URI (se ve así):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
4. **Reemplaza `[YOUR-PASSWORD]`** con tu contraseña del Paso 1
5. **Copia la URI completa**

> 📖 **¿Necesitas ayuda detallada?** Revisa `docs/COPIAR-CONNECTION-STRING.md` para instrucciones paso a paso con capturas y troubleshooting.

---

## Paso 3: Configurar Localmente (1 min)

1. Crea archivo `.env.local` en la raíz del proyecto:
   ```env
   DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
   ```

2. Actualiza `prisma/schema.prisma` línea 9:
   ```prisma
   datasource db {
     provider = "postgresql"  // ← Cambiar de "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

---

## Paso 4: Probar Conexión (1 min)

```bash
# Generar Prisma Client
npx prisma generate

# Aplicar schema a Supabase
npx prisma db push

# Probar conexión
npm run db:test-supabase
```

Deberías ver: `✅ Conexión exitosa!`

---

## Paso 5: Crear Usuarios Demo (Opcional)

```bash
npm run db:setup-prod
```

---

## ✅ Verificar

1. Ejecuta la app:
   ```bash
   npm run dev
   ```

2. Abre http://localhost:3000

3. Login con:
   - `admin@demo.com` / `demo123`

4. En Supabase Dashboard → **Table Editor**, deberías ver las tablas creadas

---

## 🚀 Listo para Producción

Cuando despliegues en Vercel:

1. Agrega `DATABASE_URL` como variable de entorno
2. Usa la URI de **Connection Pooling** (Settings → Database → Connection Pooling)
3. Deploy

---

## ❓ ¿Problemas?

Ejecuta:
```bash
npm run db:test-supabase
```

Este script te dirá exactamente qué está mal.

---

## 📚 Más Detalles

Revisa `docs/SETUP-SUPABASE.md` para la guía completa.
