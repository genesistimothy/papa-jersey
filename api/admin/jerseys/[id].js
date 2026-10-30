import {validateJerseyInput, validateStaffInput} from '../../../src/lib/jersey.js'
import {requireAdmin} from '../../_lib/auth.js'
import {json, readJson} from '../../_lib/http.js'
import {ADMIN_JERSEY_FIELDS, jerseyId, sanityWriteClient, slugTaken} from '../../_lib/sanity.js'

export default async function handler(req, res) {
  const session = requireAdmin(req, res)
  if (!session) return
  try {
    const id = jerseyId(req.query?.id)
    const client = sanityWriteClient()

    if (req.method === 'GET') {
      const jersey = await client.fetch(`*[_id == $id][0]{${ADMIN_JERSEY_FIELDS}}`, {id})
      if (!jersey) return json(res, 404, {error: 'Jersey tidak ditemukan.'})
      return json(res, 200, {jersey})
    }

    if (req.method === 'PATCH') {
      const existing = await client.getDocument(id)
      if (!existing || existing._type !== 'jersey') return json(res, 404, {error: 'Jersey tidak ditemukan.'})
      const body = await readJson(req)

      // Staff may only change stock and visibility; every other field is ignored for them.
      if (session.role === 'staff') {
        const changes = validateStaffInput(body.jersey || {})
        if (changes.visible && !existing.images?.length) return json(res, 400, {error: 'Jersey tanpa foto tidak bisa ditampilkan.'})
        await client.patch(id).set(changes).commit()
        return json(res, 200, {id})
      }

      const {jersey, errors} = validateJerseyInput(body.jersey || {})
      if (errors) return json(res, 400, {error: errors.join(' '), fields: errors})
      if (await slugTaken(client, jersey.slug.current, id)) return json(res, 409, {error: 'Slug sudah dipakai jersey lain. Ubah slug-nya.'})
      const patch = client.patch(id).set(jersey)
      if (!jersey.frontImage) patch.unset(['frontImage'])
      await patch.commit()
      return json(res, 200, {id})
    }
    return json(res, 405, {error: 'Method not allowed.'})
  } catch (error) {
    return json(res, 500, {error: error.message === 'Invalid document id.' ? error.message : 'Gagal memproses jersey.'})
  }
}
