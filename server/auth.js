import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const digest = (value) => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64, options);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [, salt, key] = stored.split('$');
  const actual = await scrypt(password, salt, 64, options);
  const expected = Buffer.from(key, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function validateCredentials(body, register = false) {
  if (typeof body?.email !== 'string' || typeof body?.password !== 'string')
    throw new Error('Revisa tu correo y contraseña.');
  const email = body.email.trim().toLowerCase();
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email))
    throw new Error('Escribe un correo electrónico válido.');
  if (body.password.length < (register ? 12 : 1) || body.password.length > 128)
    throw new Error('La contraseña debe tener entre 12 y 128 caracteres.');
  return { email, password: body.password };
}
export function makeToken() {
  return randomBytes(32).toString('base64url');
}
