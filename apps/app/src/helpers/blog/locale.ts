export function getBlogLanguage(pathname: string) {
  return pathname === '/blog/ar' || pathname.startsWith('/blog/ar/')
    ? 'ar'
    : 'en'
}
