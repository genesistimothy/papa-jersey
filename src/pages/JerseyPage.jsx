import {useEffect, useState} from 'react'
import {Link, useParams} from 'react-router-dom'
import {SHOP_NAME, WHATSAPP_NUMBER} from '../config.js'
import {useJerseys} from '../hooks/useJerseys.jsx'
import {
  formatRupiah,
  hasNameset,
  isSizeAvailable,
  kitTypeLabel,
  NAMESET_NAME_MAX,
  normalizeNameset,
  orderMessage,
  orderTotal,
  SIZES,
  versionLabel,
  whatsAppUrl,
} from '../lib/jersey.js'
import {imageUrl} from '../lib/sanity.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function JerseyPage() {
  const {slug} = useParams()
  const {jerseys, status} = useJerseys()
  // The catalog only contains visible jerseys, so a hidden jersey's old link lands on the not-found page.
  const jersey = jerseys.find((item) => item.slug === slug)

  useEffect(() => {
    if (jersey) document.title = `${jersey.name} (${versionLabel(jersey.version)}) | ${SHOP_NAME}`
  }, [jersey])

  if (status === 'loading') return <div className="detail detail-skeleton" aria-busy="true"><div className="gallery-main" /></div>
  if (!jersey) return <NotFoundPage />
  return <JerseyDetail key={jersey.id} jersey={jersey} />
}

function JerseyDetail({jersey}) {
  const [size, setSize] = useState('')
  const [wantsNameset, setWantsNameset] = useState(false)
  const [nameset, setNameset] = useState({name: '', number: ''})
  const [activeImage, setActiveImage] = useState(0)

  const appliedNameset = wantsNameset ? nameset : {name: '', number: ''}
  const total = orderTotal(jersey, appliedNameset)
  const images = jersey.images || []
  const orderUrl = size && WHATSAPP_NUMBER
    ? whatsAppUrl(WHATSAPP_NUMBER, orderMessage({
      shopName: SHOP_NAME,
      jersey,
      size,
      nameset: appliedNameset,
      pageUrl: `${window.location.origin}/jersey/${jersey.slug}`,
    }))
    : ''

  return (
    <article className="detail">
      <nav className="crumbs"><Link to="/">Semua jersey</Link></nav>

      <div className="detail-grid">
        <section className="gallery" aria-label="Foto jersey">
          <div className="gallery-main">
            {images[activeImage] && (
              <img
                src={imageUrl(images[activeImage], {width: 800, height: 1000})}
                alt={`${jersey.name}, foto ${activeImage + 1}`}
                width="800"
                height="1000"
                fetchPriority="high"
              />
            )}
          </div>
          {images.length > 1 && (
            <div className="thumbs">
              {images.map((image, index) => (
                <button
                  key={image._key || index}
                  type="button"
                  className="thumb"
                  aria-label={`Lihat foto ${index + 1}`}
                  aria-current={index === activeImage}
                  onClick={() => setActiveImage(index)}
                >
                  <img src={imageUrl(image, {width: 160, height: 200})} alt="" width="80" height="100" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="buy">
          <p className="detail-team">{jersey.team} · {jersey.league}</p>
          <h1>{jersey.name}</h1>
          <p className="detail-tags">
            <span className="tag">{versionLabel(jersey.version)} version</span>
            <span className="tag">{kitTypeLabel(jersey.kitType)}</span>
            <span className="tag">{jersey.season}</span>
          </p>
          <p className="detail-price">{formatRupiah(jersey.price)}</p>

          <fieldset className="sizes">
            <legend>Pilih ukuran</legend>
            <div className="size-options">
              {SIZES.map((option) => {
                const available = isSizeAvailable(jersey, option)
                return (
                  <label key={option} className={`size${available ? '' : ' size-soldout'}`}>
                    <input
                      type="radio"
                      name="size"
                      value={option}
                      checked={size === option}
                      disabled={!available}
                      onChange={() => setSize(option)}
                    />
                    <span className="size-name">{option}</span>
                    {!available && <span className="size-note">Habis</span>}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="nameset">
            <label className="toggle">
              <input type="checkbox" checked={wantsNameset} onChange={(event) => setWantsNameset(event.target.checked)} />
              <span>Tambah nama &amp; nomor punggung <strong>+{formatRupiah(jersey.namesetPrice)}</strong></span>
            </label>
            {wantsNameset && (
              <div className="nameset-fields">
                <label>
                  <span>Nama</span>
                  <input
                    value={nameset.name}
                    maxLength={NAMESET_NAME_MAX}
                    autoCapitalize="characters"
                    placeholder="RIZKY"
                    onChange={(event) => setNameset((current) => normalizeNameset({...current, name: event.target.value}))}
                  />
                </label>
                <label className="nameset-number">
                  <span>Nomor</span>
                  <input
                    value={nameset.number}
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="10"
                    onChange={(event) => setNameset((current) => normalizeNameset({...current, number: event.target.value}))}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="order-bar">
            <div className="order-total">
              <span>Total{hasNameset(appliedNameset) ? ' (dengan nameset)' : ''}</span>
              <strong>{formatRupiah(total)}</strong>
            </div>
            {orderUrl ? (
              <a className="order-button" href={orderUrl} target="_blank" rel="noreferrer">Pesan via WhatsApp</a>
            ) : (
              <button type="button" className="order-button" disabled>
                {WHATSAPP_NUMBER ? 'Pilih ukuran dulu' : 'Nomor WhatsApp belum diatur'}
              </button>
            )}
          </div>

          {jersey.description && (
            <section className="description">
              <h2>Deskripsi</h2>
              <p>{jersey.description}</p>
            </section>
          )}
        </section>
      </div>
    </article>
  )
}
