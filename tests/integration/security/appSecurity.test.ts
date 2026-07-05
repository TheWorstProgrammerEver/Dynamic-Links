import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { appRequestIdentifiers, appRequestNames } from '../../../common/appRequestIdentifiers'
import {
  createPublicLinkCodePath,
  createPublicLinkCodeQrPath,
  createPublicLinkCodeQrUrl,
  createPublicLinkCodeUrl
} from '../../../common/linkCodePublicUrls'
import {
  createPublicLinkCodeQrEtag,
  publicLinkCodeQrImageCacheControl,
  publicLinkCodeQrImageContentType
} from '../../../common/linkCodeQrImages'
import {
  createAdminClient,
  createAnonymousClient,
  getLocalSupabaseConfig,
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
  raw_response_message: string | null
  redirect_url: string | null
  response_mode: string
  status: string
}

let fixture: SecurityFixture | undefined
let anonymousClient: SupabaseClient
let ownerClient: SupabaseClient
let outsiderClient: SupabaseClient
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]

const getLocalPublicLinkHost = () => {
  try {
    const config = JSON.parse(readFileSync('public/config.local.json', 'utf8')) as {
      publicLinks?: {
        host?: string
      }
    }

    return config.publicLinks?.host ?? 'http://127.0.0.1:5173'
  } catch {
    return 'http://127.0.0.1:5173'
  }
}

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
    .select('id, owner_user_id, display_name, code, redirect_url, raw_response_message, response_mode, status')
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

const insertLinkCode = async ({
  code,
  displayName,
  ownerUserId,
  rawResponseMessage = null,
  redirectUrl = null,
  responseMode = 'redirect',
  status = 'active'
}: {
  code: string
  displayName: string
  ownerUserId: string
  rawResponseMessage?: string | null
  redirectUrl?: string | null
  responseMode?: string
  status?: string
}) => {
  const row: {
    code: string
    display_name: string
    owner_user_id: string
    raw_response_message: string | null
    redirect_url: string | null
    response_mode: string
    status: string
  } = {
    owner_user_id: ownerUserId,
    display_name: displayName,
    code,
    raw_response_message: rawResponseMessage,
    redirect_url: redirectUrl,
    response_mode: responseMode,
    status
  }

  const { data, error } = await createAdminClient()
    .from('link_codes')
    .insert(row)
    .select('id')
    .single()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Link Code fixture row was not created.')
  }

  return data.id as string
}

const fetchPublicLinkCode = async (code: string) => {
  const { url } = getLocalSupabaseConfig()

  return await fetch(`${url}/functions/v1/public-link-code/${encodeURIComponent(code)}`, {
    redirect: 'manual'
  })
}

