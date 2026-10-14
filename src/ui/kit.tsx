import { useEffect, useRef, useState, type ReactNode } from 'react'
import { onToast } from './notify'

const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  plan: 'M8 3v3M16 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 12h3M8 16h6',
  food: 'M7 3v8a3 3 0 0 0 3 3v7M7 3v5M10 3v8M13 3v8m4-8c-1.5 1-2.5 3-2.5 6s1 3.5 2.5 3.5V21',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M15 5l-7 7 7 7',
  chevron: 'm9 5 7 7-7 7',
  swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  info: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  timer: 'M12 8v5l3 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  flame: 'M12 22c4 0 7-2.7 7-7 0-3.5-2.5-6-4-8-.5 2-1.5 3-3 3 0-3-1-6-4-8 0 4-5 7-5 13 0 4.3 4 7 9 7z',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  up: 'm6 15 6-6 6 6',
  down: 'm6 9 6 6 6-6',
  play: 'M7 4v16l13-8z',
  pause: 'M7 4h4v16H7zM13 4h4v16h-4z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  scale: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8.5 9.5a5 5 0 0 1 7 0L12 12',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  stretch: 'M12 4a2 2 0 1 0 0 .01M6 21l3-7 3 2 3-2 3 7M7 9l5 2 5-2',
  run: 'M14 4a2 2 0 1 0 0 .01M6 20l3-5 3 2v5M9 15l1-6 4 2 3 3M10 9l-3 2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  dumbbell: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
  calendar: 'M8 3v3M16 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
}

export function Icon({ name, size = 22, stroke = 2 }: { name: keyof typeof PATHS | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? ''} />
    </svg>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {title != null && (
          <div className="sheet-head">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Schließen">
              <Icon name="close" size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function Ring({ value, max, size = 120, stroke = 12, color = 'var(--accent)', children }: { value: number; max: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={value > max ? 'var(--bad)' : color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset .4s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  )
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, suffix, label }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string; label: string }) {
  const round = (v: number) => Math.round(v * 100) / 100
  return (
    <div className="row" style={{ gap: 10 }}>
      <button type="button" className="icon-btn" aria-label={`${label} verringern`} onClick={() => onChange(Math.max(min, round(value - step)))}>
        <Icon name="minus" />
      </button>
      <div className="grow" style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '1.6rem', fontWeight: 750 }} className="num">
          {String(value).replace('.', ',')}
        </span>
        {suffix && <span className="muted"> {suffix}</span>}
      </div>
      <button type="button" className="icon-btn" aria-label={`${label} erhöhen`} onClick={() => onChange(Math.min(max, round(value + step)))}>
        <Icon name="plus" />
      </button>
    </div>
  )
}

export function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="bar" role="presentation">
      <div style={{ width: `${pct}%`, background: value > max * 1.05 ? 'var(--bad)' : color }} />
    </div>
  )
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null)
  const t = useRef<number | undefined>(undefined)
  useEffect(
    () =>
      onToast((m) => {
        setMsg(m)
        window.clearTimeout(t.current)
        t.current = window.setTimeout(() => setMsg(null), 2400)
      }),
    [],
  )
  if (!msg) return null
  return (
    <div className="toast" role="status">
      {msg}
    </div>
  )
}

export interface Point {
  x: string
  y: number
  y2?: number
}

/** Minimal responsive line chart: y = raw points, y2 = optional trend line. */
export function LineChart({ data, unit = '', height = 160, label }: { data: Point[]; unit?: string; height?: number; label: string }) {
  const [hover, setHover] = useState<number | null>(null)
  if (data.length < 2) return <p className="muted small">Noch zu wenige Daten für ein Diagramm.</p>
  const w = 320
  const padL = 34
  const padB = 20
  const padT = 10
  const ys = data.flatMap((d) => [d.y, d.y2 ?? d.y])
  let lo = Math.min(...ys)
  let hi = Math.max(...ys)
  if (hi - lo < 1) {
    hi += 0.5
    lo -= 0.5
  }
  const span = hi - lo
  lo -= span * 0.1
  hi += span * 0.1
  const X = (i: number) => padL + (i / (data.length - 1)) * (w - padL - 8)
  const Y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (height - padT - padB)
  const path = (key: 'y' | 'y2') =>
    data
      .map((d, i) => [i, d[key]] as const)
      .filter(([, v]) => v != null)
      .map(([i, v], k) => `${k ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v!).toFixed(1)}`)
      .join('')
  const hasTrend = data.some((d) => d.y2 != null)
  const ticks = [lo + (hi - lo) * 0.15, lo + (hi - lo) * 0.5, lo + (hi - lo) * 0.85]
  const h = hover != null ? data[hover] : data[data.length - 1]
  return (
    <figure style={{ margin: 0 }}>
      <div className="row between small" style={{ marginBottom: 4 }}>
        <span className="muted">{h.x}</span>
        <span className="num" style={{ fontWeight: 700 }}>
          {(hasTrend && h.y2 != null ? h.y2 : h.y).toLocaleString('de-DE', { maximumFractionDigits: 1 })} {unit}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        role="img"
        aria-label={label}
        style={{ display: 'block', touchAction: 'pan-y' }}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * w
          const i = Math.round(((px - padL) / (w - padL - 8)) * (data.length - 1))
          setHover(Math.max(0, Math.min(data.length - 1, i)))
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - 8} y1={Y(t)} y2={Y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={padL - 6} y={Y(t) + 4} fontSize="10" textAnchor="end" fill="var(--muted)">
              {Math.round(t)}
            </text>
          </g>
        ))}
        <text x={padL} y={height - 4} fontSize="10" fill="var(--muted)">
          {data[0].x}
        </text>
        <text x={w - 8} y={height - 4} fontSize="10" textAnchor="end" fill="var(--muted)">
          {data[data.length - 1].x}
        </text>
        <path d={path('y')} fill="none" stroke={hasTrend ? 'var(--muted)' : 'var(--accent)'} strokeWidth={hasTrend ? 1 : 2.5} strokeOpacity={hasTrend ? 0.5 : 1} strokeLinejoin="round" />
        {hasTrend && <path d={path('y2')} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />}
        {data.map((d, i) => (
          <circle key={i} cx={X(i)} cy={Y(d.y)} r={hover === i ? 4.5 : hasTrend ? 1.8 : 3} fill={hasTrend ? 'var(--muted)' : 'var(--accent)'} />
        ))}
        {hover != null && <line x1={X(hover)} x2={X(hover)} y1={padT} y2={height - padB} stroke="var(--text)" strokeOpacity="0.25" />}
      </svg>
    </figure>
  )
}
