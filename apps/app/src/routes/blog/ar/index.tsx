import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { JsonLd } from '@/components/app/json-ld'
import { BlogIndex } from '@/features/blog/blog-index'
import { isCloud } from '@/server/deployment'
import { listBlogPosts } from '@/shared/blog-source'
import { absoluteUrl, blogListingJsonLd, seo } from '@/shared/seo'

const listArabicBlogPosts = createServerFn({ method: 'GET' }).handler(() => {
  const posts = listBlogPosts('ar')
  const selfHost = !isCloud()
  const canonicalUrl = absoluteUrl('/blog/ar')
  return {
    canonicalUrl,
    englishUrl: absoluteUrl('/blog'),
    posts,
    selfHost,
    jsonLd: selfHost
      ? null
      : blogListingJsonLd(
          posts.map((post) => ({
            date: post.date,
            description: post.description,
            title: post.title,
            url: absoluteUrl(post.url),
          })),
          'ar',
        ),
  }
})

export const Route = createFileRoute('/blog/ar/')({
  loader: () => listArabicBlogPosts(),
  head: ({ loaderData }) => {
    const canonicalUrl = loaderData?.canonicalUrl ?? absoluteUrl('/blog/ar')
    const englishUrl = loaderData?.englishUrl ?? absoluteUrl('/blog')
    return {
      links: [
        { rel: 'canonical', href: canonicalUrl },
        { rel: 'alternate', hrefLang: 'ar', href: canonicalUrl },
        { rel: 'alternate', hrefLang: 'en', href: englishUrl },
        {
          rel: 'alternate',
          hrefLang: 'x-default',
          href: englishUrl,
        },
      ],
      meta: [
        ...seo({
          title: 'مدونة Keenpix: تحسين الصور للمطورين',
          description:
            'أدلة عربية عملية عن CDN الصور، صيغ AVIF وWebP، الحماية بالتوقيع، وتشغيل Keenpix باستخدام Docker.',
          locale: 'ar_AR',
          url: canonicalUrl,
        }),
        ...(loaderData?.selfHost
          ? [{ name: 'robots', content: 'noindex,nofollow' }]
          : []),
      ],
    }
  },
  component: ArabicBlogIndexPage,
})

function ArabicBlogIndexPage() {
  const { posts, jsonLd } = Route.useLoaderData()
  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <BlogIndex language="ar" posts={posts} />
    </>
  )
}
