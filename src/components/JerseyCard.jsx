import {Link} from 'react-router-dom'
import {formatRupiah, isSoldOut, kitTypeLabel, versionLabel} from '../lib/jersey.js'
import {imageUrl} from '../lib/sanity.js'

export default function JerseyCard({jersey, eager = false}) {
  const soldOut = isSoldOut(jersey)
  const image = jersey.images?.[0]
  return (
    <Link to={`/jersey/${jersey.slug}`} className="card">
      <div className="card-media">
        {image && (
          <img
            src={imageUrl(image, {width: 400, height: 500})}
            srcSet={`${imageUrl(image, {width: 400, height: 500})} 400w, ${imageUrl(image, {width: 640, height: 800})} 640w`}
            sizes="(min-width: 900px) 25vw, 50vw"
            alt={jersey.name}
            width="400"
            height="500"
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
          />
        )}
        {soldOut && <span className="badge badge-soldout">Habis</span>}
        <span className="badge badge-version">{versionLabel(jersey.version)}</span>
      </div>
      <div className="card-body">
        <p className="card-team">{jersey.team}</p>
        <h2 className="card-name">{jersey.name}</h2>
        <p className="card-meta">{jersey.season} · {kitTypeLabel(jersey.kitType)}</p>
        <p className="card-price">{formatRupiah(jersey.price)}</p>
      </div>
    </Link>
  )
}
