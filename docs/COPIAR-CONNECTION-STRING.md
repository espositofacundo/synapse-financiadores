# 📋 Guía: Cómo Copiar la Connection String de Supabase

## 🎯 Objetivo
Obtener la URI de conexión a tu base de datos PostgreSQL en Supabase.

---

## Paso 1: Acceder a Settings

1. **Inicia sesión** en https://supabase.com
2. Selecciona tu proyecto (`synapse-financiadores` o el nombre que le diste)
3. En el **menú lateral izquierdo**, busca el ícono de **⚙️ Settings** (Configuración)
4. Click en **"Settings"**

---

## Paso 2: Ir a Database

1. Dentro de Settings, verás varias opciones en el menú:
   - General
   - **Database** ← Click aquí
   - API
   - Auth
   - Storage
   - etc.

2. Click en **"Database"**

---

## Paso 3: Encontrar Connection String

1. En la página de Database, desplázate hacia abajo
2. Busca la sección **"Connection string"** o **"Connection pooling"**
3. Verás varias pestañas:
   - **URI** ← Esta es la que necesitas
   - Connection Pooling
   - Direct connection
   - etc.

4. Click en la pestaña **"URI"**

---

## Paso 4: Ver la URI

Verás algo como esto:

```
postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
```

**Importante**: 
- `[YOUR-PASSWORD]` es un placeholder
- Necesitas reemplazarlo con la contraseña real que creaste cuando creaste el proyecto

---

## Paso 5: Reemplazar la Contraseña

### Opción A: Si recuerdas tu contraseña

1. **Copia toda la URI** (Ctrl+C o Cmd+C)
2. Pégalo en un editor de texto (Notepad, VS Code, etc.)
3. Busca `[YOUR-PASSWORD]` y reemplázalo con tu contraseña real
4. Ejemplo:
   ```
   Antes: postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   Después: postgresql://postgres:MiPassword123!@db.xxxxx.supabase.co:5432/postgres
   ```

### Opción B: Si NO recuerdas tu contraseña

1. En la misma página de Database, busca el botón **"Reset database password"**
2. Click en **"Reset database password"**
3. Supabase te generará una nueva contraseña
4. **⚠️ IMPORTANTE**: Copia esta nueva contraseña inmediatamente (no la podrás ver de nuevo)
5. Reemplaza `[YOUR-PASSWORD]` en la URI con esta nueva contraseña

---

## Paso 6: Copiar la URI Completa

Una vez que hayas reemplazado `[YOUR-PASSWORD]` con tu contraseña real, la URI debería verse así:

```
postgresql://postgres:MiPassword123!@db.abcdefghijklmnop.supabase.co:5432/postgres
```

**Copia toda esta URI completa** (Ctrl+C o Cmd+C)

---

## Paso 7: Guardar en .env.local

1. En la raíz de tu proyecto, crea o edita el archivo `.env.local`
2. Agrega esta línea:

```env
DATABASE_URL="postgresql://postgres:MiPassword123!@db.abcdefghijklmnop.supabase.co:5432/postgres"
```

**Importante**:
- Usa comillas dobles `"` alrededor de la URI
- Reemplaza `MiPassword123!` y `db.abcdefghijklmnop` con tus valores reales
- No dejes espacios antes o después del `=`

---

## ✅ Verificar que Funciona

Ejecuta este comando para probar la conexión:

```bash
npm run db:test-supabase
```

Deberías ver: `✅ Conexión exitosa!`

---

## 🔍 Ubicación Visual en Supabase Dashboard

```
Supabase Dashboard
├── [Menú Lateral]
│   ├── Table Editor
│   ├── SQL Editor
│   ├── ⚙️ Settings  ← Click aquí
│   │   ├── General
│   │   ├── Database  ← Click aquí
│   │   │   └── Connection string
│   │   │       └── [Pestaña URI]  ← Click aquí
│   │   │           └── postgresql://postgres:[YOUR-PASSWORD]@...
│   │   ├── API
│   │   └── ...
```

---

## ⚠️ Errores Comunes

### Error: "password authentication failed"

**Causa**: La contraseña en la URI no es correcta.

**Solución**:
1. Verifica que hayas reemplazado `[YOUR-PASSWORD]` con tu contraseña real
2. Si no recuerdas la contraseña, resetea la contraseña de la base de datos
3. Asegúrate de que no haya espacios extra en la URI

### Error: "Connection string format incorrect"

**Causa**: La URI tiene un formato incorrecto.

**Solución**:
- Asegúrate de usar comillas dobles en `.env.local`
- Verifica que la URI comience con `postgresql://`
- No dejes espacios antes o después del `=`

### Error: "No se puede conectar"

**Causa**: La URI está mal copiada o tiene caracteres especiales sin codificar.

**Solución**:
- Si tu contraseña tiene caracteres especiales (`@`, `#`, `%`, etc.), necesitas codificarlos en URL
- Ejemplo: `@` se convierte en `%40`, `#` en `%23`
- O mejor: resetea la contraseña y usa una sin caracteres especiales

---

## 💡 Tip: Contraseñas con Caracteres Especiales

Si tu contraseña tiene caracteres especiales, necesitas codificarlos en la URI:

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

**Ejemplo**:
- Contraseña: `MiPass@123#`
- En la URI: `MiPass%40123%23`

**Recomendación**: Usa una contraseña sin caracteres especiales para evitar problemas.

---

## 📝 Ejemplo Completo

### 1. URI que ves en Supabase:
```
postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
```

### 2. Tu contraseña es: `Synapse2024!`

### 3. URI final (después de reemplazar):
```
postgresql://postgres:Synapse2024!@db.abcdefghijklmnop.supabase.co:5432/postgres
```

### 4. En `.env.local`:
```env
DATABASE_URL="postgresql://postgres:Synapse2024!@db.abcdefghijklmnop.supabase.co:5432/postgres"
```

---

## 🎯 Checklist

- [ ] Accedí a Settings → Database
- [ ] Encontré la sección "Connection string"
- [ ] Click en la pestaña "URI"
- [ ] Reemplacé `[YOUR-PASSWORD]` con mi contraseña real
- [ ] Copié la URI completa
- [ ] Guardé la URI en `.env.local` con comillas dobles
- [ ] Probé la conexión con `npm run db:test-supabase`
- [ ] Vi el mensaje `✅ Conexión exitosa!`

---

¿Necesitas ayuda con algún paso específico? 🚀
