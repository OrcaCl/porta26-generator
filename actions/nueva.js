import fs from 'fs/promises';
import path from 'path';
import slugify from 'slugify';

import { log, loadLog, generarNuevoId, err, generateThumb, generateHtml, saveLog, getFirstPhotoDate, normalizeFilename } from './utils.js';

const baseFotosDir = './fotos';
const thumbDirName = 'thumbs';



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

  //Verifica que exista la carpeta de fotos antes de optimizar 
  //Y que no le haya puesto mal el nombre porque se condorea.
  try {
    await fs.access(galeriaPath);
  } catch {
    err(`No existe una carpeta con el nombre "${carpetaSlug}" en el directorio "${baseFotosDir}/"`);
    err(`Agüeboldo! Crea la carpeta a mano primero o verifica el nombre que le pusiste`);
    process.exit(1);
  }

  // Cargar log para saber si ya existe la carpeta con ese slug, en el registro.
  const logData = await loadLog();
  const existeRegistro = logData.galerias.some(g => g.carpeta === carpetaSlug);

  //si ya la agregué, me manda a la ...
  if (existeRegistro) {
    err(`Ya existe una galeria registrada con el nombre de "${carpetaSlug}"`);
    process.exit();
  }

  // Generar ID ORCA-n
  const nuevoId = generarNuevoId(logData);
    
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


  // Guardar en log, con carpetaSlug separado
  logData.galerias.push({
    id: nuevoId,
    carpeta: carpetaSlug,
    titulo,
    fecha_creacion: new Date().toISOString(),
    fecha_foto: fechaFoto,
    ultima_modificacion: new Date().toISOString(),
    cantidad_fotos: fotos.length,
    template
  });

  await saveLog(logData);
  await generateHtml(galeriaPath, titulo, fechaFoto, fotos, template);

  log(`Galería "${titulo}" creada con ID ${nuevoId} y carpeta "${carpetaSlug}".`);
}
