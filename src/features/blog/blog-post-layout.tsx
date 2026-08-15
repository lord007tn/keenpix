import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { getAuthor } from '@/shared/authors'

export interface BlogPostMeta {
  author: string
  competitor?: string
  cover?: string
  coverAlt?: string
  date: string
  description: string
  image: string
  imageAlt: string
  language: 'ar' | 'en'
  tags: string[]
  title: string
  updated?: string
}

export function BlogPostHeader({ meta }: { meta: BlogPostMeta }) {
  const author = getAuthor(meta.author)
  const arabic = meta.language === 'ar'
  const authorLink = author.profilePath ?? author.sameAs?.[0]
  return (
    <header className="border-b bg-muted/30">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <a
          className="inline-flex min-h-11 touch-manipulation items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
          href={arabic ? '/blog/ar' : '/blog'}
        >
          <ArrowLeftIcon className="size-4" />
          {arabic ? 'كل المقالات' : 'All posts'}
        </a>
        <img
          alt={meta.coverAlt ?? meta.imageAlt}
          className="mt-8 aspect-[40/21] w-full rounded-xl border object-cover shadow-sm"
          fetchPriority="high"
          height={630}
          src={meta.cover ?? meta.image}
          width={1200}
        />
        {meta.competitor ? (
          <div className="mt-6">
            <Badge variant="secondary">
              {arabic ? 'مقارنة' : 'Comparison'} · vs {meta.competitor}
            </Badge>
          </div>
        ) : null}
        <h1 className="mt-4 text-balance font-semibold text-3xl tracking-tight sm:text-4xl">
          {meta.title}
        </h1>
        <p className="mt-4 text-balance text-lg text-muted-foreground leading-relaxed">
          {meta.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground text-sm">
          {authorLink ? (
            <a
              className="inline-flex min-h-11 touch-manipulation items-center font-medium text-foreground hover:underline"
              href={authorLink}
              rel={author.profilePath ? 'author' : 'author noreferrer'}
              target={author.profilePath ? undefined : '_blank'}
            >
              {meta.author}
            </a>
          ) : (
            <span>{meta.author}</span>
          )}
          <span aria-hidden="true">·</span>
          <time dateTime={meta.date}>
            {dayjs(meta.date)
              .locale(arabic ? 'ar' : 'en')
              .format(arabic ? 'D MMMM YYYY' : 'MMMM D, YYYY')}
          </time>
          {meta.updated && meta.updated !== meta.date ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {arabic ? 'حُدّث في ' : 'Updated '}
                <time dateTime={meta.updated}>
                  {dayjs(meta.updated)
                    .locale(arabic ? 'ar' : 'en')
                    .format(arabic ? 'D MMMM YYYY' : 'MMMM D, YYYY')}
                </time>
              </span>
            </>
          ) : null}
          {meta.tags.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {meta.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export function BlogPostTrust({
  authorName,
  language,
}: {
  authorName: string
  language: 'ar' | 'en'
}) {
  const author = getAuthor(authorName)
  const arabic = language === 'ar'
  return (
    <aside
      aria-label="Article accountability"
      className="mx-auto max-w-3xl px-6 pb-12"
    >
      <div className="rounded-lg border bg-muted/30 p-6">
        <h2 className="font-semibold text-lg">
          {arabic ? 'عن هذا المقال' : 'About this article'}
        </h2>
        <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
          {arabic
            ? `كتب ${author.name} هذا المقال. نراجع ادعاءات المنتج مقابل كود Keenpix الحالي، ونذكر تاريخ التحقق عند الاستناد إلى مصدر خارجي.`
            : `${author.bio ?? `${author.name} writes for Keenpix.`} Product claims are checked against the current Keenpix code and pricing. Competitor facts use primary vendor sources and carry a verification date; estimates and opinions are labeled as such.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {author.profilePath ? (
            <a
              className="inline-flex min-h-11 touch-manipulation items-center font-medium text-primary hover:underline"
              href={author.profilePath}
            >
              {arabic ? 'صفحة الكاتب' : 'Author profile'}
            </a>
          ) : null}
          <a
            className="inline-flex min-h-11 touch-manipulation items-center font-medium text-primary hover:underline"
            href="/methodology/comparisons"
          >
            {arabic ? 'منهجية التحرير' : 'Editorial methodology'}
          </a>
          <a
            className="inline-flex min-h-11 touch-manipulation items-center font-medium text-primary hover:underline"
            href="/support"
          >
            {arabic ? 'أرسل تصحيحاً' : 'Request a correction'}
          </a>
        </div>
      </div>
    </aside>
  )
}

export function BlogPostCta({ language }: { language: 'ar' | 'en' }) {
  const arabic = language === 'ar'
  return (
    <section className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-3xl flex-col items-start justify-between gap-6 px-6 py-12 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold text-2xl tracking-tight">
            {arabic
              ? 'صور محسّنة وفاتورة يمكن فهمها.'
              : 'Optimized images, minus the surprise bill.'}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {arabic
              ? 'استخدم الخدمة المدارة أو شغّل المحرك مفتوح المصدر على خادمك.'
              : 'One published price on managed image delivery. Or self-host the open-source engine, free.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <a
            className={buttonVariants({
              className: 'min-h-12 touch-manipulation px-4',
              variant: 'outline',
            })}
            href="/docs/self-hosting"
          >
            {arabic ? 'دليل التشغيل الذاتي' : 'Self-host free'}
          </a>
          <Link
            className={buttonVariants({
              className: 'min-h-12 touch-manipulation px-4',
            })}
            to="/signup"
          >
            {arabic ? 'ابدأ التجربة' : 'Start free trial'}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </div>
      </div>
    </section>
  )
}
