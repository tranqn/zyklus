import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import nodemailer from 'nodemailer'
import type { Config } from './config.ts'
import type { Locale } from './db.ts'

export interface Mail {
  to: string
  subject: string
  text: string
}

export type Mailer = (m: Mail) => Promise<void>

export function createMailer(cfg: Config): Mailer {
  if (!cfg.smtp) {
    // Development and end-to-end tests: nothing is sent. The mail goes to the console and,
    // so a test can follow a confirmation link, as one JSON line into the data directory.
    // Only ever reached without SMTP_HOST, which production refuses to start without.
    return async (m) => {
      console.log(`[mail:dev] to=${m.to} subject=${m.subject}\n${m.text}`)
      try {
        appendFileSync(join(cfg.dataDir, 'mails.log'), `${JSON.stringify({ at: Date.now(), ...m })}\n`)
      } catch {
        // no data directory (unit tests): the console line is enough
      }
    }
  }
  const transport = nodemailer.createTransport({
    host: cfg.smtp.host,
    port: cfg.smtp.port,
    secure: cfg.smtp.secure,
    auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass } : undefined,
  })
  return async (m) => {
    const info = await transport.sendMail({ from: cfg.mailFrom, to: m.to, subject: m.subject, text: m.text })
    console.log(`mail sent to=${maskEmail(m.to)} subject="${m.subject}" id=${info.messageId} response="${info.response}"`)
  }
}

/** keeps the log useful without storing full addresses: "erika.musterfrau@example.com" -> "er***@example.com" */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')
  if (at < 1) return '***'
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`
}

type Template = (link: string) => Omit<Mail, 'to'>

const VERIFY: Record<Locale, Template> = {
  de: (link) => ({
    subject: 'Bitte bestätige deine E-Mail-Adresse für Zyklus',
    text: `Hallo,\n\nwillkommen bei Zyklus! Bitte bestätige deine E-Mail-Adresse mit diesem Link:\n\n${link}\n\nDer Link ist 7 Tage gültig. Unbestätigte Konten werden danach gelöscht.\n\nWenn du dich nicht registriert hast, kannst du diese E-Mail ignorieren.\n\nDein Zyklus-Team`,
  }),
  en: (link) => ({
    subject: 'Please confirm your email address for Zyklus',
    text: `Hello,\n\nwelcome to Zyklus! Please confirm your email address with this link:\n\n${link}\n\nThe link is valid for 7 days. Unconfirmed accounts are deleted after that.\n\nIf you did not sign up, you can ignore this email.\n\nYour Zyklus team`,
  }),
  vi: (link) => ({
    subject: 'Vui lòng xác nhận địa chỉ email của bạn cho Zyklus',
    text: `Xin chào,\n\nchào mừng bạn đến với Zyklus! Vui lòng xác nhận địa chỉ email của bạn qua đường dẫn này:\n\n${link}\n\nĐường dẫn có hiệu lực trong 7 ngày. Sau thời gian đó, tài khoản chưa xác nhận sẽ bị xóa.\n\nNếu bạn không đăng ký, hãy bỏ qua email này.\n\nĐội ngũ Zyklus`,
  }),
}

const RESET: Record<Locale, Template> = {
  de: (link) => ({
    subject: 'Zyklus: Passwort zurücksetzen',
    text: `Hallo,\n\ndu hast ein neues Passwort für Zyklus angefordert. Hier kannst du es festlegen:\n\n${link}\n\nDer Link ist 1 Stunde gültig. Wenn du das nicht warst, ignoriere diese E-Mail, dein Passwort bleibt unverändert.\n\nDein Zyklus-Team`,
  }),
  en: (link) => ({
    subject: 'Zyklus: reset your password',
    text: `Hello,\n\nyou requested a new password for Zyklus. You can set it here:\n\n${link}\n\nThe link is valid for 1 hour. If this was not you, ignore this email; your password stays unchanged.\n\nYour Zyklus team`,
  }),
  vi: (link) => ({
    subject: 'Zyklus: đặt lại mật khẩu',
    text: `Xin chào,\n\nbạn đã yêu cầu mật khẩu mới cho Zyklus. Bạn có thể đặt mật khẩu tại đây:\n\n${link}\n\nĐường dẫn có hiệu lực trong 1 giờ. Nếu không phải bạn yêu cầu, hãy bỏ qua email này, mật khẩu của bạn vẫn giữ nguyên.\n\nĐội ngũ Zyklus`,
  }),
}

/*
 * Someone entered this address on the sign-up form while an account already exists.
 * The answer to the request itself is the same as for an unknown address, so this mail is the
 * only place the difference shows - and it goes to the owner of the address, not to whoever
 * typed it in.
 */
const EXISTS: Record<Locale, Template> = {
  de: (link) => ({
    subject: 'Zyklus: Es gibt schon ein Konto mit dieser Adresse',
    text: `Hallo,\n\njemand hat gerade versucht, mit dieser E-Mail-Adresse ein Zyklus-Konto anzulegen. Ein Konto mit dieser Adresse gibt es aber schon.\n\nWarst du das? Dann melde dich einfach an:\n\n${link}\n\nHast du dein Passwort vergessen, nutze in der App „Passwort vergessen?".\n\nWarst du das nicht, musst du nichts tun. Es wurde kein neues Konto angelegt und an deinem bestehenden Konto hat sich nichts geändert.\n\nDein Zyklus-Team`,
  }),
  en: (link) => ({
    subject: 'Zyklus: an account with this address already exists',
    text: `Hello,\n\nsomeone just tried to create a Zyklus account with this email address. An account with this address already exists.\n\nWas that you? Then simply sign in:\n\n${link}\n\nIf you forgot your password, use "Forgot password?" in the app.\n\nIf that was not you, there is nothing to do. No new account was created and nothing about your existing account has changed.\n\nYour Zyklus team`,
  }),
  vi: (link) => ({
    subject: 'Zyklus: đã có tài khoản dùng địa chỉ này',
    text: `Xin chào,\n\nvừa có người thử tạo tài khoản Zyklus bằng địa chỉ email này. Nhưng đã có một tài khoản dùng địa chỉ này.\n\nĐó là bạn? Vậy hãy đăng nhập:\n\n${link}\n\nNếu bạn quên mật khẩu, hãy dùng "Quên mật khẩu?" trong ứng dụng.\n\nNếu không phải bạn, bạn không cần làm gì. Không có tài khoản mới nào được tạo và tài khoản hiện có của bạn không thay đổi gì.\n\nĐội ngũ Zyklus`,
  }),
}

