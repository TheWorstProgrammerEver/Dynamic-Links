import { appRequestIdentifiers } from '../../../common/appRequestIdentifiers'
import type {
  CreateLinkCodeParams,
  DeletedLinkCode,
  DeleteLinkCodeParams,
  LinkCodeSummary,
  LinkCodesState,
  UpdateLinkCodeDetailsParams
} from '../../../common/linkCodeTypes'
import { createCommandType, createQueryType } from '../../../lib/dispatch/dispatch'

export const CreateLinkCodeCommand = createCommandType(appRequestIdentifiers.createLinkCode)<LinkCodeSummary, CreateLinkCodeParams>()
export const DeleteLinkCodeCommand = createCommandType(appRequestIdentifiers.deleteLinkCode)<DeletedLinkCode, DeleteLinkCodeParams>()
export const LoadLinkCodesQuery = createQueryType(appRequestIdentifiers.loadLinkCodes)<LinkCodesState>()
export const UpdateLinkCodeDetailsCommand = createCommandType(appRequestIdentifiers.updateLinkCodeDetails)<LinkCodeSummary, UpdateLinkCodeDetailsParams>()

export const appRequestTypes = [
  CreateLinkCodeCommand,
  DeleteLinkCodeCommand,
  LoadLinkCodesQuery,
  UpdateLinkCodeDetailsCommand
]
