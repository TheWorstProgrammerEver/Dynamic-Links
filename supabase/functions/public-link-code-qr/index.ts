import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import QRCode from 'npm:qrcode@1.5.4'
import {
  createPublicLinkCodeQrEtag,
  createPublicLinkCodeQrSourceUrl,
  publicLinkCodeQrEtagMatches,
  publicLinkCodeQrImageCacheControl,
  publicLinkCodeQrImageContentType
} from '../../../common/linkCodeQrImages.ts'
import {
  normalizePublicLinkCodeHost,
  publicLinkCodeFromQrResolverPathname
} from '../../../common/linkCodePublicUrls.ts'

type QrCodeRenderer = {
  toBuffer: (
    value: string,
    options: {
      color: {
        dark: string
        light: string
      }
      errorCorrectionLevel: 'M'
      margin: number
      scale: number
      type: 'png'
    }
  ) => Promise<Uint8Array>
}

const qrCode = QRCode as QrCodeRenderer

const errorHeaders = {
  'cache-control': 'no-store, max-age=0',
  'x-content-type-options': 'nosniff'
}

const safeNotFound = () => Response.json(
  { error: 'Link Code QR image not found.' },
  { headers: errorHeaders, status: 404 }
)

const methodNotAllowed = () => Response.json(
  { error: 'Method not allowed' },
  {
    headers: {
      ...errorHeaders,
      allow: 'GET'
    },
    status: 405
  }
)

const serverUnavailable = () => Response.json(
  { error: 'Link Code QR image renderer is unavailable.' },
  { headers: errorHeaders, status: 500 }
)

const requireEnvironmentValue = (name: string) => {
  const value = Deno.env.get(name)

  if (!value) {
    throw new Error('Public QR renderer environment is incomplete.')
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

const publicLinkHost = () => (
  normalizePublicLinkCodeHost(requireEnvironmentValue('PUBLIC_LINK_HOST'))
)

const linkCodeExists = async (client: SupabaseClient, code: string) => {
  const { data, error } = await client
    .from('link_codes')
    .select('code')
    .eq('code', code)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

const renderQrPng = async (sourceUrl: string) => new Uint8Array(await qrCode.toBuffer(sourceUrl, {
  color: {
    dark: '#000000',
    light: '#ffffff'
  },
  errorCorrectionLevel: 'M',
  margin: 2,
  scale: 8,
  type: 'png'
}))

const createImageResponse = async (request: Request, code: string) => {
  const sourceUrl = createPublicLinkCodeQrSourceUrl(publicLinkHost(), code)
  const etag = await createPublicLinkCodeQrEtag(sourceUrl)
  const headers = {
    'cache-control': publicLinkCodeQrImageCacheControl,
    'content-type': publicLinkCodeQrImageContentType,
    etag,
    'x-content-type-options': 'nosniff'
  }

  if (publicLinkCodeQrEtagMatches(request.headers.get('if-none-match'), etag)) {
    return new Response(null, {
      headers,
      status: 304
    })
  }

  return new Response(await renderQrPng(sourceUrl), { headers })
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'GET') {
      return methodNotAllowed()
    }

    const code = publicLinkCodeFromQrResolverPathname(new URL(request.url).pathname)

    if (!code) {
      return safeNotFound()
    }

    try {
      if (!await linkCodeExists(createServiceRoleClient(), code)) {
        return safeNotFound()
      }

      return await createImageResponse(request, code)
    } catch (error) {
      console.error(error)

      return serverUnavailable()
    }
  }
}
