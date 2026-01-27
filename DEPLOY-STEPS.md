# 🚀 Pasos para Deployment - Guía Completa

## 📋 Checklist Pre-Deployment

Antes de empezar, verifica:

- [ ] Código funciona localmente (`npm run dev`)
- [ ] Build funciona (`npm run build`)
- [ ] Logo de UMA está en `/public/uma-logo.png`
- [ ] No hay errores de linting
- [ ] Código está en un repositorio Git

---

## Paso 1: Preparar Repositorio Git

```bash
# Si no tienes repositorio Git
git init
git add .
git commit -m "Preparado para producción - Synapse Financiadores"

# Si ya tienes repositorio
git add .
git commit -m "Preparado para producción"
git push
```

**Importante**: Asegúrate de que `.env.local` y `dev.db` NO estén en el repositorio (ya están en `.gitignore`).

---

## Paso 2: Crear Base de Datos PostgreSQL

### Opción A: Supabase (Recomendado - Gratis)

1. Ve a https://supabase.com
2. Crea cuenta (gratis)
3. "New Project"
4. Completa:
   - **Name**: synapse-financiadores
   - **Database Password**: (guarda esta contraseña)
   - **Region**: Elige la más cercana
5. Espera a que se cree (2-3 minutos)
6. Ve a "Settings" → "Database"
7. Copia la **Connection String** (URI):
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   ```
   Reemplaza `[PASSWORD]` con tu contraseña.

### Opción B: Neon (Serverless PostgreSQL - Gratis)

1. Ve a https://neon.tech
2. Crea cuenta
3. "Create Project"
4. Copia la **Connection String** que te dan

### Opción C: Railway (Todo en uno)

1. Ve a https://railway.app
2. "New Project" → "Database" → "PostgreSQL"
3. Railway genera automáticamente `DATABASE_URL`

---

## Paso 3: Actualizar Prisma para PostgreSQL

**IMPORTANTE**: Esto cambia la configuración de SQLite a PostgreSQL.

Edita `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // ← Cambiar de "sqlite" a "postgresql"
  url      = env("DATABASE_URL")
}
```

**Guarda el cambio y haz commit**:
```bash
git add prisma/schema.prisma
git commit -m "Configurar Prisma para PostgreSQL"
git push
```

---

## Paso 4: Desplegar en Vercel

### 4.1 Crear Proyecto en Vercel

1. Ve a https://vercel.com
2. Crea cuenta o inicia sesión
3. "Add New..." → "Project"
4. Conecta tu repositorio de GitHub/GitLab
5. Vercel detectará automáticamente Next.js

### 4.2 Configurar Variables de Entorno

En la configuración del proyecto, ve a "Environment Variables" y agrega:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | `postgresql://usuario:password@host:5432/database` (la URI de Supabase/Neon) |
| `NODE_ENV` | `production` |

**Importante**: 
- Marca ambas como disponibles en "Production", "Preview" y "Development"
- `DATABASE_URL` debe ser la URI completa de PostgreSQL

### 4.3 Configurar Build Settings

Vercel debería detectar automáticamente:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (ya incluye `prisma generate`)
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 4.4 Deploy

1. Click "Deploy"
2. Espera a que termine el build (2-5 minutos)
3. Si hay errores, revisa los logs

---

## Paso 5: Configurar Base de Datos en Producción

Después del primer deploy exitoso:

### 5.1 Ejecutar Migraciones

En Vercel, ve a tu proyecto → "Deployments" → Click en el último deploy → "Logs"

O mejor, usa la terminal de Vercel CLI o ejecuta en tu máquina local con las variables de producción:

```bash
# Conectar a la base de datos de producción
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy
```

**O desde Vercel Dashboard**:
1. Ve a tu proyecto
2. "Settings" → "Functions"
3. Usa el terminal integrado o ejecuta comandos via Vercel CLI

### 5.2 Seed Inicial (Opcional)

```bash
# Ejecutar seed para crear usuarios demo y datos de prueba
npx prisma db seed
```

O ejecuta el script de setup:
```bash
npm run db:setup-prod
```

---

## Paso 6: Verificar Deployment

1. Visita la URL que Vercel te dio (ej: `tu-proyecto.vercel.app`)
2. Deberías ver la pantalla de login con el logo de UMA
3. Prueba login con:
   - `admin@demo.com` / `demo123`
   - `cotizador@demo.com` / `demo123`

---

## 🔧 Troubleshooting

### Error: "Prisma Client not generated"

**Solución**:
```bash
npx prisma generate
```

El script `build` ya incluye esto, pero si falla, ejecuta manualmente.

### Error: "Database connection failed"

**Causas posibles**:
1. `DATABASE_URL` incorrecta
2. Base de datos no permite conexiones externas
3. Firewall bloqueando la IP

**Solución**:
- Verifica la URI de conexión
- En Supabase: Settings → Database → "Connection Pooling" → Usa "Session mode"
- Verifica que la contraseña esté correcta en la URI

### Error: "Table does not exist"

**Solución**:
```bash
npx prisma migrate deploy
```

### Error: "Module not found"

**Solución**:
- Verifica que todas las dependencias estén en `package.json`
- Vercel ejecuta `npm install` automáticamente

### Build falla en Vercel

**Revisa**:
1. Logs de build en Vercel
2. Variables de entorno configuradas
3. `DATABASE_URL` correcta
4. Prisma schema actualizado a PostgreSQL

---

## 📝 Comandos Útiles Post-Deployment

```bash
# Verificar conexión a PostgreSQL
npm run db:check-postgres

# Setup inicial de usuarios
npm run db:setup-prod

# Aplicar nuevas migraciones
npm run db:migrate

# Seed datos de prueba
npm run db:seed
```

---

## 🔄 Actualizar Código en Producción

Cada vez que hagas cambios:

1. **Commit y push**:
   ```bash
   git add .
   git commit -m "Descripción del cambio"
   git push
   ```

2. **Vercel despliega automáticamente** desde tu repositorio

3. **Si cambias el schema de Prisma**:
   ```bash
   # Localmente, crea la migración
   npx prisma migrate dev --name nombre-migracion
   git add prisma/migrations
   git commit -m "Nueva migración"
   git push
   
   # En producción, aplica la migración
   npm run db:migrate
   ```

---

## 🎯 Resumen Rápido

1. ✅ Código en Git
2. ✅ Base de datos PostgreSQL (Supabase/Neon)
3. ✅ `prisma/schema.prisma` → `provider = "postgresql"`
4. ✅ Deploy en Vercel
5. ✅ Variables de entorno: `DATABASE_URL` y `NODE_ENV`
6. ✅ `npx prisma migrate deploy`
7. ✅ `npm run db:setup-prod` (opcional)

---

## 📞 ¿Necesitas Ayuda?

Si encuentras problemas:
1. Revisa los logs de Vercel
2. Verifica variables de entorno
3. Prueba conexión a PostgreSQL localmente
4. Revisa `docs/DEPLOYMENT.md` para más detalles

¡Listo para producción! 🚀
