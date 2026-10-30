import assert from 'node:assert/strict'
import test from 'node:test'
import {requireAdmin} from '../api/_lib/auth.js'
import {cdnImageUrl, renderJerseyHtml, renderNotFoundHtml} from '../api/_lib/jerseyMeta.js'
import {adminUsers, roleFor, SESSION_COOKIE, signValue} from '../api/_lib/session.js'

process.env.ADMIN_SESSION_SECRET = 'x'.repeat(40)
process.env.ADMIN_USERS = ' Owner@Example.com , helper@example.com:staff, odd@example.com:superuser '

function fakeRes() {
  return {
    statusCode: 0, headers: {}, body: '',
    setHeader(key, value) { this.headers[key] = value },
    getHeader(key) { return this.headers[key] },
    end(body) { this.body = body },
  }
}
const requestAs = (email, method = 'GET') => ({
  method,
  headers: {
    host: 'papajersey.id',
    cookie: email ? `${SESSION_COOKIE}=${encodeURIComponent(signValue({email, exp: Date.now() + 60_000}))}` : '',
  },
})

test('ADMIN_USERS parses emails and roles, defaulting to owner', () => {
  assert.deepEqual([...adminUsers()], [['owner@example.com', 'owner'], ['helper@example.com', 'staff'], ['odd@example.com', 'owner']])
  assert.equal(roleFor('OWNER@example.com'), 'owner')
  assert.equal(roleFor('stranger@example.com'), null)
})

test('an email the shop did not name is refused', () => {
  const res = fakeRes()
  assert.equal(requireAdmin(requestAs('stranger@example.com'), res), null)
  assert.equal(res.statusCode, 403)
})

test('no session gets 401', () => {
  const res = fakeRes()
  assert.equal(requireAdmin(requestAs(''), res), null)
  assert.equal(res.statusCode, 401)
})

test('staff cannot use owner-only routes', () => {
  const res = fakeRes()
  assert.equal(requireAdmin(requestAs('helper@example.com', 'POST'), res, {roles: ['owner']}), null)
  assert.equal(res.statusCode, 403)
  assert.equal(requireAdmin(requestAs('owner@example.com', 'POST'), fakeRes(), {roles: ['owner']}).role, 'owner')
})

test('a forged session cookie is rejected', () => {
  const req = requestAs('owner@example.com')
  req.headers.cookie = req.headers.cookie.replace(/.$/, (char) => char === 'A' ? 'B' : 'A')
  const res = fakeRes()
  assert.equal(requireAdmin(req, res), null)
  assert.equal(res.statusCode, 401)
})

test('removing someone from ADMIN_USERS revokes an existing session', () => {
  const req = requestAs('helper@example.com')
  const saved = process.env.ADMIN_USERS
  process.env.ADMIN_USERS = 'owner@example.com'
  const res = fakeRes()
  assert.equal(requireAdmin(req, res), null)
  assert.equal(res.statusCode, 403)
  process.env.ADMIN_USERS = saved
})

const TEMPLATE = `<head><title>Papa Jersey | Jersey Bola Original</title>
<meta name="description" content="Default" />
<meta property="og:type" content="website" />
<meta property="og:title" content="Default" />
<meta property="og:description" content="Default" />
<!--jersey-meta--></head>`

test('jersey page HTML carries its own preview tags, escaped', () => {
  const html = renderJerseyHtml(TEMPLATE, {
    jersey: {name: 'Persija "Home" <2025>', team: 'Persija', season: '2025/26', version: 'fan', price: 400000},
    shopName: 'Papa Jersey',
    pageUrl: 'https://papajersey.id/jersey/persija',
    imageUrl: 'https://cdn.sanity.io/x.jpg',
  })
  assert.match(html, /<title>Persija &quot;Home&quot; &lt;2025&gt; \(Fan\) \| Papa Jersey<\/title>/)
  assert.match(html, /og:type" content="product"/)
  assert.match(html, /og:image" content="https:\/\/cdn.sanity.io\/x.jpg"/)
  assert.match(html, /og:description" content="Rp 400.000 · Persija · 2025\/26/)
  assert.ok(!html.includes('<2025>'))
})

test('not-found HTML is marked noindex', () => {
  assert.match(renderNotFoundHtml(TEMPLATE, 'Papa Jersey'), /noindex/)
})

test('preview image is a square JPEG from the Sanity CDN', () => {
  assert.equal(
    cdnImageUrl({asset: {_ref: 'image-abc-800x1000-webp'}}, {projectId: 'p1', dataset: 'production'}),
    'https://cdn.sanity.io/images/p1/production/abc-800x1000.webp?w=800&h=800&fit=crop&fm=jpg&q=80',
  )
})
