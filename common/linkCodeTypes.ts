export type LinkCodeResponseMode = 'redirect' | 'raw_content'

export const linkCodeStatuses = ['draft', 'active', 'disabled'] as const

export type LinkCodeStatus = typeof linkCodeStatuses[number]

export const isLinkCodeStatus = (value: unknown): value is LinkCodeStatus => (
  typeof value === 'string' && linkCodeStatuses.includes(value as LinkCodeStatus)
)

export type LinkCodeRedirectResponseConfig = {
  mode: 'redirect'
  redirectUrl: string
}

export type LinkCodeRawContentResponseConfig = {
  content: string
  contentType: string
  mode: 'raw_content'
  statusCode: number
}

export type LinkCodeResponseConfig = LinkCodeRedirectResponseConfig | LinkCodeRawContentResponseConfig

export type LinkCodeSummary = {
  id: string
  displayName: string
  code: string
  responseConfig: LinkCodeResponseConfig
  responseMode: LinkCodeResponseMode
  status: LinkCodeStatus
  createdDate: string
}

export type LinkCodeCapabilities = {
  canEditCustomLinkCodes: boolean
}

export type LinkCodesState = {
  capabilities: LinkCodeCapabilities
  linkCodes: LinkCodeSummary[]
}

export type CreateLinkCodeParams = {
  displayName: string
}

export type DeleteLinkCodeParams = {
  id: string
}

export type DeletedLinkCode = {
  id: string
}

export type UpdateLinkCodeDetailsParams = {
  code?: string
  displayName: string
  id: string
  responseConfig: LinkCodeResponseConfig
  status: LinkCodeStatus
}
