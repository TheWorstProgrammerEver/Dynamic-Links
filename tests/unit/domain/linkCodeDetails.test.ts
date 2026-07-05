import { describe, expect, it } from 'vitest'
import {
  LinkCodeDetailsValidationError,
  normalizeLinkCodeDetails
} from '../../../common/linkCodeDetails'

describe('Link Code details', () => {
  it('trims names and normalizes redirect URLs', () => {
    expect(normalizeLinkCodeDetails({
      code: ' go ',
      displayName: ' Launch page ',
      id: ' link-code-id ',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: ' https://example.com/launch '
      },
      status: 'active'
    })).toEqual({
      code: 'go',
      displayName: 'Launch page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com/launch'
      },
      status: 'active'
    })
  })

  it('rejects blank names and missing Link Codes', () => {
    expect(() => normalizeLinkCodeDetails({
      displayName: ' ',
      id: 'link-code-id',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com'
      },
      status: 'draft'
    })).toThrow(LinkCodeDetailsValidationError)

    expect(() => normalizeLinkCodeDetails({
      displayName: 'Launch page',
      id: ' ',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com'
      },
      status: 'draft'
    })).toThrow(LinkCodeDetailsValidationError)
  })

  it('requires http or https redirect URLs', () => {
    expect(() => normalizeLinkCodeDetails({
      displayName: 'Launch page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'not a url'
      },
      status: 'draft'
    })).toThrow(/valid redirect URL/)

    expect(() => normalizeLinkCodeDetails({
      displayName: 'Launch page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'javascript:alert(1)'
      },
      status: 'draft'
    })).toThrow(/http/)

    expect(() => normalizeLinkCodeDetails({
      displayName: 'Launch page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com/\r\nx-extra: value'
      },
      status: 'draft'
    })).toThrow(/line breaks/)
  })

  it('validates custom Link Code strings when present', () => {
    expect(() => normalizeLinkCodeDetails({
      code: 'bad code',
      displayName: 'Launch page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com'
      },
      status: 'draft'
    })).toThrow(/letters, numbers/)
  })

  it('validates Link Code status', () => {
    expect(() => normalizeLinkCodeDetails({
      displayName: 'Launch page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com'
      },
      status: 'published' as never
    })).toThrow(/Draft, Active, or Disabled/)
  })

  it('validates raw response messages', () => {
    expect(normalizeLinkCodeDetails({
      displayName: 'Content page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'raw_content',
        responseMessage: 'HTTP/1.1 202 Accepted\nContent-Type: text/plain\n\nHello'
      },
      status: 'disabled'
    })).toEqual({
      displayName: 'Content page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'raw_content',
        responseMessage: 'HTTP/1.1 202 Accepted\nContent-Type: text/plain\n\nHello'
      },
      status: 'disabled'
    })
  })

  it('rejects invalid raw response messages', () => {
    expect(() => normalizeLinkCodeDetails({
      displayName: 'Content page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'raw_content',
        responseMessage: 'HTTP/1.1 199 Early\nContent-Type: text/plain\n\nHello'
      },
      status: 'draft'
    })).toThrow(/200 to 599/)

    expect(() => normalizeLinkCodeDetails({
      displayName: 'Content page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'raw_content',
        responseMessage: 'HTTP/1.1 204 No Content\nContent-Type: text/plain\n\nHello'
      },
      status: 'draft'
    })).toThrow(/must be empty/)

    expect(() => normalizeLinkCodeDetails({
      displayName: 'Content page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'raw_content',
        responseMessage: 'HTTP/1.1 200 OK\nBad header\n\nHello'
      },
      status: 'draft'
    })).toThrow(/Name: value/)
  })
})
