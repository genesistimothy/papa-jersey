import {useEffect} from 'react'
import {Link} from 'react-router-dom'
import {SHOP_NAME} from '../config.js'

export default function NotFoundPage() {
  useEffect(() => {
    document.title = `Tidak ditemukan | ${SHOP_NAME}`
  }, [])
  return (
    <section className="not-found">
      <h1>Jersey tidak ditemukan</h1>
      <p>Jersey ini mungkin sudah tidak dijual atau link-nya salah.</p>
      <Link className="order-button" to="/">Lihat semua jersey</Link>
    </section>
  )
}
