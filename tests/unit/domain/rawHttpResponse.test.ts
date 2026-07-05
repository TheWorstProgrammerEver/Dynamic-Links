import { describe, expect, it } from 'vitest'
import {
  parseRawResponseMessage,
  RawResponseMessageValidationError
} from '../../../common/rawHttpResponse'

describe('raw HTTP response messages', () => {
  it('parses status, headers, and body from a response message', () => {
    expect(parseRawResponseMessage(
      'HTTP/1.1 203 Non-Authoritative Information\nContent-Type: text/plain\nX-Trace: abc\n\nHello'
    )).toEqual({
      body: 'Hello',
      headers: [
        ['Content-Type', 'text/plain'],
        ['X-Trace', 'abc']
      ],
      status: 203,
      statusText: 'Non-Authoritative Information'
    })
  })

  it('preserves body text exactly after the blank line', () => {
    expect(parseRawResponseMessage(
      'HTTP/1.0 200 OK\r\nContent-Type: text/plain\r\n\r\nLine 1\r\n\r\nLine 3\n'
    ).body).toBe('Line 1\r\n\r\nLine 3\n')
  })

  it('validates status line, headers, bodyless statuses, and content length', () => {
    expect(() => parseRawResponseMessage('200 OK\n\nHello')).toThrow(RawResponseMessageValidationError)
    expect(() => parseRawResponseMessage('HTTP/1.1 199 Early\n\nHello')).toThrow(/200 to 599/)
    expect(() => parseRawResponseMessage('HTTP/1.1 200 OK\nBad header\n\nHello')).toThrow(/Name: value/)
    expect(() => parseRawResponseMessage('HTTP/1.1 200 OK\nSet-Cookie: a=b\n\nHello')).toThrow(/not supported/)
    expect(() => parseRawResponseMessage('HTTP/1.1 204 No Content\n\nHello')).toThrow(/must be empty/)
    expect(() => parseRawResponseMessage('HTTP/1.1 200 OK\nContent-Length: 2\n\nHello')).toThrow(/Content-Length/)
  })
})
