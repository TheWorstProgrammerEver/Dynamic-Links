import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { CreateLinkCodeParams } from '../../../common/linkCodeTypes.ts'
import {
  createLinkCodeWithRandomCode,
  LinkCodeCollisionError,
  LinkCodeValidationError
} from '../../../common/linkCodeCreation.ts'
import { linkCodeFromRow } from './mappers.ts'
import { HttpError, selectRows } from './helpers.ts'
import type { LinkCodeRow } from './types/rows.ts'

const linkCodeFields = 'id, display_name, code, response_mode, status, created_date'

const isLinkCodeCollision = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as { code?: unknown; details?: unknown; message?: unknown }
  const message = [candidate.message, candidate.details]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')

  return candidate.code === '23505' && /link_codes_code_key|code|duplicate key/i.test(message)
}

const insertOwnedLinkCode = async (
  client: SupabaseClient,
  ownerUserId: string,
  { code, displayName }: { code: string; displayName: string }
) => {
  const { data, error } = await client
    .from('link_codes')
    .insert({
      code,
      display_name: displayName,
      owner_user_id: ownerUserId
    })
    .select(linkCodeFields)
    .single()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Link Code was not created.')
  }

  return linkCodeFromRow(data as LinkCodeRow)
}

export const loadOwnedLinkCodes = async (client: SupabaseClient, ownerUserId: string) => {
  const rows = await selectRows<LinkCodeRow>(
    client
      .from('link_codes')
      .select(linkCodeFields)
      .eq('owner_user_id', ownerUserId)
      .order('created_date', { ascending: false })
      .order('display_name', { ascending: true })
  )

  return {
    linkCodes: rows.map(linkCodeFromRow)
  }
}

export const createOwnedLinkCode = async (
  client: SupabaseClient,
  ownerUserId: string,
  params: CreateLinkCodeParams
) => {
  try {
    return await createLinkCodeWithRandomCode({
      displayName: params.displayName,
      insert: (attempt) => insertOwnedLinkCode(client, ownerUserId, attempt),
      isCodeCollisionError: isLinkCodeCollision
    })
  } catch (error) {
    if (error instanceof LinkCodeValidationError) {
      throw new HttpError(400, error.message)
    }

    if (error instanceof LinkCodeCollisionError) {
      throw new HttpError(409, error.message)
    }

    throw error
  }
}
