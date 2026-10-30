import {json} from '../_lib/http.js'
import {sessionFromRequest} from '../_lib/session.js'

export default function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, {error: 'Method not allowed.'})
  let session
  try {
    session = sessionFromRequest(req)
  } catch {
    return json(res, 200, {authenticated: false, configured: false})
  }
  if (!session) return json(res, 200, {authenticated: false})
  if (!session.role) return json(res, 200, {authenticated: false, denied: true})
  return json(res, 200, {authenticated: true, user: {email: session.email, name: session.name, picture: session.picture, role: session.role}})
}
