import {formatRupiah, versionLabel} from '../../src/lib/jersey.js'

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

export function cdnImageUrl(image, {projectId, dataset}) {
  const match = /^image-([a-zA-Z0-9]+)-(\d+x\d+)-([a-z0-9]+)$/.exec(image?.asset?._ref || '')
  if (!match) return ''
  const [, id, dimensions, format] = match
  // WhatsApp and Instagram previews need a JPEG/PNG under ~300 KB; a square crop shows best in both.
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${format}?w=800&h=800&fit=crop&fm=jpg&q=80`
}

/** Writes the jersey's own title and link-preview tags into the built index.html. */
export function renderJerseyHtml(template, {jersey, shopName, pageUrl, imageUrl}) {
  const title = `${jersey.name} (${versionLabel(jersey.version)}) | ${shopName}`
  const description = `${formatRupiah(jersey.price)} · ${jersey.team} · ${jersey.season}. Pilih ukuran dan pesan langsung lewat WhatsApp.`
  const tags = [
    `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    imageUrl && `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
    imageUrl && '<meta property="og:image:width" content="800" />',
    imageUrl && '<meta property="og:image:height" content="800" />',
    '<meta property="product:price:amount" content="' + escapeHtml(jersey.price) + '" />',
    '<meta property="product:price:currency" content="IDR" />',
  ].filter(Boolean).join('\n    ')

  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeHtml(description)}$2`)
    .replace(/(<meta property="og:type" content=")[^"]*(")/, '$1product$2')
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeHtml(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeHtml(description)}$2`)
    .replace('<!--jersey-meta-->', tags)
}

export function renderNotFoundHtml(template, shopName) {
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>Tidak ditemukan | ${escapeHtml(shopName)}</title>`)
    .replace('<!--jersey-meta-->', '<meta name="robots" content="noindex" />')
}
