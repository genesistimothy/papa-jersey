import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {requestOrigin} from './_lib/http.js'
import {cdnImageUrl, renderJerseyHtml, renderNotFoundHtml} from './_lib/jerseyMeta.js'
import {sanityConfigured, sanityPublicClient} from './_lib/sanity.js'

// vercel.json rewrites /jersey/:slug here, so link previews show the jersey and hidden jerseys get a real 404.
let cachedTemplate = ''

async function template(req) {
  if (cachedTemplate) return cachedTemplate
  try {
    cachedTemplate = await readFile(path.join(process.cwd(), 'dist', 'index.html'), 'utf8')
  } catch {
    const response = await fetch(`${requestOrigin(req)}/index.html`)
    if (!response.ok) throw new Error('index.html is unavailable.')
    cachedTemplate = await response.text()
  }
  return cachedTemplate
}

function send(res, status, html) {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Short shared cache: a newly added or hidden jersey is reflected within about 30 seconds.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30')
  res.end(html)
}

export default async function handler(req, res) {
  const shopName = process.env.VITE_SHOP_NAME || 'Papa Jersey'
  const html = await template(req)
  const slug = String(req.query?.slug || '')
  if (!/^[a-z0-9-]{1,96}$/.test(slug)) return send(res, 404, renderNotFoundHtml(html, shopName))
  if (!sanityConfigured()) return send(res, 200, html)

  try {
    const client = sanityPublicClient()
    const jersey = await client.fetch(
      '*[_type == "jersey" && slug.current == $slug && visible == true][0]{name, team, season, version, price, "image": images[0]}',
      {slug},
    )
    if (!jersey) return send(res, 404, renderNotFoundHtml(html, shopName))
    const {projectId, dataset} = client.config()
    return send(res, 200, renderJerseyHtml(html, {
      jersey,
      shopName,
      pageUrl: `${requestOrigin(req)}/jersey/${slug}`,
      imageUrl: cdnImageUrl(jersey.image, {projectId, dataset}),
    }))
  } catch {
    // If Sanity is briefly unreachable, still serve the app; it loads the jersey itself.
    return send(res, 200, html)
  }
}
