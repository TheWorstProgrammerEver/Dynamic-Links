import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type {
  LinkCodeResponseMode,
  LinkCodeStatus,
  PublicLinkCodeLookup
} from '../../../common/linkCodeTypes.ts'
import { publicLinkCodeFromResolverPathname } from '../../../common/linkCodePublicUrls.ts'

type PublicLinkCodeRow = {
  code: string
  raw_content: string | null
  redirect_url: string | null
  response_mode: LinkCodeResponseMode
  status: LinkCodeStatus
}

const publicLinkCodeFields = [
  'code',
  'raw_content',
  'redirect_url',
  'response_mode',
  'status'
].join(', ')

const responseHeaders = {
  'cache-control': 'no-store'
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

const isConfigured = (row: PublicLinkCodeRow) => {
  if (row.status !== 'active') {
    return false
  }

  if (row.response_mode === 'redirect') {
    return Boolean(row.redirect_url?.trim())
  }

  return row.raw_content !== null
}

const lookupPublicLinkCode = async (
  client: SupabaseClient,
  code: string
): Promise<PublicLinkCodeLookup | undefined> => {
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

  if (!isConfigured(row)) {
    return undefined
  }

  return {
    code: row.code,
    responseMode: row.response_mode
  }
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
      const lookup = await lookupPublicLinkCode(createServiceRoleClient(), code)

      return lookup
        ? Response.json(lookup, { headers: responseHeaders })
        : safeNotFound()
    } catch (error) {
      console.error(error)

      return serverUnavailable()
    }
  }
}
