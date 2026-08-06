import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const KEY_FILE = join(DATA_DIR, '.key');

let cachedKey: Buffer | null = null;

export function ensureDataDir(): string {
  mkdirSync(DATA_DIR, { recursive: true });
  return DATA_DIR;
}

export function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  ensureDataDir();

  if (existsSync(KEY_FILE)) {
    const hex = readFileSync(KEY_FILE, 'utf8').trim();
    cachedKey = Buffer.from(hex, 'hex');
    if (cachedKey.length !== KEY_LENGTH) {
      throw new Error('Invalid encryption key length in data/.key');
    }
    return cachedKey;
  }

  cachedKey = randomBytes(KEY_LENGTH);
  writeFileSync(KEY_FILE, cachedKey.toString('hex'), { mode: 0o600 });
  return cachedKey;
}

/** Encrypt plaintext → base64(iv + authTag + ciphertext) */
export function encrypt(plaintext: string, key?: Buffer): string {
  const k = key ?? getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, k, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/** Decrypt base64(iv + authTag + ciphertext) → plaintext */
export function decrypt(payload: string, key?: Buffer): string {
  const k = key ?? getEncryptionKey();
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = buf.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv(ALGORITHM, k, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export { DATA_DIR, KEY_FILE };
