import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLoader } from '../../lib/hooks/useLoader'
import { appDispatcher } from '../data/app/appDispatcher'
import { CreateLinkCodeCommand, DeleteLinkCodeCommand, LoadLinkCodesQuery } from '../data/app/requests'
import type { Account } from '../types/auth'
import type { LinkCodesState } from '../types/linkCodes'
import { addCreatedLinkCode, removeDeletedLinkCode } from './linkCodeStateUpdates'

const emptyState: LinkCodesState = {
  linkCodes: []
}

const errorMessage = (error: unknown) => (
  error instanceof Error ? error.message : 'Link Code request failed.'
)

export const useLinkCodes = (currentAccount?: Account) => {
  const [state, setState] = useState<LinkCodesState>(emptyState)
  const linkCodesLoad = useLoader({ getErrorMessage: errorMessage })
  const createLinkCodeLoad = useLoader({ getErrorMessage: errorMessage })
  const deleteLinkCodeLoad = useLoader({ getErrorMessage: errorMessage })
  const linkCodesLoadState = useMemo(() => ({
    ...linkCodesLoad,
    busy: Boolean(currentAccount) && (!linkCodesLoad.settled || linkCodesLoad.busy)
  }), [currentAccount, linkCodesLoad])

  const createLinkCode = useCallback(async (displayName: string) => {
    const linkCode = await createLinkCodeLoad.execute(() => (
      appDispatcher.dispatch(new CreateLinkCodeCommand({ displayName }))
    ))
    setState((currentState) => addCreatedLinkCode(currentState, linkCode))

    return linkCode
  }, [createLinkCodeLoad.execute])

  const deleteLinkCode = useCallback(async (id: string) => {
    const deletedLinkCode = await deleteLinkCodeLoad.execute(() => (
      appDispatcher.dispatch(new DeleteLinkCodeCommand({ id }))
    ))
    setState((currentState) => removeDeletedLinkCode(currentState, deletedLinkCode))

    return deletedLinkCode
  }, [deleteLinkCodeLoad.execute])

  const reloadLinkCodes = useCallback(async () => {
    try {
      const nextState = await linkCodesLoad.execute(() => appDispatcher.dispatch(new LoadLinkCodesQuery()))
      setState(nextState)

      return nextState
    } catch {
      setState(emptyState)

      return undefined
    }
  }, [linkCodesLoad.execute])

  useEffect(() => {
    let active = true

    if (!currentAccount) {
      setState(emptyState)
      createLinkCodeLoad.clearError()
      deleteLinkCodeLoad.clearError()
      linkCodesLoad.clearError()

      return () => {
        active = false
      }
    }

    void linkCodesLoad.execute(() => appDispatcher.dispatch(new LoadLinkCodesQuery()))
      .then((nextState) => {
        if (active) {
          setState(nextState)
        }
      })
      .catch(() => {
        if (active) {
          setState(emptyState)
        }
      })

    return () => {
      active = false
    }
  }, [
    createLinkCodeLoad.clearError,
    currentAccount,
    deleteLinkCodeLoad.clearError,
    linkCodesLoad.clearError,
    linkCodesLoad.execute
  ])

  return {
    createLinkCode,
    createLinkCodeLoad,
    deleteLinkCode,
    deleteLinkCodeLoad,
    linkCodes: state.linkCodes,
    linkCodesLoad: linkCodesLoadState,
    reloadLinkCodes,
    state
  }
}
