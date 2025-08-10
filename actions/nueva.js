import fs from 'fs/promises';
import path from 'path';
import slugify from 'slugify';

import { log, err, generateThumb, generateHtml, saveLog, getFirstPhotoDate, normalizeFilename } from './utils.js';

const baseFotosDir = './fotos';
const thumbDirName = 'thumbs';

/**
 * Genera nuevo ID tipo ORCA-1, ORCA-2, etc. basado en log.json
 * @param {object} logData 
 * @returns {string}
 */
function generarNuevoId(logData) {
  const prefix = 'ORCA-';
  const ids = logData.galerias
    .map(g => g.id)
    .filter(id => id.startsWith(prefix))
    .map(id => parseInt(id.slice(prefix.length)))
    .filter(num => !isNaN(num));

  const maxNum = ids.length > 0 ? Math.max(...ids) : 0;
  return `${prefix}${maxNum + 1}`;
}

/**
 * Crear nueva galería
 * @param {string} titulo - Título de la galería
 * @param {string} template - Nombre del template a usar (default: "default")
 */
export async function nueva(titulo, template = 'default') {
  if (!titulo) {
    err('Falta el parámetro "titulo"');
    process.exit(1);
  }

  // Generar slug para carpeta
  const carpetaSlug = slugify(titulo, { lower: true, strict: true });
  const galeriaPath = path.join(baseFotosDir, carpetaSlug);
  const thumbsPath = path.join(galeriaPath, thumbDirName);

  try {
    await fs.mkdir(galeriaPath, { recursive: true });
    await fs.mkdir(thumbsPath, { recursive: true });
  } catch (e) {
    err(`Error creando carpetas: ${e.message}`);
    process.exit(1);
  }

  let fotos = (await fs.readdir(galeriaPath)).filter(f => /\.(jpe?g|png)$/i.test(f));

  // Normalizar nombres
  fotos = await Promise.all(fotos.map(async (f) => {
    const nuevoNombre = normalizeFilename(f);
    if (nuevoNombre !== f) {
      await fs.rename(path.join(galeriaPath, f), path.join(galeriaPath, nuevoNombre));
    }
    return nuevoNombre;
  }));

  if (fotos.length === 0) {
    err('No se encontraron fotos en la carpeta.');
    process.exit(1);
  }

  const fechaFoto = await getFirstPhotoDate(path.join(galeriaPath, fotos[0]));

  for (const foto of fotos) {
    await generateThumb(path.join(galeriaPath, foto), path.join(thumbsPath, foto));
  }

  // Cargar log
  const logData = await import('./log.json', { assert: { type: 'json' } }).then(m => m.default || { galerias: [] });

  // Generar ID ORCA-n
  const nuevoId = generarNuevoId(logData);

  // Guardar en log, con carpetaSlug separado
  logData.galerias.push({
    id: nuevoId,
    carpeta: carpetaSlug,
    fecha_creacion: new Date().toISOString(),
    fecha_foto: fechaFoto,
    titulo,
    ultima_modificacion: new Date().toISOString(),
    cantidad_fotos: fotos.length,
    template
  });

  await saveLog(logData);
  await generateHtml(galeriaPath, titulo, fechaFoto, fotos, template);

  log(`Galería "${titulo}" creada con ID ${nuevoId} y carpeta "${carpetaSlug}".`);
}
