import {json, redirect, requestOrigin} from '../_lib/http.js'
import {clearOAuthCookie, oauthStateFromRequest, roleFor, setSessionCookie} from '../_lib/session.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, {error: 'Method not allowed.'})
  const oauth = oauthStateFromRequest(req)
  if (!oauth || !req.query?.state || oauth.state !== req.query.state) return redirect(res, '/admin/login?error=invalid_state')
  if (req.query.error) return redirect(res, '/admin/login?error=oauth_denied')

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        code: req.query.code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${requestOrigin(req)}/api/auth/callback`,
        grant_type: 'authorization_code',
      }),
    })
    if (!response.ok) throw new Error('Google token exchange failed.')
    const tokens = await response.json()
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {Authorization: `Bearer ${tokens.access_token}`},
    })
    if (!profileResponse.ok) throw new Error('Google profile request failed.')
    const profile = await profileResponse.json()
    clearOAuthCookie(req, res)
    if (!profile.email_verified || !roleFor(profile.email)) {
      return redirect(res, '/admin/access-denied')
    }
    setSessionCookie(req, res, {
      email: profile.email.toLowerCase(),
      name: profile.name || profile.email,
      picture: profile.picture || '',
    })
    return redirect(res, '/admin')
  } catch {
    return redirect(res, '/admin/login?error=oauth_failed')
  }
}
