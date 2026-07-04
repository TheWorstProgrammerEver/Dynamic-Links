import type { DeletedLinkCode, LinkCodesState, LinkCodeSummary } from '../types/linkCodes'

export const addCreatedLinkCode = (state: LinkCodesState, linkCode: LinkCodeSummary): LinkCodesState => ({
  ...state,
  linkCodes: [
    linkCode,
    ...state.linkCodes.filter((existingLinkCode) => existingLinkCode.id !== linkCode.id)
  ]
})

export const removeDeletedLinkCode = (state: LinkCodesState, deletedLinkCode: DeletedLinkCode): LinkCodesState => ({
  ...state,
  linkCodes: state.linkCodes.filter((linkCode) => linkCode.id !== deletedLinkCode.id)
})

export const replaceUpdatedLinkCode = (state: LinkCodesState, linkCode: LinkCodeSummary): LinkCodesState => ({
  ...state,
  linkCodes: state.linkCodes.map((currentLinkCode) => (
    currentLinkCode.id === linkCode.id ? linkCode : currentLinkCode
  ))
})
