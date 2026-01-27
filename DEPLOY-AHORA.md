# 🚀 Deploy a Producción - Guía Paso a Paso

## ✅ Pre-requisitos Completados

- [x] Supabase configurado
- [x] Base de datos con datos
- [x] Prisma configurado para PostgreSQL
- [x] `.env.local` con DATABASE_URL

---

## Paso 1: Verificar Build Local (2 min)

Antes de deployar, asegúrate de que el build funciona:

```powershell
npm run build
```

Si hay errores, corrígelos antes de continuar.

---

## Paso 2: Preparar Repositorio Git (5 min)

### 2.1 Verificar estado de Git

```powershell
git status
```

### 2.2 Si NO tienes repositorio Git:

```powershell
git init
git add .
git commit -m "Preparado para producción - Synapse Financiadores"
```

### 2.3 Si YA tienes repositorio:

```powershell
git add .
git commit -m "Preparado para producción"
```

### 2.4 Crear repositorio en GitHub (si no existe)

1. Ve a https://github.com
2. Click en **"New repository"**
3. Nombre: `synapse-financiadores` (o el que prefieras)
4. **NO** marques "Initialize with README"
5. Click **"Create repository"**

### 2.5 Conectar y subir código

```powershell
# Si es la primera vez
git remote add origin https://github.com/TU_USUARIO/synapse-financiadores.git
git branch -M main
git push -u origin main

# Si ya existe el remote
git push
```

**⚠️ IMPORTANTE**: Asegúrate de que `.env.local` NO esté en el repositorio (ya está en `.gitignore`).

---

## Paso 3: Obtener Connection Pooling URI de Supabase (2 min)

Para producción, usa **Connection Pooling** en lugar de la URI directa:

1. Ve a tu proyecto en Supabase
2. **Settings** → **Database**
3. Scroll hasta **"Connection pooling"**
4. Selecciona **"Session mode"**
5. Copia la **Connection String** (URI de pooling)
   - Se ve así: `postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
   - **Puerto 6543** (no 5432)
   - Tiene `pooler.supabase.com` en el host

**Guarda esta URI** - la necesitarás en el siguiente paso.

---

## Paso 4: Crear Proyecto en Vercel (5 min)

### 4.1 Crear cuenta / Iniciar sesión

1. Ve a https://vercel.com
2. Click en **"Sign Up"** o **"Log In"**
3. Puedes usar GitHub (recomendado) para conectar automáticamente

### 4.2 Importar Proyecto

1. En el dashboard de Vercel, click en **"Add New..."**
2. Selecciona **"Project"**
3. Si usaste GitHub, verás tus repositorios
4. Selecciona `synapse-financiadores` (o el nombre de tu repo)
5. Click en **"Import"**

### 4.3 Configurar Proyecto

Vercel detectará automáticamente:
- **Framework Preset**: Next.js ✅
- **Root Directory**: `./` ✅
- **Build Command**: `npm run build` ✅
- **Output Directory**: `.next` ✅

**NO hagas click en "Deploy" todavía** - primero configura las variables de entorno.

---

## Paso 5: Configurar Variables de Entorno (3 min)

### 5.1 Agregar DATABASE_URL

1. En la página de configuración del proyecto, busca **"Environment Variables"**
2. Click en **"Add"** o **"Add New"**
3. Completa:
   - **Name**: `DATABASE_URL`
   - **Value**: Pega la URI de **Connection Pooling** que copiaste en el Paso 3
   - **Environments**: Marca las tres:
     - ☑️ Production
     - ☑️ Preview
     - ☑️ Development
4. Click **"Save"**

### 5.2 Agregar NODE_ENV (Opcional pero recomendado)

1. Click en **"Add"** nuevamente
2. Completa:
   - **Name**: `NODE_ENV`
   - **Value**: `production`
   - **Environments**: Solo ☑️ Production
3. Click **"Save"**

---

## Paso 6: Deploy (5-10 min)

1. Una vez configuradas las variables de entorno, click en **"Deploy"**
2. Vercel comenzará a construir tu aplicación
3. Verás el progreso en tiempo real
4. Espera a que termine (5-10 minutos)

**⚠️ El primer deploy puede fallar** si las migraciones no están aplicadas. Esto es normal - lo arreglaremos en el siguiente paso.

---

## Paso 7: Aplicar Migraciones a la Base de Datos (3 min)

Después del primer deploy (aunque haya fallado), necesitas aplicar el schema:

### Opción A: Desde tu máquina local

```powershell
$env:DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
npx prisma migrate deploy
```

**⚠️ Usa la URI de Connection Pooling aquí también.**

### Opción B: Desde Vercel CLI

1. Instala Vercel CLI:
   ```powershell
   npm i -g vercel
   ```

2. Login:
   ```powershell
   vercel login
   ```

3. Link al proyecto:
   ```powershell
   vercel link
   ```

4. Ejecutar migraciones:
   ```powershell
   vercel env pull .env.production
   npx prisma migrate deploy
   ```

---

## Paso 8: Verificar Deployment (2 min)

1. Una vez que el deploy termine, Vercel te dará una URL:
   - Ejemplo: `https://synapse-financiadores.vercel.app`
2. Visita la URL
3. Deberías ver la pantalla de login con el logo de UMA
4. Prueba login con:
   - `admin@demo.com` / `demo123`

---

## Paso 9: Crear Usuarios en Producción (2 min)

Si los usuarios no existen en producción, créalos:

```powershell
$env:DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
npm run db:setup-prod
```

---

## ✅ Checklist Final

- [ ] Build local funciona (`npm run build`)
- [ ] Código en GitHub
- [ ] Proyecto creado en Vercel
- [ ] `DATABASE_URL` configurada (Connection Pooling)
- [ ] Deploy completado
- [ ] Migraciones aplicadas
- [ ] Usuarios creados en producción
- [ ] Aplicación funciona en la URL de Vercel

---

## 🔧 Troubleshooting

### Error: "Prisma Client not generated"

**Solución**: El build ya incluye `prisma generate`, pero si falla:
- Verifica que `package.json` tenga `"postinstall": "prisma generate"`

### Error: "Database connection failed"

**Causas posibles**:
1. `DATABASE_URL` incorrecta
2. Usaste URI directa en lugar de Connection Pooling
3. Firewall bloqueando conexiones

**Solución**:
- Usa la URI de **Connection Pooling** (puerto 6543)
- Verifica que la contraseña sea correcta
- En Supabase: Settings → Database → Network Restrictions → "Allow all IPs"

### Error: "Table does not exist"

**Solución**:
```powershell
npx prisma migrate deploy
```

### Build falla en Vercel

**Revisa**:
1. Logs de build en Vercel (click en el deploy fallido)
2. Variables de entorno configuradas
3. `DATABASE_URL` correcta
4. Prisma schema actualizado a PostgreSQL

---

## 🎯 Resumen Rápido

1. ✅ `git push` (código en GitHub)
2. ✅ Crear proyecto en Vercel
3. ✅ Agregar `DATABASE_URL` (Connection Pooling)
4. ✅ Deploy
5. ✅ `npx prisma migrate deploy`
6. ✅ `npm run db:setup-prod`
7. ✅ Verificar en la URL de Vercel

---

## 📝 Notas Importantes

1. **Connection Pooling**: Siempre usa la URI de pooling para producción (puerto 6543)
2. **Variables de Entorno**: No las compartas públicamente
3. **Migraciones**: Ejecuta `prisma migrate deploy` después del primer deploy
4. **Usuarios**: Crea los usuarios demo con `db:setup-prod` después de las migraciones

---

¿Listo para empezar? 🚀
