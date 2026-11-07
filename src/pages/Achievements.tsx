import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ACHIEVEMENTS, achievementLevel, activityLog, isActive, MAX_SHIELDS, pausedDays, SOCIAL_ACHIEVEMENTS, type AchievementId, type Flames, type SocialAchievementId } from '../domain/motivation'
import { addDays, fmt, formatDate, startOfWeek, today } from '../domain/util'
import { useStore } from '../store'
import { useT, weekdaysShort } from '../i18n'
import { Bar, Icon, Sheet, Stepper } from '../ui/kit'
import { FlameStatus } from '../ui/Flames'
import { refreshSocial, useSocialCache } from '../sync/social'
import { useFlames } from '../ui/useFlames'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function AchievementsPage() {
  const s = useStore()
  const nav = useNavigate()
  const { t } = useT()
  const f = useFlames()
  const { counts } = useSocialCache()
  // friend and challenge counts for the social achievements; offline the cache stays
  useEffect(() => {
    refreshSocial().catch(() => undefined)
  }, [])
  const [open, setOpen] = useState<AnyId | null>(null)
  const value = (id: AnyId) => (isSocial(id) ? (counts?.[id] ?? 0) : f.progress[id])

  return (
    <div className="page">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="icon" onClick={() => nav(-1)} aria-label={t('common.back')}>
          <Icon name="back" />
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <div className="eyebrow">{t('motivation.eyebrow')}</div>
        <h1>{t('motivation.title')}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className={cn('flame-card flex flex-col gap-1', f.daily.activeToday && 'lit')}>
          <span className="eyebrow">{t('motivation.daily')}</span>
          <div className="flex items-center gap-2" style={{ gap: 6 }}>
            <Icon name="flame" size={28} />
            <span className="flame-n tabular-nums">{f.daily.count}</span>
          </div>
          <span className="text-[0.85rem] text-muted-foreground">{t('motivation.days', { n: f.daily.count })}</span>
          <span className="text-xs text-muted-foreground">{t('motivation.best', { n: f.daily.best })}</span>
        </Card>
        <Card className={cn('flame-card flex flex-col gap-1', f.weekly.thisWeek.done && 'lit')}>
          <span className="eyebrow">{t('motivation.weekly')}</span>
          <div className="flex items-center gap-2" style={{ gap: 6 }}>
            <Icon name="calendar" size={26} />
            <span className="flame-n tabular-nums">{f.weekly.count}</span>
          </div>
          <span className="text-[0.85rem] text-muted-foreground">{t('motivation.weeks', { n: f.weekly.count })}</span>
          <span className="text-xs text-muted-foreground">{t('motivation.best', { n: f.weekly.best })}</span>
        </Card>
      </div>
      <FlameStatus f={f} />

      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3>{t('motivation.shields')}</h3>
          <span className="flex items-center gap-2" style={{ gap: 4 }} role="img" aria-label={t('motivation.shieldsA11y', { n: f.daily.shields, max: MAX_SHIELDS })}>
            {Array.from({ length: MAX_SHIELDS }, (_, i) => (
              <span key={i} className={`shield ${i < f.daily.shields ? 'on' : ''}`}>
                <Icon name="shield" size={22} />
              </span>
            ))}
          </span>
        </div>
        <p className="text-[0.85rem] text-muted-foreground">{t('motivation.shieldsInfo', { max: MAX_SHIELDS })}</p>
      </Card>

      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3>{f.weekly.thisWeek.done ? t('motivation.weekDone') : t('motivation.thisWeek', { n: f.weekly.thisWeek.active, goal: f.weekly.thisWeek.goal })}</h3>
          {f.weekly.thisWeek.done && <Icon name="check" size={20} />}
        </div>
        <Bar value={Math.min(f.weekly.thisWeek.active, f.weekly.thisWeek.goal)} max={f.weekly.thisWeek.goal} color="var(--accent)" />
        <div className="flex items-center justify-between gap-2" style={{ marginTop: 6 }}>
          <span className="text-[0.85rem]">{t('motivation.goalLabel')}</span>
          <Stepper value={f.weekly.thisWeek.goal} min={1} max={7} label={t('motivation.goalLabel')} onChange={(v) => s.setWeeklyGoal(v)} />
        </div>
        <p className="text-xs text-muted-foreground">{t('motivation.goalHint')}</p>
      </Card>

      <History f={f} />

      <p className="text-[0.85rem] text-muted-foreground">{t('motivation.rules')}</p>

      <h2>{t('motivation.achievements')}</h2>
      <Card className="flex flex-col divide-y divide-border" style={{ padding: '0 16px' }}>
        {ALL.map((a) => (
          <AchievementRow key={a.id} id={a.id} value={value(a.id)} onOpen={() => setOpen(a.id)} />
        ))}
      </Card>
      <Link to="/freunde" className="glass-card rounded-[var(--radius)] p-4 text-card-foreground flex items-center gap-2" style={{ gap: 12, textDecoration: 'none', color: 'inherit' }}>
        <Icon name="users" />
        <span className="min-w-0 flex-1 text-[0.85rem]">{t('motivation.friendsLink')}</span>
        <Icon name="chevron" size={18} />
      </Link>

      <AchievementSheet id={open} f={f} value={open ? value(open) : 0} onClose={() => setOpen(null)} />
    </div>
  )
}

