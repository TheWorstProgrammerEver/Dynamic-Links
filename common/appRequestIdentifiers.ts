export const appRequestIdentifiers = {
  createLinkCode: 'createLinkCode',
  loadLinkCodes: 'loadLinkCodes'
} as const

export const appRequestNames = Object.values(appRequestIdentifiers)

export type AppRequestIdentifier = typeof appRequestNames[number]
