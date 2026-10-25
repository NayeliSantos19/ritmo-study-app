import { openDatabase } from '../server/database.js';
const email = process.argv[2]?.trim().toLowerCase();
if (!email || process.argv[3] !== '--confirm') {
  console.error('Uso: node scripts/delete-account.js correo@ejemplo.com --confirm');
  process.exit(1);
}
const db = openDatabase(process.env.DATABASE_PATH || 'data/ritmo.sqlite');
try {
  const result = db.prepare('DELETE FROM users WHERE email=?').run(email);
  console.log(
    result.changes
      ? 'Cuenta, sesiones y accesos eliminados. Revisa la conservación de copias de seguridad.'
      : 'No se encontró esa cuenta.',
  );
} finally {
  db.close();
}
