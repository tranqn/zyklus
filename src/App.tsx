import { useEffect } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store'
import { Icon, ToastHost } from './ui/kit'
import Onboarding from './pages/Onboarding'
import Today from './pages/Today'
import Workout from './pages/Workout'
import Plan from './pages/Plan'
import Nutrition from './pages/Nutrition'
import Progress from './pages/Progress'
import MesoReview from './pages/MesoReview'
import More, { Cardio, Knowledge, Mobility, ModePage, SettingsPage } from './pages/More'
import { AccountPage } from './pages/Account'
import { AuthScreen, ResetPage, VerifyPage } from './pages/Auth'
import { Datenschutz, Impressum } from './pages/Legal'
import { checkSession, startSync, useSync } from './sync/engine'
import { useLang, useT } from './i18n'

const TABS = [
  { to: '/', icon: 'home', label: 'shell.nav.today' },
  { to: '/plan', icon: 'plan', label: 'shell.nav.plan' },
  { to: '/ernaehrung', icon: 'food', label: 'shell.nav.nutrition' },
  { to: '/fortschritt', icon: 'chart', label: 'shell.nav.progress' },
  { to: '/mehr', icon: 'more', label: 'shell.nav.more' },
] as const

function Shell() {
  const loc = useLocation()
  const hideNav = loc.pathname === '/training'
  const { t } = useT()
  return (
    <div className="app">
      <main>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/training" element={<Workout />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/ernaehrung" element={<Nutrition />} />
          <Route path="/fortschritt" element={<Progress />} />
          <Route path="/zyklus" element={<MesoReview />} />
          <Route path="/mehr" element={<More />} />
          <Route path="/mobility" element={<Mobility />} />
          <Route path="/cardio" element={<Cardio />} />
          <Route path="/einstellungen" element={<SettingsPage />} />
          <Route path="/modus" element={<ModePage />} />
          <Route path="/wissen" element={<Knowledge />} />
          <Route path="/konto" element={<AccountPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!hideNav && (
        <nav className="nav" aria-label={t('shell.nav.main')}>
          <div className="nav-inner">
            {TABS.map((tab) => (
              <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon name={tab.icon} size={22} />
                {t(tab.label)}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

/** Pages reachable from e-mail links and the footer, signed in or not. */
const PUBLIC = ['/konto/bestaetigen', '/konto/passwort', '/impressum', '/datenschutz']

function Gate() {
  const loc = useLocation()
  const ready = useStore((s) => !!s.profile && !!s.meso)
  const { user, checked } = useSync()
  if (PUBLIC.includes(loc.pathname)) {
    return (
      <Routes>
        <Route path="/konto/bestaetigen" element={<VerifyPage />} />
        <Route path="/konto/passwort" element={<ResetPage />} />
        <Route path="/impressum" element={<Impressum />} />
        <Route path="/datenschutz" element={<Datenschutz />} />
      </Routes>
    )
  }
  if (!user) {
    // a cached user opens instantly; otherwise wait for the session check
    if (!checked) return <div className="app" aria-busy="true" />
    return <AuthScreen />
  }
  return ready ? <Shell /> : <Onboarding />
}

export default function App() {
  const lang = useLang((s) => s.lang)
  const syncedLang = useStore((s) => s.settings.language)
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  // a language chosen on another device arrives with the synced settings
  useEffect(() => {
    if (syncedLang && syncedLang !== useLang.getState().lang) useLang.getState().setLang(syncedLang)
  }, [syncedLang])
  useEffect(() => {
    const stop = startSync()
    checkSession()
    return stop
  }, [])
  return (
    <HashRouter>
      <Gate />
      <ToastHost />
    </HashRouter>
  )
}
