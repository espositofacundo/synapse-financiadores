# 🔍 Dónde Está la Connection String en Supabase (Versión Actual)

## ✅ Estás en el lugar correcto: Database Settings

Perfecto, ya estás en **Settings → Database**. Ahora necesitas encontrar la Connection String.

---

## 📍 Opción 1: Buscar "Connection string" o "Connection info"

1. **Haz scroll hacia ARRIBA** en la página (puede estar al inicio)
2. Busca una sección que diga:
   - **"Connection string"**
   - **"Connection info"**
   - **"Database connection"**
   - **"Connect to your database"**

---

## 📍 Opción 2: Dentro de "Connection pooling configuration"

1. En la sección **"Connection pooling configuration"** que estás viendo
2. Busca un botón o enlace que diga:
   - **"Show connection string"**
   - **"Connection parameters"**
   - **"View connection info"**
   - O un ícono de **"Copy"** o **"🔗"**

3. También puede haber pestañas como:
   - **URI**
   - **Connection Pooling**
   - **Direct connection**

---

## 📍 Opción 3: En la parte superior de la página

1. **Haz scroll hacia ARRIBA** (antes de "Reset database password")
2. Puede haber una sección al inicio que muestre:
   - **Host**
   - **Database name**
   - **Port**
   - **Connection string**

---

## 📍 Opción 4: Buscar en "Connection pooling" → "Shared Pooler"

1. En **"Connection pooling configuration"** → **"Shared Pooler"**
2. Puede haber un enlace o botón para ver la connection string
3. O puede estar en los **"Docs"** (el enlace de documentación)

---

## 🔧 Alternativa: Construir la URI Manualmente

Si no encuentras la Connection String, puedes construirla manualmente:

### Necesitas estos datos:

1. **Host**: `db.xxxxx.supabase.co` (donde `xxxxx` es tu project ID)
   - Lo puedes ver en la URL del navegador: `https://supabase.com/dashboard/project/tiyrzndfqjhydfrurbhz`
   - El host sería: `db.tiyrzndfqjhydfrurbhz.supabase.co`

2. **Port**: `5432` (puerto estándar de PostgreSQL)

3. **Database**: `postgres` (nombre por defecto)

4. **User**: `postgres` (usuario por defecto)

5. **Password**: La que creaste al crear el proyecto (o resetea con "Reset database password")

### Construir la URI:

```
postgresql://postgres:TU_PASSWORD@db.tiyrzndfqjhydfrurbhz.supabase.co:5432/postgres
```

**Ejemplo completo:**
```
postgresql://postgres:MiPassword123@db.tiyrzndfqjhydfrurbhz.supabase.co:5432/postgres
```

---

## 🎯 Pasos Recomendados

1. **Haz scroll hacia ARRIBA** en la página de Database Settings
2. Busca cualquier sección que mencione "Connection", "Connect", o "URI"
3. Si no la encuentras, usa la **Opción 4** (construir manualmente)

---

## 💡 Tip: Usar el Project ID

Tu Project ID es: `tiyrzndfqjhydfrurbhz` (lo veo en la URL)

Entonces tu host sería: `db.tiyrzndfqjhydfrurbhz.supabase.co`

---

## ✅ Si encuentras la Connection String

Debería verse así:
```
postgresql://postgres:[YOUR-PASSWORD]@db.tiyrzndfqjhydfrurbhz.supabase.co:5432/postgres
```

Solo necesitas reemplazar `[YOUR-PASSWORD]` con tu contraseña real.

---

## 🔄 Si no la encuentras

1. **Resetea la contraseña**: Click en "Reset database password" y copia la nueva contraseña
2. **Construye la URI manualmente** usando la fórmula de arriba
3. **Guarda en `.env.local`**:
   ```env
   DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.tiyrzndfqjhydfrurbhz.supabase.co:5432/postgres"
   ```

---

¿Puedes hacer scroll hacia arriba en la página y decirme qué secciones ves antes de "Reset database password"? O si prefieres, puedo ayudarte a construir la URI manualmente con tu Project ID. 🚀
