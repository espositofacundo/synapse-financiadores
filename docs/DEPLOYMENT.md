# Guía de Deployment - Synapse Financiadores

Esta guía te ayudará a desplegar la aplicación en una plataforma pública.

## Requisitos Previos

1. **Base de datos PostgreSQL**: SQLite solo funciona en desarrollo. Para producción necesitas PostgreSQL.
2. **Cuenta en plataforma de hosting**: Vercel (recomendado), Railway, Render, o similar.
3. **Repositorio Git**: Código subido a GitHub, GitLab, etc.

## Opciones de Deployment

### Opción 1: Vercel (Recomendado para Next.js)

Vercel es la plataforma oficial de Next.js y la más sencilla.

#### Pasos:

1. **Preparar el repositorio**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <tu-repositorio>
   git push -u origin main
   ```

2. **Crear cuenta en Vercel**: https://vercel.com

3. **Importar proyecto**:
   - Conecta tu repositorio de GitHub/GitLab
   - Vercel detectará automáticamente que es Next.js

4. **Configurar variables de entorno**:
   En la configuración del proyecto en Vercel, agrega:
   ```
   DATABASE_URL=postgresql://usuario:password@host:5432/database
   NODE_ENV=production
   ```

5. **Configurar base de datos PostgreSQL**:
   - Opción A: Vercel Postgres (integrado)
   - Opción B: Servicio externo (Supabase, Neon, Railway, etc.)

6. **Configurar Build Command**:
   ```
   npm run build
   ```

7. **Configurar Install Command**:
   ```
   npm install
   ```

8. **Post-deploy script** (opcional):
   ```
   npx prisma generate && npx prisma db push && npx prisma db seed
   ```

### Opción 2: Railway

Railway ofrece PostgreSQL y hosting en un solo lugar.

#### Pasos:

1. **Crear cuenta**: https://railway.app

2. **Nuevo proyecto**:
   - "New Project" → "Deploy from GitHub repo"

3. **Agregar PostgreSQL**:
   - "New" → "Database" → "PostgreSQL"
   - Railway generará automáticamente `DATABASE_URL`

4. **Variables de entorno**:
   - Railway detecta automáticamente `DATABASE_URL` del servicio PostgreSQL
   - Agregar `NODE_ENV=production`

5. **Build y Deploy**:
   - Railway detecta Next.js automáticamente
   - Ejecuta `npm run build` y `npm start`

### Opción 3: Render

Similar a Railway, con PostgreSQL incluido.

#### Pasos:

1. **Crear cuenta**: https://render.com

2. **Nuevo Web Service**:
   - Conecta tu repositorio
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **PostgreSQL Database**:
   - "New" → "PostgreSQL"
   - Copia la "Internal Database URL"

4. **Variables de entorno**:
   ```
   DATABASE_URL=<Internal Database URL>
   NODE_ENV=production
   ```

## Configuración de Base de Datos

### Migrar de SQLite a PostgreSQL

1. **Actualizar `prisma/schema.prisma`**:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Ejecutar migraciones**:
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Generar Prisma Client**:
   ```bash
   npx prisma generate
   ```

4. **Seed inicial** (opcional):
   ```bash
   npx prisma db seed
   ```

### Servicios de PostgreSQL Recomendados

- **Vercel Postgres**: Integrado con Vercel
- **Supabase**: Gratis hasta cierto límite
- **Neon**: Serverless PostgreSQL
- **Railway**: Incluido con hosting
- **Render**: Incluido con hosting

## Checklist Pre-Deployment

- [ ] Código en repositorio Git
- [ ] Base de datos PostgreSQL configurada
- [ ] Variables de entorno configuradas
- [ ] `DATABASE_URL` apuntando a PostgreSQL
- [ ] `NODE_ENV=production`
- [ ] Prisma schema actualizado para PostgreSQL
- [ ] Migraciones ejecutadas
- [ ] Seed data ejecutado (si es necesario)
- [ ] Logo de UMA en `/public/uma-logo.png`
- [ ] Build local funciona: `npm run build`

## Variables de Entorno Requeridas

```env
DATABASE_URL=postgresql://usuario:password@host:5432/database
NODE_ENV=production
```

## Comandos Post-Deployment

Después del primer deploy, ejecuta en la consola de la plataforma:

```bash
# Generar Prisma Client
npx prisma generate

# Aplicar migraciones
npx prisma migrate deploy

# Seed inicial (opcional)
npx prisma db seed
```

## Troubleshooting

### Error: "Prisma Client not generated"
```bash
npx prisma generate
```

### Error: "Database connection failed"
- Verifica que `DATABASE_URL` esté correctamente configurada
- Verifica que la base de datos PostgreSQL esté accesible desde la plataforma
- Revisa firewall/whitelist de IPs si aplica

### Error: "Module not found"
- Verifica que `package.json` tenga todas las dependencias
- Ejecuta `npm install` en la plataforma

## Notas Importantes

1. **SQLite NO funciona en producción**: Solo para desarrollo local
2. **Archivos locales**: Los archivos en `/data` no persisten en plataformas serverless. Considera usar base de datos o almacenamiento externo.
3. **Sesiones**: Las cookies funcionan, pero en producción considera usar almacenamiento más robusto.
4. **Logs**: Revisa los logs de la plataforma para debugging.

## Soporte

Si encuentras problemas durante el deployment, revisa:
- Logs de la plataforma de hosting
- Logs de Prisma
- Variables de entorno configuradas
- Estado de la base de datos PostgreSQL
