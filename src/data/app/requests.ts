import { appRequestIdentifiers } from '../../../common/appRequestIdentifiers'
import type { CreateLinkCodeParams, LinkCodeSummary, LinkCodesState } from '../../../common/linkCodeTypes'
import { createCommandType, createQueryType } from '../../../lib/dispatch/dispatch'

export const CreateLinkCodeCommand = createCommandType(appRequestIdentifiers.createLinkCode)<LinkCodeSummary, CreateLinkCodeParams>()
export const LoadLinkCodesQuery = createQueryType(appRequestIdentifiers.loadLinkCodes)<LinkCodesState>()

export const appRequestTypes = [
  CreateLinkCodeCommand,
  LoadLinkCodesQuery
]
