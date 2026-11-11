import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, api, apiMessage } from '../sync/api'
import { login, register, resetPassword, verifyEmail } from '../sync/engine'
import { Icon, Segmented, Sheet } from '../ui/kit'
import { toast } from '../ui/notify'
import { getLang, t as tr, useT } from '../i18n'
import { LanguagePicker } from '../ui/LanguagePicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const message = (e: unknown, context?: string) => apiMessage(e, context)

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [forgot, setForgot] = useState(false)
  // the address we sent a mail to; while it is set, the form is replaced by the hint
  const [sent, setSent] = useState('')
  const [unverified, setUnverified] = useState(false)
  const { t } = useT()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setUnverified(false)
    try {
      if (mode === 'login') await login(email, password)
      else {
        await register(email, password, consent, getLang())
        setSent(email.trim())
      }
    } catch (err) {
      setError(message(err, mode))
      if (err instanceof ApiError && err.code === 'unverified') setUnverified(true)
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setBusy(true)
    try {
      await api('POST', '/auth/resend', { email: email.trim() })
      setSent(email.trim())
      setUnverified(false)
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="mx-auto min-h-dvh max-w-[560px]">
        <div className="page" style={{ minHeight: '100dvh', justifyContent: 'center', paddingBottom: 'calc(24px + var(--safe-b))' }}>
          <div className="flex flex-col gap-4">
            <div style={{ fontSize: '3rem' }} aria-hidden="true">
              📬
            </div>
            <h1>{t('account.checkTitle')}</h1>
            <p className="text-muted-foreground">{t('account.checkText', { email: sent })}</p>
            <p className="text-[0.85rem] text-muted-foreground">{t('account.spamHint')}</p>
            <Button
              variant="secondary"
              className="w-full whitespace-normal text-center leading-tight py-2.5"
              onClick={() => (setSent(''), setMode('login'), setPassword(''))}
            >
              {t('account.backToLogin')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[560px]">
      <div className="page" style={{ minHeight: '100dvh', paddingBottom: 'calc(24px + var(--safe-b))' }}>
        <LanguagePicker compact />
        <div className="flex flex-col gap-2" style={{ paddingTop: 8 }}>
          <div className="eyebrow">Zyklus</div>
          <h1 style={{ fontSize: '2.1rem' }}>{mode === 'login' ? t('account.welcomeBack') : t('account.createAccount')}</h1>
          <p className="text-muted-foreground">{t('account.intro')}</p>
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
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email">{t('account.email')}</label>
            <Input id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password">{t('account.password')}</label>
            <Input
              id="password"
             
              type="password"
              required
              minLength={mode === 'register' ? 10 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'register' && <span className="text-xs text-muted-foreground">{t('account.passwordHint')}</span>}
          </div>
          {mode === 'register' && (
            <label className="flex items-center gap-2" style={{ alignItems: 'flex-start', gap: 10 }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 22, height: 22, marginTop: 2, flex: 'none', accentColor: 'var(--accent)' }} required />
              <span className="text-[0.85rem]">
                {t('account.consent')} <Link to="/datenschutz">{t('account.consentLink')}</Link>.
              </span>
            </label>
          )}
          {error && (
            <p className="text-[0.85rem]" role="alert" style={{ color: 'var(--bad)' }}>
              {error}
            </p>
          )}
          {unverified && (
            <Button variant="secondary" type="button" className="w-full whitespace-normal text-center leading-tight py-2.5" disabled={busy} onClick={resend}>
              {t('account.page.resend')}
            </Button>
          )}
          <Button className="w-full whitespace-normal text-center leading-tight py-2.5" type="submit" disabled={busy || (mode === 'register' && !consent)}>
            {busy ? t('common.oneMoment') : mode === 'login' ? t('account.login') : t('account.createAccount')}
          </Button>
          {mode === 'login' && (
            <Button variant="ghost" type="button" className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={() => setForgot(true)}>
              {t('account.forgot')}
            </Button>
          )}
        </form>
        <div style={{ marginTop: 'auto' }} className="flex flex-col gap-2">
          <p className="text-xs" style={{ textAlign: 'center' }}>
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
        <div className="flex flex-col gap-4">
          <p>{tr('account.resetSent')}</p>
          <p className="text-[0.85rem] text-muted-foreground">{tr('account.spamHint')}</p>
          <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={onClose}>
            {tr('common.okay')}
          </Button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="forgot-email">{tr('account.email')}</label>
            <Input id="forgot-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="text-[0.85rem]" style={{ color: 'var(--bad)' }}>{error}</p>}
          <Button className="w-full whitespace-normal text-center leading-tight py-2.5" type="submit">
            {tr('account.sendLink')}
          </Button>
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
    verifyEmail(token)
      .then(() => setState('ok'))
      .catch((e) => {
        setState('error')
        setError(message(e))
      })
  }, [token])
  useT()
  return (
    <div className="mx-auto min-h-dvh max-w-[560px]">
      <div className="page" style={{ minHeight: '80dvh', justifyContent: 'center' }}>
        {state === 'pending' && <p className="text-muted-foreground">{tr('account.verifying')}</p>}
        {state === 'ok' && (
          <div className="flex flex-col gap-4">
            <div style={{ fontSize: '3rem' }} aria-hidden="true">
              ✅
            </div>
            <h1>{tr('account.verified')}</h1>
            <p className="text-muted-foreground">{tr('account.verifiedText')}</p>
            <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={() => nav('/', { replace: true })}>
              {tr('account.toApp')}
            </Button>
          </div>
        )}
        {state === 'error' && (
          <div className="flex flex-col gap-4">
            <h1>{tr('account.failed')}</h1>
            <p className="text-muted-foreground">{error}</p>
            <Button className="w-full whitespace-normal text-center leading-tight py-2.5" onClick={() => nav('/konto', { replace: true })}>
              {tr('account.toAccount')}
            </Button>
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
    <div className="mx-auto min-h-dvh max-w-[560px]">
      <div className="page">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => nav('/', { replace: true })} aria-label={tr('common.cancel')}>
            <Icon name="close" />
          </Button>
        </div>
        <h1>{tr('account.newPassword')}</h1>
        <form
          className="flex flex-col gap-4"
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pw1">{tr('account.newPasswordLabel')}</label>
            <Input id="pw1" type="password" autoComplete="new-password" minLength={10} required value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pw2">{tr('account.repeat')}</label>
            <Input id="pw2" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          {error && <p className="text-[0.85rem]" style={{ color: 'var(--bad)' }}>{error}</p>}
          <Button className="w-full whitespace-normal text-center leading-tight py-2.5" type="submit" disabled={busy || !token}>
            {tr('account.savePassword')}
          </Button>
          {!token && <p className="text-[0.85rem]" style={{ color: 'var(--bad)' }}>{tr('account.incompleteLink')}</p>}
        </form>
      </div>
    </div>
  )
}
