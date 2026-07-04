import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { linkCodeFromRow } from './mappers.ts'
import { selectRows } from './helpers.ts'
import type { LinkCodeRow } from './types/rows.ts'

export const loadOwnedLinkCodes = async (client: SupabaseClient, ownerUserId: string) => {
  const rows = await selectRows<LinkCodeRow>(
    client
      .from('link_codes')
      .select('id, display_name, code, response_mode, status, created_date')
      .eq('owner_user_id', ownerUserId)
      .order('created_date', { ascending: false })
      .order('display_name', { ascending: true })
  )

  return {
    linkCodes: rows.map(linkCodeFromRow)
  }
}
