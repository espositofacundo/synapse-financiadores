# Después del primer deploy en Render

Las credenciales demo (**aprobador@demo.com** / **demo123**, etc.) fallan porque la base de datos en producción está vacía: **los usuarios demo no existen** hasta que ejecutes el setup una vez.

## Importante: Supabase y Render

Si tu base de datos es **Supabase**, los servidores de Render **no suelen poder conectarse** al host de Supabase (`db.xxx.supabase.co:5432`) durante el arranque. Por eso:

- **No uses** el script de setup en el **Start Command** ni en el **Release Command** de Render.
- El **Start Command** debe ser solo: `npm run start`.
- Ejecuta el setup **una vez desde tu PC** (o desde cualquier máquina con acceso a Internet que pueda alcanzar Supabase).

## Pasos recomendados

### 1. Comando de inicio en Render

En **Settings** → **Build & Deploy** de tu Web Service:

- **Start Command:** `npm run start` (nada más; sin migraciones ni setup).
- **Release Command:** déjalo vacío o quita lo que tenga.

Así la app arranca aunque la base esté vacía; el login fallará hasta que crees los usuarios.

### 2. Crear usuarios demo una vez (desde tu PC)

En tu máquina, con la misma `DATABASE_URL` que usa Render (la de Supabase):

1. Copia la **Connection string** de Supabase (Dashboard → Project Settings → Database) o la variable `DATABASE_URL` que tienes en Render (Environment).
2. En la carpeta del proyecto, ejecuta (en PowerShell sustituye `$env:DATABASE_URL` por tu URL entre comillas):

   **Windows (PowerShell):**
   ```powershell
   $env:DATABASE_URL = "postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"
   npx prisma migrate deploy
   npx tsx scripts/setup-production.ts
   ```

   **Windows (CMD) / Mac / Linux:**
   ```bash
   export DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres"
   npx prisma migrate deploy
   npx tsx scripts/setup-production.ts
   ```

   Usa la URI de **connection pooling** (puerto **6543**) si Supabase te la ofrece; suele dar mejor resultado desde fuera.

3. Si todo va bien, verás mensajes de usuarios creados. A partir de ahí podrás entrar en la app en Render con:
   - **aprobador@demo.com** / **demo123**
   - **cotizador@demo.com** / **demo123**
   - **oficina@demo.com** / **demo123**
   - **admin@demo.com** / **demo123**

### 3. Volver a desplegar

Con el Start Command ya en `npm run start`, haz un **Manual Deploy** en Render. La app debería arrancar y el login funcionar si el setup se ejecutó correctamente desde tu PC.
