export const defaultRawContentType = 'text/plain; charset=utf-8'
export const defaultRawStatusCode = 200
export const maximumHttpStatusCode = 599
export const minimumHttpStatusCode = 100

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
  displayName: string
  id: string
  responseConfig: ResponseConfig
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

const normalizeRawContentType = (contentType: string) => {
  const normalizedContentType = contentType.trim() || defaultRawContentType

  if (/[\r\n]/.test(normalizedContentType)) {
    throw validationError('Content type cannot contain line breaks.')
  }

  return normalizedContentType
}

const normalizeRawStatusCode = (statusCode: number) => {
  if (
    !Number.isInteger(statusCode)
    || statusCode < minimumHttpStatusCode
    || statusCode > maximumHttpStatusCode
  ) {
    throw validationError('Status code must be an integer from 100 to 599.')
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

export const normalizeLinkCodeDetails = ({
  displayName,
  id,
  responseConfig
}: LinkCodeDetailsParams): LinkCodeDetailsParams => {
  const normalizedId = id.trim()
  const normalizedDisplayName = normalizeLinkCodeDisplayName(displayName)

  if (!normalizedId) {
    throw validationError('Choose a Link Code to edit.')
  }

  if (!normalizedDisplayName) {
    throw validationError('Enter a Link Code name.')
  }

  return {
    displayName: normalizedDisplayName,
    id: normalizedId,
    responseConfig: normalizeResponseConfig(responseConfig)
  }
}
