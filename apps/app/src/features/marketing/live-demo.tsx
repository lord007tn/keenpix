import { useEffect, useState } from 'react'

export function LiveDemo() {
  const [format, setFormat] = useState('webp')
  const [width, setWidth] = useState('960')
  const [quality, setQuality] = useState('70')
  const url = `/demo/img/og.png?fmt=${format}&q=${quality}&w=${width}`
  const [result, setResult] = useState<{
    src: string
    bytes: number
    original: number
    width: string
    height: string
    format: string
    cache: string
  } | null>(null)
  const [state, setState] = useState('loading')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    setState('loading')
    setMessage('')
    setCopied(false)
    const timer = setTimeout(() => setMessage('Generating…'), 300)
    async function measure() {
      try {
        const response = await fetch(url, { signal: controller.signal })
        if (response.status === 503) {
          setState('busy')
          setResult(null)
          setMessage(
            'The demo is busy. Try again in a minute. This is a static copy, not a live result.',
          )
          return
        }
        if (!response.ok) {
          throw new Error('Demo unavailable')
        }
        const blob = await response.blob()
        if (controller.signal.aborted) {
          return
        }
        const objectUrl = URL.createObjectURL(blob)
        const headers = response.headers
        let cacheLabel = ''
        if (headers.get('cf-cache-status') === 'HIT') {
          cacheLabel = 'Served from Cloudflare cache'
        } else if (headers.get('x-keenpix-cache') === 'HIT') {
          cacheLabel = 'From Keenpix cache'
        } else if (headers.get('x-keenpix-cache') === 'MISS') {
          cacheLabel = 'Generated on this request'
        }
        setResult({
          src: objectUrl,
          bytes: blob.size,
          original: Number(headers.get('x-keenpix-original-bytes')),
          width: headers.get('x-keenpix-output-width') ?? '—',
          height: headers.get('x-keenpix-output-height') ?? '—',
          format: headers.get('x-keenpix-output-format') ?? format,
          cache: cacheLabel,
        })
        setState('ready')
        setMessage('')
      } catch {
        if (!controller.signal.aborted) {
          setState('failed')
          setMessage(
            'The live demo is unavailable right now. This is a static copy, not a live result.',
          )
        }
      } finally {
        clearTimeout(timer)
      }
    }
    measure()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [url, format])
  useEffect(() => {
    const src = result?.src
    return () => {
      if (src) {
        URL.revokeObjectURL(src)
      }
    }
  }, [result?.src])
  let savings = ''
  if (result) {
    savings =
      result.bytes <= result.original
        ? `${Math.round((1 - result.bytes / result.original) * 100)}% smaller`
        : `${Math.round((result.bytes / result.original - 1) * 100)}% larger than the original — try another format or quality`
  }
  const fullUrl = `https://keenpix.com${url}`
  return (
    <div
      className="min-w-0 text-foreground lg:col-start-2 lg:row-span-2 lg:row-start-1"
      id="demo"
    >
      <div className="rounded-xl border bg-background p-4 shadow-xl sm:p-5">
        <h2 className="mb-4 font-semibold text-sm">Live Keenpix engine demo</h2>
        <div className="space-y-3">
          {[
            {
              label: 'Format',
              values: ['avif', 'webp', 'jpeg'],
              selected: format,
              select: setFormat,
            },
            {
              label: 'Width',
              values: ['320', '640', '960', '1200'],
              selected: width,
              select: setWidth,
            },
            {
              label: 'Quality',
              values: ['50', '70', '85'],
              selected: quality,
              select: setQuality,
            },
          ].map((control) => (
            <fieldset disabled={state === 'failed'} key={control.label}>
              <legend className="mb-1 text-muted-foreground text-xs">
                {control.label}
              </legend>
              <div className="flex w-full gap-1">
                {control.values.map((value) => (
                  <button
                    aria-pressed={control.selected === value}
                    className="min-h-11 flex-1 rounded-md border px-2 text-sm uppercase hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    key={value}
                    onClick={() => {
                      control.select(value)
                      setCopied(false)
                    }}
                    type="button"
                  >
                    {value === 'webp' ? 'WebP' : value}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="mt-4 aspect-[1200/630] overflow-hidden rounded-md bg-muted">
          {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError reports codec support, not user interaction. */}
          <img
            alt="Keenpix brand card, sample for the demo"
            className="h-full w-full object-contain"
            height="630"
            onError={() => {
              if (result && state !== 'failed') {
                setMessage(
                  `Your browser can't display ${result.format.toUpperCase()}. The file was generated (${(result.bytes / 1024).toFixed(1)} KB). Try WebP.`,
                )
              }
            }}
            src={
              state === 'failed' || state === 'busy'
                ? '/brand/keenpix-og.png'
                : (result?.src ?? url)
            }
            width="1200"
          />
        </div>
        <div className="mt-3 overflow-x-auto whitespace-nowrap rounded bg-muted p-2 font-mono text-xs">
          {fullUrl}
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <button
            className="min-h-11 rounded border px-3 text-sm hover:bg-accent"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(fullUrl)
                setCopied(true)
              } catch {
                setMessage('Copy unavailable. Select the URL above to copy it.')
              }
            }}
            type="button"
          >
            {copied ? 'Copied' : 'Copy URL'}
          </button>
          <a
            className="inline-flex min-h-11 items-center justify-center rounded border px-3 text-sm hover:bg-accent"
            href={url}
            rel="noreferrer"
            target="_blank"
          >
            Open image
          </a>
          {state === 'busy' && (
            <button
              className="min-h-11 rounded border px-3"
              onClick={() => {
                setWidth(width === '960' ? '640' : '960')
              }}
              type="button"
            >
              Try another width
            </button>
          )}
        </div>
        <p aria-live="polite" className="mt-2 text-muted-foreground text-sm">
          {message}
        </p>
        <dl
          aria-live="polite"
          className={`mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs ${state === 'loading' ? 'opacity-50' : ''}`}
        >
          <dt>Original</dt>
          <dd>
            {result && state !== 'failed'
              ? `${(result.original / 1024).toFixed(1)} KB · PNG · 1200×630`
              : '—'}
          </dd>
          <dt>Delivered</dt>
          <dd>
            {result && state !== 'failed'
              ? `${(result.bytes / 1024).toFixed(1)} KB · ${result.format.toUpperCase()} · ${result.width}×${result.height}`
              : '—'}
          </dd>
          <dt>Result</dt>
          <dd>{result && state !== 'failed' ? savings : '—'}</dd>
          {result?.cache && state !== 'failed' && (
            <>
              <dt>Cache</dt>
              <dd>{result.cache}</dd>
            </>
          )}
        </dl>
        <p className="mt-3 text-muted-foreground text-xs">
          Measured in your browser from this response. Savings depend on the
          source image.
        </p>
      </div>
      <div className="mt-4 space-y-3 text-sm text-white/80 leading-relaxed">
        <p>
          This runs the same open-source transform pipeline as Keenpix cloud,
          with a bounded in-process cache, on keenpix.com with fixed sample
          images and options. It is not a customer project: no account,
          allowlist, or billing, and it isn't counted in usage. Your project's
          URLs look like:
        </p>
        <code className="block overflow-x-auto whitespace-nowrap text-xs">
          {
            'https://cdn.keenpix.com/p/<project-id>/img/<url-encoded-source>?fmt=webp&q=70&w=960'
          }
        </code>
        <p>
          Real projects can also leave fmt unset and let Keenpix choose AVIF,
          WebP, or JPEG from the browser's Accept header.
        </p>
        <div className="flex gap-4">
          <a
            className="inline-flex min-h-11 items-center underline"
            href="/signup"
          >
            Start free trial
          </a>
          <a
            className="inline-flex min-h-11 items-center underline"
            href="/docs/reference/parameters"
          >
            URL parameters →
          </a>
        </div>
      </div>
    </div>
  )
}
