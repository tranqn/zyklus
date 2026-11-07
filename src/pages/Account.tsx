import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, apiMessage } from '../sync/api'
import { forgetAccount, logout, syncNow, useSync } from '../sync/engine'
import { Icon, Sheet } from '../ui/kit'
import { toast } from '../ui/notify'
import { t as tr, useT } from '../i18n'
import { getLocale } from '../i18n/lang'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const message = (e: unknown, context?: string) => apiMessage(e, context)

function since(ts?: number): string {
  if (!ts) return tr('account.page.never')
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 60) return tr('account.page.justNow')
  if (s < 3600) return tr('account.page.minAgo', { n: Math.round(s / 60) })
  return new Date(ts).toLocaleString(getLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function AccountPage() {
  const sync = useSync()
  const nav = useNavigate()
  const [pwOpen, setPwOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const user = sync.user
  const { t } = useT()

  return (
    <div className="page">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="icon" onClick={() => nav(-1)} aria-label={t('common.back')}>
          <Icon name="back" />
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <div className="eyebrow">{t('account.page.eyebrow')}</div>
        <h1 style={{ fontSize: user && user.email.length > 22 ? '1.3rem' : undefined }}>{user?.email}</h1>
      </div>

      {user && (
        <>
          {!user.verified && <VerifyBanner />}
          <Card className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3>{t('account.page.sync')}</h3>
              <Badge variant={sync.status === 'ok' ? 'ok' : sync.status === 'error' ? 'warn' : 'default'}>{t(`account.page.status.${sync.status}`)}</Badge>
            </div>
            <p className="text-[0.85rem] text-muted-foreground">{t('account.page.last', { when: since(sync.lastSyncedAt) })}</p>
            {sync.status === 'error' && sync.error && <p className="text-[0.85rem]" style={{ color: 'var(--bad)' }}>{sync.error}</p>}
            <Button variant="secondary" onClick={() => syncNow()}>
              {t('account.page.syncNow')}
            </Button>
          </Card>
          <Card className="flex flex-col divide-y divide-border" style={{ padding: '0 16px' }}>
            <button className="list-row" onClick={() => setPwOpen(true)}>
              <span className="min-w-0 flex-1">{t('account.page.changePassword')}</span>
              <Icon name="chevron" size={18} />
            </button>
            <a className="list-row" href="/api/account/export" download style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="min-w-0 flex-1">
                {t('account.page.export')}
                <span className="text-[0.85rem] text-muted-foreground" style={{ display: 'block' }}>
                  {t('account.page.exportHint')}
                </span>
              </span>
              <Icon name="chevron" size={18} />
            </a>
            <button className="list-row" onClick={() => setLogoutOpen(true)}>
              <span className="min-w-0 flex-1">{t('account.page.logout')}</span>
              <Icon name="chevron" size={18} />
            </button>
            <button className="list-row" onClick={() => setDelOpen(true)} style={{ color: 'var(--bad)' }}>
              <span className="min-w-0 flex-1">{t('account.page.delete')}</span>
              <Icon name="trash" size={18} />
            </button>
          </Card>
        </>
      )}
      <p className="text-xs" style={{ textAlign: 'center' }}>
        <Link to="/impressum">{t('common.imprint')}</Link> · <Link to="/datenschutz">{t('common.privacy')}</Link>
      </p>
      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}
      {delOpen && <DeleteAccount onClose={() => setDelOpen(false)} />}
      {logoutOpen && <LogoutSheet onClose={() => setLogoutOpen(false)} />}
    </div>
  )
}

export function VerifyBanner() {
  const [sent, setSent] = useState(false)
  return (
    <Card className="flex flex-col gap-2" style={{ background: 'var(--warn-soft)', borderColor: 'transparent' }}>
      <strong>{tr('account.page.verifyTitle')}</strong>
      <p className="text-[0.85rem]">{tr('account.page.verifyText')}</p>
      <p className="text-[0.85rem]">{tr('account.spamHint')}</p>
      <Button variant="secondary" size="sm"
       
        style={{ alignSelf: 'flex-start' }}
        disabled={sent}
        onClick={async () => {
          try {
            await api('POST', '/auth/resend-verification', {})
            setSent(true)
            toast(tr('account.page.resent'))
          } catch (e) {
            toast(message(e))
          }
        }}
      >
        {sent ? tr('account.page.sent') : tr('account.page.resend')}
      </Button>
    </Card>
  )
}

function ChangePassword({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState('')
  return (
    <Sheet open onClose={onClose} title={tr('account.page.changePassword')}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            await api('POST', '/auth/change-password', { current, next })
            toast(tr('account.page.changed'))
            onClose()
          } catch (err) {
            setError(message(err, 'current'))
          }
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cur">{tr('account.page.current')}</label>
          <Input id="cur" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nxt">{tr('account.newPasswordLabel')}</label>
          <Input id="nxt" type="password" autoComplete="new-password" minLength={10} required value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        {error && <p className="text-[0.85rem]" style={{ color: 'var(--bad)' }}>{error}</p>}
        <Button className="w-full whitespace-normal text-center leading-tight py-2.5" type="submit">
          {tr('common.save')}
        </Button>
      </form>
    </Sheet>
  )
}

function LogoutSheet({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const out = async (clear: boolean) => {
    setBusy(true)
    await logout(clear)
    toast(tr('account.page.loggedOut'))
  }
  return (
    <Sheet open onClose={onClose} title={tr('account.page.logout')}>
      <div className="flex flex-col gap-4">
        <p className="text-[0.85rem] text-muted-foreground">{tr('account.page.logoutText')}</p>
        <Button className="w-full whitespace-normal text-center leading-tight py-2.5" disabled={busy} onClick={() => out(true)}>
          {tr('account.page.logoutClear')}
        </Button>
        <Button variant="secondary" className="w-full whitespace-normal text-center leading-tight py-2.5" disabled={busy} onClick={() => out(false)}>
          {tr('account.page.logoutKeep')}
        </Button>
      </div>
    </Sheet>
  )
}

function DeleteAccount({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  return (
    <Sheet open onClose={onClose} title={tr('account.page.delete')}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            await api('POST', '/account/delete', { password })
            forgetAccount()
            toast(tr('account.page.deleted'))
          } catch (err) {
            setError(message(err, 'delete'))
          }
        }}
      >
        <p className="text-[0.85rem]">{tr('account.page.deleteText')}</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="delpw">{tr('account.page.confirmPassword')}</label>
          <Input id="delpw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-[0.85rem]" style={{ color: 'var(--bad)' }}>{error}</p>}
        <Button variant="destructive" className="w-full whitespace-normal text-center leading-tight py-2.5" type="submit" style={{ borderColor: 'var(--bad)' }}>
          {tr('account.page.deleteFinal')}
        </Button>
      </form>
    </Sheet>
  )
}
