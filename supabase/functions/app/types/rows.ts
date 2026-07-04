import type { LinkCodeResponseMode, LinkCodeStatus } from '../../../../common/linkCodeTypes.ts'

export type LinkCodeRow = {
  id: string
  display_name: string
  code: string
  response_mode: LinkCodeResponseMode
  redirect_url: string | null
  raw_content: string | null
  raw_content_type: string | null
  raw_status_code: number | null
  status: LinkCodeStatus
  created_date: string
}
