export const publicLinkCodePathPrefix = '/code'
export const publicLinkCodeFunctionName = 'public-link-code'
export const publicLinkCodeFunctionPathPrefix = `/functions/v1/${publicLinkCodeFunctionName}`
export const publicLinkCodeRuntimePathPrefix = `/${publicLinkCodeFunctionName}`
export const publicLinkCodeQrFunctionName = 'public-link-code-qr'
export const publicLinkCodeQrFunctionPathPrefix = `/functions/v1/${publicLinkCodeQrFunctionName}`
export const publicLinkCodeQrRuntimePathPrefix = `/${publicLinkCodeQrFunctionName}`
const publicLinkCodeQrPathSuffix = '/qr.png'

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '')

const normalizeLinkCode = (code: string) => {
  const normalizedCode = code.trim()

  if (!normalizedCode) {
    throw new Error('Link Code is required.')
  }

  return normalizedCode
}

export const normalizePublicLinkCodeHost = (host: string) => {
  const normalizedHost = host.trim()

  if (!normalizedHost) {
    throw new Error('Public Link Code host is required.')
  }

  const parsedHost = new URL(normalizedHost)
  parsedHost.hash = ''
  parsedHost.search = ''

  return trimTrailingSlashes(parsedHost.href)
}

export const createPublicLinkCodePath = (code: string) => (
  `${publicLinkCodePathPrefix}/${encodeURIComponent(normalizeLinkCode(code))}`
)

export const createPublicLinkCodeUrl = (host: string, code: string) => (
  `${normalizePublicLinkCodeHost(host)}${createPublicLinkCodePath(code)}`
)

export const createPublicLinkCodeQrPath = (code: string) => (
  `${createPublicLinkCodePath(code)}${publicLinkCodeQrPathSuffix}`
)

export const createPublicLinkCodeQrUrl = (host: string, code: string) => (
  `${normalizePublicLinkCodeHost(host)}${createPublicLinkCodeQrPath(code)}`
)

const linkCodeFromPathname = (pathname: string, pathPrefix: string) => {
  const pathWithSeparator = `${pathPrefix}/`

  if (!pathname.startsWith(pathWithSeparator)) {
    return undefined
  }

  const encodedCode = pathname.slice(pathWithSeparator.length)

  if (!encodedCode || encodedCode.includes('/')) {
    return undefined
  }

  try {
    const code = decodeURIComponent(encodedCode)

    return code.length > 0 ? code : undefined
  } catch {
    return undefined
  }
}

const linkCodeFromQrPathname = (pathname: string, pathPrefix: string) => {
  const pathWithSeparator = `${pathPrefix}/`

  if (!pathname.startsWith(pathWithSeparator) || !pathname.endsWith(publicLinkCodeQrPathSuffix)) {
    return undefined
  }

  const encodedCode = pathname.slice(
    pathWithSeparator.length,
    -publicLinkCodeQrPathSuffix.length
  )

  if (!encodedCode || encodedCode.includes('/')) {
    return undefined
  }

  try {
    const code = decodeURIComponent(encodedCode)

    return code.length > 0 ? code : undefined
  } catch {
    return undefined
  }
}

export const publicLinkCodeFromCanonicalPathname = (pathname: string) => (
  linkCodeFromPathname(pathname, publicLinkCodePathPrefix)
)

export const publicLinkCodeFromResolverPathname = (pathname: string) => (
  linkCodeFromPathname(pathname, publicLinkCodeFunctionPathPrefix)
    ?? linkCodeFromPathname(pathname, publicLinkCodeRuntimePathPrefix)
    ?? linkCodeFromPathname(pathname, '')
)

export const publicLinkCodeFromQrPathname = (pathname: string) => (
  linkCodeFromQrPathname(pathname, publicLinkCodePathPrefix)
)

export const publicLinkCodeFromQrResolverPathname = (pathname: string) => (
  linkCodeFromQrPathname(pathname, publicLinkCodeQrFunctionPathPrefix)
    ?? linkCodeFromQrPathname(pathname, publicLinkCodeQrRuntimePathPrefix)
    ?? linkCodeFromQrPathname(pathname, '')
)
