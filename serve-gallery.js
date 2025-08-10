import fs from 'fs/promises';
import path from 'path';
import express from 'express';

const baseFotosDir = './fotos';
const port = process.env.PORT || 8080;
const galleryId = process.argv[2];

if (!galleryId) {
  console.error('Error: Debes pasar un ID de galería como argumento, ejemplo: node serve-gallery.js ORCA-1');
  process.exit(1);
}

async function main() {
  try {
    const logRaw = await fs.readFile('./galerias.json', 'utf-8');
    const logData = JSON.parse(logRaw);
    const galeria = logData.galerias.find(g => g.id === galleryId);
    if (!galeria) {
      console.error(`Galería con id "${galleryId}" no encontrada en galerias.json`);
      process.exit(1);
    }

    const servePath = path.join(baseFotosDir, galeria.carpeta);
    console.log(`Sirviendo galería "${galeria.titulo}" en http://localhost:${port}/ desde carpeta: ${servePath}`);

    const app = express();

    // Sirve archivos estáticos desde la carpeta de la galería
    app.use(express.static(servePath));

    app.listen(port, () => {
      console.log(`Servidor Express escuchando en puerto ${port}`);
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
