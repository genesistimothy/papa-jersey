import {requireAdmin} from '../_lib/auth.js'
import {json} from '../_lib/http.js'
import {sanityWriteClient} from '../_lib/sanity.js'

export const config = {api: {bodyParser: false}}

// The admin page shrinks photos in the browser before upload; Sanity's image CDN then serves each size on request.
export default async function handler(req, res) {
  if (!requireAdmin(req, res, {roles: ['owner']})) return
  if (req.method !== 'POST') return json(res, 405, {error: 'Method not allowed.'})
  const type = String(req.headers['content-type'] || '').split(';')[0]
  const size = Number(req.headers['content-length'] || 0)
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return json(res, 415, {error: 'Gunakan foto JPG, PNG, atau WebP.'})
  if (!size || size > 4 * 1024 * 1024) return json(res, 413, {error: 'Foto maksimal 4 MB.'})
  const filename = decodeURIComponent(String(req.headers['x-file-name'] || 'jersey')).replace(/[^a-zA-Z0-9._-]/g, '-')
  try {
    const asset = await sanityWriteClient().assets.upload('image', req, {filename, contentType: type})
    return json(res, 201, {asset: {_id: asset._id, url: asset.url}})
  } catch {
    return json(res, 500, {error: 'Upload foto gagal.'})
  }
}
