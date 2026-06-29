import { useEffect } from 'react'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import AboutPage from './pages/AboutPage'
import { PremiumProvider } from './context/premium'
import { ThemeProvider } from './context/theme'
import TermsModal from './components/TermsModal'
import HomePage from './pages/HomePage'
import PrivacyPage from './pages/PrivacyPage'
import SecurityPage from './pages/SecurityPage'
import SupportPage from './pages/SupportPage'
import TechnicalDetailsPage from './pages/TechnicalDetailsPage'
import TermsPage from './pages/TermsPage'

const FilesPage = lazy(() => import('./pages/FilesPage'))
const BrowserDiagnosticsPage = lazy(() => import('./pages/BrowserDiagnosticsPage'))
const LinkSecretPage = lazy(() => import('./pages/LinkSecretPage'))
const QrSecretPage = lazy(() => import('./pages/QrSecretPage'))
const SteganographyPage = lazy(() => import('./pages/SteganographyPage'))
const VeuNotesPage = lazy(() => import('./pages/VeuNotesPage'))

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-400">
      Carregando ferramenta...
    </div>
  )
}

function LegacyHashRedirect() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (location.pathname === '/' && location.hash.startsWith('#msg=')) {
      navigate({ pathname: '/link-secreto', hash: location.hash }, { replace: true })
    }
  }, [location.hash, location.pathname, navigate])

  return null
}

export default function App() {
  return (
    <ThemeProvider>
      <PremiumProvider>
        <TermsModal />
        <LegacyHashRedirect />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/arquivos" element={<FilesPage />} />
            <Route path="/diagnostico-navegador" element={<BrowserDiagnosticsPage />} />
            <Route path="/qr-secreto" element={<QrSecretPage />} />
            <Route path="/link-secreto" element={<LinkSecretPage />} />
            <Route path="/esteganografia" element={<SteganographyPage />} />
            <Route path="/veu-notes" element={<VeuNotesPage />} />
            <Route path="/apoiar" element={<SupportPage />} />
            <Route path="/doacao" element={<SupportPage />} />
            <Route path="/privacidade" element={<PrivacyPage />} />
            <Route path="/seguranca" element={<SecurityPage />} />
            <Route path="/detalhes-tecnicos" element={<TechnicalDetailsPage />} />
            <Route path="/termos" element={<TermsPage />} />
            <Route path="/termos-de-uso" element={<TermsPage />} />
            <Route path="/sobre" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PremiumProvider>
    </ThemeProvider>
  )
}
