import type { LinkCodeRow } from './types/rows.ts'

export const linkCodeFromRow = (row: LinkCodeRow) => ({
  id: row.id,
  displayName: row.display_name,
  code: row.code,
  responseMode: row.response_mode,
  status: row.status,
  createdDate: row.created_date
})
