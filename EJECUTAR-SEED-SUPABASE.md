# 🌱 Ejecutar Seed en Supabase

## ⚠️ Problema

Cuando ejecutas `npm run db:seed` sin especificar la `DATABASE_URL`, Prisma usa SQLite local en lugar de Supabase.

## ✅ Solución

Ejecuta el seed con la variable de entorno `DATABASE_URL` apuntando a Supabase:

### En PowerShell:

```powershell
$env:DATABASE_URL="postgresql://postgres:synapse-financiadores@db.tiyrzndfqjhydfrurbhz.supabase.co:5432/postgres"
npm run db:seed
```

### O ejecuta directamente:

```powershell
$env:DATABASE_URL="postgresql://postgres:synapse-financiadores@db.tiyrzndfqjhydfrurbhz.supabase.co:5432/postgres"
npx tsx prisma/seed.ts
```

## ⏱️ Tiempo de Ejecución

El seed puede tardar **5-10 minutos** porque:
- Crea 50 pacientes
- Crea 50 afiliados
- Crea 30 prestadores
- Crea 550 consultas
- Procesa auditoría para cada consulta
- Crea casos de onboarding con historial

## ✅ Verificar Progreso

Para verificar si el seed se completó:

```powershell
$env:DATABASE_URL="postgresql://postgres:synapse-financiadores@db.tiyrzndfqjhydfrurbhz.supabase.co:5432/postgres"
npx tsx scripts/check-data.ts
```

Deberías ver:
- OnboardingCases: ~40-50
- Patients: 50
- PatientQuotes: ~40-50
- Users: 4

## 🔄 Si el Seed Falla

Si ves errores de foreign key constraint, el orden de eliminación ya está corregido en el código. Solo vuelve a ejecutar el comando.

## 📝 Nota

El archivo `.env.local` contiene la `DATABASE_URL`, pero los scripts de Node.js no lo leen automáticamente. Next.js sí lo lee cuando ejecutas `npm run dev`, pero los scripts de seed necesitan la variable de entorno explícitamente.
