# 🔧 Construir la Connection String Manualmente

## ✅ Solución Rápida

Ya que no encuentras la sección "Connection string" en Supabase, podemos construirla manualmente con tu Project ID.

---

## 📋 Datos que Necesitas

### 1. Project ID
Tu Project ID es: **`tiyrzndfqjhydfrurbhz`** (lo veo en la URL de tu navegador)

### 2. Host
Con tu Project ID, el host es:
```
db.tiyrzndfqjhydfrurbhz.supabase.co
```

### 3. Puerto
El puerto estándar de PostgreSQL: **`5432`**

### 4. Database
Nombre de la base de datos: **`postgres`** (por defecto)

### 5. Usuario
Usuario por defecto: **`postgres`**

### 6. Contraseña
La contraseña que creaste al crear el proyecto, o resetea una nueva.

---

## 🔑 Paso 1: Obtener o Resetear la Contraseña

### Opción A: Si recuerdas tu contraseña
Úsala directamente.

### Opción B: Si NO la recuerdas
1. En la página de Database Settings que estás viendo
2. Click en **"Reset database password"**
3. Supabase te generará una nueva contraseña
4. **⚠️ IMPORTANTE**: Copia esta contraseña inmediatamente (no la podrás ver de nuevo)

---

## 🔨 Paso 2: Construir la URI

### Formato:
```
postgresql://postgres:TU_PASSWORD@db.tiyrzndfqjhydfrurbhz.supabase.co:5432/postgres
```

### Ejemplo (reemplaza `TU_PASSWORD` con tu contraseña real):
```
postgresql://postgres:MiPassword123@db.tiyrzndfqjhydfrurbhz.supabase.co:5432/postgres
```

---

## 💾 Paso 3: Guardar en .env.local

1. En la raíz de tu proyecto, crea o edita el archivo `.env.local`
2. Agrega esta línea (reemplaza `TU_PASSWORD` con tu contraseña real):

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.tiyrzndfqjhydfrurbhz.supabase.co:5432/postgres"
```

**Ejemplo completo:**
```env
DATABASE_URL="postgresql://postgres:MiPassword123@db.tiyrzndfqjhydfrurbhz.supabase.co:5432/postgres"
```

---

## ✅ Paso 4: Verificar

Ejecuta este comando para probar la conexión:

```bash
npm run db:test-supabase
```

Deberías ver: `✅ Conexión exitosa!`

---

## ⚠️ Importante: Caracteres Especiales en la Contraseña

Si tu contraseña tiene caracteres especiales (`@`, `#`, `%`, etc.), necesitas codificarlos en la URI:

| Carácter | Código URL |
|----------|------------|
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `=` | `%3D` |
| `?` | `%3F` |
| `/` | `%2F` |
| ` ` (espacio) | `%20` |

**Ejemplo:**
- Contraseña: `MiPass@123#`
- En la URI: `MiPass%40123%23`

**Recomendación**: Si reseteas la contraseña, usa una sin caracteres especiales para evitar problemas.

---

## 🎯 Resumen

1. **Resetea la contraseña** (si no la recuerdas) → Click en "Reset database password"
2. **Copia la nueva contraseña**
3. **Construye la URI**:
   ```
   postgresql://postgres:TU_PASSWORD@db.tiyrzndfqjhydfrurbhz.supabase.co:5432/postgres
   ```
4. **Guarda en `.env.local`** con comillas dobles
5. **Prueba**: `npm run db:test-supabase`

---

¿Quieres que te ayude a construir la URI una vez que tengas la contraseña? 🚀
