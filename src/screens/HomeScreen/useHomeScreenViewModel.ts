import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuthContext } from '../../contexts/AuthContext'
import { useLinkCodes } from '../../state/useLinkCodes'
import type { LinkCodeResponseMode, LinkCodeStatus } from '../../types/linkCodes'

const responseModeLabels: Record<LinkCodeResponseMode, string> = {
  redirect: 'Redirect',
  raw_content: 'Raw content'
}

const statusLabels: Record<LinkCodeStatus, string> = {
  active: 'Active',
  disabled: 'Disabled',
  draft: 'Draft'
}

export const useHomeScreenViewModel = () => {
  const { currentAccount } = useAuthContext()
  const linkCodes = useLinkCodes(currentAccount)
  const [newLinkCodeName, setNewLinkCodeName] = useState('')
  const [nameValidationError, setNameValidationError] = useState<string>()
  const clearCreateError = linkCodes.createLinkCodeLoad.clearError

  const updateNewLinkCodeName = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextName = event.currentTarget.value
    setNewLinkCodeName(nextName)
    clearCreateError()

    if (nextName.trim()) {
      setNameValidationError(undefined)
    }
  }, [clearCreateError])

  const submitNewLinkCode = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const displayName = newLinkCodeName.trim()

    if (!displayName) {
      setNameValidationError('Enter a Link Code name.')

      return
    }

    setNameValidationError(undefined)

    try {
      await linkCodes.createLinkCode(displayName)
      setNewLinkCodeName('')
    } catch {
      // The loader exposes the function error next to the form.
    }
  }, [linkCodes.createLinkCode, newLinkCodeName])

  return useMemo(() => ({
    accountEmail: currentAccount?.email,
    createLinkCodeForm: {
      error: nameValidationError ?? linkCodes.createLinkCodeLoad.error,
      loader: linkCodes.createLinkCodeLoad,
      name: newLinkCodeName,
      submit: submitNewLinkCode,
      updateName: updateNewLinkCodeName
    },
    linkCodes: linkCodes.linkCodes,
    linkCodesLoad: linkCodes.linkCodesLoad,
    responseModeLabels,
    statusLabels
  }), [
    currentAccount?.email,
    linkCodes.createLinkCodeLoad,
    linkCodes.linkCodes,
    linkCodes.linkCodesLoad,
    nameValidationError,
    newLinkCodeName,
    submitNewLinkCode,
    updateNewLinkCodeName
  ])
}
