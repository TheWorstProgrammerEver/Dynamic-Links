import { randomUUID } from 'node:crypto'
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
  raw_content: string | null
  raw_content_type: string | null
  raw_status_code: number | null
  redirect_url: string | null
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
    .select('id, owner_user_id, display_name, code, redirect_url, raw_content, raw_content_type, raw_status_code, response_mode, status')
    .order('display_name', { ascending: true })

  if (error) {
    throw error
  }

  return data as LinkCodeRow[]
}

const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id)

const shortCustomCode = () => randomUUID().replaceAll('-', '').slice(0, 6)

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

    const premiumEntitlements = await anonymousClient
      .from('manual_premium_entitlements')
      .select('user_id')
      .limit(10)

    expect(premiumEntitlements.error || (premiumEntitlements.data ?? []).length === 0).toBeTruthy()
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
    expect(ownerState.capabilities).toEqual({
      canEditCustomLinkCodes: true
    })
    expect(outsiderState.capabilities).toEqual({
      canEditCustomLinkCodes: false
    })
    expect(ids(ownerState.linkCodes)).toEqual([securityFixture.linkCodes.visible])
    expect(ids(outsiderState.linkCodes)).toEqual([securityFixture.linkCodes.hidden])
    expect(ownerState.linkCodes[0]).toEqual(expect.objectContaining({
      code: `${securityFixture.prefix}-visible`,
      displayName: `${securityFixture.prefix} visible Link Code`,
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com/visible'
      },
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
        responseConfig: {
          mode: 'redirect',
          redirectUrl: ''
        },
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

  test('Link Code owners can delete their own rows through the app function', async () => {
    const securityFixture = requireFixture()
    let createdId: string | undefined

    try {
      const { data: created, error: createError } = await createAdminClient()
        .from('link_codes')
        .insert({
          owner_user_id: securityFixture.users.owner.id,
          display_name: `${securityFixture.prefix} delete through function`,
          code: `${securityFixture.prefix}-delete-function`,
          response_mode: 'redirect',
          status: 'draft'
        })
        .select('id')
        .single()
      createdId = created?.id

      expect(createError).toBeFalsy()

      const { data, error } = await invokeApp(ownerClient, appRequestIdentifiers.deleteLinkCode, {
        id: createdId
      })

      expect(error).toBeFalsy()
      expect(data).toEqual({ id: createdId })

      const { data: rows, error: selectError } = await createAdminClient()
        .from('link_codes')
        .select('id')
        .eq('id', createdId)

      expect(selectError).toBeFalsy()
      expect(rows ?? []).toHaveLength(0)
    } finally {
      await deleteLinkCode(createdId)
    }
  })

  test('Link Code owners cannot delete another owner row through the app function', async () => {
    const securityFixture = requireFixture()
    const { data, error } = await invokeApp(ownerClient, appRequestIdentifiers.deleteLinkCode, {
      id: securityFixture.linkCodes.hidden
    })

    expect(error).toBeTruthy()
    expect(data).toBeFalsy()

    const { data: row, error: rowError } = await createAdminClient()
      .from('link_codes')
      .select('display_name')
      .eq('id', securityFixture.linkCodes.hidden)
      .single()

    expect(rowError).toBeFalsy()
    expect(row?.display_name).toBe(`${securityFixture.prefix} hidden Link Code`)
  })

  test('Link Code owners can update details through the app function', async () => {
    const securityFixture = requireFixture()
    let createdId: string | undefined

    try {
      const { data: created, error: createError } = await createAdminClient()
        .from('link_codes')
        .insert({
          owner_user_id: securityFixture.users.owner.id,
          display_name: `${securityFixture.prefix} update through function`,
          code: `${securityFixture.prefix}-update-function`,
          response_mode: 'redirect',
          status: 'draft'
        })
        .select('id')
        .single()
      createdId = created?.id

      expect(createError).toBeFalsy()

      const { data, error } = await invokeApp(ownerClient, appRequestIdentifiers.updateLinkCodeDetails, {
        displayName: ` ${securityFixture.prefix} updated content `,
        id: createdId,
        responseConfig: {
          content: 'Updated content',
          contentType: 'text/html; charset=utf-8',
          mode: 'raw_content',
          statusCode: 202
        }
      })

      expect(error).toBeFalsy()
      expect(data).toEqual(expect.objectContaining({
        displayName: `${securityFixture.prefix} updated content`,
        id: createdId,
        responseConfig: {
          content: 'Updated content',
          contentType: 'text/html; charset=utf-8',
          mode: 'raw_content',
          statusCode: 202
        },
        responseMode: 'raw_content'
      }))

      const { data: row, error: rowError } = await createAdminClient()
        .from('link_codes')
        .select('display_name, redirect_url, raw_content, raw_content_type, raw_status_code, response_mode')
        .eq('id', createdId)
        .single()

      expect(rowError).toBeFalsy()
      expect(row).toEqual({
        display_name: `${securityFixture.prefix} updated content`,
        raw_content: 'Updated content',
        raw_content_type: 'text/html; charset=utf-8',
        raw_status_code: 202,
        redirect_url: null,
        response_mode: 'raw_content'
      })
    } finally {
      await deleteLinkCode(createdId)
    }
  })

  test('premium Link Code owners can update custom codes through the app function', async () => {
    const securityFixture = requireFixture()
    const code = shortCustomCode()
    let createdId: string | undefined

    try {
      const { data: created, error: createError } = await createAdminClient()
        .from('link_codes')
        .insert({
          owner_user_id: securityFixture.users.owner.id,
          display_name: `${securityFixture.prefix} custom code through function`,
          code: `${securityFixture.prefix}-custom-function`,
          response_mode: 'redirect',
          status: 'draft'
        })
        .select('id')
        .single()
      createdId = created?.id

      expect(createError).toBeFalsy()

      const { data, error } = await invokeApp(ownerClient, appRequestIdentifiers.updateLinkCodeDetails, {
        code,
        displayName: `${securityFixture.prefix} short custom code`,
        id: createdId,
        responseConfig: {
          mode: 'redirect',
          redirectUrl: 'https://example.com/custom'
        }
      })

      expect(error).toBeFalsy()
      expect(data).toEqual(expect.objectContaining({
        code,
        displayName: `${securityFixture.prefix} short custom code`,
        id: createdId
      }))
      expect(data.code).toHaveLength(6)

      const { data: row, error: rowError } = await createAdminClient()
        .from('link_codes')
        .select('code, display_name')
        .eq('id', createdId)
        .single()

      expect(rowError).toBeFalsy()
      expect(row).toEqual({
        code,
        display_name: `${securityFixture.prefix} short custom code`
      })
    } finally {
      await deleteLinkCode(createdId)
    }
  })

  test('custom Link Code updates reject existing codes through the app function', async () => {
    const securityFixture = requireFixture()
    const { data, error } = await invokeApp(ownerClient, appRequestIdentifiers.updateLinkCodeDetails, {
      code: `${securityFixture.prefix}-hidden`,
      displayName: `${securityFixture.prefix} duplicate custom code`,
      id: securityFixture.linkCodes.visible,
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com/visible'
      }
    })

    expect(error).toBeTruthy()
    expect(data).toBeFalsy()

    const { data: row, error: rowError } = await createAdminClient()
      .from('link_codes')
      .select('code, display_name')
      .eq('id', securityFixture.linkCodes.visible)
      .single()

    expect(rowError).toBeFalsy()
    expect(row).toEqual({
      code: `${securityFixture.prefix}-visible`,
      display_name: `${securityFixture.prefix} visible Link Code`
    })
  })

  test('non-premium Link Code owners cannot update custom codes through the app function', async () => {
    const securityFixture = requireFixture()
    const { data, error } = await invokeApp(outsiderClient, appRequestIdentifiers.updateLinkCodeDetails, {
      code: shortCustomCode(),
      displayName: `${securityFixture.prefix} non-premium custom code`,
      id: securityFixture.linkCodes.hidden,
      responseConfig: {
        content: 'hidden content',
        contentType: 'text/plain; charset=utf-8',
        mode: 'raw_content',
        statusCode: 200
      }
    })

    expect(error).toBeTruthy()
    expect(data).toBeFalsy()

    const { data: row, error: rowError } = await createAdminClient()
      .from('link_codes')
      .select('code, display_name')
      .eq('id', securityFixture.linkCodes.hidden)
      .single()

    expect(rowError).toBeFalsy()
    expect(row).toEqual({
      code: `${securityFixture.prefix}-hidden`,
      display_name: `${securityFixture.prefix} hidden Link Code`
    })
  })

  test('Link Code updates reject invalid redirect URLs through the app function', async () => {
    const securityFixture = requireFixture()
    const { data, error } = await invokeApp(ownerClient, appRequestIdentifiers.updateLinkCodeDetails, {
      displayName: `${securityFixture.prefix} invalid redirect`,
      id: securityFixture.linkCodes.visible,
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'javascript:alert(1)'
      }
    })

    expect(error).toBeTruthy()
    expect(data).toBeFalsy()
  })

  test('Link Code owners cannot update another owner row through the app function', async () => {
    const securityFixture = requireFixture()
    const { data, error } = await invokeApp(ownerClient, appRequestIdentifiers.updateLinkCodeDetails, {
      displayName: `${securityFixture.prefix} stolen`,
      id: securityFixture.linkCodes.hidden,
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com/stolen'
      }
    })

    expect(error).toBeTruthy()
    expect(data).toBeFalsy()

    const { data: row, error: rowError } = await createAdminClient()
      .from('link_codes')
      .select('display_name, redirect_url, response_mode')
      .eq('id', securityFixture.linkCodes.hidden)
      .single()

    expect(rowError).toBeFalsy()
    expect(row).toEqual({
      display_name: `${securityFixture.prefix} hidden Link Code`,
      redirect_url: null,
      response_mode: 'raw_content'
    })
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
      .update({
        display_name: `${securityFixture.prefix} updated by owner`,
        redirect_url: 'https://example.com/cross-owner',
        response_mode: 'redirect'
      })
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

  test('users cannot directly read or mutate manual premium entitlements', async () => {
    const securityFixture = requireFixture()
    const ownerRead = await ownerClient
      .from('manual_premium_entitlements')
      .select('user_id')

    expect(ownerRead.error || (ownerRead.data ?? []).length === 0).toBeTruthy()

    const outsiderInsert = await outsiderClient
      .from('manual_premium_entitlements')
      .insert({
        user_id: securityFixture.users.outsider.id
      })

    expect(outsiderInsert.error).toBeTruthy()

    const ownerDelete = await ownerClient
      .from('manual_premium_entitlements')
      .delete()
      .eq('user_id', securityFixture.users.owner.id)
      .select('user_id')

    expect(ownerDelete.error || (ownerDelete.data ?? []).length === 0).toBeTruthy()

    const { data, error } = await createAdminClient()
      .from('manual_premium_entitlements')
      .select('user_id')
      .eq('user_id', securityFixture.users.owner.id)
      .single()

    expect(error).toBeFalsy()
    expect(data?.user_id).toBe(securityFixture.users.owner.id)
  })

  test('Link Code owners cannot directly update code strings', async () => {
    const securityFixture = requireFixture()
    const premiumDirectUpdate = await ownerClient
      .from('link_codes')
      .update({
        code: `${securityFixture.prefix}-direct-premium`
      })
      .eq('id', securityFixture.linkCodes.visible)
      .select('id')

    expect(premiumDirectUpdate.error).toBeTruthy()

    const nonPremiumDirectUpdate = await outsiderClient
      .from('link_codes')
      .update({
        code: `${securityFixture.prefix}-direct-non-premium`
      })
      .eq('id', securityFixture.linkCodes.hidden)
      .select('id')

    expect(nonPremiumDirectUpdate.error).toBeTruthy()

    const rows = await selectLinkCodes(createAdminClient())
    const visibleRow = rows.find((row) => row.id === securityFixture.linkCodes.visible)
    const hiddenRow = rows.find((row) => row.id === securityFixture.linkCodes.hidden)

    expect(visibleRow?.code).toBe(`${securityFixture.prefix}-visible`)
    expect(hiddenRow?.code).toBe(`${securityFixture.prefix}-hidden`)
  })

  test('anonymous users cannot directly delete Link Codes', async () => {
    const securityFixture = requireFixture()
    const deleted = await anonymousClient
      .from('link_codes')
      .delete()
      .eq('id', securityFixture.linkCodes.visible)
      .select('id')

    expect(deleted.data ?? []).toHaveLength(0)

    const { data, error } = await createAdminClient()
      .from('link_codes')
      .select('display_name')
      .eq('id', securityFixture.linkCodes.visible)
      .single()

    expect(error).toBeFalsy()
    expect(data?.display_name).toBe(`${securityFixture.prefix} visible Link Code`)
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
