import { appRequestIdentifiers } from '../../../../common/appRequestIdentifiers.ts'
import {
  isLinkCodeStatus,
  type CreateLinkCodeParams,
  type DeleteLinkCodeParams,
  type LinkCodeResponseConfig,
  type UpdateLinkCodeDetailsParams
} from '../../../../common/linkCodeTypes.ts'
import { HttpError } from '../helpers.ts'
import {
  createOwnedLinkCode,
  deleteOwnedLinkCode,
  loadOwnedLinkCodes,
  updateOwnedLinkCodeDetails
} from '../linkCodes.ts'
import { createAppRequestHandlerFactory } from './handlerFactory.ts'

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
)

const createLinkCodeParams = (params: unknown): CreateLinkCodeParams => {
  if (!isRecord(params)) {
    throw new HttpError(400, 'Link Code name is required.')
  }

  const displayName = params.displayName

  if (typeof displayName !== 'string') {
    throw new HttpError(400, 'Link Code name is required.')
  }

  return { displayName }
}

const deleteLinkCodeParams = (params: unknown): DeleteLinkCodeParams => {
  if (!isRecord(params)) {
    throw new HttpError(400, 'Link Code ID is required.')
  }

  const id = params.id

  if (typeof id !== 'string' || !id.trim()) {
    throw new HttpError(400, 'Link Code ID is required.')
  }

  return { id }
}

const updateLinkCodeDetailsParams = (params: unknown): UpdateLinkCodeDetailsParams => {
  if (!isRecord(params)) {
    throw new HttpError(400, 'Link Code details are required.')
  }

  const { code, displayName, id, responseConfig, status } = params

  if (
    typeof id !== 'string'
    || typeof displayName !== 'string'
    || !isRecord(responseConfig)
    || !isLinkCodeStatus(status)
  ) {
    throw new HttpError(400, 'Link Code details are required.')
  }

  if (code !== undefined && typeof code !== 'string') {
    throw new HttpError(400, 'Link Code must be text.')
  }

  if (responseConfig.mode === 'redirect') {
    if (typeof responseConfig.redirectUrl !== 'string') {
      throw new HttpError(400, 'Enter a redirect URL.')
    }

    return {
      ...(code === undefined ? {} : { code }),
      displayName,
      id,
      responseConfig: {
        mode: 'redirect',
        redirectUrl: responseConfig.redirectUrl
      },
      status
    }
  }

  if (responseConfig.mode === 'raw_content') {
    const { content, contentType, statusCode } = responseConfig

    if (
      typeof content !== 'string'
      || typeof contentType !== 'string'
      || typeof statusCode !== 'number'
    ) {
      throw new HttpError(400, 'Raw content response details are required.')
    }

    return {
      ...(code === undefined ? {} : { code }),
      displayName,
      id,
      responseConfig: {
        content,
        contentType,
        mode: 'raw_content',
        statusCode
      } satisfies LinkCodeResponseConfig,
      status
    }
  }

  throw new HttpError(400, 'Choose a Link Code response mode.')
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

export const createUpdateLinkCodeDetailsHandler = createAppRequestHandlerFactory(
  appRequestIdentifiers.updateLinkCodeDetails,
  ({ client, user }) => async (request) => await updateOwnedLinkCodeDetails(
    client,
    user.id,
    updateLinkCodeDetailsParams(request.params)
  )
)
