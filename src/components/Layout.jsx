import {Link, Outlet} from 'react-router-dom'
import {SHOP_NAME, WHATSAPP_NUMBER} from '../config.js'
import {whatsAppUrl} from '../lib/jersey.js'

export default function Layout() {
  return (
    <div className="shell">
      <header className="site-header">
        <Link to="/" className="brand">
          <img src="/favicon.svg" alt="" width="32" height="32" />
          <span>{SHOP_NAME}</span>
        </Link>
        {WHATSAPP_NUMBER && (
          <a className="header-chat" href={whatsAppUrl(WHATSAPP_NUMBER, `Halo ${SHOP_NAME}, saya mau tanya jersey.`)} target="_blank" rel="noreferrer">
            Tanya via WA
          </a>
        )}
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>© {new Date().getFullYear()} {SHOP_NAME}. Pemesanan dan pembayaran melalui WhatsApp.</p>
      </footer>
    </div>
  )
}
