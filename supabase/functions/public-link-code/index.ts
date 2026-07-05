import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  resolvePublicLinkCodeRow,
  type PublicLinkCodeResolution,
  type PublicLinkCodeResolverRow
} from '../../../common/publicLinkCodeResolution.ts'
import { publicLinkCodeFromResolverPathname } from '../../../common/linkCodePublicUrls.ts'

type PublicLinkCodeRow = PublicLinkCodeResolverRow

const publicLinkCodeFields = [
  'raw_response_message',
  'redirect_url',
  'response_mode',
  'status'
].join(', ')

const responseHeaders = {
  'cache-control': 'no-store, max-age=0',
  expires: '0',
  pragma: 'no-cache'
}

const safeNotFound = () => Response.json(
  { error: 'Link Code not found.' },
  { headers: responseHeaders, status: 404 }
)

const methodNotAllowed = () => Response.json(
  { error: 'Method not allowed' },
  {
    headers: {
      ...responseHeaders,
      allow: 'GET'
    },
    status: 405
  }
)

const serverUnavailable = () => Response.json(
  { error: 'Public Link Code resolver is unavailable.' },
  { headers: responseHeaders, status: 500 }
)

const redirectTo = (location: string) => new Response(null, {
  headers: {
    ...responseHeaders,
    location
  },
  status: 302
})

const respondWithRawContent = (resolution: Extract<PublicLinkCodeResolution, { responseMode: 'raw_content' }>) => {
  const body = [204, 205, 304].includes(resolution.status) ? null : resolution.body

  return new Response(body, {
    headers: resolution.headers,
    status: resolution.status,
    statusText: resolution.statusText
  })
}

const requireEnvironmentValue = (name: string) => {
  const value = Deno.env.get(name)

  if (!value) {
    throw new Error('Public resolver environment is incomplete.')
  }

  return value
}

const createServiceRoleClient = () => createClient(
  requireEnvironmentValue('SUPABASE_URL'),
  requireEnvironmentValue('SUPABASE_SERVICE_ROLE_KEY'),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const lookupPublicLinkCode = async (
  client: SupabaseClient,
  code: string
): Promise<PublicLinkCodeResolution | undefined> => {
  const { data, error } = await client
    .from('link_codes')
    .select(publicLinkCodeFields)
    .eq('code', code)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return undefined
  }

  const row = data as PublicLinkCodeRow

  return resolvePublicLinkCodeRow(row)
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'GET') {
      return methodNotAllowed()
    }

    const code = publicLinkCodeFromResolverPathname(new URL(request.url).pathname)

    if (!code) {
      return safeNotFound()
    }

    try {
      const resolution = await lookupPublicLinkCode(createServiceRoleClient(), code)

      if (!resolution) {
        return safeNotFound()
      }

      return resolution.responseMode === 'redirect'
        ? redirectTo(resolution.redirectUrl)
        : respondWithRawContent(resolution)
    } catch (error) {
      console.error(error)

      return serverUnavailable()
    }
  }
}