const fetchPublicLinkCodeQr = async (code: string, headers: Record<string, string> = {}) => {
  const { url } = getLocalSupabaseConfig()

  return await fetch(`${url}/functions/v1/public-link-code-qr/${encodeURIComponent(code)}/qr.png`, {
    headers
  })
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

  test('public Link Code paths use the canonical code route', () => {
    const securityFixture = requireFixture()

    expect(createPublicLinkCodePath(`${securityFixture.prefix}-visible`))
      .toBe(`/code/${encodeURIComponent(`${securityFixture.prefix}-visible`)}`)
  })

  test('public QR image route returns a cacheable PNG for the canonical public URL', async () => {
    const securityFixture = requireFixture()
    const code = `${securityFixture.prefix}-visible`
    const publicTestHost = getLocalPublicLinkHost()
    const sourceUrl = createPublicLinkCodeUrl(publicTestHost, code)
    const response = await fetchPublicLinkCodeQr(code)
    const body = new Uint8Array(await response.arrayBuffer())
    const etag = response.headers.get('etag')

    expect(createPublicLinkCodeQrPath(code))
      .toBe(`/code/${encodeURIComponent(code)}/qr.png`)
    expect(createPublicLinkCodeQrUrl(publicTestHost, code))
      .toBe(`${sourceUrl}/qr.png`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe(publicLinkCodeQrImageContentType)
    expect(response.headers.get('cache-control')).toBe(publicLinkCodeQrImageCacheControl)
    expect(etag).toBe(await createPublicLinkCodeQrEtag(sourceUrl))
    expect(Array.from(body.slice(0, pngSignature.length))).toEqual(pngSignature)

    const cachedResponse = await fetchPublicLinkCodeQr(code, {
      'if-none-match': etag ?? ''
    })
    const cachedBody = new Uint8Array(await cachedResponse.arrayBuffer())

    expect(cachedResponse.status).toBe(304)
    expect(cachedBody).toHaveLength(0)
  })

  test('unknown public QR image requests return a non-image 404', async () => {
    const securityFixture = requireFixture()
    const response = await fetchPublicLinkCodeQr(`${securityFixture.prefix}-missing`)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.headers.get('content-type')).not.toContain('image/png')
    expect(body).toEqual({ error: 'Link Code QR image not found.' })
  })

  test('anonymous users are redirected by configured redirect Link Codes through the public function', async () => {
    const securityFixture = requireFixture()
    const response = await fetchPublicLinkCode(`${securityFixture.prefix}-visible`)
    const body = await response.text()

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://example.com/visible')
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(body).toBe('')
    expect(`${response.headers.get('location') ?? ''}${body}`).not.toContain(securityFixture.users.owner.id)
    expect(`${response.headers.get('location') ?? ''}${body}`)
      .not.toContain(`${securityFixture.prefix} visible Link Code`)
  })

  test('unknown Link Codes return a safe public 404', async () => {
    const securityFixture = requireFixture()
    const response = await fetchPublicLinkCode(`${securityFixture.prefix}-missing`)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(response.headers.get('location')).toBeNull()
    expect(body).toEqual({ error: 'Link Code not found.' })
  })

  test('unconfigured Link Codes return a safe public 404', async () => {
    const securityFixture = requireFixture()
    let createdId: string | undefined

    try {
      createdId = await insertLinkCode({
        ownerUserId: securityFixture.users.owner.id,
        displayName: `${securityFixture.prefix} unconfigured public Link Code`,
        code: `${securityFixture.prefix}-unconfigured`
      })

      const response = await fetchPublicLinkCode(`${securityFixture.prefix}-unconfigured`)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(response.headers.get('location')).toBeNull()
      expect(body).toEqual({ error: 'Link Code not found.' })
      expect(JSON.stringify(body)).not.toContain(securityFixture.users.owner.id)
      expect(JSON.stringify(body)).not.toContain('unconfigured public Link Code')
    } finally {
      await deleteLinkCode(createdId)
    }
  })

  test('unconfigured content-mode Link Codes return a safe public 404', async () => {
    const securityFixture = requireFixture()
    let createdId: string | undefined

    try {
      createdId = await insertLinkCode({
        ownerUserId: securityFixture.users.owner.id,
        displayName: `${securityFixture.prefix} unconfigured content Link Code`,
        code: `${securityFixture.prefix}-content-unconfigured`,
        rawResponseMessage: null,
        responseMode: 'raw_content'
      })

      const response = await fetchPublicLinkCode(`${securityFixture.prefix}-content-unconfigured`)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(response.headers.get('location')).toBeNull()
      expect(body).toEqual({ error: 'Link Code not found.' })
      expect(JSON.stringify(body)).not.toContain(securityFixture.users.owner.id)
      expect(JSON.stringify(body)).not.toContain('unconfigured content Link Code')
    } finally {
      await deleteLinkCode(createdId)
    }
  })

  test('configured content-mode Link Codes serve raw content through the public function', async () => {
    const securityFixture = requireFixture()
    let createdId: string | undefined

    try {
      createdId = await insertLinkCode({
        ownerUserId: securityFixture.users.owner.id,
        displayName: `${securityFixture.prefix} public content Link Code`,
        code: `${securityFixture.prefix}-content`,
        rawResponseMessage: [
          'HTTP/1.1 203 Non-Authoritative Information',
          'Content-Type: text/html; charset=utf-8',
          'Content-Length: 23',
          'X-Link-Code-Test: configured',
          '',
          '<h1>Public content</h1>'
        ].join('\n'),
        responseMode: 'raw_content'
      })

      const response = await fetchPublicLinkCode(`${securityFixture.prefix}-content`)
      const body = await response.text()

      expect(response.status).toBe(203)
      expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
      expect(response.headers.get('x-link-code-test')).toBe('configured')
      expect(response.headers.get('cache-control')).toBeNull()
      expect(response.headers.get('location')).toBeNull()
      expect(body).toBe('<h1>Public content</h1>')
      expect(body).not.toContain(securityFixture.users.owner.id)
      expect(body).not.toContain('public content Link Code')
    } finally {
      await deleteLinkCode(createdId)
    }
  })

  test('content-mode Link Codes serve the default raw response message', async () => {
    const securityFixture = requireFixture()
    let createdId: string | undefined

    try {
      createdId = await insertLinkCode({
        ownerUserId: securityFixture.users.owner.id,
        displayName: `${securityFixture.prefix} default content metadata Link Code`,
        code: `${securityFixture.prefix}-content-defaults`,
        rawResponseMessage: 'HTTP/1.1 200 OK\nContent-Type: text/plain; charset=utf-8\n\ndefault public content',
        responseMode: 'raw_content'
      })

      const response = await fetchPublicLinkCode(`${securityFixture.prefix}-content-defaults`)
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
      expect(response.headers.get('location')).toBeNull()
      expect(body).toBe('default public content')
    } finally {
      await deleteLinkCode(createdId)
    }
  })

  test('redirect-mode Link Codes do not serve stale raw content through the public function', async () => {
    const securityFixture = requireFixture()
    let createdId: string | undefined

    try {
      createdId = await insertLinkCode({
        ownerUserId: securityFixture.users.owner.id,
        displayName: `${securityFixture.prefix} stale content redirect Link Code`,
        code: `${securityFixture.prefix}-redirect-stale-content`,
        rawResponseMessage: 'HTTP/1.1 200 OK\nContent-Type: text/plain\n\nstale public content',
        redirectUrl: 'https://example.com/stale-content',
        responseMode: 'redirect'
      })

      const response = await fetchPublicLinkCode(`${securityFixture.prefix}-redirect-stale-content`)
      const body = await response.text()

      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toBe('https://example.com/stale-content')
      expect(body).toBe('')
      expect(`${response.headers.get('location') ?? ''}${body}`).not.toContain('stale public content')
    } finally {
      await deleteLinkCode(createdId)
    }
  })

  test('deleted Link Codes return a safe public 404 without redirecting', async () => {
    const securityFixture = requireFixture()
    const code = `${securityFixture.prefix}-deleted`
    let createdId: string | undefined

    try {
      createdId = await insertLinkCode({
        ownerUserId: securityFixture.users.owner.id,
        displayName: `${securityFixture.prefix} deleted public Link Code`,
        code,
        redirectUrl: 'https://example.com/deleted'
      })
      await deleteLinkCode(createdId)
      createdId = undefined

      const response = await fetchPublicLinkCode(code)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(response.headers.get('location')).toBeNull()
      expect(body).toEqual({ error: 'Link Code not found.' })
    } finally {
      await deleteLinkCode(createdId)
    }
  })

  test('invalid stored redirect URLs return a safe public 404 without redirecting', async () => {
    const securityFixture = requireFixture()
    const code = `${securityFixture.prefix}-invalid-redirect`
    let createdId: string | undefined

    try {
      createdId = await insertLinkCode({
        ownerUserId: securityFixture.users.owner.id,
        displayName: `${securityFixture.prefix} invalid redirect public Link Code`,
        code,
        redirectUrl: 'http://'
      })

      const response = await fetchPublicLinkCode(code)
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(response.headers.get('location')).toBeNull()
      expect(body).toEqual({ error: 'Link Code not found.' })
      expect(JSON.stringify(body)).not.toContain(securityFixture.users.owner.id)
      expect(JSON.stringify(body)).not.toContain('invalid redirect public Link Code')
    } finally {
      await deleteLinkCode(createdId)
    }
  })

  test('updated redirect URLs change public resolution without changing the public path', async () => {
    const securityFixture = requireFixture()
    const code = `${securityFixture.prefix}-mutable-redirect`
    const publicPath = createPublicLinkCodePath(code)
    let createdId: string | undefined

    try {
      createdId = await insertLinkCode({
        ownerUserId: securityFixture.users.owner.id,
        displayName: `${securityFixture.prefix} mutable redirect Link Code`,
        code,
        redirectUrl: 'https://example.com/first'
      })

      const firstResponse = await fetchPublicLinkCode(code)

      expect(firstResponse.status).toBe(302)
      expect(firstResponse.headers.get('location')).toBe('https://example.com/first')

      const { data, error } = await invokeApp(ownerClient, appRequestIdentifiers.updateLinkCodeDetails, {
        displayName: `${securityFixture.prefix} mutable redirect Link Code`,
        id: createdId,
        responseConfig: {
          mode: 'redirect',
          redirectUrl: ' https://example.com/second?source=update '
        },
        status: 'active'
      })

      expect(error).toBeFalsy()
      expect(data).toEqual(expect.objectContaining({
        code,
        responseConfig: {
          mode: 'redirect',
          redirectUrl: 'https://example.com/second?source=update'
        }
      }))
      expect(createPublicLinkCodePath(code)).toBe(publicPath)

      const secondResponse = await fetchPublicLinkCode(code)

      expect(secondResponse.status).toBe(302)
      expect(secondResponse.headers.get('location')).toBe('https://example.com/second?source=update')
    } finally {
      await deleteLinkCode(createdId)
    }
  })

  test('updated raw content changes public responses without changing the public path', async () => {
    const securityFixture = requireFixture()
    const code = `${securityFixture.prefix}-mutable-content`
    const publicPath = createPublicLinkCodePath(code)
    let createdId: string | undefined

    try {
      createdId = await insertLinkCode({
        ownerUserId: securityFixture.users.owner.id,
        displayName: `${securityFixture.prefix} mutable content Link Code`,
        code,
        rawResponseMessage: 'HTTP/1.1 200 OK\nContent-Type: text/plain; charset=utf-8\n\nfirst content',
        responseMode: 'raw_content'
      })

      const firstResponse = await fetchPublicLinkCode(code)

      expect(firstResponse.status).toBe(200)
      expect(await firstResponse.text()).toBe('first content')

      const { data, error } = await invokeApp(ownerClient, appRequestIdentifiers.updateLinkCodeDetails, {
        displayName: `${securityFixture.prefix} mutable content Link Code`,
        id: createdId,
        responseConfig: {
          mode: 'raw_content',
          responseMessage: 'HTTP/1.1 202 Accepted\nContent-Type: application/json; charset=utf-8\n\n{"message":"second content"}'
        },
        status: 'active'
      })

      expect(error).toBeFalsy()
      expect(data).toEqual(expect.objectContaining({
        code,
        responseConfig: {
          mode: 'raw_content',
          responseMessage: 'HTTP/1.1 202 Accepted\nContent-Type: application/json; charset=utf-8\n\n{"message":"second content"}'
        }
      }))
      expect(createPublicLinkCodePath(code)).toBe(publicPath)

      const secondResponse = await fetchPublicLinkCode(code)

      expect(secondResponse.status).toBe(202)
      expect(secondResponse.headers.get('content-type')).toBe('application/json; charset=utf-8')
      expect(await secondResponse.text()).toBe('{"message":"second content"}')
    } finally {
      await deleteLinkCode(createdId)
    }
  })

  test('status updates control public Link Code resolution through the app function', async () => {
    const securityFixture = requireFixture()
    const code = `${securityFixture.prefix}-status-publish`
    let createdId: string | undefined

    try {
      createdId = await insertLinkCode({
        ownerUserId: securityFixture.users.owner.id,
        displayName: `${securityFixture.prefix} status publish Link Code`,
        code,
        redirectUrl: 'https://example.com/published',
        status: 'draft'
      })

      const draftResponse = await fetchPublicLinkCode(code)

      expect(draftResponse.status).toBe(404)

      const activeUpdate = await invokeApp(ownerClient, appRequestIdentifiers.updateLinkCodeDetails, {
        displayName: `${securityFixture.prefix} status publish Link Code`,
        id: createdId,
        responseConfig: {
          mode: 'redirect',
          redirectUrl: 'https://example.com/published'
        },
        status: 'active'
      })

      expect(activeUpdate.error).toBeFalsy()
      expect(activeUpdate.data).toEqual(expect.objectContaining({
        id: createdId,
        status: 'active'
      }))

      const activeResponse = await fetchPublicLinkCode(code)

      expect(activeResponse.status).toBe(302)
      expect(activeResponse.headers.get('location')).toBe('https://example.com/published')

      const disabledUpdate = await invokeApp(ownerClient, appRequestIdentifiers.updateLinkCodeDetails, {
        displayName: `${securityFixture.prefix} status publish Link Code`,
        id: createdId,
        responseConfig: {
          mode: 'redirect',
          redirectUrl: 'https://example.com/published'
        },
        status: 'disabled'
      })

      expect(disabledUpdate.error).toBeFalsy()
      expect(disabledUpdate.data).toEqual(expect.objectContaining({
        id: createdId,
        status: 'disabled'
      }))

      const disabledResponse = await fetchPublicLinkCode(code)

      expect(disabledResponse.status).toBe(404)
    } finally {
      await deleteLinkCode(createdId)
    }
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
          mode: 'raw_content',
          responseMessage: 'HTTP/1.1 202 Accepted\nContent-Type: text/html; charset=utf-8\n\nUpdated content'
        },
        status: 'active'
      })

      expect(error).toBeFalsy()
      expect(data).toEqual(expect.objectContaining({
        displayName: `${securityFixture.prefix} updated content`,
        id: createdId,
        responseConfig: {
          mode: 'raw_content',
          responseMessage: 'HTTP/1.1 202 Accepted\nContent-Type: text/html; charset=utf-8\n\nUpdated content'
        },
        responseMode: 'raw_content',
        status: 'active'
      }))

      const { data: row, error: rowError } = await createAdminClient()
        .from('link_codes')
        .select('display_name, redirect_url, raw_response_message, response_mode, status')
        .eq('id', createdId)
        .single()

      expect(rowError).toBeFalsy()
      expect(row).toEqual({
        display_name: `${securityFixture.prefix} updated content`,
        raw_response_message: 'HTTP/1.1 202 Accepted\nContent-Type: text/html; charset=utf-8\n\nUpdated content',
        redirect_url: null,
        response_mode: 'raw_content',
        status: 'active'
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
        },
        status: 'draft'
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
      },
      status: 'active'
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
        mode: 'raw_content',
        responseMessage: 'HTTP/1.1 200 OK\nContent-Type: text/plain; charset=utf-8\n\nhidden content'
      },
      status: 'draft'
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
      },
      status: 'active'
    })

    expect(error).toBeTruthy()
    expect(data).toBeFalsy()
  })

  test('Link Code updates reject invalid statuses through the app function', async () => {
    const securityFixture = requireFixture()
    const { data, error } = await invokeApp(ownerClient, appRequestIdentifiers.updateLinkCodeDetails, {
      displayName: `${securityFixture.prefix} invalid status`,
      id: securityFixture.linkCodes.visible,
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com/visible'
      },
      status: 'published'
    })

    expect(error).toBeTruthy()
    expect(data).toBeFalsy()

    const { data: row, error: rowError } = await createAdminClient()
      .from('link_codes')
      .select('status')
      .eq('id', securityFixture.linkCodes.visible)
      .single()

    expect(rowError).toBeFalsy()
    expect(row?.status).toBe('active')
  })

  test('Link Code owners cannot directly store unsafe redirect URLs', async () => {
    const securityFixture = requireFixture()
    const unsafeProtocolUpdate = await ownerClient
      .from('link_codes')
      .update({
        redirect_url: 'javascript:alert(1)',
        response_mode: 'redirect'
      })
      .eq('id', securityFixture.linkCodes.visible)
      .select('id')

    expect(unsafeProtocolUpdate.error).toBeTruthy()

    const lineBreakUpdate = await ownerClient
      .from('link_codes')
      .update({
        redirect_url: 'https://example.com/\r\nx-extra: value',
        response_mode: 'redirect'
      })
      .eq('id', securityFixture.linkCodes.visible)
      .select('id')

    expect(lineBreakUpdate.error).toBeTruthy()

    const { data: row, error: rowError } = await createAdminClient()
      .from('link_codes')
      .select('redirect_url')
      .eq('id', securityFixture.linkCodes.visible)
      .single()

    expect(rowError).toBeFalsy()
    expect(row?.redirect_url).toBe('https://example.com/visible')
  })

  test('Link Code updates reject invalid raw response messages through the app function', async () => {
    const securityFixture = requireFixture()
    const { data, error } = await invokeApp(ownerClient, appRequestIdentifiers.updateLinkCodeDetails, {
      displayName: `${securityFixture.prefix} invalid raw response`,
      id: securityFixture.linkCodes.visible,
      responseConfig: {
        mode: 'raw_content',
        responseMessage: 'HTTP/1.1 200 OK\nBad header\n\nHello'
      },
      status: 'active'
    })

    expect(error).toBeTruthy()
    expect(data).toBeFalsy()

    const { data: row, error: rowError } = await createAdminClient()
      .from('link_codes')
      .select('raw_response_message, response_mode')
      .eq('id', securityFixture.linkCodes.visible)
      .single()

    expect(rowError).toBeFalsy()
    expect(row).toEqual({
      raw_response_message: null,
      response_mode: 'redirect'
    })
  })

  test('Link Code owners cannot update another owner row through the app function', async () => {
    const securityFixture = requireFixture()
    const { data, error } = await invokeApp(ownerClient, appRequestIdentifiers.updateLinkCodeDetails, {
      displayName: `${securityFixture.prefix} stolen`,
      id: securityFixture.linkCodes.hidden,
      responseConfig: {
        mode: 'redirect',
        redirectUrl: 'https://example.com/stolen'
      },
      status: 'active'
    })

    expect(error).toBeTruthy()
    expect(data).toBeFalsy()

    const { data: row, error: rowError } = await createAdminClient()
      .from('link_codes')
      .select('display_name, redirect_url, response_mode, status')
      .eq('id', securityFixture.linkCodes.hidden)
      .single()

    expect(rowError).toBeFalsy()
    expect(row).toEqual({
      display_name: `${securityFixture.prefix} hidden Link Code`,
      redirect_url: null,
      response_mode: 'raw_content',
      status: 'draft'
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
