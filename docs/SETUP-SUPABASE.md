# 🗄️ Guía Completa: Configurar Supabase

## Paso 1: Crear Cuenta en Supabase

1. Ve a https://supabase.com
2. Click en **"Start your project"** o **"Sign up"**
3. Puedes registrarte con:
   - GitHub (recomendado)
   - Email
   - Google

---

## Paso 2: Crear Nuevo Proyecto

1. Una vez dentro del dashboard, click en **"New Project"**
2. Completa el formulario:

   **Organization** (si es tu primer proyecto):
   - Crea una nueva organización o selecciona una existente
   - Nombre: `Synapse` o el que prefieras

   **Project Details**:
   - **Name**: `synapse-financiadores` (o el nombre que prefieras)
   - **Database Password**: 
     - ⚠️ **IMPORTANTE**: Guarda esta contraseña en un lugar seguro
     - Debe tener al menos 8 caracteres
     - Ejemplo: `MiPasswordSeguro123!`
   - **Region**: Elige la más cercana a tus usuarios
     - Para Argentina: `South America (São Paulo)`
     - Para España: `West EU (Ireland)`
     - Para USA: `US East (North Virginia)`

3. Click en **"Create new project"**
4. Espera 2-3 minutos mientras se crea el proyecto

---

## Paso 3: Obtener Connection String (URI)

Una vez que el proyecto esté listo:

1. En el menú lateral, ve a **"Settings"** (⚙️)
2. Click en **"Database"**
3. Busca la sección **"Connection string"**
4. Selecciona la pestaña **"URI"** (no "Connection Pooling" por ahora)
5. Verás algo como:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
6. **Reemplaza `[YOUR-PASSWORD]`** con la contraseña que creaste en el Paso 2
7. **Copia la URI completa**. Debería verse así:
   ```
   postgresql://postgres:MiPasswordSeguro123!@db.abcdefghijklmnop.supabase.co:5432/postgres
   ```

⚠️ **IMPORTANTE**: Esta URI contiene tu contraseña. No la compartas públicamente.

---

## Paso 4: Configurar Variables de Entorno

### Opción A: Para Desarrollo Local (Opcional)

