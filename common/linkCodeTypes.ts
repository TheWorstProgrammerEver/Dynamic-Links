export type LinkCodeResponseMode = 'redirect' | 'raw_content'

export type LinkCodeStatus = 'draft' | 'active' | 'disabled'

export type LinkCodeSummary = {
  id: string
  displayName: string
  code: string
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
