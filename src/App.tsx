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

const TABS = [
  { to: '/', icon: 'home', label: 'Heute' },
  { to: '/plan', icon: 'plan', label: 'Plan' },
  { to: '/ernaehrung', icon: 'food', label: 'Ernährung' },
  { to: '/fortschritt', icon: 'chart', label: 'Fortschritt' },
  { to: '/mehr', icon: 'more', label: 'Mehr' },
]

function Shell() {
  const loc = useLocation()
  const hideNav = loc.pathname === '/training'
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!hideNav && (
        <nav className="nav" aria-label="Hauptnavigation">
          <div className="nav-inner">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon name={t.icon} size={22} />
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

export default function App() {
  const ready = useStore((s) => !!s.profile && !!s.meso)
  return (
    <HashRouter>
      {ready ? <Shell /> : <Onboarding />}
      <ToastHost />
    </HashRouter>
  )
}
