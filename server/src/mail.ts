import nodemailer from 'nodemailer'
import type { Config } from './config.ts'

export interface Mail {
  to: string
  subject: string
  text: string
}

export type Mailer = (m: Mail) => Promise<void>

export function createMailer(cfg: Config): Mailer {
  if (!cfg.smtp) {
    return async (m) => {
      console.log(`[mail:dev] to=${m.to} subject=${m.subject}\n${m.text}`)
    }
  }
  const transport = nodemailer.createTransport({
    host: cfg.smtp.host,
    port: cfg.smtp.port,
    secure: cfg.smtp.secure,
    auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass } : undefined,
  })
  return async (m) => {
    await transport.sendMail({ from: cfg.mailFrom, to: m.to, subject: m.subject, text: m.text })
  }
}

export function verifyMail(origin: string, token: string): Omit<Mail, 'to'> {
  return {
    subject: 'Bitte bestätige deine E-Mail-Adresse für Zyklus',
    text: `Hallo,

willkommen bei Zyklus! Bitte bestätige deine E-Mail-Adresse mit diesem Link:

${origin}/#/konto/bestaetigen?token=${token}

Der Link ist 7 Tage gültig. Unbestätigte Konten werden danach gelöscht.

Wenn du dich nicht registriert hast, kannst du diese E-Mail ignorieren.

Dein Zyklus-Team`,
  }
}

export function resetMail(origin: string, token: string): Omit<Mail, 'to'> {
  return {
    subject: 'Zyklus: Passwort zurücksetzen',
    text: `Hallo,

du hast ein neues Passwort für Zyklus angefordert. Hier kannst du es festlegen:

${origin}/#/konto/passwort?token=${token}

Der Link ist 1 Stunde gültig. Wenn du das nicht warst, ignoriere diese E-Mail, dein Passwort bleibt unverändert.

Dein Zyklus-Team`,
  }
}

export function passwordChangedMail(): Omit<Mail, 'to'> {
  return {
    subject: 'Zyklus: Dein Passwort wurde geändert',
    text: `Hallo,

das Passwort deines Zyklus-Kontos wurde gerade geändert und alle anderen Geräte wurden abgemeldet.

Warst du das nicht? Setze dein Passwort sofort über „Passwort vergessen" in der App zurück.

Dein Zyklus-Team`,
  }
}
