import {useEffect, useState} from 'react'
import {Link, Navigate, Route, Routes, useSearchParams} from 'react-router-dom'
import {SHOP_NAME} from '../config.js'
import {adminRequest} from './adminApi.js'
import JerseyFormPage from './JerseyFormPage.jsx'
import JerseyListPage from './JerseyListPage.jsx'
import './admin.css'

const LOGIN_ERRORS = {
  invalid_state: 'Sesi masuk kedaluwarsa. Coba lagi.',
  oauth_denied: 'Proses masuk dengan Google dibatalkan.',
  oauth_failed: 'Gagal masuk dengan Google. Coba lagi.',
}

export default function AdminApp() {
  const [session, setSession] = useState({status: 'loading'})

  useEffect(() => {
    document.title = `Admin | ${SHOP_NAME}`
    fetch('/api/auth/session', {credentials: 'same-origin'})
      .then((response) => response.json())
      .then((data) => setSession(data.authenticated ? {status: 'in', user: data.user} : {status: data.denied ? 'denied' : 'out'}))
      .catch(() => setSession({status: 'out'}))
  }, [])

  if (session.status === 'loading') return <p className="admin-loading">Memuat…</p>

  return (
    <Routes>
      <Route path="login" element={session.status === 'in' ? <Navigate to="/admin" replace /> : <LoginPage />} />
      <Route path="access-denied" element={<AccessDeniedPage />} />
      <Route path="*" element={session.status === 'in' ? <AdminShell user={session.user} /> : <Navigate to={session.status === 'denied' ? '/admin/access-denied' : '/admin/login'} replace />} />
    </Routes>
  )
}

function AdminShell({user}) {
  const logout = async () => {
    await adminRequest('/api/auth/logout', {method: 'POST'}).catch(() => {})
    window.location.assign('/admin/login')
  }
  return (
    <div className="admin">
      <header className="admin-header">
        <Link to="/admin" className="admin-brand">{SHOP_NAME} · Admin</Link>
        <div className="admin-user">
          <span title={user.email}>{user.name}{user.role === 'staff' ? ' (staf)' : ''}</span>
          <button type="button" onClick={logout}>Keluar</button>
        </div>
      </header>
      <main className="admin-main">
        <Routes>
          <Route index element={<JerseyListPage user={user} />} />
          <Route path="new" element={user.role === 'owner' ? <JerseyFormPage user={user} /> : <Navigate to="/admin" replace />} />
          <Route path="jerseys/:id" element={<JerseyFormPage user={user} />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function LoginPage() {
  const [params] = useSearchParams()
  const error = LOGIN_ERRORS[params.get('error')]
  return (
    <div className="admin-center">
      <div className="admin-panel">
        <h1>{SHOP_NAME} · Admin</h1>
        <p>Masuk dengan akun Google yang sudah didaftarkan oleh pemilik toko.</p>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <a className="admin-button" href="/api/auth/login">Masuk dengan Google</a>
        <Link to="/" className="admin-muted-link">Kembali ke toko</Link>
      </div>
    </div>
  )
}

function AccessDeniedPage() {
  return (
    <div className="admin-center">
      <div className="admin-panel">
        <h1>Akses ditolak</h1>
        <p>Akun Google ini tidak terdaftar sebagai admin {SHOP_NAME}. Minta pemilik toko menambahkan email Anda.</p>
        <a className="admin-button" href="/api/auth/login">Masuk dengan akun lain</a>
      </div>
    </div>
  )
}