const CHANGED: Record<Locale, () => Omit<Mail, 'to'>> = {
  de: () => ({
    subject: 'Zyklus: Dein Passwort wurde geändert',
    text: `Hallo,\n\ndas Passwort deines Zyklus-Kontos wurde gerade geändert und alle anderen Geräte wurden abgemeldet.\n\nWarst du das nicht? Setze dein Passwort sofort über „Passwort vergessen" in der App zurück.\n\nDein Zyklus-Team`,
  }),
  en: () => ({
    subject: 'Zyklus: your password was changed',
    text: `Hello,\n\nthe password of your Zyklus account was just changed and all other devices were signed out.\n\nWasn't that you? Reset your password immediately via "Forgot password?" in the app.\n\nYour Zyklus team`,
  }),
  vi: () => ({
    subject: 'Zyklus: mật khẩu của bạn đã được thay đổi',
    text: `Xin chào,\n\nmật khẩu tài khoản Zyklus của bạn vừa được thay đổi và tất cả thiết bị khác đã được đăng xuất.\n\nNếu không phải bạn? Hãy đặt lại mật khẩu ngay qua mục "Quên mật khẩu?" trong ứng dụng.\n\nĐội ngũ Zyklus`,
  }),
}

export function accountExistsMail(origin: string, locale: Locale = 'de'): Omit<Mail, 'to'> {
  return EXISTS[locale](origin)
}

export function verifyMail(origin: string, token: string, locale: Locale = 'de'): Omit<Mail, 'to'> {
  return VERIFY[locale](`${origin}/#/konto/bestaetigen?token=${token}`)
}

export function resetMail(origin: string, token: string, locale: Locale = 'de'): Omit<Mail, 'to'> {
  return RESET[locale](`${origin}/#/konto/passwort?token=${token}`)
}

export function passwordChangedMail(locale: Locale = 'de'): Omit<Mail, 'to'> {
  return CHANGED[locale]()
}
