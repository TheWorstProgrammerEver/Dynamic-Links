import { normalizeLinkCodeDetails } from '../../../common/linkCodeDetails'
import { defaultRawResponseMessage, parseRawResponseMessage } from '../../../common/rawHttpResponse'
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
  rawResponseMessage: string
  redirectUrl: string
  responseMode: LinkCodeResponseMode
  status: LinkCodeStatus
}

export type LinkCodeEditFormField = keyof Omit<LinkCodeEditFormState, 'canEditCustomLinkCode' | 'id'>

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
    rawResponseMessage: rawContentConfig?.responseMessage ?? defaultRawResponseMessage,
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

  if (field === 'status') {
    return {
      ...form,
      status: value as LinkCodeStatus
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
      mode: 'raw_content',
      responseMessage: form.rawResponseMessage
    },
  status: form.status
})

export const formatLinkCodeResponseConfig = (linkCode: LinkCodeSummary) => {
  if (linkCode.responseConfig.mode === 'redirect') {
    return linkCode.responseConfig.redirectUrl || 'Redirect URL not set'
  }

  try {
    const response = parseRawResponseMessage(linkCode.responseConfig.responseMessage)
    const contentType = response.headers.find(([name]) => name.toLowerCase() === 'content-type')?.[1]

    return contentType ? `${response.status} ${contentType}` : `${response.status} raw response`
  } catch {
    return 'Raw response message'
  }
}
