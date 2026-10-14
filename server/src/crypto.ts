import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// scrypt N=2^15, r=8, p=1 (OWASP minimum is N=2^17 with p=1 or equivalent cost;
// 2^15 keeps login under ~100 ms on the small ARM box; raise via the stored params later)
const N = 2 ** 15
const R = 8
const P = 1
const KEYLEN = 64
const MAXMEM = 128 * N * R * 2

function scryptAsync(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, KEYLEN, { N: n, r, p, maxmem: MAXMEM }, (err, key) => (err ? reject(err) : resolve(key))),
  )
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, N, R, P)
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${key.toString('base64url')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split('$')
  if (algo !== 'scrypt' || !salt || !hash) return false
  const key = await scryptAsync(password, Buffer.from(salt, 'base64url'), Number(n), Number(r), Number(p))
  const expected = Buffer.from(hash, 'base64url')
  return key.length === expected.length && timingSafeEqual(key, expected)
}

/** A hash to verify against when the user does not exist, so timing does not reveal it. */
export const DUMMY_HASH = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$' + 'A'.repeat(86)

export function newToken(): string {
  return randomBytes(32).toString('base64url')
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}
