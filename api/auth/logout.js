import {json} from '../_lib/http.js'
import {clearSessionCookie, sameOrigin} from '../_lib/session.js'

export default function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, {error: 'Method not allowed.'})
  if (!sameOrigin(req)) return json(res, 403, {error: 'Invalid request origin.'})
  clearSessionCookie(req, res)
  return json(res, 200, {ok: true})
}
