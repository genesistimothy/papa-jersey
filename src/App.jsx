import {lazy, Suspense} from 'react'
import {Route, Routes} from 'react-router-dom'
import Layout from './components/Layout.jsx'
import {JerseysProvider} from './hooks/useJerseys.jsx'
import CatalogPage from './pages/CatalogPage.jsx'
import JerseyPage from './pages/JerseyPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

// Kept out of the public bundle so customers never download admin code.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={(
          <Suspense fallback={<p className="admin-loading">Memuat…</p>}>
            <AdminApp />
          </Suspense>
        )}
      />
      <Route element={<JerseysProvider><Layout /></JerseysProvider>}>
        <Route index element={<CatalogPage />} />
        <Route path="jersey/:slug" element={<JerseyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
