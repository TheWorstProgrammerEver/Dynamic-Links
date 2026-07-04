import type { LinkCodeResponseMode, LinkCodeStatus } from '../../../../common/linkCodeTypes.ts'

export type LinkCodeRow = {
  id: string
  display_name: string
  code: string
  response_mode: LinkCodeResponseMode
  status: LinkCodeStatus
  created_date: string
}
