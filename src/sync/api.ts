import { tk } from '../i18n'

export interface PublicUser {
  id: number
  email: string
  verified: boolean
  createdAt: number
  locale?: string
}

export class ApiError extends Error {
  status: number
  code: string
  body: Record<string, unknown>
  constructor(status: number, code: string, message: string, body: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.body = body
  }
}

/** An error on this device rather than on the server; `code` has a text under account.apiError. */
export class LocalError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

interface Binding {
  /** `<id>:<createdAt>` of the account the local data belongs to, if any */
  account: () => string | undefined
  /** false while a signed-in user's data is not bound yet: account requests must wait */
  ready: () => boolean
  /** the session belongs to another account than the local data (409 account_mismatch) */
  onAccountMismatch: () => void
}
let binding: Binding = { account: () => undefined, ready: () => true, onAccountMismatch: () => {} }

/** Routes that act on the signed-in account (behind requireUser on the server). */
const ACCOUNT_SCOPED = /^\/(state|social\/|account\/|auth\/(resend-verification|change-password))/

/** Set by the sync engine, which owns the account binding (api.ts must not import it). */
export function configureApi(b: Binding) {
  binding = b
}

/** JSON call to our own /api. Network failures surface as ApiError(0, 'offline'). */
export async function api<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
  // Without the binding the request would carry no account header, so the server would answer for
  // whoever the cookie belongs to now (say, friends of Y cached as X's): such requests wait.
  if (ACCOUNT_SCOPED.test(path) && !binding.ready()) throw new LocalError('not_ready', 'Die Anmeldung wird noch geprüft.')
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['content-type'] = 'application/json'
  // the server refuses to read or write for any other account than this one (see requireUser)
  const account = binding.account()
  if (account) headers['x-zyklus-account'] = account
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'offline', 'Keine Verbindung. Prüfe dein Internet.')
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (res.status === 409 && data.error === 'account_mismatch') binding.onAccountMismatch()
  if (!res.ok) throw new ApiError(res.status, String(data.error ?? 'error'), String(data.message ?? 'Unbekannter Fehler.'), data)
  return data as T
}


/**
 * Translated message for an API error. The server only provides stable codes for the UI;
 * `context` picks a more specific text (e.g. credentials_current on the change-password form).
 */
export function apiMessage(e: unknown, context?: string): string {
  if (e instanceof LocalError) return tk(`account.apiError.${e.code}`, undefined, tk('account.apiError.generic'))
  if (!(e instanceof ApiError)) return tk('account.apiError.generic')
  const code = e.status === 0 ? 'offline' : e.status >= 500 ? 'server' : e.code
  const specific = context ? tk(`account.apiError.${code}_${context}`, undefined, '') : ''
  return specific || tk(`account.apiError.${code}`, undefined, tk('account.apiError.generic'))
}
