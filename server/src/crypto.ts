import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

/*
 * scrypt N=2^15, r=8, p=3 - one of OWASP's equivalent settings, chosen for its memory profile.
 * The headline recommendation (N=2^17, p=1) needs 128 MiB per hash, and the API container runs
 * with mem_limit: 256m, so two logins at once would take it down. N=2^15 keeps the working set
 * at 32 MiB and buys the same cost through p: ~200 ms on a laptop, ~300 ms on the ARM box.
 * The parameters travel inside the stored hash, so raising them again needs no migration:
 * verifyPassword reads the stored values and login rehashes (see needsRehash).
 */
const N = 2 ** 15
const R = 8
const P = 3
const KEYLEN = 64
const MAXMEM = 128 * N * R * (P + 2)

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
export const DUMMY_HASH = `scrypt$${N}$${R}$${P}$AAAAAAAAAAAAAAAAAAAAAA$` + 'A'.repeat(86)

/** True for a hash made with older parameters; login then quietly stores a fresh one. */
export function needsRehash(stored: string): boolean {
  const [algo, n, r, p] = stored.split('$')
  return algo !== 'scrypt' || Number(n) !== N || Number(r) !== R || Number(p) !== P
}

export function newToken(): string {
  return randomBytes(32).toString('base64url')
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}
