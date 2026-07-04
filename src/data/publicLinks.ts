import { normalizePublicLinkCodeHost } from '../../common/linkCodePublicUrls'

const unresolvedPlaceholder = (value: string) => value.includes('#{')

export const getPublicLinkHost = () => {
  const configuredHost = window.config?.publicLinks?.host?.trim()
  const host = configuredHost && !unresolvedPlaceholder(configuredHost)
    ? configuredHost
    : window.location.origin

  return normalizePublicLinkCodeHost(host)
}
