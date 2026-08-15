import { useDocsPage } from 'fumadocs-ui/layouts/docs/page'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn/utils'

export function DocsMainContainer({
  className,
  ...props
}: ComponentProps<'article'>) {
  const { full } = useDocsPage()

  return (
    <main
      data-full={full}
      id="main-content"
      {...props}
      className={cn(
        'mx-auto flex w-full max-w-[900px] flex-col gap-4 px-4 py-6 [grid-area:main] md:px-6 md:pt-8 xl:px-8 xl:pt-14',
        full && 'max-w-[1168px]',
        className,
      )}
    />
  )
}
