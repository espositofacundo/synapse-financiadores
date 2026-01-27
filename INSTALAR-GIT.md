# 📥 Instalar Git en Windows

## Paso 1: Descargar Git

1. Ve a: **https://git-scm.com/download/win**
2. Click en el botón de descarga (se descargará automáticamente la versión correcta para tu sistema)

## Paso 2: Instalar Git

1. Ejecuta el instalador descargado
2. **IMPORTANTE**: Durante la instalación:
   - Sigue las opciones por defecto (Next, Next, Next...)
   - Cuando llegues a "Choosing the default editor", puedes dejar "Nano" o elegir "Visual Studio Code" si lo prefieres
   - En "Adjusting your PATH environment", deja la opción por defecto: **"Git from the command line and also from 3rd-party software"**
   - Sigue con las opciones por defecto hasta el final
3. Click en **"Install"**
4. Espera a que termine la instalación

## Paso 3: Verificar Instalación

1. **Cierra PowerShell completamente** (cierra todas las ventanas)
2. Abre una **nueva ventana de PowerShell**
3. Ejecuta:
   ```powershell
   git --version
   ```
4. Deberías ver algo como: `git version 2.x.x`

## Paso 4: Configurar Git (Primera vez)

Ejecuta estos comandos (reemplaza con tu información):

```powershell
git config --global user.name "Facundo Esposito"
git config --global user.email "tu-email@ejemplo.com"
```

## Paso 5: Subir Código a GitHub

Una vez instalado Git, ejecuta estos comandos:

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

**⚠️ Nota sobre autenticación**: 
- Si te pide usuario y contraseña, **NO uses tu contraseña de GitHub**
- Necesitas un **Personal Access Token**
- Para crearlo: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
- Marca los permisos: `repo` (todos los permisos de repositorio)
- Copia el token y úsalo como contraseña

---

## 🎯 Alternativa Más Fácil: GitHub Desktop

Si prefieres una interfaz visual, usa **GitHub Desktop**:

1. Descarga: **https://desktop.github.com**
2. Instala e inicia sesión
3. File → Add Local Repository
4. Selecciona tu carpeta
5. Commit y Push desde la interfaz

Es mucho más fácil si no estás familiarizado con comandos de terminal.

---

¿Necesitas ayuda con algún paso? 🚀
