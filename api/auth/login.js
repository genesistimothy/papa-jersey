import {json, redirect, requestOrigin} from '../_lib/http.js'
import {adminUsers, createOAuthState, setOAuthCookie} from '../_lib/session.js'

export default function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, {error: 'Method not allowed.'})
  const clientId = process.env.GOOGLE_CLIENT_ID
  const configured = clientId && process.env.GOOGLE_CLIENT_SECRET && process.env.ADMIN_SESSION_SECRET?.length >= 32 && adminUsers().size
  if (!configured) return json(res, 503, {error: 'Google authentication is not configured.'})

  const oauth = createOAuthState()
  setOAuthCookie(req, res, oauth)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${requestOrigin(req)}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state: oauth.state,
    nonce: oauth.nonce,
    prompt: 'select_account',
  })
  return redirect(res, `https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
