import type { KeyboardEvent, SVGProps } from 'react'
import type { Muscle } from '../domain/types'

/*
 * Front and back figure in a 100 × 214 box. Paths describe the figure's right side (viewer's left);
 * the other side is the same path mirrored around x = 50. Centre pieces (head, abs, traps) are drawn once.
 */
type Part = { side?: string[]; centre?: string[] }

const SILHOUETTE: Part = {
  centre: ['M45 22 L55 22 L56 30 L44 30 Z'],
  side: [
    'M50 28 C42 28 32 29 27 33 C23 36 23 44 24 50 L33 54 C34 66 35 78 34 92 L33 102 L50 104 Z',
    'M24 44 C20 52 19 62 20 74 L29 74 C31 64 32 54 32 46 Z',
    'M20 72 C17 82 15 94 16 104 L23 105 C26 96 29 84 29 72 Z',
    'M19 104 C15 105 14 110 15 114 C17 117 21 117 23 114 C24 110 23 106 23 104 Z',
    'M33 100 C31 116 32 134 36 152 L49 152 C49 136 50 118 50 104 Z',
    'M36 150 C35 154 36 158 37 160 L48 160 C49 157 49 153 49 150 Z',
    'M36 158 C34 172 35 188 38 200 L46 200 C47 188 49 172 48 158 Z',
    'M37 199 L47 199 L48 207 C43 209 37 209 33 208 C33 204 35 201 37 199 Z',
  ],
}

const FRONT: Partial<Record<Muscle, Part>> = {
  schultern: { side: ['M35 31 C28 31 24 35 24 42 L25 49 C28 44 32 41 37 39 L38 32 Z'] },
  brust: { side: ['M49 33 L49 50 C44 53 38 52 35.5 48 C34.5 43 35 37 38 33.5 C42 32.5 46 32.5 49 33 Z'] },
  bizeps: { side: ['M25 51 C22 57 21 64 22 72 L28 72 C30 64 31 56 31 49 Z'] },
  unterarme: { side: ['M21 76 C18 85 17 94 17 102 L22 103 C25 94 27 85 28 76 Z'] },
  bauch: { centre: ['M43 55 L57 55 L56.5 88 C54 93 46 93 43.5 88 Z'] },
  quadrizeps: { side: ['M34.5 106 C33.5 120 34 136 37 149 L48 149 C48.5 135 49 120 49 108 Z'] },
  waden: { side: ['M37.5 162 C35.5 173 36.5 186 39 196 L45 196 C46 186 47.5 173 47 162 Z'] },
}

const BACK: Partial<Record<Muscle, Part>> = {
  schultern: FRONT.schultern,
  ruecken: {
    centre: ['M50 24 L57 29 L62 32 L56 36 L52 50 L50 52 L48 50 L44 36 L38 32 L43 29 Z'],
    side: ['M43.5 38.5 L48.5 54 L48.5 80 C44 78 39 72 35.5 63 C34.5 56 34.5 48 36.5 41 Z'],
  },
  trizeps: FRONT.bizeps,
  unterarme: FRONT.unterarme,
  gesaess: { side: ['M49.5 92 L49.5 110 C44 114 37 112 34.5 106 C33.5 99 34.5 94 36 91 Z'] },
  beinbeuger: { side: ['M34.5 113.5 C34 126 35 140 37 149 L48 149 C48.5 138 49 126 49 115.5 Z'] },
  waden: { side: ['M36.5 159 C34 168 35.5 180 39 190 L46 190 C48 180 48.5 168 47.5 159 Z'] },
}

const MIRROR = 'translate(100 0) scale(-1 1)'

function Shapes({ shape, ...rest }: { shape: Part } & SVGProps<SVGPathElement>) {
  return (
    <>
      {shape.centre?.map((d) => <path key={d} d={d} {...rest} />)}
      {shape.side?.map((d) => <path key={d} d={d} {...rest} />)}
      {shape.side?.map((d) => <path key={`m${d}`} d={d} transform={MIRROR} {...rest} />)}
    </>
  )
}

function Figure({ muscles, x, caption, fill, label, selected, onSelect }: { muscles: Partial<Record<Muscle, Part>>; x: number; caption: string } & Omit<Props, 'front' | 'back' | 'title'>) {
  const key = (m: Muscle) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(m)
    }
  }
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse cx="50" cy="13" rx="8.5" ry="10.5" fill="var(--surface-2)" />
      <Shapes shape={SILHOUETTE} fill="var(--surface-2)" />
      {(Object.entries(muscles) as [Muscle, Part][]).map(([m, part]) => (
        <g key={m} role="button" tabIndex={0} aria-label={label(m)} aria-pressed={selected === m} className="bm-muscle" onClick={() => onSelect(m)} onKeyDown={key(m)}>
          <Shapes shape={part} fill={fill(m)} stroke={selected === m ? 'var(--text)' : 'var(--surface)'} strokeWidth={selected === m ? 1.2 : 0.6} strokeLinejoin="round" />
        </g>
      ))}
      {muscles.bauch && <path d="M50 57 L50 89 M44 66 L56 66 M44 76 L56 76" stroke="var(--surface)" strokeWidth="0.6" fill="none" pointerEvents="none" />}
      <text x="50" y="214" textAnchor="middle" fontSize="7" fill="var(--muted)">
        {caption}
      </text>
    </g>
  )
}

interface Props {
  fill: (m: Muscle) => string
  label: (m: Muscle) => string
  selected?: Muscle
  onSelect: (m: Muscle) => void
  front: string
  back: string
  title: string
}

/** Tappable front/back muscle figure; colors come from the caller. */
export function BodyMap({ front, back, title, ...rest }: Props) {
  return (
    <svg className="bodymap" viewBox="0 0 210 218" role="group" aria-label={title}>
      <Figure muscles={FRONT} x={0} caption={front} {...rest} />
      <Figure muscles={BACK} x={110} caption={back} {...rest} />
    </svg>
  )
}
