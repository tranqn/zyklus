export interface Config {
  port: number
  /** The only origin allowed to send state-changing requests, e.g. https://mci.quocnamtran.com */
  appOrigin: string
  dataDir: string
  /** Secure cookies need https; off only for local http development. */
  secureCookies: boolean
  smtp?: { host: string; port: number; secure: boolean; user?: string; pass?: string }
  mailFrom: string
  /** registrations per IP and hour (raised only for end-to-end tests) */
  registerLimit: number
}

export function loadConfig(env = process.env): Config {
  /*
   * Production refuses to start on a missing setting instead of falling back quietly.
   * Without APP_ORIGIN the cookie would ship without `Secure`, and without SMTP_HOST the dev
   * mailer takes over and prints whole verification and reset links, tokens included, to stdout
   * - which the json-file log driver then keeps on disk.
   */
  if (env.NODE_ENV === 'production') {
    const missing = (['APP_ORIGIN', 'SMTP_HOST', 'MAIL_FROM'] as const).filter((k) => !env[k])
    if (missing.length) throw new Error(`config: ${missing.join(', ')} must be set when NODE_ENV=production`)
    if (!env.APP_ORIGIN!.startsWith('https://')) throw new Error('config: APP_ORIGIN must be https in production')
  }
  const appOrigin = env.APP_ORIGIN ?? 'http://localhost:5173'
  return {
    port: Number(env.PORT ?? 8080),
    appOrigin,
    dataDir: env.DATA_DIR ?? './data',
    secureCookies: appOrigin.startsWith('https://'),
    smtp: env.SMTP_HOST
      ? {
          host: env.SMTP_HOST,
          port: Number(env.SMTP_PORT ?? 587),
          secure: env.SMTP_SECURE === 'true',
          user: env.SMTP_USER || undefined,
          pass: env.SMTP_PASS || undefined,
        }
      : undefined,
    mailFrom: env.MAIL_FROM ?? 'Zyklus <noreply@localhost>',
    registerLimit: Number(env.REGISTER_LIMIT_PER_HOUR ?? 5),
  }
}
