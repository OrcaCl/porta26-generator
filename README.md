# Generador de Galerías de Fotos

Este proyecto permite crear y gestionar galerías de fotos estáticas, optimizando imágenes y generando plantillas HTML personalizables.

---

## Instalación

1. Clonar el repositorio  
2. Instalar dependencias:

`npm install`

3. (Opcional) Instalar express para servir galerías localmente:
   (Opcional) Instalar nodemon para hacer auto recarga si actualizas archivos estáticos.

`npm install express`

## Comandos disponibles

Los comandos se ejecutan con:

`node generar-galeria.js <acción> [opciones]`

### nueva

Crear una galería nueva.

    --titulo (string, requerido): Título de la galería.

    --template (string, opcional, default: default): Nombre del template HTML a usar.

Ejemplo: node generar-galeria.js nueva --titulo "Gothic Asylum Julio 2025" --template default

### regenerar-thumbs

Regenera las miniaturas de una galería existente.

    --cual (string, requerido): ID de la galería (ORCA-1, etc.).

Ejemplo: node generar-galeria.js regenerar-thumbs --cual "ORCA-1"

### regenerar-fotos

Regenera las fotos optimizadas (resize, compresión).

    --cual (string, requerido): ID de la galería.

Ejemplo: node generar-galeria.js regenerar-fotos --cual "ORCA-1"

### cambiar-template

Cambia el template de una galería existente y regenera el HTML.

    --cual (string, requerido): ID de la galería.

    --template (string, requerido): Nombre del template nuevo.

Ejemplo:node generar-galeria.js cambiar-template --cual "ORCA-1" --template "minimal"


**Nuevo**
### regenerar-template

Solo regenera el archivo HTML de la galería sin modificar fotos ni miniaturas. Ideal para actualizar la estructura, clases CSS, lazy loading, o cambios visuales rápidos.

    --cual (string, requerido): ID de la galería.

Ejemplo: node generar-galeria.js regenerar-plantilla --cual "ORCA-1"


## Servir galerías localmente

Para probar las galerías localmente, puedes usar Express con este comando en package.json:

"scripts": {
  "dev": "nodemon server.js"
}

Luego correr: npm run dev "ORCA-1"

Esto levantará un servidor en http://localhost:3000 que servirá la carpeta raíz con las galerías.

## Estructura de carpetas

    /fotos/ — Carpeta base con subcarpetas para cada galería (nombres normalizados).

    /templates/ — Plantillas HTML y CSS para las galerías.

    galerias.json — Log que guarda metadata de las galerías, incluyendo IDs y nombres de carpeta.

## Notas

    Los IDs de galería siguen el formato ORCA-1, ORCA-2, ... para facilitar comandos.

    Los nombres de archivos se normalizan para evitar espacios, mayúsculas y caracteres especiales.

    Puedes añadir nuevos templates HTML en /templates/ y usarlos con --template.

## Futuras mejoras

    Diseñar una ventana más bonita. Ahora es funcional solamente.

    Diseño de mosaicos sin espacios vacíos.

    Efectos de transición para galerías.

    Listar las galerias en un menú de selección más bonito


