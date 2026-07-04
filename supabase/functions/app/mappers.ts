import { defaultRawContentType, defaultRawStatusCode } from '../../../common/linkCodeDetails.ts'
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
      content: row.raw_content ?? '',
      contentType: row.raw_content_type ?? defaultRawContentType,
      mode: 'raw_content' as const,
      statusCode: row.raw_status_code ?? defaultRawStatusCode
    },
  responseMode: row.response_mode,
  status: row.status,
  createdDate: row.created_date
})
