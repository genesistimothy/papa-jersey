// Public, read-only access to the Sanity dataset over plain HTTP, to keep the public bundle small.

export const projectId = import.meta.env.VITE_SANITY_PROJECT_ID || ''
export const dataset = import.meta.env.VITE_SANITY_DATASET || 'production'
export const sanityConfigured = Boolean(projectId)
const apiVersion = '2025-02-19'

export const PUBLIC_JERSEY_FIELDS = `
  "id": _id, name, "slug": slug.current, team, league, season, kitType, version,
  price, namesetPrice, description, stock, images, "createdAt": _createdAt
`

export async function sanityQuery(query, params = {}, {signal} = {}) {
  const search = new URLSearchParams({query, perspective: 'published'})
  for (const [key, value] of Object.entries(params)) search.set(`$${key}`, JSON.stringify(value))
  // apicdn is purged on publish, so changes reach visitors within seconds.
  const response = await fetch(`https://${projectId}.apicdn.sanity.io/v${apiVersion}/data/query/${dataset}?${search}`, {signal})
  if (!response.ok) throw new Error('Gagal memuat katalog.')
  const data = await response.json()
  return data.result
}

/** Builds a resized CDN URL from an image field ({asset: {_ref}}), or returns a plain URL as-is. */
export function imageUrl(image, {width = 600, height} = {}) {
  if (!image) return ''
  if (image.url) return image.url
  const ref = image.asset?._ref || image.asset?._id || ''
  const match = /^image-([a-zA-Z0-9]+)-(\d+x\d+)-([a-z0-9]+)$/.exec(ref)
  if (!match) return ''
  const [, id, dimensions, format] = match
  const params = new URLSearchParams({w: String(width), auto: 'format', q: '75', fit: 'crop'})
  if (height) params.set('h', String(height))
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${format}?${params}`
}
