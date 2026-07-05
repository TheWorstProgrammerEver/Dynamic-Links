import { LinkCodeCodeValidationError, normalizeLinkCodeCode } from './linkCodeCodes.ts'
import { isLinkCodeStatus, type LinkCodeStatus } from './linkCodeTypes.ts'
import { normalizeRawResponseMessage, RawResponseMessageValidationError } from './rawHttpResponse.ts'

type RedirectResponseConfig = {
  mode: 'redirect'
  redirectUrl: string
}

type RawContentResponseConfig = {
  mode: 'raw_content'
  responseMessage: string
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

const normalizeResponseConfig = (responseConfig: ResponseConfig): ResponseConfig => {
  if (responseConfig.mode === 'redirect') {
    return {
      mode: 'redirect',
      redirectUrl: normalizeRedirectUrl(responseConfig.redirectUrl)
    } satisfies RedirectResponseConfig
  }

  try {
    return {
      mode: 'raw_content',
      responseMessage: normalizeRawResponseMessage(responseConfig.responseMessage)
    } satisfies RawContentResponseConfig
  } catch (error) {
    if (error instanceof RawResponseMessageValidationError) {
      throw validationError(error.message)
    }

    throw error
  }
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
