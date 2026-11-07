import { useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { bestE1rm } from '../domain/progression'
import { fmt } from '../domain/util'
import { exerciseMap, useStore } from '../store'
import { Icon } from '../ui/kit'
import { toast } from '../ui/notify'
import { useT } from '../i18n'
import { exerciseName } from '../i18n/content/exercises'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function MesoReview() {
  const s = useStore()
  const nav = useNavigate()
  const lib = useMemo(() => exerciseMap(s), [s])
  const { t } = useT()
  const meso = s.meso
  if (!meso) return <Navigate to="/" replace />
  const sessions = s.sessions.filter((x) => x.mesoId === meso.id && x.finishedAt)
  const ready = sessions.map((x) => x.readiness).filter((x): x is number => x != null)
  const ratings = sessions.map((x) => x.rating).filter((x): x is number => x != null)
  const avgReady = ready.length ? ready.reduce((a, b) => a + b, 0) / ready.length : undefined
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : undefined

  const progress = new Map<string, { first: number; last: number }>()
  for (const x of sessions) {
    if (x.deload) continue
    for (const e of x.exercises) {
      const v = bestE1rm(e)
      if (!v) continue
      const p = progress.get(e.exerciseId)
      if (!p) progress.set(e.exerciseId, { first: v, last: v })
      else p.last = v
    }
  }
  const rows = [...progress.entries()].map(([id, p]) => ({ id, ...p, pct: ((p.last - p.first) / p.first) * 100 })).sort((a, b) => b.pct - a.pct)
  const improved = rows.filter((r) => r.pct > 0.5).length

  // more volume only when recovery and mood were good
  let bonus = 0
  let advice = t('progress.review.adviceSame')
  if ((avgReady ?? 60) >= 65 && (avgRating ?? 3.5) >= 3.5 && improved >= rows.length / 2) {
    bonus = 1
    advice = t('progress.review.adviceMore')
  } else if ((avgReady ?? 60) < 45) {
    advice = t('progress.review.adviceLow')
  }

  const start = (b: number) => {
    s.startNextMeso(b)
    toast(t('progress.review.started', { n: meso.number + 1 }))
    nav('/plan')
  }

  return (
    <div className="page">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="icon" onClick={() => nav(-1)} aria-label={t('common.back')}>
          <Icon name="back" />
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <div className="eyebrow">{t('progress.review.eyebrow')}</div>
        <h1>{t('progress.review.title', { n: meso.number })}</h1>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 flex flex-col gap-0.5">
          <span className="text-[1.4rem] font-extrabold tabular-nums">{sessions.length}</span>
          <span className="text-[0.78rem] font-semibold text-muted-foreground">{t('progress.review.sessions')}</span>
        </Card>
        <Card className="p-3 flex flex-col gap-0.5">
          <span className="text-[1.4rem] font-extrabold tabular-nums">{avgReady != null ? Math.round(avgReady) : '–'}</span>
          <span className="text-[0.78rem] font-semibold text-muted-foreground">{t('progress.review.avgReadiness')}</span>
        </Card>
        <Card className="p-3 flex flex-col gap-0.5">
          <span className="text-[1.4rem] font-extrabold tabular-nums">
            {improved}/{rows.length}
          </span>
          <span className="text-[0.78rem] font-semibold text-muted-foreground">{t('progress.review.stronger')}</span>
        </Card>
      </div>
      <Card className="flex flex-col gap-2" style={{ gap: 0 }}>
        <h3 style={{ marginBottom: 8 }}>{t('progress.review.strength')}</h3>
        <div className="flex flex-col divide-y divide-border">
          {rows.length === 0 && <p className="empty-state">{t('progress.review.noData')}</p>}
          {rows.map((r) => (
            <div key={r.id} className="list-row">
              <span className="min-w-0 flex-1">
                <span style={{ fontWeight: 600 }}>{lib.get(r.id) ? exerciseName(lib.get(r.id)!) : r.id}</span>
                <span className="text-[0.85rem] text-muted-foreground tabular-nums" style={{ display: 'block' }}>
                  {fmt(r.first, 1)} → {fmt(r.last, 1)} kg
                </span>
              </span>
              <Badge variant={r.pct > 0.5 ? 'ok' : r.pct < -0.5 ? 'warn' : 'default'}>
                {r.pct >= 0 ? '+' : ''}
                {fmt(r.pct, 1)} %
              </Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card className="[--glass-fill:var(--accent-grad)] text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/80 flex flex-col gap-2">
        <h2>{t('progress.review.recommendation')}</h2>
        <p className="text-[0.85rem]">{advice}</p>
        <Button variant="secondary" style={{ background: 'var(--accent-ink)', color: 'var(--accent)', border: 0 }} onClick={() => start(bonus)}>
          {t('progress.review.startNext')}
        </Button>
      </Card>
      {bonus === 1 ? (
        <Button variant="secondary" className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={() => start(0)}>
          {t('progress.review.withoutExtra')}
        </Button>
      ) : (
        <Button variant="secondary" className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={() => start(1)}>
          {t('progress.review.withExtra')}
        </Button>
      )}
    </div>
  )
}
