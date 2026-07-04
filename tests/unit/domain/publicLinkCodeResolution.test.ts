import { describe, expect, it } from 'vitest'
import {
  defaultRawContentType,
  defaultRawStatusCode
} from '../../../common/linkCodeDetails'
import {
  resolvePublicLinkCodeRow,
  type PublicLinkCodeResolverRow
} from '../../../common/publicLinkCodeResolution'

const activeRawContentRow = (overrides: Partial<PublicLinkCodeResolverRow> = {}): PublicLinkCodeResolverRow => ({
  raw_content: 'Hello',
  raw_content_type: 'text/html; charset=utf-8',
  raw_status_code: 202,
  redirect_url: null,
  response_mode: 'raw_content',
  status: 'active',
  ...overrides
})

describe('public Link Code resolution', () => {
  it('resolves active raw-content rows to raw HTTP response metadata', () => {
    expect(resolvePublicLinkCodeRow(activeRawContentRow())).toEqual({
      body: 'Hello',
      contentType: 'text/html; charset=utf-8',
      responseMode: 'raw_content',
      statusCode: 202
    })
  })

  it('uses safe raw-content metadata defaults when optional metadata is absent', () => {
    expect(resolvePublicLinkCodeRow(activeRawContentRow({
      raw_content_type: undefined,
      raw_status_code: undefined
    }))).toEqual({
      body: 'Hello',
      contentType: defaultRawContentType,
      responseMode: 'raw_content',
      statusCode: defaultRawStatusCode
    })
  })

  it('does not serve raw content for redirect, inactive, or unconfigured rows', () => {
    expect(resolvePublicLinkCodeRow(activeRawContentRow({
      raw_content: 'stale content',
      redirect_url: 'https://example.com/target',
      response_mode: 'redirect'
    }))).toEqual({
      redirectUrl: 'https://example.com/target',
      responseMode: 'redirect'
    })

    expect(resolvePublicLinkCodeRow(activeRawContentRow({
      status: 'draft'
    }))).toBeUndefined()

    expect(resolvePublicLinkCodeRow(activeRawContentRow({
      raw_content: null
    }))).toBeUndefined()
  })
})
