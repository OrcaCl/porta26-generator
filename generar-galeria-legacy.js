import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import exifr from 'exifr';
import slugify from 'slugify';

const baseFotosDir = './fotos';
const baseTemplatesDir = './templates';
const logFile = './galerias.json';
const thumbDirName = 'thumbs';
const thumbWidth = 300;
const maxPhotoWidth = 1920;
const maxPhotoHeight = 1080;
const photoQuality = 85;
const thumbQuality = 80;

const args = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < args.length; i += 2) {
  argMap[args[i].replace(/^--/, '')] = args[i + 1];
}

// Helpers
function log(msg) { console.log(`[INFO] ${msg}`); }
function err(msg) { console.error(`[ERROR] ${msg}`); }
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

async function loadLog() {
  try {
    const data = await fs.readFile(logFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { galerias: [] };
  }
}

async function saveLog(log) {
  await fs.writeFile(logFile, JSON.stringify(log, null, 2));
}

async function getFirstPhotoDate(photoPath) {
  try {
    const exif = await exifr.parse(photoPath);
    if (exif?.DateTimeOriginal) return exif.DateTimeOriginal;
    if (exif?.CreateDate) return exif.CreateDate;
    if (exif?.ModifyDate) return exif.ModifyDate;
  } catch {
    // ignore
  }
  // fallback: file mtime
  const stat = await fs.stat(photoPath);
  return stat.mtime;
}

async function optimizePhoto(photoPath) {
  const buffer = await sharp(photoPath)
    .resize({ width: maxPhotoWidth, height: maxPhotoHeight, fit: 'inside' })
    .withMetadata({ density: 96 })
    .jpeg({ quality: photoQuality })
    .toBuffer();

  await fs.writeFile(photoPath, buffer);
}

async function generateThumb(photoPath, thumbPath) {
  await sharp(photoPath)
    .resize({ width: thumbWidth })
    .jpeg({ quality: thumbQuality })
    .toFile(thumbPath);
}

async function readTemplate(name) {
  const filePath = path.join(baseTemplatesDir, `${name}.html`);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    err(`No se encontró plantilla ${name}, usando default.`);
    return await fs.readFile(path.join(baseTemplatesDir, 'default.html'), 'utf-8');
  }
}

async function copyCss(templateName, galeriaPath) {
  const cssSrc = path.join(baseTemplatesDir, `${templateName}.css`);
  const cssDest = path.join(galeriaPath, 'styles.css');
  try {
    await fs.copyFile(cssSrc, cssDest);
  } catch {
    err(`No se encontró CSS para plantilla ${templateName}, se usará estilo por defecto.`);
  }
}

async function generateHtml(galeriaPath, titulo, fechaFoto, fotos, templateName) {
  const template = await readTemplate(templateName);
  await copyCss(templateName, galeriaPath);

  // Construir bloque galería
  let galeriaHtml = '';
  let count = 1;
  for (const foto of fotos) {
    const photoUrl = path.basename(foto);
    const thumbUrl = path.join(thumbDirName, path.basename(foto));
    const metadata = await sharp(path.join(galeriaPath, photoUrl)).metadata();

    galeriaHtml += `
<a href="${photoUrl}" 
   data-pswp-width="${metadata.width}" 
   data-pswp-height="${metadata.height}" 
   target="_blank" 
   data-download-url="${photoUrl}">
  <img src="${thumbUrl}" alt="${titulo} - Foto ${count}" />
</a>`;
    count++;
  }

  const htmlFinal = template
    .replace(/\$\{TITULO\}/g, titulo)
    .replace(/\$\{FECHA_FOTO\}/g, formatDate(fechaFoto))
    .replace(/\$\{GALERIA\}/g, galeriaHtml);

  await fs.writeFile(path.join(galeriaPath, 'index.html'), htmlFinal);
  log(`Archivo index.html generado en ${galeriaPath}`);
}

