import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, apiMessage } from '../sync/api'
import { forgetAccount, logout, syncNow, useSync } from '../sync/engine'
import { Icon, Sheet } from '../ui/kit'
import { toast } from '../ui/notify'
import { t as tr, useT } from '../i18n'
import { getLocale } from '../i18n/lang'

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
      <div className="row">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label={t('common.back')}>
          <Icon name="back" />
        </button>
      </div>
      <div className="stack">
        <div className="eyebrow">{t('account.page.eyebrow')}</div>
        <h1 style={{ fontSize: user && user.email.length > 22 ? '1.3rem' : undefined }}>{user?.email}</h1>
      </div>

      {user && (
        <>
          {!user.verified && <VerifyBanner />}
          <section className="card stack">
            <div className="row between">
              <h3>{t('account.page.sync')}</h3>
              <span className={`badge ${sync.status === 'ok' ? 'ok' : sync.status === 'error' ? 'warn' : ''}`}>{t(`account.page.status.${sync.status}`)}</span>
            </div>
            <p className="small muted">{t('account.page.last', { when: since(sync.lastSyncedAt) })}</p>
            {sync.status === 'error' && sync.error && <p className="small" style={{ color: 'var(--bad)' }}>{sync.error}</p>}
            <button className="btn" onClick={() => syncNow()}>
              {t('account.page.syncNow')}
            </button>
          </section>
          <section className="card list" style={{ padding: '0 16px' }}>
            <button className="list-item" onClick={() => setPwOpen(true)}>
              <span className="grow">{t('account.page.changePassword')}</span>
              <Icon name="chevron" size={18} />
            </button>
            <a className="list-item" href="/api/account/export" download style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="grow">
                {t('account.page.export')}
                <span className="small muted" style={{ display: 'block' }}>
                  {t('account.page.exportHint')}
                </span>
              </span>
              <Icon name="chevron" size={18} />
            </a>
            <button className="list-item" onClick={() => setLogoutOpen(true)}>
              <span className="grow">{t('account.page.logout')}</span>
              <Icon name="chevron" size={18} />
            </button>
            <button className="list-item" onClick={() => setDelOpen(true)} style={{ color: 'var(--bad)' }}>
              <span className="grow">{t('account.page.delete')}</span>
              <Icon name="trash" size={18} />
            </button>
          </section>
        </>
      )}
      <p className="tiny" style={{ textAlign: 'center' }}>
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
    <div className="card stack" style={{ background: 'var(--warn-soft)', borderColor: 'transparent' }}>
      <strong>{tr('account.page.verifyTitle')}</strong>
      <p className="small">{tr('account.page.verifyText')}</p>
      <button
        className="btn sm"
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
      </button>
    </div>
  )
}

function ChangePassword({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState('')
  return (
    <Sheet open onClose={onClose} title={tr('account.page.changePassword')}>
      <form
        className="stack lg"
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
        <div className="field">
          <label htmlFor="cur">{tr('account.page.current')}</label>
          <input id="cur" className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="nxt">{tr('account.newPasswordLabel')}</label>
          <input id="nxt" className="input" type="password" autoComplete="new-password" minLength={10} required value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
        <button className="btn primary block" type="submit">
          {tr('common.save')}
        </button>
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
      <div className="stack lg">
        <p className="small muted">{tr('account.page.logoutText')}</p>
        <button className="btn primary block" disabled={busy} onClick={() => out(true)}>
          {tr('account.page.logoutClear')}
        </button>
        <button className="btn block" disabled={busy} onClick={() => out(false)}>
          {tr('account.page.logoutKeep')}
        </button>
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
        className="stack lg"
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
        <p className="small">{tr('account.page.deleteText')}</p>
        <div className="field">
          <label htmlFor="delpw">{tr('account.page.confirmPassword')}</label>
          <input id="delpw" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
        <button className="btn danger block" type="submit" style={{ borderColor: 'var(--bad)' }}>
          {tr('account.page.deleteFinal')}
        </button>
      </form>
    </Sheet>
  )
}
