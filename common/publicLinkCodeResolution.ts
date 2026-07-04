import {
  defaultRawContentType,
  defaultRawStatusCode,
  LinkCodeDetailsValidationError,
  normalizeRawContentType,
  normalizeRawStatusCode,
  normalizeRedirectUrl
} from './linkCodeDetails.ts'
import type { LinkCodeResponseMode, LinkCodeStatus } from './linkCodeTypes.ts'

export type PublicLinkCodeResolverRow = {
  raw_content: string | null
  raw_content_type?: string | null
  raw_status_code?: number | null
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
    contentType: string
    responseMode: 'raw_content'
    statusCode: number
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

const normalizeStoredRawContentType = (contentType: string | null | undefined) => (
  contentType === null || contentType === undefined
    ? defaultRawContentType
    : defaultOnStoredValidationError(
      () => normalizeRawContentType(contentType),
      defaultRawContentType
    )
)

const normalizeStoredRawStatusCode = (statusCode: number | null | undefined) => (
  statusCode === null || statusCode === undefined
    ? defaultRawStatusCode
    : defaultOnStoredValidationError(
      () => normalizeRawStatusCode(statusCode),
      defaultRawStatusCode
    )
)

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

  return row.raw_content === null
    ? undefined
    : {
      body: row.raw_content,
      contentType: normalizeStoredRawContentType(row.raw_content_type),
      responseMode: row.response_mode,
      statusCode: normalizeStoredRawStatusCode(row.raw_status_code)
    }
}
