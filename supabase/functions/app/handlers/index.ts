import type { RequestHandlers } from '../../../../lib/dispatch/dispatch.ts'
import type { AppInvocationContext } from '../types/context.ts'
import type { AppRequestHandlerFactory } from './handlerFactory.ts'
import { createCreateLinkCodeHandler, createLoadLinkCodesHandler } from './linkCodes.ts'

const handlerFactories: AppRequestHandlerFactory[] = [
  createCreateLinkCodeHandler,
  createLoadLinkCodesHandler
]

export const createAppRequestHandlers = (context: AppInvocationContext): RequestHandlers => (
  Object.fromEntries(handlerFactories.map((factory) => [
    factory.requestIdentifier,
    factory(context)
  ]))
)
