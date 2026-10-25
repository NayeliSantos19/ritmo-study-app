import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const database = resolve(process.env.DATABASE_PATH || 'data/ritmo.sqlite');
const output = resolve(
  process.argv[2] || `backups/ritmo-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`,
);
if (output === database)
  throw new Error('La copia debe tener una ruta diferente de la base de datos activa.');
mkdirSync(resolve(output, '..'), { recursive: true });
const db = new DatabaseSync(database, { readOnly: true });
try {
  await backup(db, output);
  console.log(`Copia consistente guardada: ${output}`);
} finally {
  db.close();
}
