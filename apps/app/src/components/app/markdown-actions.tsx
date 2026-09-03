import { useRouterState } from '@tanstack/react-router'
import { CheckIcon, ClipboardIcon, FileTextIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  getMarkdownPathname,
  isPublicKnowledgePath,
} from '@/shared/markdown-discovery'

export function MarkdownActions() {
  const route = useRouterState({
    select: (state) => ({
      notFound: state.matches.some(
        (match) => match.status === 'notFound' || match.globalNotFound,
      ),
      pathname: state.location.pathname,
    }),
  })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) {
      return
    }
    const timeout = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timeout)
  }, [copied])

  if (route.notFound || !isPublicKnowledgePath(route.pathname)) {
    return null
  }

  const markdownPathname = getMarkdownPathname(route.pathname)

  async function copyMarkdown() {
    try {
      const response = await fetch(route.pathname, {
        headers: { Accept: 'text/markdown' },
      })
      if (!response.ok) {
        throw new Error(`Markdown request failed: ${response.status}`)
      }
      await navigator.clipboard.writeText(await response.text())
      setCopied(true)
      toast.success('Markdown copied')
    } catch {
      toast.error('Could not copy Markdown')
    }
  }

  return (
    <aside
      aria-label="Markdown actions"
      className="fixed right-3 bottom-3 z-40 flex items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-lg backdrop-blur sm:right-5 sm:bottom-5"
    >
      <a
        className={buttonVariants({
          className: 'min-h-10 gap-2 px-3',
          size: 'sm',
          variant: 'ghost',
        })}
        href={markdownPathname}
      >
        <FileTextIcon className="size-4" />
        <span className="hidden min-[390px]:inline">View Markdown</span>
        <span className="min-[390px]:hidden">Markdown</span>
      </a>
      <Button
        aria-label={copied ? 'Copied' : 'Copy Markdown'}
        className="min-h-10 gap-2 px-3"
        onClick={copyMarkdown}
        size="sm"
        type="button"
        variant="ghost"
      >
        {copied ? (
          <CheckIcon className="size-4" />
        ) : (
          <ClipboardIcon className="size-4" />
        )}
        <span className="hidden sm:inline">
          {copied ? 'Copied' : 'Copy Markdown'}
        </span>
      </Button>
    </aside>
  )
}
