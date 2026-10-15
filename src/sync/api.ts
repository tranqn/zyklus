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

/** JSON call to our own /api. Network failures surface as ApiError(0, 'offline'). */
export async function api<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'offline', 'Keine Verbindung. Prüfe dein Internet.')
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new ApiError(res.status, String(data.error ?? 'error'), String(data.message ?? 'Unbekannter Fehler.'), data)
  return data as T
}


/**
 * Translated message for an API error. The server only provides stable codes for the UI;
 * `context` picks a more specific text (e.g. credentials_current on the change-password form).
 */
export function apiMessage(e: unknown, context?: string): string {
  if (!(e instanceof ApiError)) return tk('account.apiError.generic')
  const code = e.status === 0 ? 'offline' : e.status >= 500 ? 'server' : e.code
  const specific = context ? tk(`account.apiError.${code}_${context}`, undefined, '') : ''
  return specific || tk(`account.apiError.${code}`, undefined, tk('account.apiError.generic'))
}
