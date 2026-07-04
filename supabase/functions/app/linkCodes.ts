import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  LinkCodeDetailsValidationError,
  normalizeLinkCodeDetails
} from '../../../common/linkCodeDetails.ts'
import type {
  CreateLinkCodeParams,
  DeleteLinkCodeParams,
  UpdateLinkCodeDetailsParams
} from '../../../common/linkCodeTypes.ts'
import {
  createLinkCodeWithRandomCode,
  LinkCodeCollisionError,
  LinkCodeValidationError
} from '../../../common/linkCodeCreation.ts'
import { linkCodeFromRow } from './mappers.ts'
import { HttpError, selectRows } from './helpers.ts'
import type { LinkCodeRow } from './types/rows.ts'

const linkCodeFields = [
  'id',
  'display_name',
  'code',
  'response_mode',
  'redirect_url',
  'raw_content',
  'raw_content_type',
  'raw_status_code',
  'status',
  'created_date'
].join(', ')

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

export const deleteOwnedLinkCode = async (
  client: SupabaseClient,
  ownerUserId: string,
  { id }: DeleteLinkCodeParams
) => {
  const { data, error } = await client
    .from('link_codes')
    .delete()
    .eq('id', id)
    .eq('owner_user_id', ownerUserId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new HttpError(404, 'Link Code not found.')
  }

  return { id: data.id as string }
}

export const updateOwnedLinkCodeDetails = async (
  client: SupabaseClient,
  ownerUserId: string,
  params: UpdateLinkCodeDetailsParams
) => {
  try {
    const details = normalizeLinkCodeDetails(params)
    const responseConfig = details.responseConfig
    const update = responseConfig.mode === 'redirect'
      ? {
        display_name: details.displayName,
        raw_content: null,
        redirect_url: responseConfig.redirectUrl,
        response_mode: responseConfig.mode,
        updated_date: new Date().toISOString().slice(0, 10)
      }
      : {
        display_name: details.displayName,
        raw_content: responseConfig.content,
        raw_content_type: responseConfig.contentType,
        raw_status_code: responseConfig.statusCode,
        redirect_url: null,
        response_mode: responseConfig.mode,
        updated_date: new Date().toISOString().slice(0, 10)
      }
    const { data, error } = await client
      .from('link_codes')
      .update(update)
      .eq('id', details.id)
      .eq('owner_user_id', ownerUserId)
      .select(linkCodeFields)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      throw new HttpError(404, 'Link Code was not found.')
    }

    return linkCodeFromRow(data as LinkCodeRow)
  } catch (error) {
    if (error instanceof LinkCodeDetailsValidationError) {
      throw new HttpError(400, error.message)
    }

    throw error
  }
}
