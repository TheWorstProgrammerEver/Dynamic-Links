import { describe, expect, test } from 'vitest'
import {
  createPublicLinkCodePath,
  createPublicLinkCodeQrPath,
  createPublicLinkCodeQrUrl,
  createPublicLinkCodeUrl,
  normalizePublicLinkCodeHost,
  publicLinkCodeFromCanonicalPathname,
  publicLinkCodeFromQrPathname,
  publicLinkCodeFromQrResolverPathname,
  publicLinkCodeFromResolverPathname
} from '../../../common/linkCodePublicUrls'

describe('Link Code public URLs', () => {
  test('builds the canonical code path', () => {
    expect(createPublicLinkCodePath('abc123')).toBe('/code/abc123')
    expect(createPublicLinkCodePath('custom code')).toBe('/code/custom%20code')
  })

  test('builds public URLs from the configured host', () => {
    expect(createPublicLinkCodeUrl('https://links.example.com/', 'abc123'))
      .toBe('https://links.example.com/code/abc123')
  })

  test('builds public QR image URLs from the current code', () => {
    expect(createPublicLinkCodeQrPath('abc123')).toBe('/code/abc123/qr.png')
    expect(createPublicLinkCodeQrPath('custom code')).toBe('/code/custom%20code/qr.png')
    expect(createPublicLinkCodeQrUrl('https://links.example.com/', 'abc123'))
      .toBe('https://links.example.com/code/abc123/qr.png')
  })

  test('normalizes configured hosts without search or hash details', () => {
    expect(normalizePublicLinkCodeHost(' https://links.example.com/base/?draft=true#top '))
      .toBe('https://links.example.com/base')
  })

  test('parses canonical host-route paths', () => {
    expect(publicLinkCodeFromCanonicalPathname('/code/abc123')).toBe('abc123')
    expect(publicLinkCodeFromCanonicalPathname('/code/custom%20code')).toBe('custom code')
    expect(publicLinkCodeFromCanonicalPathname('/profile')).toBeUndefined()
    expect(publicLinkCodeFromCanonicalPathname('/code/')).toBeUndefined()
    expect(publicLinkCodeFromCanonicalPathname('/code/a/b')).toBeUndefined()
  })

  test('parses Supabase public resolver function paths', () => {
    expect(publicLinkCodeFromResolverPathname('/functions/v1/public-link-code/abc123')).toBe('abc123')
    expect(publicLinkCodeFromResolverPathname('/functions/v1/public-link-code/custom%20code')).toBe('custom code')
    expect(publicLinkCodeFromResolverPathname('/public-link-code/abc123')).toBe('abc123')
    expect(publicLinkCodeFromResolverPathname('/abc123')).toBe('abc123')
    expect(publicLinkCodeFromResolverPathname('/functions/v1/app/abc123')).toBeUndefined()
  })

  test('parses public QR image route paths', () => {
    expect(publicLinkCodeFromQrPathname('/code/abc123/qr.png')).toBe('abc123')
    expect(publicLinkCodeFromQrPathname('/code/custom%20code/qr.png')).toBe('custom code')
    expect(publicLinkCodeFromQrPathname('/code/abc123')).toBeUndefined()
    expect(publicLinkCodeFromQrPathname('/code/abc123/not-qr.png')).toBeUndefined()
    expect(publicLinkCodeFromQrPathname('/code/a/b/qr.png')).toBeUndefined()
  })

  test('parses Supabase public QR image function paths', () => {
    expect(publicLinkCodeFromQrResolverPathname('/functions/v1/public-link-code-qr/abc123/qr.png')).toBe('abc123')
    expect(publicLinkCodeFromQrResolverPathname('/functions/v1/public-link-code-qr/custom%20code/qr.png'))
      .toBe('custom code')
    expect(publicLinkCodeFromQrResolverPathname('/public-link-code-qr/abc123/qr.png')).toBe('abc123')
    expect(publicLinkCodeFromQrResolverPathname('/abc123/qr.png')).toBe('abc123')
    expect(publicLinkCodeFromQrResolverPathname('/functions/v1/public-link-code/abc123/qr.png')).toBeUndefined()
  })
})
