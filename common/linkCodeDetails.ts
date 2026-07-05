import { LinkCodeCodeValidationError, normalizeLinkCodeCode } from './linkCodeCodes.ts'
import { isLinkCodeStatus, type LinkCodeStatus } from './linkCodeTypes.ts'

export const defaultRawContentType = 'text/plain; charset=utf-8'
export const defaultRawStatusCode = 200
export const maximumHttpStatusCode = 599
export const minimumHttpStatusCode = 200
const bodylessRawStatusCodes = new Set([204, 205, 304])

type RedirectResponseConfig = {
  mode: 'redirect'
  redirectUrl: string
}

type RawContentResponseConfig = {
  content: string
  contentType: string
  mode: 'raw_content'
  statusCode: number
}

type ResponseConfig = RedirectResponseConfig | RawContentResponseConfig

type LinkCodeDetailsParams = {
  code?: string
  displayName: string
  id: string
  responseConfig: ResponseConfig
  status: LinkCodeStatus
}

export class LinkCodeDetailsValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LinkCodeDetailsValidationError'
  }
}

const validationError = (message: string) => new LinkCodeDetailsValidationError(message)

export const normalizeLinkCodeDisplayName = (displayName: string) => displayName.trim()

export const normalizeRedirectUrl = (redirectUrl: string) => {
  const trimmedRedirectUrl = redirectUrl.trim()

  if (!trimmedRedirectUrl) {
    throw validationError('Enter a redirect URL.')
  }

  if (/[\r\n]/.test(trimmedRedirectUrl)) {
    throw validationError('Redirect URL cannot contain line breaks.')
  }

  let parsedUrl: URL

  try {
    parsedUrl = new URL(trimmedRedirectUrl)
  } catch {
    throw validationError('Enter a valid redirect URL.')
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw validationError('Redirect URLs must start with http:// or https://.')
  }

  return parsedUrl.href
}

export const normalizeRawContentType = (contentType: string) => {
  const normalizedContentType = contentType.trim() || defaultRawContentType

  if (/[\r\n]/.test(normalizedContentType)) {
    throw validationError('Content type cannot contain line breaks.')
  }

  return normalizedContentType
}

export const normalizeRawStatusCode = (statusCode: number) => {
  if (
    !Number.isInteger(statusCode)
    || statusCode < minimumHttpStatusCode
    || statusCode > maximumHttpStatusCode
    || bodylessRawStatusCodes.has(statusCode)
  ) {
    throw validationError('Status code must be an integer from 200 to 599 that allows a response body.')
  }

  return statusCode
}

const normalizeResponseConfig = (responseConfig: ResponseConfig): ResponseConfig => {
  if (responseConfig.mode === 'redirect') {
    return {
      mode: 'redirect',
      redirectUrl: normalizeRedirectUrl(responseConfig.redirectUrl)
    } satisfies RedirectResponseConfig
  }

  return {
    content: responseConfig.content,
    contentType: normalizeRawContentType(responseConfig.contentType),
    mode: 'raw_content',
    statusCode: normalizeRawStatusCode(responseConfig.statusCode)
  } satisfies RawContentResponseConfig
}

const normalizeOptionalLinkCodeCode = (code?: string) => {
  if (code === undefined) {
    return undefined
  }

  try {
    return normalizeLinkCodeCode(code)
  } catch (error) {
    if (error instanceof LinkCodeCodeValidationError) {
      throw validationError(error.message)
    }

    throw error
  }
}

export const normalizeLinkCodeStatus = (status: unknown) => {
  if (!isLinkCodeStatus(status)) {
    throw validationError('Choose Draft, Active, or Disabled status.')
  }

  return status
}

export const normalizeLinkCodeDetails = ({
  code,
  displayName,
  id,
  responseConfig,
  status
}: LinkCodeDetailsParams): LinkCodeDetailsParams => {
  const normalizedId = id.trim()
  const normalizedDisplayName = normalizeLinkCodeDisplayName(displayName)

  if (!normalizedId) {
    throw validationError('Choose a Link Code to edit.')
  }

  if (!normalizedDisplayName) {
    throw validationError('Enter a Link Code name.')
  }

  const normalizedCode = normalizeOptionalLinkCodeCode(code)

  return {
    ...(normalizedCode === undefined ? {} : { code: normalizedCode }),
    displayName: normalizedDisplayName,
    id: normalizedId,
    responseConfig: normalizeResponseConfig(responseConfig),
    status: normalizeLinkCodeStatus(status)
  }
}
