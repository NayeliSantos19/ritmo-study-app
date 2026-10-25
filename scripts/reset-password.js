import { randomBytes } from 'node:crypto';
import { openDatabase, transaction } from '../server/database.js';
import { hashPassword } from '../server/auth.js';
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Uso: node scripts/reset-password.js correo@ejemplo.com');
  process.exit(1);
}
const db = openDatabase(process.env.DATABASE_PATH || 'data/ritmo.sqlite');
try {
  const user = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (!user) throw new Error('No se encontró esa cuenta.');
  const password = randomBytes(24).toString('base64url');
  const hash = await hashPassword(password);
  transaction(db, () => {
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, user.id);
    db.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(user.id);
  });
  console.log(
    'Las sesiones de acceso anteriores fueron invalidadas. Guarda esta contraseña en un gestor y entrégala por un canal privado:',
  );
  console.log(password);
} finally {
  db.close();
}
