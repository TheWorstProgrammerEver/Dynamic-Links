import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { LinkCodeDetailsValidationError } from '../../../common/linkCodeDetails'
import { useAuthContext } from '../../contexts/AuthContext'
import { useLinkCodes } from '../../state/useLinkCodes'
import type {
  LinkCodeResponseMode,
  LinkCodeStatus,
  LinkCodeSummary,
  UpdateLinkCodeDetailsParams
} from '../../types/linkCodes'
import {
  closeLinkCodeDeleteConfirmation,
  closedLinkCodeDeleteConfirmationState,
  isLinkCodeDeleteConfirmationOpen,
  openLinkCodeDeleteConfirmation
} from './linkCodeDeleteConfirmation'
import {
  createLinkCodeEditFormState,
  formatLinkCodeResponseConfig,
  linkCodeEditFormToUpdateParams,
  updateLinkCodeEditFormField,
  type LinkCodeEditFormField,
  type LinkCodeEditFormState
} from './linkCodeEditForm'

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
  const [deleteConfirmation, setDeleteConfirmation] = useState(closedLinkCodeDeleteConfirmationState)
  const [editForm, setEditForm] = useState<LinkCodeEditFormState>()
  const [editValidationError, setEditValidationError] = useState<string>()
  const clearCreateError = linkCodes.createLinkCodeLoad.clearError
  const clearDeleteError = linkCodes.deleteLinkCodeLoad.clearError
  const clearEditError = linkCodes.updateLinkCodeLoad.clearError

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

  const requestDeleteLinkCode = useCallback((linkCode: LinkCodeSummary) => {
    clearDeleteError()
    setDeleteConfirmation(openLinkCodeDeleteConfirmation(linkCode))
  }, [clearDeleteError])

  const cancelDeleteLinkCode = useCallback(() => {
    setDeleteConfirmation(closeLinkCodeDeleteConfirmation())
  }, [])

  const confirmDeleteLinkCode = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const target = deleteConfirmation.target

    if (!target) {
      return
    }

    try {
      await linkCodes.deleteLinkCode(target.id)
      setDeleteConfirmation(closeLinkCodeDeleteConfirmation())
    } catch {
      // The loader exposes the function error in the confirmation dialog.
    }
  }, [deleteConfirmation.target, linkCodes.deleteLinkCode])

  const openEditLinkCode = useCallback((linkCode: LinkCodeSummary) => {
    setEditForm(createLinkCodeEditFormState(linkCode))
    setEditValidationError(undefined)
    clearEditError()
  }, [clearEditError])

  const closeEditLinkCode = useCallback(() => {
    setEditForm(undefined)
    setEditValidationError(undefined)
    clearEditError()
  }, [clearEditError])

  const updateEditForm = useCallback((field: LinkCodeEditFormField, value: string) => {
    setEditForm((currentForm) => (
      currentForm ? updateLinkCodeEditFormField(currentForm, field, value) : currentForm
    ))
    setEditValidationError(undefined)
    clearEditError()
  }, [clearEditError])

  const submitEditLinkCode = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editForm) {
      return
    }

    let params: UpdateLinkCodeDetailsParams

    try {
      params = linkCodeEditFormToUpdateParams(editForm)
    } catch (error) {
      setEditValidationError(
        error instanceof LinkCodeDetailsValidationError
          ? error.message
          : 'Check the Link Code details.'
      )

      return
    }

    setEditValidationError(undefined)

    try {
      await linkCodes.updateLinkCodeDetails(params)
      setEditForm(undefined)
    } catch {
      // The loader exposes the function error next to the form.
    }
  }, [editForm, linkCodes.updateLinkCodeDetails])

  return useMemo(() => ({
    accountEmail: currentAccount?.email,
    createLinkCodeForm: {
      error: nameValidationError ?? linkCodes.createLinkCodeLoad.error,
      loader: linkCodes.createLinkCodeLoad,
      name: newLinkCodeName,
      submit: submitNewLinkCode,
      updateName: updateNewLinkCodeName
    },
    deleteLinkCodeConfirmation: {
      cancel: cancelDeleteLinkCode,
      confirm: confirmDeleteLinkCode,
      error: linkCodes.deleteLinkCodeLoad.error,
      loader: linkCodes.deleteLinkCodeLoad,
      open: isLinkCodeDeleteConfirmationOpen(deleteConfirmation),
      request: requestDeleteLinkCode,
      target: deleteConfirmation.target
    },
    editLinkCodeDialog: {
      close: closeEditLinkCode,
      error: editValidationError ?? linkCodes.updateLinkCodeLoad.error,
      form: editForm,
      loader: linkCodes.updateLinkCodeLoad,
      open: Boolean(editForm),
      submit: submitEditLinkCode,
      updateField: updateEditForm
    },
    formatResponseConfig: formatLinkCodeResponseConfig,
    linkCodes: linkCodes.linkCodes,
    linkCodesLoad: linkCodes.linkCodesLoad,
    openEditLinkCode,
    responseModeLabels,
    statusLabels
  }), [
    cancelDeleteLinkCode,
    closeEditLinkCode,
    confirmDeleteLinkCode,
    currentAccount?.email,
    deleteConfirmation,
    editForm,
    editValidationError,
    linkCodes.createLinkCodeLoad,
    linkCodes.deleteLinkCodeLoad,
    linkCodes.linkCodes,
    linkCodes.linkCodesLoad,
    linkCodes.updateLinkCodeLoad,
    nameValidationError,
    newLinkCodeName,
    openEditLinkCode,
    requestDeleteLinkCode,
    submitEditLinkCode,
    submitNewLinkCode,
    updateEditForm,
    updateNewLinkCodeName
  ])
}
