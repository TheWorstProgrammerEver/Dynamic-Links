import {
  defaultRawContentType,
  defaultRawStatusCode,
  normalizeLinkCodeDetails
} from '../../../common/linkCodeDetails'
import type {
  LinkCodeResponseMode,
  LinkCodeStatus,
  LinkCodeSummary,
  UpdateLinkCodeDetailsParams
} from '../../types/linkCodes'

export type LinkCodeEditFormState = {
  canEditCustomLinkCode: boolean
  code: string
  displayName: string
  id: string
  rawContent: string
  rawContentType: string
  rawStatusCode: string
  redirectUrl: string
  responseMode: LinkCodeResponseMode
  status: LinkCodeStatus
}

export type LinkCodeEditFormField = keyof Omit<LinkCodeEditFormState, 'canEditCustomLinkCode' | 'id' | 'status'>

export const createLinkCodeEditFormState = (
  linkCode: LinkCodeSummary,
  canEditCustomLinkCode = false
): LinkCodeEditFormState => {
  const redirectConfig = linkCode.responseConfig.mode === 'redirect' ? linkCode.responseConfig : undefined
  const rawContentConfig = linkCode.responseConfig.mode === 'raw_content' ? linkCode.responseConfig : undefined

  return {
    canEditCustomLinkCode,
    code: linkCode.code,
    displayName: linkCode.displayName,
    id: linkCode.id,
    rawContent: rawContentConfig?.content ?? '',
    rawContentType: rawContentConfig?.contentType ?? defaultRawContentType,
    rawStatusCode: String(rawContentConfig?.statusCode ?? defaultRawStatusCode),
    redirectUrl: redirectConfig?.redirectUrl ?? '',
    responseMode: linkCode.responseMode,
    status: linkCode.status
  }
}

export const updateLinkCodeEditFormField = (
  form: LinkCodeEditFormState,
  field: LinkCodeEditFormField,
  value: string
): LinkCodeEditFormState => {
  if (field === 'responseMode') {
    return {
      ...form,
      responseMode: value as LinkCodeResponseMode
    }
  }

  return {
    ...form,
    [field]: value
  }
}

export const linkCodeEditFormToUpdateParams = (
  form: LinkCodeEditFormState
): UpdateLinkCodeDetailsParams => normalizeLinkCodeDetails({
  ...(form.canEditCustomLinkCode ? { code: form.code } : {}),
  displayName: form.displayName,
  id: form.id,
  responseConfig: form.responseMode === 'redirect'
    ? {
      mode: 'redirect',
      redirectUrl: form.redirectUrl
    }
    : {
      content: form.rawContent,
      contentType: form.rawContentType,
      mode: 'raw_content',
      statusCode: Number(form.rawStatusCode)
    }
})

export const formatLinkCodeResponseConfig = (linkCode: LinkCodeSummary) => {
  if (linkCode.responseConfig.mode === 'redirect') {
    return linkCode.responseConfig.redirectUrl || 'Redirect URL not set'
  }

  return `${linkCode.responseConfig.statusCode} ${linkCode.responseConfig.contentType}`
}
