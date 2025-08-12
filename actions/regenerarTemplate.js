// actions/regenerarPlantilla.js
import fs from 'fs/promises';
import path from 'path';

import { loadLog, saveLog, log, err, generateHtml } from './utils.js';

const baseFotosDir = './fotos';

export async function regenerarTemplate(cual) {
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

  let fotos = (await fs.readdir(galeriaPath)).filter(f => /\.(jpe?g|png)$/i.test(f));
  if (fotos.length === 0) {
    err('No se encontraron fotos en la carpeta.');
    process.exit(1);
  }

  log(`Regenerando Template HTML para la galería "${cual}"...`);
  await generateHtml(galeriaPath, galeria.titulo, new Date(galeria.fecha_foto), fotos, galeria.template || 'default');
  log('Template HTML regenerada correctamente.');
}
