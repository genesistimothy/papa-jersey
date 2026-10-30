import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto'
import {parseCookies, requestOrigin} from './http.js'

export const SESSION_COOKIE = 'papa_admin_session'
export const OAUTH_COOKIE = 'papa_admin_oauth'
export const ROLES = ['owner', 'staff']

const secret = () => {
  const value = process.env.ADMIN_SESSION_SECRET
  if (!value || value.length < 32) throw new Error('ADMIN_SESSION_SECRET must contain at least 32 characters.')
  return value
}

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const signature = (value) => createHmac('sha256', secret()).update(value).digest('base64url')

export function signValue(value) {
  const payload = encode(value)
  return `${payload}.${signature(payload)}`
}

export function verifyValue(value) {
  if (!value || !value.includes('.')) return null
  const [payload, supplied] = value.split('.')
  const expected = signature(payload)
  const suppliedBuffer = Buffer.from(supplied)
  const expectedBuffer = Buffer.from(expected)
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return decoded.exp > Date.now() ? decoded : null
  } catch {
    return null
  }
}

/**
 * ADMIN_USERS="owner@x.com,helper@y.com:staff" → Map(email → role). A missing or unknown role means owner.
 * Changing this env var adds or removes staff without a code change.
 */
export function adminUsers() {
  const users = new Map()
  for (const entry of (process.env.ADMIN_USERS || '').split(',')) {
    const [email, role] = entry.split(':').map((part) => part.trim().toLowerCase())
    if (email) users.set(email, ROLES.includes(role) ? role : 'owner')
  }
  return users
}

export const roleFor = (email) => adminUsers().get(String(email || '').trim().toLowerCase()) || null

/** Returns the signed-in user with their current role, or null. The role is read from ADMIN_USERS on every request so removing someone takes effect at once. */
export function sessionFromRequest(req) {
  const session = verifyValue(parseCookies(req.headers.cookie)[SESSION_COOKIE])
  if (!session) return null
  const role = roleFor(session.email)
  return role ? {...session, role} : {...session, role: null}
}

export function createOAuthState() {
  return {
    state: randomBytes(24).toString('base64url'),
    nonce: randomBytes(24).toString('base64url'),
    exp: Date.now() + 10 * 60 * 1000,
  }
}

const secureCookie = (req) => requestOrigin(req).startsWith('https://') ? '; Secure' : ''
const appendCookie = (res, value) => {
  const existing = res.getHeader?.('Set-Cookie')
  res.setHeader('Set-Cookie', existing ? [...(Array.isArray(existing) ? existing : [existing]), value] : value)
}

export function setOAuthCookie(req, res, value) {
  appendCookie(res, `${OAUTH_COOKIE}=${encodeURIComponent(signValue(value))}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=600${secureCookie(req)}`)
}

export function clearOAuthCookie(req, res) {
  appendCookie(res, `${OAUTH_COOKIE}=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie(req)}`)
}

export function oauthStateFromRequest(req) {
  return verifyValue(parseCookies(req.headers.cookie)[OAUTH_COOKIE])
}

export function setSessionCookie(req, res, user) {
  const value = signValue({...user, exp: Date.now() + 8 * 60 * 60 * 1000})
  appendCookie(res, `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secureCookie(req)}`)
}

export function clearSessionCookie(req, res) {
  appendCookie(res, `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie(req)}`)
}

export function sameOrigin(req) {
  const origin = req.headers.origin
  return !origin || origin === requestOrigin(req)
}
