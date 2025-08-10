import fs from 'fs/promises';
import path from 'path';

import { loadLog, saveLog, log, err, optimizePhoto, generateHtml, normalizeFilename } from './utils.js';

const baseFotosDir = './fotos';
const thumbDirName = 'thumbs';

export async function regenerarFotos(cual) {
  // Cargar log y buscar galería por id exacto
  const logData = await loadLog();
  const galeria = logData.galerias.find(g => g.id === cual);
  if (!galeria) {
    err(`Galería con id "${cual}" no encontrada en log.`);
    process.exit(1);
  }

  const galeriaPath = path.join(baseFotosDir, galeria.carpeta);
  const thumbsPath = path.join(galeriaPath, thumbDirName);

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

  // Optimizar fotos
  log(`Optimizando fotos para la galería "${cual}"...`);
  for (const foto of fotos) {
    log(`Optimizando: ${foto}`);
    await optimizePhoto(path.join(galeriaPath, foto));
  }

  galeria.ultima_modificacion = new Date().toISOString();
  galeria.cantidad_fotos = fotos.length;

  await generateHtml(galeriaPath, galeria.titulo, new Date(galeria.fecha_foto), fotos, galeria.template || 'default');
  await saveLog(logData);

  log('Fotos optimizadas y HTML actualizado correctamente.');
}
