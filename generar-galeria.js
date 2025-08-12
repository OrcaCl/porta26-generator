import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { nueva } from './actions/nueva.js';
import { regenerarThumbs } from './actions/regenerarThumbs.js';
import { regenerarFotos } from './actions/regenerarFotos.js';
import { cambiarTemplate } from './actions/cambiarTemplate.js';
import { regenerarTemplate } from './actions/regenerarTemplate.js';

(async () => {
  const argv = yargs(hideBin(process.argv))
    .command('nueva', 'Crear galería nueva', {
      titulo: { type: 'string', demandOption: true },
      template: { type: 'string', default: 'default' }
    })
    .command('regenerar-thumbs', 'Regenerar thumbnails', {
      cual: { type: 'string', demandOption: true }
    })
    .command('regenerar-fotos', 'Regenerar fotos optimizadas', {
      cual: { type: 'string', demandOption: true }
    })
    .command('cambiar-template', 'Cambiar template', {
      cual: { type: 'string', demandOption: true },
      template: { type: 'string', demandOption: true }
    })
    .command('regenerar-template', 'Regenerar solo template HTML', {
      cual: { type: 'string', demandOption: true }
    })
    .demandCommand(1, 'Se requiere una acción')
    .strict()
    .help()
    .argv;

  const accion = argv._[0];

  try {
    switch (accion) {
      case 'nueva':
        await nueva(argv.titulo, argv.template);
        break;
      case 'regenerar-thumbs':
        await regenerarThumbs(argv.cual);
        break;
      case 'regenerar-fotos':
        await regenerarFotos(argv.cual);
        break;
      case 'cambiar-template':
        await cambiarTemplate(argv.cual, argv.template);
        break;
      case 'regenerar-template':
        await regenerarTemplate(argv.cual);
        break;
      default:
        console.error(`Acción desconocida: ${accion}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error ejecutando la acción: ${error.message}`);
    process.exit(1);
  }
})();