async function processNueva(titulo, template) {
  const id = slugify(titulo, { lower: true, strict: true });
  const galeriaPath = path.join(baseFotosDir, id);

  // Validar carpeta
  try {
    await fs.access(galeriaPath);
  } catch {
    err(`La carpeta ${galeriaPath} no existe.`);
    process.exit(1);
  }

  // Leer fotos
  let fotos = (await fs.readdir(galeriaPath)).filter(f => /\.(jpe?g|png)$/i.test(f));

  if (fotos.length === 0) {
    err('No se encontraron fotos en la carpeta.');
    process.exit(1);
  }

  // Crear carpeta thumbs si no existe
  const thumbsPath = path.join(galeriaPath, thumbDirName);
  try {
    await fs.access(thumbsPath);
  } catch {
    await fs.mkdir(thumbsPath);
  }

  log('Optimizando fotos y generando thumbnails...');

  // Optimizar fotos y crear thumbs
  for (const foto of fotos) {
    await optimizePhoto(path.join(galeriaPath, foto));
    await generateThumb(path.join(galeriaPath, foto), path.join(thumbsPath, foto));
  }

  // Leer fecha de referencia de la primera foto
  const fechaFoto = await getFirstPhotoDate(path.join(galeriaPath, fotos[0]));

  // Generar HTML
  await generateHtml(galeriaPath, titulo, fechaFoto, fotos, template);

  // Actualizar log
  const logData = await loadLog();
  const now = new Date().toISOString();
  const existe = logData.galerias.find(g => g.id === id);

  if (!existe) {
    logData.galerias.push({
      id,
      titulo,
      fecha_creacion: now,
      fecha_foto: fechaFoto.toISOString(),
      ultima_modificacion: now,
      cantidad_fotos: fotos.length
    });
  } else {
    existe.ultima_modificacion = now;
    existe.cantidad_fotos = fotos.length;
  }

  await saveLog(logData);
  log(`Galería "${titulo}" procesada y log actualizada.`);
}

// Placeholder para otras acciones
async function processRegenerarThumbs(cual) {
  // TODO: Implementar similar a 'nueva' pero solo thumbs
  log(`(Pendiente) Regenerar thumbs para ${cual}`);
}

async function processRegenerarFotos(cual) {
  // TODO: Implementar similar a 'nueva' pero solo fotos
  log(`(Pendiente) Regenerar fotos para ${cual}`);
}

async function processCambiarTemplate(cual, template) {
  const id = slugify(cual, { lower: true, strict: true });
  const galeriaPath = path.join(baseFotosDir, id);
  const logData = await loadLog();
  const galeria = logData.galerias.find(g => g.id === id);

  if (!galeria) {
    err(`Galería ${cual} no encontrada en log.`);
    process.exit(1);
  }

  let fotos = [];
  try {
    fotos = (await fs.readdir(galeriaPath)).filter(f => /\.(jpe?g|png)$/i.test(f));
  } catch {
    err(`No se encontró carpeta de galería ${galeriaPath}`);
    process.exit(1);
  }

  await generateHtml(galeriaPath, galeria.titulo, new Date(galeria.fecha_foto), fotos, template);
  galeria.ultima_modificacion = new Date().toISOString();
  await saveLog(logData);
  log(`Template cambiado a '${template}' para galería ${cual}`);
}

(async () => {
  const accion = argMap.accion || 'nueva';
  const cual = argMap.cual;
  const titulo = argMap.titulo;
  const template = argMap.template || 'default';

  if (accion === 'nueva') {
    if (!titulo) {
      err('Para acción "nueva" debes especificar --titulo "Nombre de galería"');
      process.exit(1);
    }
    await processNueva(titulo, template);
  } else if (accion === 'regenerar-thumbs') {
    if (!cual) {
      err('Para regenerar-thumbs necesitas especificar --cual "id-galeria"');
      process.exit(1);
    }
    await processRegenerarThumbs(cual);
  } else if (accion === 'regenerar-fotos') {
    if (!cual) {
      err('Para regenerar-fotos necesitas especificar --cual "id-galeria"');
      process.exit(1);
    }
    await processRegenerarFotos(cual);
  } else if (accion === 'cambiar-template') {
    if (!cual || !template) {
      err('Para cambiar-template necesitas especificar --cual "id-galeria" y --template "nombre"');
      process.exit(1);
    }
    await processCambiarTemplate(cual, template);
  } else {
    err(`Acción desconocida: ${accion}`);
    process.exit(1);
  }
})();
