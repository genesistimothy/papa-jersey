import {useEffect, useMemo, useState} from 'react'
import {Link} from 'react-router-dom'
import {formatRupiah, totalStock, versionLabel} from '../lib/jersey.js'
import {imageUrl} from '../lib/sanity.js'
import {adminRequest} from './adminApi.js'

export default function JerseyListPage({user}) {
  const [jerseys, setJerseys] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    adminRequest('/api/admin/jerseys')
      .then((data) => setJerseys(data.jerseys))
      .catch((requestError) => setError(requestError.message))
  }, [])

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (jerseys || []).filter((jersey) => !term || `${jersey.name} ${jersey.team} ${jersey.season}`.toLowerCase().includes(term))
  }, [jerseys, query])

  const toggleVisible = async (jersey) => {
    setBusyId(jersey._id)
    setError('')
    try {
      await adminRequest(`/api/admin/jerseys/${jersey._id}`, {method: 'PATCH', body: JSON.stringify({jersey: {...jersey, visible: !jersey.visible}})})
      setJerseys((current) => current.map((item) => item._id === jersey._id ? {...item, visible: !item.visible} : item))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId('')
    }
  }

  return (
    <section>
      <div className="admin-toolbar">
        <h1>Jersey</h1>
        {user.role === 'owner' && <Link className="admin-button" to="/admin/new">+ Tambah jersey</Link>}
      </div>
      <input className="admin-search" type="search" placeholder="Cari jersey" aria-label="Cari jersey" value={query} onChange={(event) => setQuery(event.target.value)} />
      {error && <p className="admin-error" role="alert">{error}</p>}
      {!jerseys && !error && <p className="admin-loading">Memuat…</p>}
      {jerseys && !jerseys.length && <p className="admin-empty">Belum ada jersey. Tambahkan jersey pertama.</p>}
      <ul className="admin-list">
        {shown.map((jersey) => {
          const stock = totalStock(jersey)
          return (
            <li key={jersey._id} className={jersey.visible ? '' : 'is-hidden'}>
              <Link to={`/admin/jerseys/${jersey._id}`} className="admin-row">
                <span className="admin-thumb">
                  {jersey.images?.[0] && <img src={imageUrl(jersey.images[0], {width: 96, height: 120})} alt="" width="48" height="60" loading="lazy" />}
                </span>
                <span className="admin-row-text">
                  <strong>{jersey.name}</strong>
                  <span>{versionLabel(jersey.version)} · {formatRupiah(jersey.price)}</span>
                  <span className={stock ? '' : 'admin-warn'}>{stock ? `Stok ${stock}` : 'Stok habis'}</span>
                </span>
              </Link>
              <button
                type="button"
                className={`admin-pill${jersey.visible ? ' on' : ''}`}
                onClick={() => toggleVisible(jersey)}
                disabled={busyId === jersey._id}
                aria-label={`${jersey.visible ? 'Sembunyikan' : 'Tampilkan'} ${jersey.name}`}
              >
                {jersey.visible ? 'Tampil' : 'Disembunyikan'}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
