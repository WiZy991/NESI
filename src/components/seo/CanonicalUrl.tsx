/**
 * Компонент для добавления canonical URL в <head>
 */

export function CanonicalUrl({ url }: { url: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nesi.su'
  const canonicalUrl = url.startsWith('http') ? url : `${baseUrl}${url}`
  
  return <link rel="canonical" href={canonicalUrl} />
}

