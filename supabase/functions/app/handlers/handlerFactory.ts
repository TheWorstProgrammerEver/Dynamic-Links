import type { RequestHandler } from '../../../../lib/dispatch/dispatch.ts'
import type { AppRequestIdentifier } from '../../../../common/appRequestIdentifiers.ts'
import type { AppInvocationContext } from '../types/context.ts'

export type AppRequestHandlerFactory = {
  (context: AppInvocationContext): RequestHandler
  requestIdentifier: AppRequestIdentifier
}

export const createAppRequestHandlerFactory = (
  requestIdentifier: AppRequestIdentifier,
  createHandler: (context: AppInvocationContext) => RequestHandler
): AppRequestHandlerFactory => Object.assign(createHandler, { requestIdentifier })
