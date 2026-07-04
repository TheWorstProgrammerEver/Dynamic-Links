export const minimumGeneratedLinkCodeLength = 8
export const defaultGeneratedLinkCodeLength = 10
export const linkCodeAlphabet = '23456789abcdefghijkmnpqrstuvwxyz'
export const defaultLinkCodeCreationAttempts = 5

type RandomBytes = (bytes: Uint8Array<ArrayBuffer>) => void

type GenerateRandomLinkCodeOptions = {
  length?: number
  randomBytes?: RandomBytes
}

export type GeneratedLinkCodeAttempt = {
  code: string
  displayName: string
}

type CreateLinkCodeWithRandomCodeOptions<TResult> = {
  displayName: string
  generateCode?: () => string
  insert: (attempt: GeneratedLinkCodeAttempt) => Promise<TResult>
  isCodeCollisionError: (error: unknown) => boolean
  maxAttempts?: number
}

export class LinkCodeValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LinkCodeValidationError'
  }
}

export class LinkCodeCollisionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LinkCodeCollisionError'
  }
}

const fillCryptoRandomBytes: RandomBytes = (bytes) => {
  const crypto = globalThis.crypto

  if (!crypto?.getRandomValues) {
    throw new Error('Crypto random values are unavailable.')
  }

  crypto.getRandomValues(bytes)
}

export const normalizeLinkCodeDisplayName = (displayName: string) => displayName.trim()

export const generateRandomLinkCode = ({
  length = defaultGeneratedLinkCodeLength,
  randomBytes = fillCryptoRandomBytes
}: GenerateRandomLinkCodeOptions = {}) => {
  if (!Number.isInteger(length) || length < minimumGeneratedLinkCodeLength) {
    throw new Error(`Generated Link Codes must be at least ${minimumGeneratedLinkCodeLength} characters long.`)
  }

  const bytes = new Uint8Array(new ArrayBuffer(length))
  randomBytes(bytes)

  return Array.from(bytes, (byte) => linkCodeAlphabet[byte % linkCodeAlphabet.length]).join('')
}

export const createLinkCodeWithRandomCode = async <TResult>({
  displayName,
  generateCode = generateRandomLinkCode,
  insert,
  isCodeCollisionError,
  maxAttempts = defaultLinkCodeCreationAttempts
}: CreateLinkCodeWithRandomCodeOptions<TResult>) => {
  const normalizedDisplayName = normalizeLinkCodeDisplayName(displayName)

  if (!normalizedDisplayName) {
    throw new LinkCodeValidationError('Link Code name is required.')
  }

  for (let attempt = 0; attempt < Math.max(1, maxAttempts); attempt += 1) {
    try {
      return await insert({
        code: generateCode(),
        displayName: normalizedDisplayName
      })
    } catch (error) {
      if (!isCodeCollisionError(error)) {
        throw error
      }
    }
  }

  throw new LinkCodeCollisionError('Could not create a unique Link Code. Please try again.')
}
