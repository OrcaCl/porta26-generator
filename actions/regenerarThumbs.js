import fs from 'fs/promises';
import path from 'path';
import fsExtra from 'fs-extra';

import { loadLog, saveLog, log, err, generateThumb, generateHtml, normalizeFilename } from './utils.js';

const baseFotosDir = './fotos';
const thumbDirName = 'thumbs';

export async function regenerarThumbs(cual) {
  // Cargar log y buscar galería por id exacto
  const logData = await loadLog();
  const galeria = logData.galerias.find(g => g.id === cual);
  if (!galeria) {
    err(`Galería con id "${cual}" no encontrada en log.`);
    process.exit(1);
  }

  const galeriaPath = path.join(baseFotosDir, galeria.carpeta);
  const thumbsPath = path.join(galeriaPath, thumbDirName);

  // Validar que exista la galería (carpeta)
  try {
    await fs.access(galeriaPath);
  } catch {
    err(`La carpeta ${galeriaPath} no existe.`);
    process.exit(1);
  }

  // Leer fotos y normalizar nombres (renombrar físicamente)
  let fotos = (await fs.readdir(galeriaPath)).filter(f => /\.(jpe?g|png)$/i.test(f));

  fotos = await Promise.all(fotos.map(async (f) => {
    const nuevoNombre = normalizeFilename(f);
    if (nuevoNombre !== f) {
      log(`Renombrando archivo: "${f}" → "${nuevoNombre}"`);
      await fs.rename(path.join(galeriaPath, f), path.join(galeriaPath, nuevoNombre));
    }
    return nuevoNombre;
  }));

  if (fotos.length === 0) {
    err('No se encontraron fotos en la carpeta.');
    process.exit(1);
  }

  // Borrar carpeta thumbs para regenerar miniaturas completamente
  try {
    await fsExtra.remove(thumbsPath);
    log(`Carpeta "${thumbDirName}" eliminada para regenerar miniaturas.`);
  } catch {
    log(`No se pudo eliminar la carpeta "${thumbDirName}" o no existía.`);
  }

  // Crear carpeta thumbs vacía
  await fs.mkdir(thumbsPath, { recursive: true });

  // Generar thumbnails con nombres normalizados
  log(`Regenerando thumbnails para la galería "${cual}"...`);
  for (const foto of fotos) {
    log(`Generando miniatura para: ${foto}`);
    await generateThumb(path.join(galeriaPath, foto), path.join(thumbsPath, foto));
  }

  // Actualizar log con fecha y cantidad
  galeria.ultima_modificacion = new Date().toISOString();
  galeria.cantidad_fotos = fotos.length;

  // Regenerar HTML con fotos y thumbs nuevos
  await generateHtml(galeriaPath, galeria.titulo, new Date(galeria.fecha_foto), fotos, galeria.template || 'default');
  await saveLog(logData);

  log('Miniaturas regeneradas y HTML actualizado correctamente.');
}
