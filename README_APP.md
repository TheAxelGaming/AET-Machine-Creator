# AET Machine Creator - Guía de Uso

Esta aplicación te permite crear máquinas expendedoras personalizadas para tu mod de Project Zomboid de forma visual.

## Pasos para empezar

1. **Extraer Datos del Juego**:
   - Asegúrate de tener Python instalado.
   - Ejecuta el script `get_items_json.py` desde la terminal en la carpeta `app/`.
   - Introduce la ruta de tu carpeta de Project Zomboid cuando se te solicite (por defecto busca en las rutas comunes de Steam).
   - Este script creará `public/items.json` y copiará los iconos a `public/icons/`.

2. **Ejecutar la Aplicación**:
   - Abre una terminal en la carpeta `app/`.
   - Ejecuta `npm install` (solo la primera vez).
   - Ejecuta `npm run dev`.
   - Abre la URL que aparezca (normalmente `http://localhost:5173`).

3. **Configurar tu Máquina**:
   - Cambia el nombre, ID y textura de la máquina.
   - Busca ítems en el catálogo de la derecha y haz clic para añadirlos.
   - Ajusta el precio, moneda y aplica descuentos individuales si lo deseas.
   - Usa el "Descuento Global" para aplicar una rebaja a toda la máquina.

4. **Exportar**:
   - Haz clic en **Exportar ZIP**.
   - Obtendrás un archivo `.txt` con la definición del ítem y el modelo, y un archivo `.lua` con los datos de los ítems.
   - Coloca estos archivos en las carpetas correspondientes de tu mod (`media/scripts` y `media/lua/shared`).

## Subir a GitHub Web (GitHub Pages)

1. Sube todo el repositorio a GitHub.
2. Ve a **Settings > Pages** en tu repositorio.
3. En **Build and deployment**, selecciona **GitHub Actions** como fuente.
4. Usa el flujo de trabajo de "Static Web App" o simplemente ejecuta `npm run build` y sube la carpeta `dist` a una rama llamada `gh-pages`.

---
*Desarrollado para la comunidad de Project Zomboid B42.*
