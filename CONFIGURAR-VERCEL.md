# 🚀 Configurar Vercel - Guía Paso a Paso

## ✅ Lo que Ya Tienes

- ✅ Repositorio conectado: `espositofacundo/synapse-financiadores`
- ✅ Framework: Next.js (detectado automáticamente)
- ✅ Root Directory: `./`
- ✅ Branch: `master` (o `main`)

---

## ⚠️ IMPORTANTE: Antes de Deploy

**NO hagas click en "Deploy" todavía**. Primero necesitas configurar las variables de entorno.

---

## Paso 1: Obtener Connection Pooling URI de Supabase (2 min)

### 1.1 Ir a Supabase

1. Ve a https://supabase.com
2. Selecciona tu proyecto `synapse-financiadores`
3. Ve a **Settings** (⚙️) → **Database**

### 1.2 Obtener Connection Pooling URI

1. Scroll hacia abajo hasta **"Connection pooling"**
2. Selecciona **"Session mode"**
3. Copia la **Connection String** (URI de pooling)
   - Se ve así: `postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
   - **Puerto 6543** (no 5432)
   - Tiene `pooler.supabase.com` en el host
   - Tiene `?pgbouncer=true` al final

**⚠️ IMPORTANTE**: Esta es diferente a la URI directa. Usa esta para producción.

---

## Paso 2: Configurar Variables de Entorno en Vercel

### 2.1 Antes de Deploy

En la página de Vercel donde estás ahora:

1. **NO hagas click en "Deploy" todavía**
2. Busca la sección **"Environment Variables"** o **"Configure Project"**
3. Si no la ves, haz click en **"Deploy"** primero, pero luego ve a Settings

### 2.2 Agregar DATABASE_URL

**Opción A: Antes del Deploy (si está disponible)**

1. En la página de configuración, busca **"Environment Variables"**
2. Click en **"Add"** o **"Add New"**
3. Completa:
   - **Name**: `DATABASE_URL`
   - **Value**: Pega la URI de **Connection Pooling** que copiaste
   - **Environments**: Marca las tres:
     - ☑️ Production
     - ☑️ Preview  
     - ☑️ Development
4. Click **"Save"**

**Opción B: Después del Deploy (más común)**

1. Haz click en **"Deploy"** (aunque falle, es normal)
2. Una vez que termine (o falle), ve a tu proyecto en Vercel
3. Click en **"Settings"** (en el menú superior)
4. Click en **"Environment Variables"** (en el menú lateral)
5. Click en **"Add New"**
6. Completa:
   - **Name**: `DATABASE_URL`
   - **Value**: Pega la URI de Connection Pooling
   - **Environments**: Marca las tres (Production, Preview, Development)
7. Click **"Save"**

---

## Paso 3: Verificar Configuración del Proyecto

En la página de Vercel, verifica:

- **Framework Preset**: Next.js ✅
- **Root Directory**: `./` ✅
- **Build Command**: `npm run build` ✅ (debería estar automático)
- **Output Directory**: `.next` ✅ (debería estar automático)
- **Install Command**: `npm install` ✅ (debería estar automático)

Si algo está mal, haz click en **"Edit"** para cambiarlo.

---

## Paso 4: Deploy (5-10 min)

1. Una vez configurada la variable `DATABASE_URL`, haz click en **"Deploy"**
2. Vercel comenzará a construir tu aplicación
3. Verás el progreso en tiempo real
4. Espera a que termine (5-10 minutos)

**⚠️ El primer deploy puede fallar** si las migraciones no están aplicadas. Esto es normal - lo arreglaremos en el siguiente paso.

---

## Paso 5: Aplicar Migraciones (3 min)

Después del deploy (aunque haya fallado), necesitas aplicar el schema a la base de datos:

### Desde tu máquina local:

```powershell
# Usa la URI de Connection Pooling (puerto 6543)
$env:DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
npx prisma migrate deploy
```

**⚠️ Reemplaza** `xxxxx` y `[PASSWORD]` con tus valores reales de Supabase.

---

## Paso 6: Crear Usuarios en Producción (2 min)

```powershell
$env:DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
npm run db:setup-prod
```

---

## Paso 7: Verificar Deployment

1. Una vez que el deploy termine, Vercel te dará una URL:
   - Ejemplo: `https://synapse-financiadores.vercel.app`
2. Visita la URL
3. Deberías ver la pantalla de login con el logo de UMA
4. Prueba login con:
   - `admin@demo.com` / `demo123`

---

## ✅ Checklist

- [ ] Connection Pooling URI copiada de Supabase
- [ ] `DATABASE_URL` configurada en Vercel (Connection Pooling)
- [ ] Deploy completado
- [ ] Migraciones aplicadas (`npx prisma migrate deploy`)
- [ ] Usuarios creados (`npm run db:setup-prod`)
- [ ] Aplicación funciona en la URL de Vercel

---

## 🔧 Troubleshooting

### Error: "Database connection failed"

**Causa**: Usaste la URI directa en lugar de Connection Pooling.

**Solución**:
- Usa la URI de **Connection Pooling** (puerto 6543, con `pooler.supabase.com`)
- Verifica que la contraseña sea correcta

### Error: "Table does not exist"

**Solución**:
```powershell
$env:DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
npx prisma migrate deploy
```

### Build falla en Vercel

**Revisa**:
1. Logs de build en Vercel (click en el deploy fallido)
2. Variables de entorno configuradas
3. `DATABASE_URL` correcta (Connection Pooling)

---

¿Necesitas ayuda con algún paso específico? 🚀
