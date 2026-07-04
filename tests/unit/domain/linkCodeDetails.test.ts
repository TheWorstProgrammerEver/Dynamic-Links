import { describe, expect, it } from 'vitest'
import {
  defaultRawContentType,
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
      }
    })).toEqual({
      code: 'go',
      displayName: 'Launch page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com/launch'
      }
    })
  })

  it('rejects blank names and missing Link Codes', () => {
    expect(() => normalizeLinkCodeDetails({
      displayName: ' ',
      id: 'link-code-id',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com'
      }
    })).toThrow(LinkCodeDetailsValidationError)

    expect(() => normalizeLinkCodeDetails({
      displayName: 'Launch page',
      id: ' ',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com'
      }
    })).toThrow(LinkCodeDetailsValidationError)
  })

  it('requires http or https redirect URLs', () => {
    expect(() => normalizeLinkCodeDetails({
      displayName: 'Launch page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'not a url'
      }
    })).toThrow(/valid redirect URL/)

    expect(() => normalizeLinkCodeDetails({
      displayName: 'Launch page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'javascript:alert(1)'
      }
    })).toThrow(/http/)

    expect(() => normalizeLinkCodeDetails({
      displayName: 'Launch page',
      id: 'link-code-id',
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com/\r\nx-extra: value'
      }
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
      }
    })).toThrow(/letters, numbers/)
  })

  it('normalizes raw content metadata', () => {
    expect(normalizeLinkCodeDetails({
      displayName: 'Content page',
      id: 'link-code-id',
      responseConfig: {
        content: 'Hello',
        contentType: ' ',
        mode: 'raw_content',
        statusCode: 202
      }
    })).toEqual({
      displayName: 'Content page',
      id: 'link-code-id',
      responseConfig: {
        content: 'Hello',
        contentType: defaultRawContentType,
        mode: 'raw_content',
        statusCode: 202
      }
    })
  })

  it('validates raw content HTTP metadata', () => {
    expect(() => normalizeLinkCodeDetails({
      displayName: 'Content page',
      id: 'link-code-id',
      responseConfig: {
        content: 'Hello',
        contentType: 'text/plain',
        mode: 'raw_content',
        statusCode: 99
      }
    })).toThrow(/100 to 599/)

    expect(() => normalizeLinkCodeDetails({
      displayName: 'Content page',
      id: 'link-code-id',
      responseConfig: {
        content: 'Hello',
        contentType: 'text/plain\r\nx-extra: value',
        mode: 'raw_content',
        statusCode: 200
      }
    })).toThrow(/line breaks/)
  })
})
