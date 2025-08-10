import fs from 'fs/promises';
import path from 'path';

import { loadLog, saveLog, log, err, generateHtml } from './utils.js';

const baseFotosDir = './fotos';

export async function cambiarTemplate(cual, template) {
  if (!template) {
    err('Falta el parámetro --template');
    process.exit(1);
  }

  // Cargar log y buscar galería por id exacto
  const logData = await loadLog();
  const galeria = logData.galerias.find(g => g.id === cual);
  if (!galeria) {
    err(`Galería con id "${cual}" no encontrada en log.`);
    process.exit(1);
  }

  const galeriaPath = path.join(baseFotosDir, galeria.carpeta);

  try {
    await fs.access(galeriaPath);
  } catch {
    err(`La carpeta ${galeriaPath} no existe.`);
    process.exit(1);
  }

  // Leer fotos (sin normalizar aquí)
  const fotos = (await fs.readdir(galeriaPath)).filter(f => /\.(jpe?g|png)$/i.test(f));

  if (fotos.length === 0) {
    err('No se encontraron fotos en la carpeta.');
    process.exit(1);
  }

  galeria.template = template;
  galeria.ultima_modificacion = new Date().toISOString();

  await generateHtml(galeriaPath, galeria.titulo, new Date(galeria.fecha_foto), fotos, template);
  await saveLog(logData);

  log(`Template cambiado a "${template}" para la galería ${cual} correctamente.`);
}
