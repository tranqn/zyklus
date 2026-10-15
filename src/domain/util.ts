/** Current epoch ms. Read it in handlers and effects, not during render. */
import { getLocale } from '../i18n/lang'

export function nowMs(): number {
  return Date.now()
}

export function currentHour(): number {
  return new Date().getHours()
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Local calendar date as YYYY-MM-DD. */
export function today(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDay(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseDay(s)
  d.setDate(d.getDate() + n)
  return today(d)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000)
}

/** 0 = Montag ... 6 = Sonntag */
export function weekdayIndex(s: string): number {
  return (parseDay(s).getDay() + 6) % 7
}

export function startOfWeek(s: string): string {
  return addDays(s, -weekdayIndex(s))
}

export function formatDate(s: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return parseDay(s).toLocaleDateString(getLocale(), opts)
}

/** Number in the current UI locale (1.234,5 in de/vi, 1,234.5 in en). */
export function fmt(n: number, digits = 0): string {
  return n.toLocaleString(getLocale(), { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0)
}
