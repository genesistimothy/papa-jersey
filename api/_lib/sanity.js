import {createClient} from '@sanity/client'

export function sanityConfigured() {
  return Boolean(process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID)
}

const config = () => ({
  projectId: process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || process.env.VITE_SANITY_DATASET || 'production',
  apiVersion: process.env.SANITY_API_VERSION || '2025-02-19',
})

/** Public published content. useCdn is off so a jersey that was just hidden is never served from a stale cache. */
export function sanityPublicClient() {
  return createClient({...config(), useCdn: false, perspective: 'published'})
}

export function sanityWriteClient() {
  const token = process.env.SANITY_WRITE_TOKEN
  if (!token) throw new Error('SANITY_WRITE_TOKEN is not configured.')
  return createClient({...config(), token, useCdn: false, perspective: 'published'})
}

export function jerseyId(id = '') {
  const value = String(id)
  if (!/^jersey-[a-zA-Z0-9-]{1,120}$/.test(value)) throw new Error('Invalid document id.')
  return value
}

export const ADMIN_JERSEY_FIELDS = `
  _id, _createdAt, _updatedAt, name, "slug": slug.current, team, league, season, kitType, version,
  price, namesetPrice, description, stock, visible, images, frontImage
`

/** Rejects a slug already used by another jersey, so every jersey page has its own link. */
export async function slugTaken(client, slug, exceptId = '') {
  const id = await client.fetch('*[_type == "jersey" && slug.current == $slug && _id != $exceptId][0]._id', {slug, exceptId})
  return Boolean(id)
}
