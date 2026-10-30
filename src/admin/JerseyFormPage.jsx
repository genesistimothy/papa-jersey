import {useEffect, useState} from 'react'
import {Link, useNavigate, useParams} from 'react-router-dom'
import {DEFAULT_NAMESET_PRICE} from '../config.js'
import {KIT_TYPES, SIZES, slugify, VERSIONS} from '../lib/jersey.js'
import {imageUrl} from '../lib/sanity.js'
import {adminRequest, uploadImage} from './adminApi.js'

const EMPTY = {
  name: '', slug: '', team: '', league: '', season: '', kitType: 'home', version: 'fan',
  price: '', namesetPrice: DEFAULT_NAMESET_PRICE || '', description: '',
  images: [], frontImage: null, stock: Object.fromEntries(SIZES.map((size) => [size, 0])), visible: false,
}

export default function JerseyFormPage({user}) {
  const {id} = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const staffOnly = user.role === 'staff'
  const [form, setForm] = useState(isNew ? EMPTY : null)
  const [slugEdited, setSlugEdited] = useState(!isNew)
  const [suggestions, setSuggestions] = useState({teams: [], leagues: []})
  const [status, setStatus] = useState({saving: false, uploading: false, error: '', saved: false})

  useEffect(() => {
    // Existing teams and leagues are offered as suggestions so spellings stay consistent for the filters.
    adminRequest('/api/admin/jerseys').then(({jerseys}) => setSuggestions({
      teams: [...new Set(jerseys.map((jersey) => jersey.team).filter(Boolean))].sort(),
      leagues: [...new Set(jerseys.map((jersey) => jersey.league).filter(Boolean))].sort(),
    })).catch(() => {})
    if (isNew) return
    adminRequest(`/api/admin/jerseys/${id}`)
      .then(({jersey}) => setForm({...EMPTY, ...jersey, stock: {...EMPTY.stock, ...jersey.stock}, images: jersey.images || [], frontImage: jersey.frontImage || null}))
      .catch((error) => setStatus((current) => ({...current, error: error.message})))
  }, [id, isNew])

  if (!form) return status.error ? <p className="admin-error" role="alert">{status.error}</p> : <p className="admin-loading">Memuat…</p>

  const set = (changes) => {
    setStatus((current) => ({...current, saved: false}))
    setForm((current) => {
      const next = {...current, ...changes}
      if (!slugEdited && ('name' in changes || 'version' in changes)) next.slug = slugify(`${next.name} ${next.version}`)
      return next
    })
  }
  const field = (key) => ({value: form[key] ?? '', onChange: (event) => set({[key]: event.target.value}), disabled: staffOnly})

  const addImages = async (files, target = 'images') => {
    if (!files.length) return
    setStatus((current) => ({...current, uploading: true, error: ''}))
    try {
      const uploaded = []
      for (const file of files) uploaded.push(await uploadImage(file))
      if (target === 'frontImage') set({frontImage: uploaded[0]})
      else set({images: [...form.images, ...uploaded]})
    } catch (error) {
      setStatus((current) => ({...current, error: error.message}))
    } finally {
      setStatus((current) => ({...current, uploading: false}))
    }
  }
  const moveImage = (index, delta) => {
    const images = [...form.images]
    const [image] = images.splice(index, 1)
    images.splice(index + delta, 0, image)
    set({images})
  }

  const save = async (event) => {
    event.preventDefault()
    setStatus((current) => ({...current, saving: true, error: '', saved: false}))
    try {
      const body = JSON.stringify({jersey: form})
      if (isNew) {
        const {id: newId} = await adminRequest('/api/admin/jerseys', {method: 'POST', body})
        navigate(`/admin/jerseys/${newId}`, {replace: true})
      } else {
        await adminRequest(`/api/admin/jerseys/${id}`, {method: 'PATCH', body})
      }
      setStatus((current) => ({...current, saving: false, saved: true}))
    } catch (error) {
      setStatus((current) => ({...current, saving: false, error: error.message}))
    }
  }

  return (
    <form className="admin-form" onSubmit={save}>
      <div className="admin-toolbar">
        <h1>{isNew ? 'Tambah jersey' : form.name || 'Ubah jersey'}</h1>
        <Link to="/admin" className="admin-muted-link">← Daftar jersey</Link>
      </div>
      {staffOnly && <p className="admin-note">Akun staf hanya bisa mengubah stok dan status tampil.</p>}

      <fieldset>
        <legend>Detail</legend>
        <label className="wide">Nama jersey<input {...field('name')} required placeholder="Persija Home 2025/26" /></label>
        <label>Tim<input {...field('team')} required list="teams" placeholder="Persija Jakarta" /></label>
        <label>Liga<input {...field('league')} required list="leagues" placeholder="Liga 1" /></label>
        <label>Musim<input {...field('season')} required placeholder="2025/26" /></label>
        <label>Tipe
          <select {...field('kitType')}>{KIT_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </label>
        <label>Versi
          <select {...field('version')}>{VERSIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </label>
        <label>Harga (Rp)<input {...field('price')} required type="number" min="1" step="1000" inputMode="numeric" /></label>
        <label>Biaya nameset (Rp)<input {...field('namesetPrice')} type="number" min="0" step="1000" inputMode="numeric" /></label>
        <label className="wide">Slug (alamat halaman)
          <input
            value={form.slug}
            disabled={staffOnly}
            onChange={(event) => {
              setSlugEdited(true)
              set({slug: slugify(event.target.value)})
            }}
          />
          <small>/jersey/{form.slug || '…'}</small>
        </label>
        <label className="wide">Deskripsi<textarea {...field('description')} rows={4} /></label>
        <datalist id="teams">{suggestions.teams.map((team) => <option key={team} value={team} />)}</datalist>
        <datalist id="leagues">{suggestions.leagues.map((league) => <option key={league} value={league} />)}</datalist>
      </fieldset>

      <fieldset>
        <legend>Foto</legend>
        <p className="admin-hint">Foto pertama tampil di katalog. Foto otomatis diperkecil saat diunggah.</p>
        <ol className="admin-images">
          {form.images.map((image, index) => (
            <li key={image._key || index}>
              <img src={imageUrl(image, {width: 200, height: 250})} alt={`Foto ${index + 1}`} width="100" height="125" />
              {!staffOnly && (
                <div className="admin-image-actions">
                  <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} aria-label="Geser ke kiri">←</button>
                  <button type="button" onClick={() => moveImage(index, 1)} disabled={index === form.images.length - 1} aria-label="Geser ke kanan">→</button>
                  <button type="button" onClick={() => set({images: form.images.filter((_, i) => i !== index)})} aria-label="Hapus foto">✕</button>
                </div>
              )}
            </li>
          ))}
        </ol>
        {!staffOnly && (
          <label className="admin-upload">
            {status.uploading ? 'Mengunggah…' : '+ Tambah foto'}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={status.uploading} onChange={(event) => {
              addImages([...event.target.files])
              event.target.value = ''
            }} />
          </label>
        )}

        <div className="admin-front">
          <p><strong>Foto depan polos (opsional)</strong><br /><span className="admin-hint">Foto jersey tampak depan tanpa model, untuk fitur coba virtual di fase 2.</span></p>
          {form.frontImage && <img src={imageUrl(form.frontImage, {width: 200, height: 250})} alt="Foto depan" width="100" height="125" />}
          {!staffOnly && (
            <div className="admin-image-actions">
              <label className="admin-upload small">
                {form.frontImage ? 'Ganti' : 'Unggah'}
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={status.uploading} onChange={(event) => {
                  addImages([...event.target.files], 'frontImage')
                  event.target.value = ''
                }} />
              </label>
              {form.frontImage && <button type="button" onClick={() => set({frontImage: null})}>Hapus</button>}
            </div>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend>Stok per ukuran</legend>
        <div className="admin-stock">
          {SIZES.map((size) => (
            <label key={size}>{size}
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={form.stock[size] ?? 0}
                onChange={(event) => set({stock: {...form.stock, [size]: event.target.value}})}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <label className="admin-visible">
        <input type="checkbox" checked={form.visible} onChange={(event) => set({visible: event.target.checked})} />
        Tampilkan di website
      </label>

      {status.error && <p className="admin-error" role="alert">{status.error}</p>}
      <div className="admin-actions">
        <button className="admin-button" type="submit" disabled={status.saving || status.uploading}>{status.saving ? 'Menyimpan…' : 'Simpan'}</button>
        {status.saved && <span className="admin-saved" role="status">Tersimpan. Website ter-update dalam beberapa detik.</span>}
        {!isNew && form.visible && <a href={`/jersey/${form.slug}`} target="_blank" rel="noreferrer" className="admin-muted-link">Lihat di website</a>}
      </div>
    </form>
  )
}
