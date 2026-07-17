// Hash/verificação de senha — único lugar que sabe o formato de armazenamento
// ("<salt-hex>:<hash-hex>", scrypt). auth.js nunca deve tocar em senha crua.
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const KEYLEN = 64;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, KEYLEN);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [salt, hashHex] = (stored ?? '').split(':');
  if (!salt || !hashHex) return false;
  const derivedKey = await scrypt(password, salt, KEYLEN);
  const storedKey = Buffer.from(hashHex, 'hex');
  if (storedKey.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(storedKey, derivedKey);
}
