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
