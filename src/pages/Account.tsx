import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../sync/api'
import { forgetAccount, logout, syncNow, useSync } from '../sync/engine'
import { Icon, Sheet } from '../ui/kit'
import { toast } from '../ui/notify'

const message = (e: unknown) => (e instanceof ApiError ? e.message : 'Etwas ist schiefgelaufen.')

function since(ts?: number): string {
  if (!ts) return 'noch nie'
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 60) return 'gerade eben'
  if (s < 3600) return `vor ${Math.round(s / 60)} min`
  return new Date(ts).toLocaleString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const STATUS: Record<string, string> = { idle: 'Bereit', pending: 'Änderungen ausstehend', syncing: 'Synchronisiert …', ok: 'Synchronisiert', offline: 'Offline, wird nachgeholt', error: 'Fehler' }

export function AccountPage() {
  const sync = useSync()
  const nav = useNavigate()
  const [pwOpen, setPwOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const user = sync.user

  return (
    <div className="page">
      <div className="row">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Zurück">
          <Icon name="back" />
        </button>
      </div>
      <div className="stack">
        <div className="eyebrow">Konto</div>
        <h1 style={{ fontSize: user && user.email.length > 22 ? '1.3rem' : undefined }}>{user ? user.email : 'Kein Konto'}</h1>
      </div>

      {!user ? (
        <div className="card stack">
          <p className="small muted">Deine Daten liegen gerade nur auf diesem Gerät. Mit einem Konto sind sie gesichert und auf allen deinen Geräten verfügbar. Bestehende Daten werden beim ersten Anmelden übernommen.</p>
          <button className="btn primary" onClick={() => useSync.setState({ localOnly: false })}>
            Anmelden oder registrieren
          </button>
        </div>
      ) : (
        <>
          {!user.verified && <VerifyBanner />}
          <section className="card stack">
            <div className="row between">
              <h3>Synchronisierung</h3>
              <span className={`badge ${sync.status === 'ok' ? 'ok' : sync.status === 'error' ? 'warn' : ''}`}>{STATUS[sync.status]}</span>
            </div>
            <p className="small muted">Zuletzt: {since(sync.lastSyncedAt)}. Änderungen werden automatisch übertragen, auch nachträglich, wenn du offline warst.</p>
            {sync.status === 'error' && sync.error && <p className="small" style={{ color: 'var(--bad)' }}>{sync.error}</p>}
            <button className="btn" onClick={() => syncNow()}>
              Jetzt synchronisieren
            </button>
          </section>
          <section className="card list" style={{ padding: '0 16px' }}>
            <button className="list-item" onClick={() => setPwOpen(true)}>
              <span className="grow">Passwort ändern</span>
              <Icon name="chevron" size={18} />
            </button>
            <a className="list-item" href="/api/account/export" download style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="grow">
                Meine Daten exportieren
                <span className="small muted" style={{ display: 'block' }}>
                  Alles als JSON-Datei (Art. 20 DSGVO)
                </span>
              </span>
              <Icon name="chevron" size={18} />
            </a>
            <button className="list-item" onClick={() => setLogoutOpen(true)}>
              <span className="grow">Abmelden</span>
              <Icon name="chevron" size={18} />
            </button>
            <button className="list-item" onClick={() => setDelOpen(true)} style={{ color: 'var(--bad)' }}>
              <span className="grow">Konto löschen</span>
              <Icon name="trash" size={18} />
            </button>
          </section>
        </>
      )}
      <p className="tiny" style={{ textAlign: 'center' }}>
        <Link to="/impressum">Impressum</Link> · <Link to="/datenschutz">Datenschutz</Link>
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
      <strong>Bitte bestätige deine E-Mail-Adresse</strong>
      <p className="small">Wir haben dir einen Link geschickt. Unbestätigte Konten werden nach 7 Tagen gelöscht.</p>
      <button
        className="btn sm"
        style={{ alignSelf: 'flex-start' }}
        disabled={sent}
        onClick={async () => {
          try {
            await api('POST', '/auth/resend-verification', {})
            setSent(true)
            toast('E-Mail erneut gesendet')
          } catch (e) {
            toast(message(e))
          }
        }}
      >
        {sent ? 'Gesendet' : 'Link erneut senden'}
      </button>
    </div>
  )
}

function ChangePassword({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState('')
  return (
    <Sheet open onClose={onClose} title="Passwort ändern">
      <form
        className="stack lg"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            await api('POST', '/auth/change-password', { current, next })
            toast('Passwort geändert. Andere Geräte wurden abgemeldet.')
            onClose()
          } catch (err) {
            setError(message(err))
          }
        }}
      >
        <div className="field">
          <label htmlFor="cur">Aktuelles Passwort</label>
          <input id="cur" className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="nxt">Neues Passwort (mind. 10 Zeichen)</label>
          <input id="nxt" className="input" type="password" autoComplete="new-password" minLength={10} required value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
        <button className="btn primary block" type="submit">
          Speichern
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
    toast('Abgemeldet')
  }
  return (
    <Sheet open onClose={onClose} title="Abmelden">
      <div className="stack lg">
        <p className="small muted">Deine Daten sind im Konto gesichert. Auf einem fremden oder geteilten Gerät solltest du die lokale Kopie entfernen.</p>
        <button className="btn primary block" disabled={busy} onClick={() => out(true)}>
          Abmelden und Daten vom Gerät entfernen
        </button>
        <button className="btn block" disabled={busy} onClick={() => out(false)}>
          Abmelden, Daten auf dem Gerät behalten
        </button>
      </div>
    </Sheet>
  )
}

function DeleteAccount({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  return (
    <Sheet open onClose={onClose} title="Konto löschen">
      <form
        className="stack lg"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            await api('POST', '/account/delete', { password })
            forgetAccount()
            toast('Dein Konto und alle Daten wurden gelöscht')
          } catch (err) {
            setError(message(err))
          }
        }}
      >
        <p className="small">Dein Konto und alle gespeicherten Daten werden sofort und endgültig gelöscht, auch auf diesem Gerät. Exportiere sie vorher, wenn du sie behalten willst.</p>
        <div className="field">
          <label htmlFor="delpw">Passwort zur Bestätigung</label>
          <input id="delpw" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
        <button className="btn danger block" type="submit" style={{ borderColor: 'var(--bad)' }}>
          Endgültig löschen
        </button>
      </form>
    </Sheet>
  )
}
