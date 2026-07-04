import { appRequestIdentifiers } from '../../../common/appRequestIdentifiers'
import type { LinkCodesState } from '../../../common/linkCodeTypes'
import { createQueryType } from '../../../lib/dispatch/dispatch'

export const LoadLinkCodesQuery = createQueryType(appRequestIdentifiers.loadLinkCodes)<LinkCodesState>()

export const appRequestTypes = [
  LoadLinkCodesQuery
]
