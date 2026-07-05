export const defaultRawResponseMessage = 'HTTP/1.1 200 OK\nContent-Type: text/plain; charset=utf-8\n\n'

const minimumFetchStatusCode = 200
const maximumFetchStatusCode = 599
const bodylessStatusCodes = new Set([204, 205, 304])
const headerNamePattern = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/
const statusLinePattern = /^HTTP\/1\.[01] ([0-9]{3})(?: ([\t\x20-\x7e]*))?$/
const forbiddenHeaderNames = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'set-cookie',
  'set-cookie2',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
])

export type ParsedRawResponseMessage = {
  body: string
  headers: [string, string][]
  status: number
  statusText: string
}

export class RawResponseMessageValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RawResponseMessageValidationError'
  }
}

const validationError = (message: string) => new RawResponseMessageValidationError(message)

const byteLength = (value: string) => new TextEncoder().encode(value).length

const separatorMatch = (message: string) => message.match(/\r?\n\r?\n/)

const parseStatusLine = (line: string) => {
  const match = line.match(statusLinePattern)

  if (!match) {
    throw validationError('Start the raw response message with a status line like HTTP/1.1 200 OK.')
  }

  const status = Number(match[1])

  if (status < minimumFetchStatusCode || status > maximumFetchStatusCode) {
    throw validationError('Raw response status must be an integer from 200 to 599.')
  }

  return {
    status,
    statusText: match[2] ?? ''
  }
}

const parseHeaders = (lines: string[]) => {
  const headers: [string, string][] = []
  let contentLength: number | undefined

  for (const line of lines) {
    const separatorIndex = line.indexOf(':')

    if (separatorIndex <= 0) {
      throw validationError('Raw response headers must use "Name: value" lines.')
    }

    const name = line.slice(0, separatorIndex)
    const value = line.slice(separatorIndex + 1).trim()
    const normalizedName = name.toLowerCase()

    if (!headerNamePattern.test(name)) {
      throw validationError('Raw response header names can only contain valid HTTP token characters.')
    }

    if (forbiddenHeaderNames.has(normalizedName)) {
      throw validationError(`Raw response header "${name}" is not supported.`)
    }

    if (normalizedName === 'content-length') {
      if (contentLength !== undefined || !/^[0-9]+$/.test(value)) {
        throw validationError('Raw response Content-Length must be a single non-negative integer.')
      }

      contentLength = Number(value)
    }

    headers.push([name, value])
  }

  return {
    contentLength,
    headers
  }
}

export const parseRawResponseMessage = (message: string): ParsedRawResponseMessage => {
  const match = separatorMatch(message)

  if (!match || match.index === undefined) {
    throw validationError('Raw response message must include a blank line between headers and body.')
  }

  const head = message.slice(0, match.index)
  const body = message.slice(match.index + match[0].length)

  if (head.includes('\r') && !head.includes('\r\n')) {
    throw validationError('Raw response message header lines must use LF or CRLF line endings.')
  }

  const [statusLine, ...headerLines] = head.split(/\r?\n/)
  const { status, statusText } = parseStatusLine(statusLine)
  const { contentLength, headers } = parseHeaders(headerLines)

  if (bodylessStatusCodes.has(status) && body.length > 0) {
    throw validationError('Raw response body must be empty for 204, 205, and 304 statuses.')
  }

  if (contentLength !== undefined && contentLength !== byteLength(body)) {
    throw validationError('Raw response Content-Length must match the UTF-8 body byte length.')
  }

  try {
    const responseBody = bodylessStatusCodes.has(status) ? null : body
    new Response(responseBody, { headers, status, statusText })
  } catch {
    throw validationError('Raw response message is not supported by the Fetch Response API.')
  }

  return {
    body,
    headers,
    status,
    statusText
  }
}

export const normalizeRawResponseMessage = (message: string) => {
  parseRawResponseMessage(message)

  return message
}
