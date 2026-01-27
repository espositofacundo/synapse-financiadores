# 🚀 Guía Rápida de Deployment

## ¿Qué necesitas?

Para subir la aplicación a producción necesitas:

1. **Una base de datos PostgreSQL** (SQLite solo funciona en desarrollo)
2. **Una plataforma de hosting** (Vercel, Railway, Render, etc.)
3. **Un repositorio Git** (GitHub, GitLab, etc.)

## Opción Más Rápida: Vercel + Supabase

### Paso 1: Preparar el código

```bash
# Asegúrate de que todo esté commiteado
git add .
git commit -m "Preparado para producción"
git push
```

### Paso 2: Crear base de datos PostgreSQL

1. Ve a https://supabase.com (gratis)
2. Crea un nuevo proyecto
3. Copia la "Connection String" (URI de PostgreSQL)

### Paso 3: Actualizar Prisma para PostgreSQL

Edita `prisma/schema.prisma` y cambia:

```prisma
datasource db {
  provider = "postgresql"  // Cambiar de "sqlite" a "postgresql"
  url      = env("DATABASE_URL")
}
```

### Paso 4: Desplegar en Vercel

1. Ve a https://vercel.com
2. "Add New Project"
3. Conecta tu repositorio de GitHub
4. En "Environment Variables", agrega:
   - `DATABASE_URL` = (la URI de Supabase)
   - `NODE_ENV` = `production`
5. En "Build Command", asegúrate que diga: `npm run build`
6. Click "Deploy"

### Paso 5: Configurar base de datos

Después del primer deploy, en la consola de Vercel ejecuta:

```bash
npx prisma migrate deploy
npx prisma db seed
```

## Alternativa: Railway (Todo en uno)

Railway ofrece PostgreSQL + hosting:

1. Ve a https://railway.app
2. "New Project" → "Deploy from GitHub"
3. Agrega un servicio "PostgreSQL"
4. Railway automáticamente detecta `DATABASE_URL`
5. Deploy automático

## Checklist

- [ ] Código en GitHub/GitLab
- [ ] Base de datos PostgreSQL creada
- [ ] `prisma/schema.prisma` actualizado a PostgreSQL
- [ ] Variables de entorno configuradas
- [ ] Build exitoso
- [ ] Migraciones ejecutadas
- [ ] Seed ejecutado

## Problemas Comunes

**Error: "Prisma Client not generated"**
```bash
npx prisma generate
```

**Error: "Database connection failed"**
- Verifica `DATABASE_URL` en variables de entorno
- Asegúrate que la BD permita conexiones externas

**Error: "Module not found"**
- Verifica que `package.json` tenga todas las dependencias
- Ejecuta `npm install` en la plataforma

## Soporte

Revisa `docs/DEPLOYMENT.md` para más detalles.
