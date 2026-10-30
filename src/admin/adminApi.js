export async function adminRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body && typeof options.body === 'string' ? {'Content-Type': 'application/json'} : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 401) window.location.assign('/admin/login')
  if (!response.ok) throw new Error(data.error || 'Terjadi kesalahan.')
  return data
}

const MAX_EDGE = 1600

/** Shrinks a photo in the browser (longest side 1600px, WebP or JPEG) so uploads stay small and fast. */
export async function shrinkImage(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const toBlob = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, 0.85))
  // Some older Safari versions return a PNG when asked for WebP; fall back to JPEG then.
  let blob = await toBlob('image/webp')
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg')
  return blob
}

export async function uploadImage(file) {
  const blob = await shrinkImage(file)
  const {asset} = await adminRequest('/api/admin/upload', {
    method: 'POST',
    headers: {'Content-Type': blob.type, 'X-File-Name': encodeURIComponent(file.name)},
    body: blob,
  })
  return {_type: 'image', _key: Math.random().toString(36).slice(2, 10), asset: {_type: 'reference', _ref: asset._id}}
}
