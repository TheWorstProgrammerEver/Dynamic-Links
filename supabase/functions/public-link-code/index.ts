import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type {
  LinkCodeResponseMode,
  LinkCodeStatus,
  PublicLinkCodeLookup
} from '../../../common/linkCodeTypes.ts'
import {
  LinkCodeDetailsValidationError,
  normalizeRedirectUrl
} from '../../../common/linkCodeDetails.ts'
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
  'cache-control': 'no-store, max-age=0',
  expires: '0',
  pragma: 'no-cache'
}

type PublicLinkCodeResolution =
  | {
    lookup: PublicLinkCodeLookup
    redirectUrl: string
    responseMode: 'redirect'
  }
  | {
    lookup: PublicLinkCodeLookup
    responseMode: 'raw_content'
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

const normalizeStoredRedirectUrl = (redirectUrl: string | null) => {
  if (!redirectUrl?.trim()) {
    return undefined
  }

  try {
    return normalizeRedirectUrl(redirectUrl)
  } catch (error) {
    if (error instanceof LinkCodeDetailsValidationError) {
      return undefined
    }

    throw error
  }
}

const resolutionFromRow = (row: PublicLinkCodeRow): PublicLinkCodeResolution | undefined => {
  if (row.status !== 'active') {
    return undefined
  }

  if (row.response_mode === 'redirect') {
    const redirectUrl = normalizeStoredRedirectUrl(row.redirect_url)

    return redirectUrl
      ? {
        lookup: {
          code: row.code,
          responseMode: row.response_mode
        },
        redirectUrl,
        responseMode: row.response_mode
      }
      : undefined
  }

  return row.raw_content === null
    ? undefined
    : {
      lookup: {
        code: row.code,
        responseMode: row.response_mode
      },
      responseMode: row.response_mode
    }
}

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

  return resolutionFromRow(row)
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
        : Response.json(resolution.lookup, { headers: responseHeaders })
    } catch (error) {
      console.error(error)

      return serverUnavailable()
    }
  }
}
