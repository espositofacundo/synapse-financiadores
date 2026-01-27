# 🎯 Dónde Encontrar la Connection String en Supabase

## ❌ NO es aquí (lo que estás viendo ahora)

Estás viendo la sección **"PROJECT API"** que muestra:
- Project URL (para usar con el SDK de Supabase)
- Publishable API Key

**Esta NO es la Connection String que necesitas para Prisma.**

---

## ✅ SÍ es aquí (lo que necesitas)

### Paso 1: Ir a Settings

1. En el **menú lateral izquierdo** (sidebar), busca el ícono de **⚙️ Settings**
2. Click en **"Settings"**

### Paso 2: Ir a Database

1. Dentro de Settings, verás un submenú con opciones:
   - General
   - **Database** ← **Click aquí**
   - API (esta es la que estás viendo ahora, pero necesitas Database)
   - Auth
   - Storage
   - etc.

2. Click en **"Database"**

### Paso 3: Encontrar Connection String

1. En la página de Database, **desplázate hacia abajo** (scroll)
2. Busca la sección que dice **"Connection string"** o **"Connection pooling"**
3. Verás varias pestañas:
   - **URI** ← **Esta es la que necesitas**
   - Connection Pooling
   - Direct connection
   - etc.

4. Click en la pestaña **"URI"**

### Paso 4: Ver la URI

Ahí verás algo como:

```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

Esta SÍ es la Connection String que necesitas.

---

## 📍 Resumen Visual de la Navegación

```
Supabase Dashboard
│
├── [Menú Lateral Izquierdo]
│   │
│   ├── Table Editor
│   ├── SQL Editor
│   ├── ⚙️ Settings  ← PASO 1: Click aquí
│   │   │
│   │   ├── General
│   │   ├── Database  ← PASO 2: Click aquí (NO "API")
│   │   │   │
│   │   │   └── [Scroll hacia abajo]
│   │   │       │
│   │   │       └── Connection string
│   │   │           │
│   │   │           ├── [URI]  ← PASO 3: Click aquí
│   │   │           ├── Connection Pooling
│   │   │           └── Direct connection
│   │   │
│   │   └── API  ← Estás aquí ahora (NO es lo que necesitas)
│   │       └── PROJECT API (Project URL, API Keys)
│   │
│   └── ...
```

---

## 🔍 Diferencia entre API y Database

### API (donde estás ahora):
- **Project URL**: `https://xxxxx.supabase.co`
- **Publishable API Key**: Para usar con el SDK de Supabase
- **Uso**: Para aplicaciones que usan el cliente de Supabase

### Database (lo que necesitas):
- **Connection String (URI)**: `postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres`
- **Uso**: Para Prisma, herramientas de base de datos, conexiones directas a PostgreSQL

---

## ✅ Pasos Rápidos

1. **Menú lateral** → Click en **⚙️ Settings**
2. **Submenú de Settings** → Click en **"Database"** (NO "API")
3. **Scroll hacia abajo** → Busca **"Connection string"**
4. **Pestaña "URI"** → Ahí está tu Connection String

---

## 💡 Tip

Si no ves "Database" en el submenú de Settings, asegúrate de haber hecho click en "Settings" primero. A veces el submenú se colapsa.

---

¿Ya encontraste la sección Database? Si sigues teniendo problemas, avísame y te ayudo paso a paso. 🚀
