import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ACHIEVEMENTS } from '../domain/motivation'
import { daysBetween, fmt, formatDate, today } from '../domain/util'
import { useStore } from '../store'
import { useT } from '../i18n'
import { ApiError } from '../sync/api'
import { challengeLink, inviteLink, refreshSocial, shareLink, social, socialError, useSocial, useSocialCache, type ChallengeView, type FriendView } from '../sync/social'
import { Bar, Icon, Segmented, Sheet, Stepper } from '../ui/kit'
import { confirmAction, toast } from '../ui/notify'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

type Tab = 'friends' | 'challenges'

function Back() {
  const nav = useNavigate()
  const { t } = useT()
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="icon" onClick={() => nav(-1)} aria-label={t('common.back')}>
        <Icon name="back" />
      </Button>
    </div>
  )
}

/** Loads the friends page data; `offline` once a refresh failed for lack of a connection. */
function useRefresh() {
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState('')
  const run = () =>
    refreshSocial().then(
      () => {
        setOffline(false)
        setError('')
      },
      (e: unknown) => {
        if (e instanceof ApiError && e.status === 0) setOffline(true)
        else setError(socialError(e))
      },
    )
  useEffect(() => {
    void run()
  }, [])
  return { offline, error, refresh: run }
}

export default function FriendsPage() {
  const { t } = useT()
  const loc = useLocation()
  const [tab, setTab] = useState<Tab>((loc.state as { tab?: Tab } | null)?.tab ?? 'friends')
  const { offline, error, refresh } = useRefresh()
  return (
    <div className="page">
      <Back />
      <div className="flex flex-col gap-2">
        <div className="eyebrow">{t('social.eyebrow')}</div>
        <h1>{t('social.title')}</h1>
      </div>
      <Segmented
        value={tab}
        onChange={setTab}
        label={t('social.title')}
        options={[
          { value: 'friends', label: t('social.tabs.friends') },
          { value: 'challenges', label: t('social.tabs.challenges') },
        ]}
      />
      {offline && <p className="text-[0.85rem] text-muted-foreground">{t('social.offline')}</p>}
      {error && (
        <p className="text-[0.85rem]" style={{ color: 'var(--bad)' }}>
          {error}
        </p>
      )}
      {tab === 'friends' ? <FriendsTab refresh={refresh} /> : <ChallengesTab refresh={refresh} />}
    </div>
  )
}

function NameCard() {
  const s = useStore()
  const { t } = useT()
  const [name, setName] = useState('')
  if (s.profile?.name) return null
  return (
    <form
      className="glass-card rounded-[var(--radius)] p-4 text-card-foreground flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) s.updateProfile({ name: name.trim().slice(0, 40) })
      }}
    >
      <h3>{t('social.name.title')}</h3>
      <p className="text-[0.85rem] text-muted-foreground">{t('social.name.hint')}</p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="social-name">{t('social.name.label')}</label>
        <Input id="social-name" value={name} maxLength={40} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
      </div>
      <Button type="submit" disabled={!name.trim()}>
        {t('social.name.save')}
      </Button>
    </form>
  )
}

function InviteCard() {
  const { t } = useT()
  const nav = useNavigate()
  const { code } = useSocialCache()
  const [other, setOther] = useState('')
  const share = async () => {
    if (!code) return
    const r = await shareLink(t('social.invite.shareText'), inviteLink(code))
    if (r === 'copied') toast(t('social.invite.copied'))
    if (r === 'failed') toast(t('social.invite.failed', { code }))
  }
  const rotate = async () => {
    if (!confirmAction(t('social.invite.rotateConfirm'))) return
    try {
      const r = await social.rotate()
      useSocial.setState({ code: r.code })
      toast(t('social.invite.rotated'))
    } catch (e) {
      toast(socialError(e))
    }
  }
  const clean = other.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return (
    <Card className="flex flex-col gap-2">
      <h3>{t('social.invite.title')}</h3>
      <p className="text-[0.85rem] text-muted-foreground">{t('social.invite.text')}</p>
      {code && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.85rem] text-muted-foreground">{t('social.invite.code')}</span>
          <strong className="tabular-nums" style={{ letterSpacing: '0.12em' }}>
            {code}
          </strong>
        </div>
      )}
      <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={share} disabled={!code}>
        {t('social.invite.share')}
      </Button>
      <Button variant="ghost" size="sm" style={{ alignSelf: 'center' }} onClick={rotate} disabled={!code}>
        {t('social.invite.rotate')}
      </Button>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (clean) nav(`/einladung/${clean}`)
        }}
      >
        <Input className="min-w-0 flex-1" aria-label={t('social.invite.enter')} placeholder={t('social.invite.enter')} value={other} maxLength={16} autoCapitalize="characters" onChange={(e) => setOther(e.target.value)} />
        <Button variant="secondary" size="sm" type="submit" disabled={!clean}>
          {t('social.invite.enterGo')}
        </Button>
      </form>
    </Card>
  )
}

