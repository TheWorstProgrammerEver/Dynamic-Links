import { defaultRawResponseMessage } from '../../../common/rawHttpResponse.ts'
import type { LinkCodeRow } from './types/rows.ts'

export const linkCodeFromRow = (row: LinkCodeRow) => ({
  id: row.id,
  displayName: row.display_name,
  code: row.code,
  responseConfig: row.response_mode === 'redirect'
    ? {
      mode: 'redirect' as const,
      redirectUrl: row.redirect_url ?? ''
    }
    : {
      mode: 'raw_content' as const,
      responseMessage: row.raw_response_message ?? defaultRawResponseMessage
    },
  responseMode: row.response_mode,
  status: row.status,
  createdDate: row.created_date
})
