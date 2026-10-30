import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filterAndSort,
  formatRupiah,
  isSizeAvailable,
  normalizeNameset,
  orderMessage,
  orderTotal,
  validateJerseyInput,
  validateStaffInput,
  whatsAppUrl,
} from '../src/lib/jersey.js'

const persija = {name: 'Persija Home 2025/26', slug: 'persija-home-2025-26-fan', team: 'Persija Jakarta', league: 'Liga 1', season: '2025/26', kitType: 'home', version: 'fan', price: 400000, namesetPrice: 50000, stock: {L: 2, M: 0}, createdAt: '2026-10-02'}
const arsenal = {name: 'Arsenal Away 2025/26', team: 'Arsenal', league: 'Premier League', season: '2025/26', kitType: 'away', version: 'player', price: 650000, stock: {}, createdAt: '2026-10-03'}
const retro = {name: 'Persija Retro 2001', team: 'Persija Jakarta', league: 'Liga 1', season: '2001', kitType: 'retro', version: 'fan', price: 300000, stock: {}, createdAt: '2026-10-01'}

test('order message matches the format in the PRD', () => {
  const message = orderMessage({
    shopName: 'Papa Jersey',
    jersey: persija,
    size: 'L',
    nameset: {name: 'RIZKY', number: '10'},
    pageUrl: 'https://papajersey.id/jersey/persija-home-2025-26-fan',
  })
  assert.equal(message, [
    'Halo Papa Jersey, saya mau pesan:',
    'Persija Home 2025/26 (Fan)',
    'Ukuran: L',
    'Nameset: RIZKY 10',
    'Total: Rp 450.000',
    'https://papajersey.id/jersey/persija-home-2025-26-fan',
  ].join('\n'))
})

test('order without nameset omits the line and the printing cost', () => {
  const message = orderMessage({shopName: 'Papa Jersey', jersey: persija, size: 'L', nameset: {name: '', number: ''}})
  assert.ok(!message.includes('Nameset'))
  assert.ok(message.endsWith('Total: Rp 400.000'))
})

test('nameset cost applies when only a number is printed', () => {
  assert.equal(orderTotal(persija, {name: '', number: '7'}), 450000)
})

test('WhatsApp URL strips formatting from the number and encodes the text', () => {
  assert.equal(whatsAppUrl('+62 812-3456', 'Halo\nUkuran: L'), 'https://wa.me/628123456?text=Halo%0AUkuran%3A%20L')
})

test('rupiah uses dot thousand separators', () => {
  assert.equal(formatRupiah(1250000), 'Rp 1.250.000')
  assert.equal(formatRupiah(0), 'Rp 0')
})

test('sold-out sizes are not available', () => {
  assert.equal(isSizeAvailable(persija, 'L'), true)
  assert.equal(isSizeAvailable(persija, 'M'), false)
  assert.equal(isSizeAvailable(persija, 'XS'), false)
})

test('nameset input is uppercased, cleaned and limited', () => {
  assert.deepEqual(normalizeNameset({name: 'rizky<script>', number: '1a23'}), {name: 'RIZKYSCRIPT', number: '12'})
})

test('filters combine and search matches team and season', () => {
  const all = [persija, arsenal, retro]
  assert.deepEqual(filterAndSort(all, {league: 'Liga 1'}).map((j) => j.name), ['Persija Home 2025/26', 'Persija Retro 2001'])
  assert.deepEqual(filterAndSort(all, {type: 'retro'}).map((j) => j.name), ['Persija Retro 2001'])
  assert.deepEqual(filterAndSort(all, {version: 'player'}).map((j) => j.name), ['Arsenal Away 2025/26'])
  assert.deepEqual(filterAndSort(all, {q: 'persija 2025'}).map((j) => j.name), ['Persija Home 2025/26'])
})

test('sorting by newest and by price', () => {
  const all = [persija, arsenal, retro]
  assert.deepEqual(filterAndSort(all, {}).map((j) => j.team), ['Arsenal', 'Persija Jakarta', 'Persija Jakarta'])
  assert.deepEqual(filterAndSort(all, {sort: 'price-asc'}).map((j) => j.price), [300000, 400000, 650000])
  assert.deepEqual(filterAndSort(all, {sort: 'price-desc'}).map((j) => j.price), [650000, 400000, 300000])
})

const validInput = {
  name: 'Persija Home 2025/26', team: 'Persija Jakarta', league: 'Liga 1', season: '2025/26',
  kitType: 'home', version: 'player', price: '650000', namesetPrice: '75000',
  images: [{_key: 'a', asset: {_ref: 'image-abc123-800x1000-jpg'}}],
  stock: {L: '3', M: '-2', XXL: '1.7', FOO: 5}, visible: true,
}

test('valid jersey input is normalised for storage', () => {
  const {jersey, errors} = validateJerseyInput(validInput)
  assert.equal(errors, undefined)
  assert.equal(jersey.slug.current, 'persija-home-2025-26-player')
  assert.equal(jersey.price, 650000)
  assert.deepEqual(jersey.stock, {XS: 0, S: 0, M: 0, L: 3, XL: 0, XXL: 1, '3XL': 0})
  assert.equal(jersey.images[0].asset._ref, 'image-abc123-800x1000-jpg')
  assert.equal(jersey.frontImage, undefined)
})

test('a visible jersey needs a photo and required fields', () => {
  const {errors} = validateJerseyInput({...validInput, images: [], team: '', price: 0})
  assert.ok(errors.some((error) => error.includes('foto')))
  assert.ok(errors.some((error) => error.includes('Tim')))
  assert.ok(errors.some((error) => error.includes('Harga')))
})

test('a hidden draft may be saved without photos', () => {
  const {errors} = validateJerseyInput({...validInput, images: [], visible: false})
  assert.equal(errors, undefined)
})

test('invalid image references are dropped', () => {
  const {jersey} = validateJerseyInput({...validInput, visible: false, images: [{asset: {_ref: 'https://evil.example/x.jpg'}}]})
  assert.deepEqual(jersey.images, [])
})

test('staff input only carries stock and visibility', () => {
  assert.deepEqual(Object.keys(validateStaffInput({price: 1, name: 'x', stock: {L: 2}, visible: 1})).sort(), ['stock', 'visible'])
})
