export const publicLinkCodePathPrefix = '/code'
export const publicLinkCodeFunctionName = 'public-link-code'
export const publicLinkCodeFunctionPathPrefix = `/functions/v1/${publicLinkCodeFunctionName}`
export const publicLinkCodeRuntimePathPrefix = `/${publicLinkCodeFunctionName}`

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

export const publicLinkCodeFromCanonicalPathname = (pathname: string) => (
  linkCodeFromPathname(pathname, publicLinkCodePathPrefix)
)

export const publicLinkCodeFromResolverPathname = (pathname: string) => (
  linkCodeFromPathname(pathname, publicLinkCodeFunctionPathPrefix)
    ?? linkCodeFromPathname(pathname, publicLinkCodeRuntimePathPrefix)
    ?? linkCodeFromPathname(pathname, '')
)
