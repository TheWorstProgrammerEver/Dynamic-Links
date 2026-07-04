import { appRequestIdentifiers } from '../../../../common/appRequestIdentifiers.ts'
import type { CreateLinkCodeParams, DeleteLinkCodeParams } from '../../../../common/linkCodeTypes.ts'
import { HttpError } from '../helpers.ts'
import { createOwnedLinkCode, deleteOwnedLinkCode, loadOwnedLinkCodes } from '../linkCodes.ts'
import { createAppRequestHandlerFactory } from './handlerFactory.ts'

const createLinkCodeParams = (params: unknown): CreateLinkCodeParams => {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new HttpError(400, 'Link Code name is required.')
  }

  const displayName = (params as { displayName?: unknown }).displayName

  if (typeof displayName !== 'string') {
    throw new HttpError(400, 'Link Code name is required.')
  }

  return { displayName }
}

const deleteLinkCodeParams = (params: unknown): DeleteLinkCodeParams => {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new HttpError(400, 'Link Code ID is required.')
  }

  const id = (params as { id?: unknown }).id

  if (typeof id !== 'string' || !id.trim()) {
    throw new HttpError(400, 'Link Code ID is required.')
  }

  return { id }
}

export const createCreateLinkCodeHandler = createAppRequestHandlerFactory(
  appRequestIdentifiers.createLinkCode,
  ({ client, user }) => async (request) => await createOwnedLinkCode(
    client,
    user.id,
    createLinkCodeParams(request.params)
  )
)

export const createDeleteLinkCodeHandler = createAppRequestHandlerFactory(
  appRequestIdentifiers.deleteLinkCode,
  ({ client, user }) => async (request) => await deleteOwnedLinkCode(
    client,
    user.id,
    deleteLinkCodeParams(request.params)
  )
)

export const createLoadLinkCodesHandler = createAppRequestHandlerFactory(
  appRequestIdentifiers.loadLinkCodes,
  ({ client, user }) => async () => await loadOwnedLinkCodes(client, user.id)
)
