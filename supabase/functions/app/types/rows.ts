import type { LinkCodeResponseMode, LinkCodeStatus } from '../../../../common/linkCodeTypes.ts'

export type LinkCodeRow = {
  id: string
  display_name: string
  code: string
  response_mode: LinkCodeResponseMode
  redirect_url: string | null
  raw_response_message: string | null
  status: LinkCodeStatus
  created_date: string
}
