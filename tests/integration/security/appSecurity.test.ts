import type { SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { appRequestIdentifiers, appRequestNames } from '../../../common/appRequestIdentifiers'
import {
  createAdminClient,
  createAnonymousClient,
  createSignedInClient,
  requireLocalFunctionsReady
} from './localSupabase'
import {
  cleanupSecurityFixture,
  createSecurityFixture,
  type SecurityFixture
} from './securityFixture'

type LinkCodeRow = {
  code: string
  display_name: string
  id: string
  owner_user_id: string
  response_mode: string
  status: string
}

let fixture: SecurityFixture | undefined
let anonymousClient: SupabaseClient
let ownerClient: SupabaseClient
let outsiderClient: SupabaseClient

const requireFixture = () => {
  if (!fixture) {
    throw new Error('Security fixture was not created.')
  }

  return fixture
}

const invokeApp = (client: SupabaseClient, identifier: string, params: unknown = {}) => (
  client.functions.invoke('app', {
    body: {
      identifier,
      params
    }
  })
)

const selectLinkCodes = async (client: SupabaseClient) => {
  const { data, error } = await client
    .from('link_codes')
    .select('id, owner_user_id, display_name, code, response_mode, status')
    .order('display_name', { ascending: true })

  if (error) {
    throw error
  }

  return data as LinkCodeRow[]
}

const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id)

const deleteLinkCode = async (id?: string) => {
  if (!id) {
    return
  }

  await createAdminClient()
    .from('link_codes')
    .delete()
    .eq('id', id)
}

beforeAll(async () => {
  await requireLocalFunctionsReady()
  fixture = await createSecurityFixture()
  anonymousClient = createAnonymousClient()
  ownerClient = await createSignedInClient(fixture.users.owner.email, fixture.users.owner.password)
  outsiderClient = await createSignedInClient(fixture.users.outsider.email, fixture.users.outsider.password)
})

afterAll(async () => {
  await cleanupSecurityFixture(fixture)
})