Crea un archivo `.env.local` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
NODE_ENV=development
```

### Opción B: Para Producción (Vercel)

Cuando despliegues en Vercel, agrega esta variable en la configuración del proyecto.

---

## Paso 5: Actualizar Prisma Schema

Edita `prisma/schema.prisma` y cambia:

```prisma
datasource db {
  provider = "postgresql"  // ← Cambiar de "sqlite"
  url      = env("DATABASE_URL")
}
```

---

## Paso 6: Probar Conexión Localmente

### 6.1 Configurar .env.local

Crea `.env.local` con tu URI de Supabase:

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

### 6.2 Generar Prisma Client

```bash
npx prisma generate
```

### 6.3 Aplicar Schema a PostgreSQL

```bash
npx prisma db push
```

Esto creará todas las tablas en tu base de datos de Supabase.

### 6.4 Verificar Conexión

```bash
npm run db:check-postgres
```

Deberías ver: `✅ Conexión a PostgreSQL exitosa`

---

## Paso 7: Seed Inicial (Opcional)

Para crear usuarios demo y datos de prueba:

```bash
npm run db:seed
```

O solo usuarios:

```bash
npm run db:setup-prod
```

---

## Paso 8: Verificar en Supabase Dashboard

1. Ve a tu proyecto en Supabase
2. En el menú lateral, click en **"Table Editor"**
3. Deberías ver todas las tablas creadas:
   - `User`
   - `Patient`
   - `OnboardingCase`
   - `PatientQuote`
   - etc.

---

## 🔒 Seguridad: Connection Pooling (Recomendado para Producción)

Para producción, Supabase recomienda usar **Connection Pooling**:

1. En Supabase Dashboard → Settings → Database
2. Busca **"Connection Pooling"**
3. Selecciona **"Session mode"**
4. Copia la nueva URI (tiene un puerto diferente, usualmente 6543)
5. Usa esta URI en producción en lugar de la URI directa

La URI de pooling se ve así:
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Ventajas**:
- Mejor rendimiento
- Maneja mejor las conexiones concurrentes
- Recomendado para Vercel y otras plataformas serverless

---

## 🧪 Probar la Conexión

### Desde tu código local:

1. Asegúrate de tener `.env.local` con `DATABASE_URL`
2. Ejecuta:
   ```bash
   npm run dev
   ```
3. Abre http://localhost:3000
4. Deberías poder hacer login con los usuarios demo

### Verificar en Supabase:

1. Ve a **"Table Editor"** en Supabase
2. Click en la tabla `User`
3. Deberías ver los usuarios demo creados

---

## 📊 Herramientas Útiles en Supabase

### SQL Editor
- Ejecuta queries SQL directamente
- Útil para debugging y consultas complejas

### Table Editor
- Ver y editar datos visualmente
- Útil para verificar que los datos se crearon correctamente

### Database → Connection Pooling
- Configurar pooling para producción
- Ver estadísticas de conexiones

### Settings → API
- Aquí puedes ver las keys de API (no necesarias para Prisma)
- Útil si quieres usar el SDK de Supabase en el futuro

---

## ⚠️ Troubleshooting

### Error: "password authentication failed"

**Causa**: La contraseña en la URI no coincide con la del proyecto.

**Solución**:
1. Ve a Settings → Database
2. Click en "Reset database password"
3. Genera una nueva contraseña
4. Actualiza la URI con la nueva contraseña

### Error: "Connection timeout"

**Causas posibles**:
1. Firewall bloqueando la conexión
2. IP no permitida

**Solución**:
1. En Supabase → Settings → Database
2. Ve a "Network Restrictions"
3. Asegúrate de que "Allow all IPs" esté habilitado (para desarrollo)
4. Para producción, agrega las IPs de Vercel

### Error: "relation does not exist"

**Causa**: Las tablas no se han creado aún.

**Solución**:
```bash
npx prisma db push
```

### Error: "too many connections"

**Causa**: Estás usando la URI directa en producción (sin pooling).

**Solución**:
- Usa Connection Pooling URI en producción
- Ve a Settings → Database → Connection Pooling
- Usa la URI de pooling (puerto 6543)

---

## ✅ Checklist de Configuración

- [ ] Cuenta de Supabase creada
- [ ] Proyecto creado
- [ ] Contraseña guardada de forma segura
- [ ] Connection String (URI) copiada
- [ ] `.env.local` creado con `DATABASE_URL`
- [ ] `prisma/schema.prisma` actualizado a `postgresql`
- [ ] `npx prisma generate` ejecutado
- [ ] `npx prisma db push` ejecutado
- [ ] Conexión verificada (`npm run db:check-postgres`)
- [ ] Usuarios demo creados (`npm run db:setup-prod`)
- [ ] Aplicación funciona localmente con Supabase

---

## 🚀 Siguiente Paso: Deploy en Vercel

Una vez que Supabase esté configurado y funcionando localmente:

1. Agrega `DATABASE_URL` como variable de entorno en Vercel
2. Usa la URI de **Connection Pooling** para producción
3. Deploy y verifica

Revisa `DEPLOY-STEPS.md` para continuar con el deployment.

---

## 📝 Notas Importantes

1. **Plan Gratuito de Supabase**:
   - 500 MB de base de datos
   - 2 GB de ancho de banda
   - Suficiente para desarrollo y pruebas

2. **Límites**:
   - Máximo 2 proyectos en plan gratuito
   - Si necesitas más, considera el plan Pro ($25/mes)

3. **Backups**:
   - Supabase hace backups automáticos diarios
   - Puedes restaurar desde Settings → Database → Backups

4. **Migraciones**:
   - Usa `npx prisma migrate dev` para desarrollo
   - Usa `npx prisma migrate deploy` para producción

---

¿Necesitas ayuda con algún paso específico? 🚀