function statusText(f: FriendView, t: ReturnType<typeof useT>['t']): string {
  return f.daily.activeToday ? t('social.friend.active') : f.daily.paused ? t('social.friend.paused') : f.daily.count > 0 ? t('social.friend.atRisk') : t('social.friend.idle')
}

function FriendsTab({ refresh }: { refresh: () => Promise<void> }) {
  const { t } = useT()
  const { friends } = useSocialCache()
  const [open, setOpen] = useState<FriendView | null>(null)
  return (
    <>
      <NameCard />
      {friends.length === 0 ? (
        <p className="text-[0.85rem] text-muted-foreground">{t('social.empty')}</p>
      ) : (
        <Card className="flex flex-col divide-y divide-border" style={{ padding: '0 16px' }}>
          {friends.map((f) => (
            <button key={f.id} className="list-row" style={{ width: '100%', textAlign: 'left', border: 0, color: 'inherit', font: 'inherit' }} onClick={() => setOpen(f)}>
              <span className="medal" aria-hidden="true">
                {(f.name || '?').slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <strong>{f.name || t('social.friend.unnamed')}</strong>
                <span className="text-[0.85rem] text-muted-foreground" style={{ display: 'block' }}>
                  {statusText(f, t)} · {t('social.friend.week', { n: f.weekly.active, goal: f.weekly.goal })}
                </span>
              </span>
              <span className={`flame-chip ${f.daily.activeToday ? 'lit' : ''}`} aria-label={t('motivation.dailyChip', { n: f.daily.count })}>
                <Icon name="flame" size={16} /> {f.daily.count}
              </span>
            </button>
          ))}
        </Card>
      )}
      <InviteCard />
      <FriendSheet friend={open} onClose={() => setOpen(null)} onRemoved={refresh} />
    </>
  )
}

function FriendSheet({ friend, onClose, onRemoved }: { friend: FriendView | null; onClose: () => void; onRemoved: () => Promise<void> }) {
  const { t, tk } = useT()
  const remove = async () => {
    if (!friend || !confirmAction(t('social.friend.removeConfirm', { name: friend.name || t('social.friend.unnamed') }))) return
    try {
      await social.removeFriend(friend.id)
      toast(t('social.friend.removed'))
      onClose()
      await onRemoved()
    } catch (e) {
      toast(socialError(e))
    }
  }
  return (
    <Sheet open={!!friend} onClose={onClose} title={friend ? friend.name || t('social.friend.unnamed') : ''}>
      {friend && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2" style={{ gap: 8 }}>
            <span className={`flame-chip ${friend.daily.activeToday ? 'lit' : ''}`}>
              <Icon name="flame" size={16} /> {friend.daily.count}
            </span>
            <span className={`flame-chip ${friend.weekly.done ? 'lit' : ''}`}>
              <Icon name="calendar" size={15} /> {friend.weekly.count}
            </span>
            <span className="text-[0.85rem] text-muted-foreground">{statusText(friend, t)}</span>
          </div>
          <p className="text-[0.85rem]">{t('social.friend.week', { n: friend.weekly.active, goal: friend.weekly.goal })}</p>
          <Bar value={Math.min(friend.weekly.active, friend.weekly.goal)} max={friend.weekly.goal} color="var(--accent)" />
          <p className="text-[0.85rem] text-muted-foreground">{t('social.friend.best', { d: friend.daily.best, w: friend.weekly.best })}</p>
          <div className="flex items-center flex-wrap gap-2" style={{ gap: 6 }}>
            {ACHIEVEMENTS.filter((a) => friend.levels[a.id]).map((a) => (
              <Badge variant="accent" key={a.id}>
                {tk(`motivation.a.${a.id}.name`)} {friend.levels[a.id]}
              </Badge>
            ))}
          </div>
          {friend.since && <p className="text-xs text-muted-foreground">{t('social.friend.since', { date: formatDate(new Date(friend.since).toISOString().slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' }) })}</p>}
          <Button variant="ghost" onClick={remove}>
            {t('social.friend.remove')}
          </Button>
        </div>
      )}
    </Sheet>
  )
}

// ---- challenges ----

function unit(ch: Pick<ChallengeView, 'metric'>, t: ReturnType<typeof useT>['t']) {
  return ch.metric === 'minutes' ? t('social.ch.unitMinutes') : t('social.ch.unitDays')
}

function challengeTitle(ch: Pick<ChallengeView, 'title' | 'kind' | 'metric' | 'target' | 'days'>, t: ReturnType<typeof useT>['t']) {
  return ch.title || (ch.kind === 'goal' ? t('social.ch.defaultGoal', { target: fmt(ch.target ?? 0), unit: unit(ch, t) }) : t('social.ch.defaultStreak', { n: ch.days }))
}

const isRunning = (ch: ChallengeView) => ch.status === 'running' && ch.end >= today()

function ChallengesTab({ refresh }: { refresh: () => Promise<void> }) {
  const { t } = useT()
  const { challenges } = useSocialCache()
  const [create, setCreate] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const running = challenges.filter(isRunning)
  const past = challenges.filter((c) => !isRunning(c))
  const open = challenges.find((c) => c.id === openId) ?? null
  return (
    <>
      <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={() => setCreate(true)}>
        <Icon name="plus" size={18} /> {t('social.ch.create')}
      </Button>
      {challenges.length === 0 && <p className="text-[0.85rem] text-muted-foreground">{t('social.ch.empty')}</p>}
      {running.map((c) => (
        <ChallengeCard key={c.id} ch={c} onOpen={() => setOpenId(c.id)} />
      ))}
      {past.length > 0 && <h3>{t('social.ch.past')}</h3>}
      {past.map((c) => (
        <ChallengeCard key={c.id} ch={c} onOpen={() => setOpenId(c.id)} />
      ))}
      <CreateChallengeSheet open={create} onClose={() => setCreate(false)} onCreated={(id) => refresh().then(() => setOpenId(id))} />
      <ChallengeSheet ch={open} onClose={() => setOpenId(null)} refresh={refresh} />
    </>
  )
}

export function ChallengeCard({ ch, onOpen }: { ch: ChallengeView; onOpen?: () => void }) {
  const { t, tk } = useT()
  const left = daysBetween(today(), ch.end) + 1
  const alive = ch.members.filter((m) => m.status !== 'out').length
  const statusCls = ch.status === 'done' ? 'ok' : ch.status === 'failed' ? 'warn' : 'default'
  return (
    <button className="glass-card rounded-[var(--radius)] p-4 text-card-foreground flex flex-col gap-2" style={{ textAlign: 'left', color: 'inherit', font: 'inherit', width: '100%' }} onClick={onOpen} disabled={!onOpen}>
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">{ch.kind === 'goal' ? t('social.ch.goal') : t('social.ch.streak')}</span>
        <Badge variant={statusCls}>{isRunning(ch) ? t('social.ch.left', { n: left }) : tk(`social.ch.status.${ch.status}`)}</Badge>
      </div>
      <h3>{challengeTitle(ch, t)}</h3>
      {ch.kind === 'goal' ? (
        <>
          <Bar value={Math.min(ch.total, ch.target ?? 0)} max={ch.target ?? 1} color="var(--accent)" />
          <span className="text-[0.85rem] text-muted-foreground">{t('social.ch.progress', { total: fmt(ch.total), target: fmt(ch.target ?? 0), unit: unit(ch, t) })}</span>
        </>
      ) : (
        <span className="text-[0.85rem] text-muted-foreground">
          {t('social.ch.members')}: {alive}/{ch.members.length}
        </span>
      )}
      <span className="text-xs text-muted-foreground">{t('social.ch.range', { start: formatDate(ch.start), end: formatDate(ch.end) })}</span>
    </button>
  )
}

function FriendPicker({ friends, picked, onChange }: { friends: FriendView[]; picked: number[]; onChange: (ids: number[]) => void }) {
  const { t } = useT()
  return (
    <div className="flex items-center flex-wrap gap-2" style={{ gap: 6 }}>
      {friends.map((f) => (
        <Button variant="chip" key={f.id} type="button" aria-pressed={picked.includes(f.id)} onClick={() => onChange(picked.includes(f.id) ? picked.filter((x) => x !== f.id) : [...picked, f.id])}>
          {f.name || t('social.friend.unnamed')}
        </Button>
      ))}
    </div>
  )
}

function CreateChallengeSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useT()
  const { friends } = useSocialCache()
  const [kind, setKind] = useState<'goal' | 'streak'>('goal')
  const [metric, setMetric] = useState<'active_days' | 'minutes'>('active_days')
  const [target, setTarget] = useState(10)
  const [days, setDays] = useState(7)
  const [title, setTitle] = useState('')
  const [invite, setInvite] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const setMetricAndTarget = (m: 'active_days' | 'minutes') => {
    setMetric(m)
    setTarget(m === 'minutes' ? 300 : 10)
  }
  const submit = async () => {
    setBusy(true)
    try {
      const r = await social.create({ kind, title: title.trim(), days, invite, ...(kind === 'goal' ? { metric, target } : {}) })
      toast(t('social.ch.created'))
      setTitle('')
      setInvite([])
      onClose()
      onCreated(r.challenge.id)
    } catch (e) {
      toast(socialError(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title={t('social.ch.create')}>
      <div className="flex flex-col gap-4">
        <Segmented
          value={kind}
          onChange={setKind}
          label={t('social.ch.create')}
          options={[
            { value: 'goal', label: t('social.ch.goal') },
            { value: 'streak', label: t('social.ch.streak') },
          ]}
        />
        <p className="text-[0.85rem] text-muted-foreground">{kind === 'goal' ? t('social.ch.goalD') : t('social.ch.streakD')}</p>
        {kind === 'goal' && (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-[0.85rem] font-semibold text-muted-foreground">{t('social.ch.metric')}</span>
              <Segmented
                value={metric}
                onChange={setMetricAndTarget}
                label={t('social.ch.metric')}
                options={[
                  { value: 'active_days', label: t('social.ch.activeDays') },
                  { value: 'minutes', label: t('social.ch.minutes') },
                ]}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[0.85rem] font-semibold text-muted-foreground">{t('social.ch.target')}</span>
              <Stepper label={t('social.ch.target')} value={target} onChange={setTarget} step={metric === 'minutes' ? 30 : 1} min={metric === 'minutes' ? 30 : 1} max={metric === 'minutes' ? 100_000 : 1_000} suffix={unit({ metric }, t)} />
            </div>
          </>
        )}
        <div className="flex flex-col gap-2">
          <span className="text-[0.85rem] font-semibold text-muted-foreground">{t('social.ch.duration')}</span>
          <Segmented value={days} onChange={setDays} label={t('social.ch.duration')} options={[7, 14, 30].map((n) => ({ value: n, label: t('social.ch.daysN', { n }) }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ch-title">{t('social.ch.titleLabel')}</label>
          <Input id="ch-title" value={title} maxLength={60} placeholder={challengeTitle({ title: '', kind, metric: kind === 'goal' ? metric : null, target, days }, t)} onChange={(e) => setTitle(e.target.value)} />
        </div>
        {friends.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[0.85rem] font-semibold text-muted-foreground">{t('social.ch.inviteFriends')}</span>
            <FriendPicker friends={friends} picked={invite} onChange={setInvite} />
          </div>
        )}
        <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={submit} disabled={busy}>
          {t('social.ch.start')}
        </Button>
      </div>
    </Sheet>
  )
}

function ChallengeSheet({ ch, onClose, refresh }: { ch: ChallengeView | null; onClose: () => void; refresh: () => Promise<void> }) {
  const { t, tk } = useT()
  const { friends } = useSocialCache()
  const [add, setAdd] = useState<number[]>([])
  if (!ch) return null
  const candidates = friends.filter((f) => !ch.members.some((m) => m.id === f.id))
  const share = async () => {
    const r = await shareLink(t('social.ch.shareText'), challengeLink(ch.code))
    if (r === 'copied') toast(t('social.invite.copied'))
    if (r === 'failed') toast(challengeLink(ch.code))
  }
  const addFriends = async () => {
    try {
      await social.inviteToChallenge(ch.id, add)
      setAdd([])
      await refresh()
    } catch (e) {
      toast(socialError(e))
    }
  }
  const leave = async () => {
    if (!confirmAction(t('social.ch.leaveConfirm'))) return
    try {
      await social.leave(ch.id)
      toast(t('social.ch.leftDone'))
      onClose()
      await refresh()
    } catch (e) {
      toast(socialError(e))
    }
  }
  return (
    <Sheet open onClose={onClose} title={challengeTitle(ch, t)}>
      <div className="flex flex-col gap-2">
        <ChallengeCard ch={ch} />
        <h3>{t('social.ch.members')}</h3>
        <div className="flex flex-col divide-y divide-border">
          {[...ch.members]
            .sort((a, b) => b.value - a.value)
            .map((m) => (
              <div key={m.id} className="list-row">
                <span className="medal" aria-hidden="true">
                  {(m.name || '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <strong>{m.name || t('social.friend.unnamed')}</strong>
                  {m.me && <span className="text-[0.85rem] text-muted-foreground"> ({t('social.ch.you')})</span>}
                </span>
                {ch.kind === 'goal' ? (
                  <span className="tabular-nums">{ch.metric === 'minutes' ? t('social.ch.memberMinutes', { n: fmt(m.value) }) : t('social.ch.memberDays', { n: m.value })}</span>
                ) : (
                  <Badge variant={m.status === 'out' ? 'warn' : m.status === 'done' ? 'ok' : 'default'}>{tk(`social.ch.status.${m.status ?? 'running'}`)}</Badge>
                )}
              </div>
            ))}
        </div>
        {isRunning(ch) && (
          <Button variant="secondary" className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={share}>
            {t('social.ch.share')}
          </Button>
        )}
        {isRunning(ch) && candidates.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[0.85rem] font-semibold text-muted-foreground">{t('social.ch.add')}</span>
            <FriendPicker friends={candidates} picked={add} onChange={setAdd} />
            {add.length > 0 && (
              <Button variant="secondary" size="sm" onClick={addFriends}>
                {t('social.ch.addGo')}
              </Button>
            )}
          </div>
        )}
        <Button variant="ghost" onClick={leave}>
          {t('social.ch.leave')}
        </Button>
      </div>
    </Sheet>
  )
}

// ---- links ----

/** /einladung/:code: someone's friend invitation. */
export function InvitePage() {
  const { code = '' } = useParams()
  const nav = useNavigate()
  const { t } = useT()
  const [info, setInfo] = useState<{ name: string; self: boolean; friends: boolean } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    social.invite(code).then(setInfo, (e: unknown) => setError(socialError(e)))
  }, [code])
  const accept = async () => {
    setBusy(true)
    try {
      await social.accept(code)
      toast(t('social.accept.done'))
      await refreshSocial().catch(() => undefined)
      nav('/freunde', { replace: true })
    } catch (e) {
      setError(socialError(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page">
      <Back />
      <h1>{t('social.accept.title')}</h1>
      <Card className="flex flex-col gap-2">
        {error ? (
          <p>{error}</p>
        ) : !info ? (
          <p className="text-muted-foreground" aria-busy="true">
            …
          </p>
        ) : info.self ? (
          <p>{t('social.accept.self')}</p>
        ) : info.friends ? (
          <p>{t('social.accept.already', { name: info.name })}</p>
        ) : (
          <>
            <p>{t('social.accept.text', { name: info.name || t('social.friend.unnamed') })}</p>
            <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={accept} disabled={busy}>
              {t('social.accept.go')}
            </Button>
          </>
        )}
        {(error || info?.self || info?.friends) && (
          <Button variant="secondary" className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={() => nav('/freunde', { replace: true })}>
            {t('social.accept.toFriends')}
          </Button>
        )}
      </Card>
    </div>
  )
}

/** /challenge/:code: join a challenge from a shared link. */
export function JoinChallengePage() {
  const { code = '' } = useParams()
  const nav = useNavigate()
  const { t } = useT()
  const [ch, setCh] = useState<ChallengeView | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    social.previewJoin(code).then((r) => setCh(r.challenge), (e: unknown) => setError(socialError(e)))
  }, [code])
  const member = ch?.members.some((m) => m.me)
  const join = async () => {
    setBusy(true)
    try {
      await social.join(code)
      toast(t('social.ch.joined'))
      await refreshSocial().catch(() => undefined)
      nav('/freunde', { replace: true, state: { tab: 'challenges' } })
    } catch (e) {
      setError(socialError(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page">
      <Back />
      <h1>{t('social.ch.joinTitle')}</h1>
      {error && <p className="glass-card rounded-[var(--radius)] p-4 text-card-foreground">{error}</p>}
      {ch && <ChallengeCard ch={ch} />}
      {ch && !member && isRunning(ch) && (
        <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={join} disabled={busy}>
          {t('social.ch.join')}
        </Button>
      )}
      {(error || member) && (
        <Button variant="secondary" className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={() => nav('/freunde', { replace: true, state: { tab: 'challenges' } })}>
          {t('social.accept.toFriends')}
        </Button>
      )}
    </div>
  )
}
