import {randomUUID} from 'node:crypto'
import {validateJerseyInput} from '../../../src/lib/jersey.js'
import {requireAdmin} from '../../_lib/auth.js'
import {json, readJson} from '../../_lib/http.js'
import {ADMIN_JERSEY_FIELDS, sanityWriteClient, slugTaken} from '../../_lib/sanity.js'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (!requireAdmin(req, res, {roles: ['owner']})) return
  } else if (!requireAdmin(req, res)) return

  try {
    const client = sanityWriteClient()
    if (req.method === 'GET') {
      const jerseys = await client.fetch(`*[_type == "jersey"] | order(_createdAt desc){${ADMIN_JERSEY_FIELDS}}`)
      return json(res, 200, {jerseys})
    }

    if (req.method === 'POST') {
      const body = await readJson(req)
      const {jersey, errors} = validateJerseyInput(body.jersey || {})
      if (errors) return json(res, 400, {error: errors.join(' '), fields: errors})
      if (await slugTaken(client, jersey.slug.current)) return json(res, 409, {error: 'Slug sudah dipakai jersey lain. Ubah slug-nya.'})
      const id = `jersey-${randomUUID()}`
      await client.create({...jersey, _id: id})
      return json(res, 201, {id})
    }
    return json(res, 405, {error: 'Method not allowed.'})
  } catch (error) {
    return json(res, 500, {error: error.message === 'Request body is too large.' ? error.message : 'Gagal menyimpan jersey.'})
  }
}
