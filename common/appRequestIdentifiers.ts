export const appRequestIdentifiers = {
  createLinkCode: 'createLinkCode',
  deleteLinkCode: 'deleteLinkCode',
  loadLinkCodes: 'loadLinkCodes',
  updateLinkCodeDetails: 'updateLinkCodeDetails'
} as const

export const appRequestNames = Object.values(appRequestIdentifiers)

export type AppRequestIdentifier = typeof appRequestNames[number]