describe('app security integration', () => {
  test('anonymous users cannot call business functions', async () => {
    for (const identifier of appRequestNames) {
      const { data, error } = await invokeApp(anonymousClient, identifier)

      expect(error, identifier).toBeTruthy()
      expect(data, identifier).toBeFalsy()
    }
  })

  test('anonymous users cannot read app tables directly', async () => {
    const { data } = await anonymousClient
      .from('link_codes')
      .select('id')
      .limit(10)

    expect(data ?? []).toHaveLength(0)
  })

  test('anonymous users cannot directly create Link Codes', async () => {
    const securityFixture = requireFixture()
    const { error } = await anonymousClient
      .from('link_codes')
      .insert({
        display_name: `${securityFixture.prefix} anonymous Link Code`,
        code: `${securityFixture.prefix}-anonymous`,
        response_mode: 'redirect',
        status: 'draft'
      })

    expect(error).toBeTruthy()
  })

  test('Link Code owners only load their own rows through the app function', async () => {
    const securityFixture = requireFixture()
    const { data: ownerState, error: ownerError } = await invokeApp(ownerClient, appRequestIdentifiers.loadLinkCodes)
    const { data: outsiderState, error: outsiderError } = await invokeApp(outsiderClient, appRequestIdentifiers.loadLinkCodes)

    expect(ownerError).toBeFalsy()
    expect(outsiderError).toBeFalsy()
    expect(ids(ownerState.linkCodes)).toEqual([securityFixture.linkCodes.visible])
    expect(ids(outsiderState.linkCodes)).toEqual([securityFixture.linkCodes.hidden])
    expect(ownerState.linkCodes[0]).toEqual(expect.objectContaining({
      code: `${securityFixture.prefix}-visible`,
      displayName: `${securityFixture.prefix} visible Link Code`,
      responseMode: 'redirect',
      status: 'active'
    }))
  })

  test('Link Code owners can create named random Link Codes through the app function', async () => {
    const securityFixture = requireFixture()
    let createdId: string | undefined

    try {
      const { data, error } = await invokeApp(ownerClient, appRequestIdentifiers.createLinkCode, {
        displayName: ` ${securityFixture.prefix} created Link Code `
      })
      createdId = data?.id

      expect(error).toBeFalsy()
      expect(data).toEqual(expect.objectContaining({
        displayName: `${securityFixture.prefix} created Link Code`,
        responseMode: 'redirect',
        status: 'draft'
      }))
      expect(data.code).toEqual(expect.any(String))
      expect(data.code.length).toBeGreaterThanOrEqual(8)

      const { data: row, error: rowError } = await createAdminClient()
        .from('link_codes')
        .select('owner_user_id')
        .eq('id', createdId)
        .single()

      expect(rowError).toBeFalsy()
      expect(row?.owner_user_id).toBe(securityFixture.users.owner.id)
    } finally {
      await deleteLinkCode(createdId)
    }
  })

  test('Link Code owners cannot create app-function rows for another account', async () => {
    const securityFixture = requireFixture()
    let createdId: string | undefined

    try {
      const { data, error } = await invokeApp(ownerClient, appRequestIdentifiers.createLinkCode, {
        displayName: `${securityFixture.prefix} owner-scoped create`,
        ownerUserId: securityFixture.users.outsider.id,
        owner_user_id: securityFixture.users.outsider.id
      })
      createdId = data?.id

      expect(error).toBeFalsy()

      const { data: row, error: rowError } = await createAdminClient()
        .from('link_codes')
        .select('owner_user_id')
        .eq('id', createdId)
        .single()

      expect(rowError).toBeFalsy()
      expect(row?.owner_user_id).toBe(securityFixture.users.owner.id)
    } finally {
      await deleteLinkCode(createdId)
    }
  })

  test('Link Code owners only read their own rows directly', async () => {
    const securityFixture = requireFixture()
    const ownerRows = await selectLinkCodes(ownerClient)
    const outsiderRows = await selectLinkCodes(outsiderClient)

    expect(ids(ownerRows)).toEqual([securityFixture.linkCodes.visible])
    expect(ids(outsiderRows)).toEqual([securityFixture.linkCodes.hidden])
  })

  test('Link Code owners cannot directly write another owner row', async () => {
    const securityFixture = requireFixture()
    const admin = createAdminClient()
    const crossOwnerInsert = await ownerClient
      .from('link_codes')
      .insert({
        owner_user_id: securityFixture.users.outsider.id,
        display_name: `${securityFixture.prefix} cross owner`,
        code: `${securityFixture.prefix}-cross-owner`,
        response_mode: 'redirect',
        status: 'draft'
      })

    expect(crossOwnerInsert.error).toBeTruthy()

    const crossOwnerUpdate = await ownerClient
      .from('link_codes')
      .update({ display_name: `${securityFixture.prefix} updated by owner` })
      .eq('id', securityFixture.linkCodes.hidden)
      .select('id')

    expect(crossOwnerUpdate.error).toBeFalsy()
    expect(crossOwnerUpdate.data ?? []).toHaveLength(0)

    const crossOwnerDelete = await ownerClient
      .from('link_codes')
      .delete()
      .eq('id', securityFixture.linkCodes.hidden)
      .select('id')

    expect(crossOwnerDelete.error).toBeFalsy()
    expect(crossOwnerDelete.data ?? []).toHaveLength(0)

    const { data, error } = await admin
      .from('link_codes')
      .select('display_name')
      .eq('id', securityFixture.linkCodes.hidden)
      .single()

    expect(error).toBeFalsy()
    expect(data?.display_name).toBe(`${securityFixture.prefix} hidden Link Code`)
  })

  test('Link Code owners can directly write their own rows', async () => {
    const securityFixture = requireFixture()
    const created = await ownerClient
      .from('link_codes')
      .insert({
        display_name: `${securityFixture.prefix} owned write`,
        code: `${securityFixture.prefix}-owned-write`,
        response_mode: 'redirect',
        status: 'draft'
      })
      .select('id, owner_user_id, status')
      .single()

    expect(created.error).toBeFalsy()
    expect(created.data?.owner_user_id).toBe(securityFixture.users.owner.id)
    expect(created.data?.status).toBe('draft')

    const updated = await ownerClient
      .from('link_codes')
      .update({ status: 'active' })
      .eq('id', created.data?.id)
      .select('id, status')
      .single()

    expect(updated.error).toBeFalsy()
    expect(updated.data?.status).toBe('active')

    const deleted = await ownerClient
      .from('link_codes')
      .delete()
      .eq('id', created.data?.id)
      .select('id')
      .single()

    expect(deleted.error).toBeFalsy()
    expect(deleted.data?.id).toBe(created.data?.id)
  })

  test('Link Code strings are unique in the database', async () => {
    const securityFixture = requireFixture()
    const { error } = await createAdminClient()
      .from('link_codes')
      .insert({
        owner_user_id: securityFixture.users.outsider.id,
        display_name: `${securityFixture.prefix} duplicate Link Code`,
        code: `${securityFixture.prefix}-visible`,
        response_mode: 'redirect',
        status: 'draft'
      })

    expect(error).toBeTruthy()
    expect(error?.message).toMatch(/duplicate key|unique/i)
  })
})
