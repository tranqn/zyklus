import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../sync/api'
import { login, register, resetPassword, useSync } from '../sync/engine'
import { Icon, Segmented, Sheet } from '../ui/kit'
import { toast } from '../ui/notify'

const message = (e: unknown) => (e instanceof ApiError ? e.message : 'Etwas ist schiefgelaufen. Versuch es erneut.')

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [forgot, setForgot] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') await login(email, password)
      else {
        await register(email, password, consent)
        toast('Konto erstellt. Bitte bestätige deine E-Mail.')
      }
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <div className="page" style={{ minHeight: '100dvh', paddingBottom: 'calc(24px + var(--safe-b))' }}>
        <div className="stack" style={{ paddingTop: 24 }}>
          <div className="eyebrow">Zyklus</div>
          <h1 style={{ fontSize: '2.1rem' }}>{mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}</h1>
          <p className="muted">Dein Plan und dein Verlauf werden in deinem Konto gespeichert und sind auf allen deinen Geräten da.</p>
        </div>
        <Segmented
          value={mode}
          onChange={(m) => (setMode(m), setError(''))}
          label="Anmelden oder registrieren"
          options={[
            { value: 'login', label: 'Anmelden' },
            { value: 'register', label: 'Registrieren' },
          ]}
        />
        <form className="stack lg" onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">E-Mail</label>
            <input id="email" className="input" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Passwort</label>
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
            {mode === 'register' && <span className="tiny muted">Mindestens 10 Zeichen. Ein Satz aus mehreren Wörtern ist sicher und gut zu merken.</span>}
          </div>
          {mode === 'register' && (
            <label className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 22, height: 22, marginTop: 2, flex: 'none', accentColor: 'var(--accent)' }} required />
              <span className="small">
                Ich willige ausdrücklich ein, dass Zyklus meine Gesundheitsdaten (z. B. Gewicht, Körpermaße, Training, Ernährung) speichert, um mir den Dienst bereitzustellen. Ich kann die Einwilligung jederzeit widerrufen, indem ich mein Konto lösche. Details in der{' '}
                <Link to="/datenschutz">Datenschutzerklärung</Link>.
              </span>
            </label>
          )}
          {error && (
            <p className="small" role="alert" style={{ color: 'var(--bad)' }}>
              {error}
            </p>
          )}
          <button className="btn primary block" type="submit" disabled={busy || (mode === 'register' && !consent)}>
            {busy ? 'Einen Moment …' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </button>
          {mode === 'login' && (
            <button type="button" className="btn ghost block" onClick={() => setForgot(true)}>
              Passwort vergessen?
            </button>
          )}
        </form>
        <div style={{ marginTop: 'auto' }} className="stack">
          <p className="tiny" style={{ textAlign: 'center' }}>
            <Link to="/impressum">Impressum</Link> · <Link to="/datenschutz">Datenschutz</Link>
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
    <Sheet open onClose={onClose} title="Passwort zurücksetzen">
      {sent ? (
        <div className="stack lg">
          <p>Wenn es ein Konto mit dieser E-Mail gibt, haben wir dir einen Link geschickt. Er ist eine Stunde gültig. Schau auch im Spam-Ordner nach.</p>
          <button className="btn primary block" onClick={onClose}>
            Okay
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
            <label htmlFor="forgot-email">E-Mail</label>
            <input id="forgot-email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
          <button className="btn primary block" type="submit">
            Link senden
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
  return (
    <div className="app">
      <div className="page" style={{ minHeight: '80dvh', justifyContent: 'center' }}>
        {state === 'pending' && <p className="muted">E-Mail wird bestätigt …</p>}
        {state === 'ok' && (
          <div className="stack lg">
            <div style={{ fontSize: '3rem' }} aria-hidden="true">
              ✅
            </div>
            <h1>E-Mail bestätigt</h1>
            <p className="muted">Danke! Dein Konto ist jetzt vollständig eingerichtet.</p>
            <button className="btn primary block" onClick={() => nav('/', { replace: true })}>
              Zur App
            </button>
          </div>
        )}
        {state === 'error' && (
          <div className="stack lg">
            <h1>Das hat nicht geklappt</h1>
            <p className="muted">{error}</p>
            <button className="btn primary block" onClick={() => nav('/konto', { replace: true })}>
              Zum Konto
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
          <button className="icon-btn" onClick={() => nav('/', { replace: true })} aria-label="Abbrechen">
            <Icon name="close" />
          </button>
        </div>
        <h1>Neues Passwort</h1>
        <form
          className="stack lg"
          onSubmit={async (e) => {
            e.preventDefault()
            if (pw !== pw2) return setError('Die Passwörter stimmen nicht überein.')
            setBusy(true)
            setError('')
            try {
              await resetPassword(token, pw)
              toast('Passwort geändert, du bist angemeldet')
              nav('/', { replace: true })
            } catch (err) {
              setError(message(err))
            } finally {
              setBusy(false)
            }
          }}
        >
          <div className="field">
            <label htmlFor="pw1">Neues Passwort (mind. 10 Zeichen)</label>
            <input id="pw1" className="input" type="password" autoComplete="new-password" minLength={10} required value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pw2">Wiederholen</label>
            <input id="pw2" className="input" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
          <button className="btn primary block" type="submit" disabled={busy || !token}>
            Passwort speichern
          </button>
          {!token && <p className="small" style={{ color: 'var(--bad)' }}>Der Link ist unvollständig. Öffne ihn direkt aus der E-Mail.</p>}
        </form>
      </div>
    </div>
  )
}
