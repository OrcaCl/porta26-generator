import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import exifr from 'exifr';


//Logs del proyecto
export function log(msg) { console.log(`[INFO] ${msg}`); }
export function err(msg) { console.error(`[ERROR] ${msg}`); }

//Cargar Log de galerías
export async function loadLog() {
  try {
    const data = await fs.readFile('./galerias.json', 'utf-8');
    return JSON.parse(data);
  } catch {
    return { galerias: [] };
  }
}

//Actualizar y guardar el log de galerias
export async function saveLog(log) {
  await fs.writeFile('./galerias.json', JSON.stringify(log, null, 2));
}

//Formatear fecha
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

//optimizar las fotos antes de subirlas
export async function optimizePhoto(photoPath) {
  const buffer = await sharp(photoPath)
    .resize({ width: 1920, height: 1080, fit: 'inside' })
    .withMetadata({ density: 96 })
    .jpeg({ quality: 85 })
    .toBuffer();

  await fs.writeFile(photoPath, buffer);
}

//Generar las miniaturas
export async function generateThumb(photoPath, thumbPath) {
  await sharp(photoPath)
    .resize({ width: 300 })
    .jpeg({ quality: 80 })
    .toFile(thumbPath);
}

//Generar la galería usando las fotos, miniaturas, titulo y nombre del template.
export async function generateHtml(galeriaPath, titulo, fechaFoto, fotos, templateName) {
  const templatePath = path.join('./templates', `${templateName}.html`);
  let template;
  try {
    template = await fs.readFile(templatePath, 'utf-8');
  } catch {
    throw new Error(`No se encontró plantilla ${templateName}`);
  }

  // Copiar CSS desde la plantilla al CSS del sitio base
  const cssSrc = path.join('./templates', `${templateName}.css`);
  const cssDest = path.join(galeriaPath, 'styles.css');
  try {
    await fs.copyFile(cssSrc, cssDest);
  } catch {
    log('No se encontró CSS para la plantilla, se usará estilo por defecto.');
  }

  let galeriaHtml = '';
  let count = 1;
  for (const foto of fotos) {
    const photoUrl = path.basename(foto);
    const thumbUrl = `thumbs/${path.basename(foto)}`;
    const metadata = await sharp(path.join(galeriaPath, photoUrl)).metadata();

    galeriaHtml += `
<a href="${photoUrl}" data-pswp-width="${metadata.width}" data-pswp-height="${metadata.height}" target="_blank" data-download-url="${photoUrl}">
  <img src="${thumbUrl}" alt="${titulo} - Foto ${count}" loading="lazy" />
</a>`;
    count++;
  }

  const htmlFinal = template
    .replace(/\$\{TITULO\}/g, titulo)
    .replace(/\$\{FECHA_FOTO\}/g, formatDate(fechaFoto))
    .replace(/\$\{GALERIA\}/g, galeriaHtml);

  await fs.writeFile(path.join(galeriaPath, 'index.html'), htmlFinal);
}

// Helper para leer fecha EXIF

/**
 * Obtiene la fecha de la foto leyendo metadata EXIF o fallback a fecha archivo
 * @param {string} photoPath - Ruta a la foto
 * @returns {Promise<Date>} Fecha de la foto
 */
export async function getFirstPhotoDate(photoPath) {
  try {
    const exif = await exifr.parse(photoPath);
    if (exif?.DateTimeOriginal) return exif.DateTimeOriginal;
    if (exif?.CreateDate) return exif.CreateDate;
    if (exif?.ModifyDate) return exif.ModifyDate;
  } catch { }
  const stat = await fs.stat(photoPath);
  return stat.mtime;
}

/**
 * Normaliza un nombre de archivo para que sea seguro en URLs y sistemas de archivos.
 * - Convierte a minúsculas
 * - Reemplaza espacios por "_"
 * - Elimina tildes y acentos
 * - Solo permite caracteres alfanuméricos, "_" y "."
 * 
 * @param {string} filename - Nombre original del archivo
 * @returns {string} - Nombre normalizado
 */
export function normalizeFilename(filename) {
  const ext = filename.split('.').pop().toLowerCase(); // extensión en minúsculas
  let name = filename.slice(0, -(ext.length + 1));

  name = name
    .toLowerCase()
    .normalize('NFD') // descompone caracteres con acentos
    .replace(/[\u0300-\u036f]/g, '') // elimina marcas diacríticas
    .replace(/\s+/g, '_') // reemplaza espacios por guiones bajos
    .replace(/[^a-z0-9_]/g, ''); // elimina caracteres no permitidos

  return `${name}.${ext}`;
}
