import {
  LinkCodeDetailsValidationError,
  normalizeRedirectUrl
} from './linkCodeDetails.ts'
import { parseRawResponseMessage, RawResponseMessageValidationError } from './rawHttpResponse.ts'
import type { LinkCodeResponseMode, LinkCodeStatus } from './linkCodeTypes.ts'

export type PublicLinkCodeResolverRow = {
  raw_response_message: string | null
  redirect_url: string | null
  response_mode: LinkCodeResponseMode
  status: LinkCodeStatus
}

export type PublicLinkCodeResolution =
  | {
    redirectUrl: string
    responseMode: 'redirect'
  }
  | {
    body: string
    headers: [string, string][]
    responseMode: 'raw_content'
    status: number
    statusText: string
  }

const defaultOnStoredValidationError = <T>(readValue: () => T, defaultValue: T) => {
  try {
    return readValue()
  } catch (error) {
    if (error instanceof LinkCodeDetailsValidationError) {
      return defaultValue
    }

    throw error
  }
}

const normalizeStoredRedirectUrl = (redirectUrl: string | null) => {
  if (!redirectUrl?.trim()) {
    return undefined
  }

  return defaultOnStoredValidationError(
    () => normalizeRedirectUrl(redirectUrl),
    undefined
  )
}

const parseStoredRawResponseMessage = (message: string | null) => {
  if (message === null) {
    return undefined
  }

  try {
    return parseRawResponseMessage(message)
  } catch (error) {
    if (error instanceof RawResponseMessageValidationError) {
      return undefined
    }

    throw error
  }
}

export const resolvePublicLinkCodeRow = (
  row: PublicLinkCodeResolverRow
): PublicLinkCodeResolution | undefined => {
  if (row.status !== 'active') {
    return undefined
  }

  if (row.response_mode === 'redirect') {
    const redirectUrl = normalizeStoredRedirectUrl(row.redirect_url)

    return redirectUrl
      ? {
        redirectUrl,
        responseMode: row.response_mode
      }
      : undefined
  }

  const rawResponse = parseStoredRawResponseMessage(row.raw_response_message)

  return rawResponse === undefined
    ? undefined
    : {
      body: rawResponse.body,
      headers: rawResponse.headers,
      responseMode: row.response_mode,
      status: rawResponse.status,
      statusText: rawResponse.statusText
    }
}
