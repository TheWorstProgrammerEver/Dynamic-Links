export const supportedCustomLinkCodeCharacters = 'letters, numbers, periods, hyphens, underscores, and tildes'
export const customLinkCodePattern = /^[A-Za-z0-9._~-]+$/

export class LinkCodeCodeValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LinkCodeCodeValidationError'
  }
}

export const normalizeLinkCodeCode = (code: string) => {
  const normalizedCode = code.trim()

  if (!normalizedCode) {
    throw new LinkCodeCodeValidationError('Enter a Link Code.')
  }

  if (!customLinkCodePattern.test(normalizedCode)) {
    throw new LinkCodeCodeValidationError(`Link Codes can only use ${supportedCustomLinkCodeCharacters}.`)
  }

  return normalizedCode
}

export const isLinkCodeCodeConflictError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as { code?: unknown; details?: unknown; message?: unknown }
  const message = [candidate.message, candidate.details]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')

  return candidate.code === '23505'
    && (/link_codes_code_key/i.test(message) || (/duplicate key/i.test(message) && /\bcode\b/i.test(message)))
}
