import {json} from './http.js'
import {sameOrigin, sessionFromRequest} from './session.js'

/** Allows owners and staff by default; pass {roles: ['owner']} to restrict a route further. */
export function requireAdmin(req, res, {roles = ['owner', 'staff']} = {}) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !sameOrigin(req)) {
    json(res, 403, {error: 'Invalid request origin.'})
    return null
  }

  const session = sessionFromRequest(req)
  if (!session) {
    json(res, 401, {error: 'Silakan masuk terlebih dahulu.'})
    return null
  }
  if (!session.role || !roles.includes(session.role)) {
    json(res, 403, {error: 'Akun ini tidak punya akses.'})
    return null
  }
  return session
}
