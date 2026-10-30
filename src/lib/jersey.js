// Shared by the website (src/) and the server routes (api/). Keep this file free of browser or Node APIs.

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']

export const KIT_TYPES = [
  {value: 'home', label: 'Home'},
  {value: 'away', label: 'Away'},
  {value: 'third', label: 'Third'},
  {value: 'retro', label: 'Retro'},
  {value: 'kids', label: 'Anak'},
]

export const VERSIONS = [
  {value: 'fan', label: 'Fan'},
  {value: 'player', label: 'Player'},
]

export const NAMESET_NAME_MAX = 12

const labelOf = (options, value) => options.find((option) => option.value === value)?.label || ''
export const kitTypeLabel = (value) => labelOf(KIT_TYPES, value)
export const versionLabel = (value) => labelOf(VERSIONS, value)

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 96)
}

export const stockOf = (jersey, size) => Math.max(0, Math.trunc(Number(jersey?.stock?.[size]) || 0))
export const isSizeAvailable = (jersey, size) => stockOf(jersey, size) > 0
export const totalStock = (jersey) => SIZES.reduce((sum, size) => sum + stockOf(jersey, size), 0)
export const isSoldOut = (jersey) => totalStock(jersey) === 0

/** Normalises and validates the optional name and number printed on the back. */
export function normalizeNameset({name = '', number = ''} = {}) {
  const cleanName = String(name).toUpperCase().replace(/[^A-Z .'-]/g, '').replace(/\s+/g, ' ').trimStart().slice(0, NAMESET_NAME_MAX)
  const cleanNumber = String(number).replace(/\D/g, '').slice(0, 2)
  return {name: cleanName, number: cleanNumber}
}

export const hasNameset = (nameset) => Boolean(nameset?.name?.trim() || nameset?.number)

export function orderTotal(jersey, nameset) {
  const price = Number(jersey?.price) || 0
  return hasNameset(nameset) ? price + (Number(jersey?.namesetPrice) || 0) : price
}

export function formatRupiah(value) {
  const amount = Math.round(Number(value) || 0)
  return `Rp ${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

export function orderMessage({shopName, jersey, size, nameset, pageUrl}) {
  const version = versionLabel(jersey.version)
  const lines = [
    `Halo ${shopName}, saya mau pesan:`,
    `${jersey.name}${version ? ` (${version})` : ''}`,
    `Ukuran: ${size}`,
  ]
  if (hasNameset(nameset)) lines.push(`Nameset: ${[nameset.name.trim(), nameset.number].filter(Boolean).join(' ')}`)
  lines.push(`Total: ${formatRupiah(orderTotal(jersey, nameset))}`)
  if (pageUrl) lines.push(pageUrl)
  return lines.join('\n')
}

export function whatsAppUrl(phoneNumber, message) {
  const digits = String(phoneNumber || '').replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export const SORTS = [
  {value: 'newest', label: 'Terbaru'},
  {value: 'price-asc', label: 'Harga terendah'},
  {value: 'price-desc', label: 'Harga tertinggi'},
]

const normalizeText = (value) => String(value || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')

/**
 * @param {any[]} jerseys
 * @param {{q?: string, team?: string, league?: string, type?: string, version?: string, sort?: string}} criteria
 */
export function filterAndSort(jerseys, {q = '', team = '', league = '', type = '', version = '', sort = 'newest'} = {}) {
  const terms = normalizeText(q).split(/\s+/).filter(Boolean)
  const result = jerseys.filter((jersey) => {
    if (team && jersey.team !== team) return false
    if (league && jersey.league !== league) return false
    if (type && jersey.kitType !== type) return false
    if (version && jersey.version !== version) return false
    if (!terms.length) return true
    const haystack = normalizeText([jersey.name, jersey.team, jersey.season, jersey.league].join(' '))
    return terms.every((term) => haystack.includes(term))
  })
  const byPrice = (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)
  if (sort === 'price-asc') result.sort(byPrice)
  else if (sort === 'price-desc') result.sort((a, b) => byPrice(b, a))
  else result.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  return result
}

export const uniqueValues = (jerseys, key) => [...new Set(jerseys.map((jersey) => jersey[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b))

// ---- Admin input validation (server-side source of truth) ----

const text = (value, max) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : ''
const ASSET_ID = /^image-[a-zA-Z0-9]+-\d+x\d+-[a-z0-9]+$/
const assetRef = (value) => {
  const ref = value?.asset?._ref || value?.asset?._id || value?._ref || ''
  return ASSET_ID.test(ref) ? ref : ''
}
const imageField = (ref, key) => ({_type: 'image', ...(key ? {_key: key} : {}), asset: {_type: 'reference', _ref: ref}})

export function normalizeStock(input = {}) {
  return Object.fromEntries(SIZES.map((size) => [size, Math.min(9999, Math.max(0, Math.trunc(Number(input?.[size]) || 0)))]))
}

/** Returns {jersey} ready to store, or {errors}. */
export function validateJerseyInput(input = {}) {
  const name = text(input.name, 120)
  const team = text(input.team, 80)
  const league = text(input.league, 80)
  const season = text(input.season, 20)
  const kitType = KIT_TYPES.some((option) => option.value === input.kitType) ? input.kitType : ''
  const version = VERSIONS.some((option) => option.value === input.version) ? input.version : ''
  // Fan and player versions often share a name, so the version goes into the default slug.
  const slug = slugify(input.slug || `${name} ${version}`)
  const price = Number(input.price)
  const namesetPrice = Number(input.namesetPrice || 0)
  const images = (Array.isArray(input.images) ? input.images : [])
    .map((image) => ({ref: assetRef(image), key: text(image?._key, 40)}))
    .filter((image) => image.ref)
    .slice(0, 12)
  const frontImage = assetRef(input.frontImage)
  const visible = Boolean(input.visible)

  const errors = []
  if (!name) errors.push('Nama jersey wajib diisi.')
  if (!slug) errors.push('Slug tidak valid.')
  if (!team) errors.push('Tim wajib diisi.')
  if (!league) errors.push('Liga wajib diisi.')
  if (!season) errors.push('Musim wajib diisi.')
  if (!kitType) errors.push('Pilih tipe jersey.')
  if (!version) errors.push('Pilih versi jersey.')
  if (!Number.isFinite(price) || price <= 0) errors.push('Harga harus lebih dari 0.')
  if (!Number.isFinite(namesetPrice) || namesetPrice < 0) errors.push('Biaya nameset tidak boleh negatif.')
  if (visible && !images.length) errors.push('Tambahkan minimal satu foto sebelum jersey ditampilkan.')
  if (errors.length) return {errors}

  const jersey = {
    _type: 'jersey',
    name,
    slug: {_type: 'slug', current: slug},
    team,
    league,
    season,
    kitType,
    version,
    price: Math.round(price),
    namesetPrice: Math.round(namesetPrice),
    description: typeof input.description === 'string' ? input.description.trim().slice(0, 2000) : '',
    images: images.map((image, index) => imageField(image.ref, image.key || `img${index}-${image.ref.slice(6, 14)}`)),
    stock: normalizeStock(input.stock),
    visible,
  }
  if (frontImage) jersey.frontImage = imageField(frontImage)
  return {jersey}
}

/** The only fields a staff account may change. */
export function validateStaffInput(input = {}) {
  return {stock: normalizeStock(input.stock), visible: Boolean(input.visible)}
}
