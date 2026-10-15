import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, apiMessage } from '../sync/api'
import { login, register, resetPassword, useSync } from '../sync/engine'
import { Icon, Segmented, Sheet } from '../ui/kit'
import { toast } from '../ui/notify'
import { getLang, t as tr, useT } from '../i18n'
import { LanguagePicker } from '../ui/LanguagePicker'

const message = (e: unknown, context?: string) => apiMessage(e, context)

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [forgot, setForgot] = useState(false)
  const { t } = useT()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') await login(email, password)
      else {
        await register(email, password, consent, getLang())
        toast(tr('account.created'))
      }
    } catch (err) {
      setError(message(err, mode))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <div className="page" style={{ minHeight: '100dvh', paddingBottom: 'calc(24px + var(--safe-b))' }}>
        <LanguagePicker compact />
        <div className="stack" style={{ paddingTop: 8 }}>
          <div className="eyebrow">Zyklus</div>
          <h1 style={{ fontSize: '2.1rem' }}>{mode === 'login' ? t('account.welcomeBack') : t('account.createAccount')}</h1>
          <p className="muted">{t('account.intro')}</p>
        </div>
        <Segmented
          value={mode}
          onChange={(m) => (setMode(m), setError(''))}
          label={t('account.modeLabel')}
          options={[
            { value: 'login', label: t('account.login') },
            { value: 'register', label: t('account.register') },
          ]}
        />
        <form className="stack lg" onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">{t('account.email')}</label>
            <input id="email" className="input" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">{t('account.password')}</label>
            <input
              id="password"
              className="input"
              type="password"
              required
              minLength={mode === 'register' ? 10 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'register' && <span className="tiny muted">{t('account.passwordHint')}</span>}
          </div>
          {mode === 'register' && (
            <label className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 22, height: 22, marginTop: 2, flex: 'none', accentColor: 'var(--accent)' }} required />
              <span className="small">
                {t('account.consent')} <Link to="/datenschutz">{t('account.consentLink')}</Link>.
              </span>
            </label>
          )}
          {error && (
            <p className="small" role="alert" style={{ color: 'var(--bad)' }}>
              {error}
            </p>
          )}
          <button className="btn primary block" type="submit" disabled={busy || (mode === 'register' && !consent)}>
            {busy ? t('common.oneMoment') : mode === 'login' ? t('account.login') : t('account.createAccount')}
          </button>
          {mode === 'login' && (
            <button type="button" className="btn ghost block" onClick={() => setForgot(true)}>
              {t('account.forgot')}
            </button>
          )}
        </form>
        <div style={{ marginTop: 'auto' }} className="stack">
          <p className="tiny" style={{ textAlign: 'center' }}>
            <Link to="/impressum">{t('common.imprint')}</Link> · <Link to="/datenschutz">{t('common.privacy')}</Link>
          </p>
        </div>
      </div>
      {forgot && <ForgotSheet initialEmail={email} onClose={() => setForgot(false)} />}
    </div>
  )
}

function ForgotSheet({ initialEmail, onClose }: { initialEmail: string; onClose: () => void }) {
  const [email, setEmail] = useState(initialEmail)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  return (
    <Sheet open onClose={onClose} title={tr('account.resetTitle')}>
      {sent ? (
        <div className="stack lg">
          <p>{tr('account.resetSent')}</p>
          <button className="btn primary block" onClick={onClose}>
            {tr('common.okay')}
          </button>
        </div>
      ) : (
        <form
          className="stack lg"
          onSubmit={async (e) => {
            e.preventDefault()
            try {
              await api('POST', '/auth/forgot', { email })
              setSent(true)
            } catch (err) {
              setError(message(err))
            }
          }}
        >
          <div className="field">
            <label htmlFor="forgot-email">{tr('account.email')}</label>
            <input id="forgot-email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
          <button className="btn primary block" type="submit">
            {tr('account.sendLink')}
          </button>
        </form>
      )}
    </Sheet>
  )
}

function useToken() {
  const loc = useLocation()
  return new URLSearchParams(loc.search).get('token') ?? ''
}

export function VerifyPage() {
  const token = useToken()
  const nav = useNavigate()
  const [state, setState] = useState<'pending' | 'ok' | 'error'>('pending')
  const [error, setError] = useState('')
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    api('POST', '/auth/verify', { token })
      .then(() => {
        setState('ok')
        const user = useSync.getState().user
        if (user) useSync.setState({ user: { ...user, verified: true } })
      })
      .catch((e) => {
        setState('error')
        setError(message(e))
      })
  }, [token])
  useT()
  return (
    <div className="app">
      <div className="page" style={{ minHeight: '80dvh', justifyContent: 'center' }}>
        {state === 'pending' && <p className="muted">{tr('account.verifying')}</p>}
        {state === 'ok' && (
          <div className="stack lg">
            <div style={{ fontSize: '3rem' }} aria-hidden="true">
              ✅
            </div>
            <h1>{tr('account.verified')}</h1>
            <p className="muted">{tr('account.verifiedText')}</p>
            <button className="btn primary block" onClick={() => nav('/', { replace: true })}>
              {tr('account.toApp')}
            </button>
          </div>
        )}
        {state === 'error' && (
          <div className="stack lg">
            <h1>{tr('account.failed')}</h1>
            <p className="muted">{error}</p>
            <button className="btn primary block" onClick={() => nav('/konto', { replace: true })}>
              {tr('account.toAccount')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ResetPage() {
  const token = useToken()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="app">
      <div className="page">
        <div className="row">
          <button className="icon-btn" onClick={() => nav('/', { replace: true })} aria-label={tr('common.cancel')}>
            <Icon name="close" />
          </button>
        </div>
        <h1>{tr('account.newPassword')}</h1>
        <form
          className="stack lg"
          onSubmit={async (e) => {
            e.preventDefault()
            if (pw !== pw2) return setError(tr('account.mismatch'))
            setBusy(true)
            setError('')
            try {
              await resetPassword(token, pw)
              toast(tr('account.passwordChangedIn'))
              nav('/', { replace: true })
            } catch (err) {
              setError(message(err))
            } finally {
              setBusy(false)
            }
          }}
        >
          <div className="field">
            <label htmlFor="pw1">{tr('account.newPasswordLabel')}</label>
            <input id="pw1" className="input" type="password" autoComplete="new-password" minLength={10} required value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pw2">{tr('account.repeat')}</label>
            <input id="pw2" className="input" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
          <button className="btn primary block" type="submit" disabled={busy || !token}>
            {tr('account.savePassword')}
          </button>
          {!token && <p className="small" style={{ color: 'var(--bad)' }}>{tr('account.incompleteLink')}</p>}
        </form>
      </div>
    </div>
  )
}
