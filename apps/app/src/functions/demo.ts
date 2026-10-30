import { generateDemoImage, recordDemoError } from '@/actions/demo'
import { isCloud } from '@/server/deployment'

export async function handleDemoRequest(request: Request, sample?: string) {
  if (!isCloud()) {
    return new Response('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
  const { pathname, search, searchParams: params } = new URL(request.url)
  const invalid = [...params].find(
    ([key]) =>
      !['fmt', 'q', 'w'].includes(key) || params.getAll(key).length !== 1,
  )
  const format = params.get('fmt')
  const quality = params.get('q')
  const width = params.get('w')
  let problem = invalid
  if (sample !== 'og.png') {
    problem = ['sample', sample ?? 'missing']
  } else if (format !== 'avif' && format !== 'webp' && format !== 'jpeg') {
    problem = ['fmt', format ?? 'missing']
  } else if (!['50', '70', '85'].includes(quality ?? '')) {
    problem = ['q', quality ?? 'missing']
  } else if (!['320', '640', '960', '1200'].includes(width ?? '')) {
    problem = ['w', width ?? 'missing']
  } else if (
    !invalid &&
    (pathname !== '/demo/img/og.png' ||
      search !== `?fmt=${format}&q=${quality}&w=${width}`)
  ) {
    // Cloudflare caches by raw URL, so each variant gets exactly one cacheable spelling.
    problem = ['url', 'a non-canonical spelling']
  }
  if (
    problem ||
    (format !== 'avif' && format !== 'webp' && format !== 'jpeg')
  ) {
    recordDemoError()
    return new Response(
      `This demo accepts only fmt=avif|webp|jpeg, w=320|640|960|1200, q=50|70|85. Received: ${problem?.[0]}=${problem?.[1]}. Customer projects support the full parameter set: https://keenpix.com/docs/reference/parameters`,
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'text/plain; charset=utf-8',
        },
      },
    )
  }
  try {
    const result = await generateDemoImage(
      format,
      Number(quality),
      Number(width),
    )
    if (!result) {
      return new Response('The demo is busy. Try again in a minute.', {
        status: 503,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
      })
    }
    return new Response(new Uint8Array(result.image.data), {
      headers: {
        'Content-Type': `image/${format}`,
        'Content-Length': String(result.image.data.length),
        'Cache-Control': 'public, max-age=86400, no-transform',
        'X-Keenpix-Original-Bytes': String(result.originalBytes),
        'X-Keenpix-Output-Width': String(result.image.width),
        'X-Keenpix-Output-Height': String(result.image.height),
        'X-Keenpix-Output-Format': format,
        'X-Keenpix-Cache': result.cache,
        'X-Robots-Tag': 'noindex',
        'Timing-Allow-Origin': '*',
      },
    })
  } catch {
    return new Response('Demo unavailable', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
