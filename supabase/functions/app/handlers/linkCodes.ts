import { appRequestIdentifiers } from '../../../../common/appRequestIdentifiers.ts'
import { loadOwnedLinkCodes } from '../linkCodes.ts'
import { createAppRequestHandlerFactory } from './handlerFactory.ts'

export const createLoadLinkCodesHandler = createAppRequestHandlerFactory(
  appRequestIdentifiers.loadLinkCodes,
  ({ client, user }) => async () => await loadOwnedLinkCodes(client, user.id)
)