function History({ f }: { f: Flames }) {
  const s = useStore()
  const { t, lang } = useT()
  const d = today()
  const log = useMemo(() => activityLog(s), [s])
  const paused = useMemo(() => new Set(pausedDays(s)), [s])
  const shielded = new Set(f.daily.shieldDays)
  const first = addDays(startOfWeek(d), -7 * 7)
  const names = weekdaysShort(lang)
  return (
    <Card className="flex flex-col gap-2">
      <h3>{t('motivation.history')}</h3>
      <div className="hist" role="img" aria-label={t('motivation.history')}>
        {names.map((w) => (
          <span key={w} className="text-xs text-muted-foreground">
            {w}
          </span>
        ))}
        {Array.from({ length: 56 }, (_, i) => {
          const date = addDays(first, i)
          const cls = date > d ? 'future' : isActive(log[date]) ? 'active' : shielded.has(date) ? 'shield' : paused.has(date) ? 'paused' : ''
          return <span key={date} className={`hd ${cls} ${date === d ? 'today' : ''}`} title={formatDate(date)} />
        })}
      </div>
      <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground" style={{ gap: 12 }}>
        <span className="flex items-center gap-2" style={{ gap: 4 }}>
          <span className="hd active" /> {t('motivation.legend.active')}
        </span>
        <span className="flex items-center gap-2" style={{ gap: 4 }}>
          <span className="hd shield" /> {t('motivation.legend.shield')}
        </span>
        <span className="flex items-center gap-2" style={{ gap: 4 }}>
          <span className="hd paused" /> {t('motivation.legend.paused')}
        </span>
      </div>
    </Card>
  )
}

type AnyId = AchievementId | SocialAchievementId
const ALL = [...ACHIEVEMENTS, ...SOCIAL_ACHIEVEMENTS]
const isSocial = (id: AnyId): id is SocialAchievementId => SOCIAL_ACHIEVEMENTS.some((a) => a.id === id)

function AchievementRow({ id, value, onOpen }: { id: AnyId; value: number; onOpen: () => void }) {
  const { t, tk } = useT()
  const tiers = ALL.find((a) => a.id === id)!.tiers
  const { level, next } = achievementLevel(id, value)
  return (
    <button className="list-row" onClick={onOpen} style={{ width: '100%', textAlign: 'left', border: 0, color: 'inherit', font: 'inherit' }}>
      <span className={`medal ${level ? 'on' : ''}`} aria-hidden="true">
        {level ? level : <Icon name="trophy" size={18} />}
      </span>
      <span className="min-w-0 flex-1 flex flex-col gap-2" style={{ gap: 4 }}>
        <strong>{tk(`motivation.a.${id}.name`)}</strong>
        <span className="text-[0.85rem] text-muted-foreground">{next === undefined ? t('motivation.maxed') : tk(`motivation.a.${id}.desc`, { n: fmt(next) })}</span>
        {next !== undefined && <Bar value={value} max={next} color="var(--accent)" />}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">{t('motivation.level', { level, max: tiers.length })}</span>
    </button>
  )
}

function AchievementSheet({ id, f, value, onClose }: { id: AnyId | null; f: Flames; value: number; onClose: () => void }) {
  const { t, tk } = useT()
  const a = ALL.find((x) => x.id === id)
  return (
    <Sheet open={!!a} onClose={onClose} title={a ? tk(`motivation.a.${a.id}.name`) : ''}>
      {a && (
        <div className="flex flex-col gap-2">
          {a.tiers.map((n, i) => {
            // social achievements come from the server as counts, without dates
            const date = isSocial(a.id) ? undefined : f.unlocked[a.id][i]
            const reached = value >= n
            return (
              <div key={n} className="flex items-center gap-2" style={{ gap: 12 }}>
                <span className={`medal ${reached ? 'on' : ''}`} aria-hidden="true">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span style={{ display: 'block' }}>{tk(`motivation.a.${a.id}.desc`, { n: fmt(n) })}</span>
                  <span className="text-xs text-muted-foreground">{date ? t('motivation.reached', { level: i + 1, date: formatDate(date, { day: 'numeric', month: 'long', year: 'numeric' }) }) : reached ? t('motivation.reachedPlain') : t('motivation.locked')}</span>
                </span>
              </div>
            )
          })}
          {(() => {
            const { next } = achievementLevel(a.id, value)
            return <p className="text-[0.85rem] text-muted-foreground">{next === undefined ? t('motivation.maxed') : t('motivation.next', { value: fmt(value), next: fmt(next) })}</p>
          })()}
        </div>
      )}
    </Sheet>
  )
}

