import { describe, expect, it } from 'vitest'
import {
  resolvePublicLinkCodeRow,
  type PublicLinkCodeResolverRow
} from '../../../common/publicLinkCodeResolution'

const activeRawContentRow = (overrides: Partial<PublicLinkCodeResolverRow> = {}): PublicLinkCodeResolverRow => ({
  raw_response_message: 'HTTP/1.1 202 Accepted\nContent-Type: text/html; charset=utf-8\nX-Test: yes\n\nHello',
  redirect_url: null,
  response_mode: 'raw_content',
  status: 'active',
  ...overrides
})

describe('public Link Code resolution', () => {
  it('resolves active raw-content rows to raw HTTP response metadata', () => {
    expect(resolvePublicLinkCodeRow(activeRawContentRow())).toEqual({
      body: 'Hello',
      headers: [
        ['Content-Type', 'text/html; charset=utf-8'],
        ['X-Test', 'yes']
      ],
      responseMode: 'raw_content',
      status: 202,
      statusText: 'Accepted'
    })
  })

  it('does not serve invalid stored raw response messages', () => {
    expect(resolvePublicLinkCodeRow(activeRawContentRow({
      raw_response_message: 'HTTP/1.1 200 OK\nBad header\n\nHello'
    }))).toBeUndefined()
  })

  it('does not serve raw content for redirect, inactive, or unconfigured rows', () => {
    expect(resolvePublicLinkCodeRow(activeRawContentRow({
      raw_response_message: 'HTTP/1.1 200 OK\nContent-Type: text/plain\n\nstale content',
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
      raw_response_message: null
    }))).toBeUndefined()
  })
})
