# 🔮 Quantum Game — Experimento GHZ/Mermin

Juego en línea para 3 jugadores que demuestra el teorema GHZ/Mermin de mecánica cuántica.

---

## 🚀 Cómo poner el juego en línea (Render.com — GRATIS)

### Paso 1: Crear una cuenta en GitHub

1. Ve a [github.com](https://github.com) y crea una cuenta gratuita (si no tienes una)
2. Inicia sesión en GitHub

### Paso 2: Subir el proyecto a GitHub

1. En GitHub, haz clic en el botón **"+"** (arriba a la derecha) → **"New repository"**
2. Ponle un nombre, por ejemplo: `quantum-game`
3. Déjalo en **Public**
4. Haz clic en **"Create repository"**
5. Sube todos los archivos de esta carpeta (`quantum_game/`) al repositorio:
   - Puedes arrastrar y soltar los archivos directamente en la página de GitHub
   - O usar el botón **"uploading an existing file"**
   - Asegúrate de subir: `server.js`, `package.json`, y la carpeta `public/` con sus 3 archivos

### Paso 3: Desplegar en Render

1. Ve a [render.com](https://render.com) y crea una cuenta gratuita (puedes usar tu cuenta de GitHub)
2. Una vez dentro, haz clic en **"New +"** → **"Web Service"**
3. Conecta tu repositorio de GitHub (`quantum-game`)
4. Configura:
   - **Name**: `quantum-game` (o el nombre que quieras)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Selecciona **"Free"**
5. Haz clic en **"Create Web Service"**
6. Espera 1-2 minutos mientras se despliega

### Paso 4: ¡Listo!

Render te dará un link tipo:
```
https://quantum-game-xxxx.onrender.com
```

**Comparte ese link con los jugadores.** Solo necesitan abrir el link en su navegador (celular o computadora).

---

## 🎮 Cómo jugar

1. Los 3 jugadores abren el link
2. Cada uno escribe su nombre y hace clic en "Ingresar al juego"
3. Cuando los 3 están conectados, comienza la partida automáticamente
4. Cada jugador recibe una tarjeta de color (roja o azul) — ¡solo ven la suya!
5. Pueden consultar al oráculo (opcional) y luego envían su respuesta (+1 o –1)
6. Al final se muestra si ganaron o perdieron juntos

---

## 🧪 Probar localmente (solo para desarrolladores)

Si quieres probar el juego en tu computadora antes de subirlo:

```bash
# 1. Instalar Node.js desde https://nodejs.org (si no lo tienes)

# 2. Abrir terminal en la carpeta del proyecto

# 3. Instalar dependencias
npm install

# 4. Iniciar el servidor
npm start

# 5. Abrir 3 pestañas en http://localhost:3000
```

---

## ⚠️ Nota sobre Render Free Tier

El plan gratuito de Render "duerme" la aplicación después de 15 minutos de inactividad. La primera vez que alguien abre el link después de que se durmió, puede tardar ~30 segundos en despertar. Después de eso funciona normal.

Si quieres que nunca se duerma, puedes subir de plan (hay opciones desde $7/mes), pero para jugar ocasionalmente el plan gratuito funciona perfecto.
