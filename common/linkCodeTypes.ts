export type LinkCodeResponseMode = 'redirect' | 'raw_content'

export type LinkCodeStatus = 'draft' | 'active' | 'disabled'

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

export type LinkCodesState = {
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
  displayName: string
  id: string
  responseConfig: LinkCodeResponseConfig
}
