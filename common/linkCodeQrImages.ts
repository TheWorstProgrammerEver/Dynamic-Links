import { createPublicLinkCodeUrl } from './linkCodePublicUrls.ts'

const etagVersion = 'public-link-code-qr-v1'
const textEncoder = new TextEncoder()

export const publicLinkCodeQrImageCacheControl = 'public, max-age=86400, stale-while-revalidate=604800'
export const publicLinkCodeQrImageContentType = 'image/png'

const bytesToHex = (bytes: Uint8Array) => (
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
)

const normalizeEntityTag = (value: string) => value.trim().replace(/^W\//i, '')

export const createPublicLinkCodeQrSourceUrl = (host: string, code: string) => (
  createPublicLinkCodeUrl(host, code)
)

export const createPublicLinkCodeQrEtag = async (sourceUrl: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    textEncoder.encode(`${etagVersion}:${sourceUrl}`)
  )

  return `"${etagVersion}-${bytesToHex(new Uint8Array(digest)).slice(0, 32)}"`
}

export const publicLinkCodeQrEtagMatches = (ifNoneMatch: string | null, etag: string) => (
  ifNoneMatch
    ?.split(',')
    .map(normalizeEntityTag)
    .some((candidate) => candidate === '*' || candidate === etag)
  ?? false
)
