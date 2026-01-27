# 📤 Subir Código a GitHub

## Opción 1: Usar GitHub Desktop (Más Fácil) ⭐ Recomendado

### Paso 1: Instalar GitHub Desktop

1. Ve a https://desktop.github.com
2. Descarga e instala GitHub Desktop
3. Inicia sesión con tu cuenta de GitHub

### Paso 2: Clonar/Agregar Repositorio

1. En GitHub Desktop, click en **"File"** → **"Add Local Repository"**
2. Click en **"Choose..."** y selecciona la carpeta: `C:\Users\fesposito\Desktop\Nueva carpeta (2)`
3. Si te pregunta si quieres crear un repositorio, click en **"Create a Repository"**
4. En "Remote repository URL", pega: `https://github.com/espositofacundo/synapse-financiadores.git`
5. Click en **"Create Repository"**

### Paso 3: Hacer Commit y Push

1. En GitHub Desktop, verás todos los archivos sin commitear
2. En la parte inferior, escribe un mensaje: `"Preparado para producción - Synapse Financiadores"`
3. Click en **"Commit to main"**
4. Click en **"Push origin"** (botón en la parte superior)

¡Listo! Tu código estará en GitHub.

---

## Opción 2: Instalar Git y Usar Terminal

### Paso 1: Instalar Git

1. Ve a https://git-scm.com/download/win
2. Descarga Git para Windows
3. Instala con las opciones por defecto
4. **Reinicia PowerShell** después de instalar

### Paso 2: Configurar Git (Primera vez)

```powershell
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

### Paso 3: Inicializar y Subir

Abre PowerShell en la carpeta del proyecto y ejecuta:

```powershell
cd "C:\Users\fesposito\Desktop\Nueva carpeta (2)"

# Inicializar Git
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Preparado para producción - Synapse Financiadores"

# Agregar remote
git remote add origin https://github.com/espositofacundo/synapse-financiadores.git

# Cambiar a branch main
git branch -M main

# Subir código
git push -u origin main
```

Si te pide autenticación:
- Usa tu **Personal Access Token** de GitHub (no tu contraseña)
- Para crear uno: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token

---

## Opción 3: Usar GitHub Web (Solo archivos pequeños)

Si tienes pocos archivos, puedes subirlos directamente desde la web:

1. Ve a https://github.com/espositofacundo/synapse-financiadores
2. Click en **"uploading an existing file"**
3. Arrastra los archivos (pero esto es tedioso para muchos archivos)

---

## ⚠️ Importante: Verificar .gitignore

Antes de subir, asegúrate de que estos archivos NO se suban:

- `.env.local` ✅ (ya está en .gitignore)
- `dev.db` ✅ (ya está en .gitignore)
- `node_modules/` ✅ (ya está en .gitignore)

---

## ✅ Después de Subir

Una vez que el código esté en GitHub:

1. Ve a https://github.com/espositofacundo/synapse-financiadores
2. Verifica que todos los archivos estén ahí
3. Continúa con el deployment en Vercel (Paso 4 de `DEPLOY-AHORA.md`)

---

## 🎯 Recomendación

**Usa GitHub Desktop** - es la forma más fácil y visual para subir código si no estás familiarizado con Git.

¿Necesitas ayuda con algún paso específico? 🚀
