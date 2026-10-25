import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store'
import { Icon, ToastHost } from './ui/kit'
import Today from './pages/Today'
import { AuthScreen } from './pages/Auth'
import { checkSession, startSync, useSync } from './sync/engine'
import { useLang, useT } from './i18n'

// The first screens (Heute, sign-in) ship in the entry chunk; every other page loads on demand and is
// prefetched once the app is idle, so navigation stays instant and the pages are cached for offline use.
const loaders: (() => Promise<unknown>)[] = []
function page<M, K extends keyof M>(load: () => Promise<M>, name: K) {
  loaders.push(load)
  return lazy(() => load().then((m) => ({ default: m[name] as ComponentType })))
}
const Onboarding = page(() => import('./pages/Onboarding'), 'default')
const Workout = page(() => import('./pages/Workout'), 'default')
const Plan = page(() => import('./pages/Plan'), 'default')
const Nutrition = page(() => import('./pages/Nutrition'), 'default')
const Progress = page(() => import('./pages/Progress'), 'default')
const MesoReview = page(() => import('./pages/MesoReview'), 'default')
const More = page(() => import('./pages/More'), 'default')
const Mobility = page(() => import('./pages/More'), 'Mobility')
const Cardio = page(() => import('./pages/More'), 'Cardio')
const SettingsPage = page(() => import('./pages/More'), 'SettingsPage')
const ModePage = page(() => import('./pages/More'), 'ModePage')
const Knowledge = page(() => import('./pages/More'), 'Knowledge')
const AccountPage = page(() => import('./pages/Account'), 'AccountPage')
const VerifyPage = page(() => import('./pages/Auth'), 'VerifyPage')
const ResetPage = page(() => import('./pages/Auth'), 'ResetPage')
const Impressum = page(() => import('./pages/Legal'), 'Impressum')
const Datenschutz = page(() => import('./pages/Legal'), 'Datenschutz')

function prefetchPages() {
  const run = () => loaders.forEach((load) => load().catch(() => {}))
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 1500)
}

const pending = <div className="page" aria-busy="true" />

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
        <Suspense fallback={pending}>
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
        </Suspense>
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
      <Suspense fallback={pending}>
      <Routes>
        <Route path="/konto/bestaetigen" element={<VerifyPage />} />
        <Route path="/konto/passwort" element={<ResetPage />} />
        <Route path="/impressum" element={<Impressum />} />
        <Route path="/datenschutz" element={<Datenschutz />} />
      </Routes>
      </Suspense>
    )
  }
  if (!user) {
    // a cached user opens instantly; otherwise wait for the session check
    if (!checked) return <div className="app" aria-busy="true" />
    return <AuthScreen />
  }
  return ready ? (
    <Shell />
  ) : (
    <Suspense fallback={pending}>
      <Onboarding />
    </Suspense>
  )
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
    prefetchPages()
    return stop
  }, [])
  return (
    <HashRouter>
      <Gate />
      <ToastHost />
    </HashRouter>
  )
}
