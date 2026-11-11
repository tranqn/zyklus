import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from './store'
import { Icon, ToastHost } from './ui/kit'
import Today from './pages/Today'
import { AuthScreen } from './pages/Auth'
import { checkSession, startSync, useSync } from './sync/engine'
import { useLang, useT } from './i18n'
import { FlameCelebration } from './ui/Flames'
import { usePressFeedback } from './ui/usePressFeedback'
import { rememberInvite, takeInvite } from './sync/social'
import { GlassFilters } from './components/GlassFilters'
import { cn } from './lib/utils'

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
const Achievements = page(() => import('./pages/Achievements'), 'default')
const Friends = page(() => import('./pages/Friends'), 'default')
const InvitePage = page(() => import('./pages/Friends'), 'InvitePage')
const JoinChallengePage = page(() => import('./pages/Friends'), 'JoinChallengePage')

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
  const nav = useNavigate()
  // an invite link opened before signing in or onboarding opens now
  useEffect(() => {
    const p = takeInvite()
    if (p && p !== loc.pathname) nav(p)
  }, [loc.pathname, nav])
  const hideNav = loc.pathname === '/training'
  const { t } = useT()
  return (
    <div className="mx-auto min-h-dvh max-w-[560px]">
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
          <Route path="/erfolge" element={<Achievements />} />
          <Route path="/freunde" element={<Friends />} />
          <Route path="/einladung/:code" element={<InvitePage />} />
          <Route path="/challenge/:code" element={<JoinChallengePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>
      <FlameCelebration />
      {!hideNav && (
        <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-3.5 pb-[max(12px,var(--safe-b))]" aria-label={t('shell.nav.main')}>
          {/* floating liquid-glass capsule; the active tab is a glass drop inside it */}
          <div className="glass-lens glass-refract pointer-events-auto mx-auto grid h-16 max-w-[500px] grid-cols-5 gap-0.5 rounded-full p-1.5 [--glass-glow:0_18px_40px_-16px_rgb(0_0_0/0.3)] [--lens-a:34%] [--lens-blur:10px] [--lens-w:18px]">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'glass-press flex flex-col items-center justify-center gap-[3px] rounded-full text-[0.66rem] font-semibold text-muted-foreground no-underline',
                    isActive && 'bg-[color-mix(in_srgb,var(--glass-tint)_30%,transparent)] text-primary shadow-[var(--rim)]',
                  )
                }
              >
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
  rememberInvite(loc.pathname)
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
    if (!checked) return <div className="mx-auto min-h-dvh max-w-[560px]" aria-busy="true" />
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
  usePressFeedback()
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
      <GlassFilters />
    </HashRouter>
  )
}
