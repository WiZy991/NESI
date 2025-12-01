/**
 * Компонент для добавления rel=next и rel=prev для пагинации
 */

export interface PaginationLinksProps {
  currentPage: number
  totalPages: number
  baseUrl: string
}

export function PaginationLinks({ currentPage, totalPages, baseUrl }: PaginationLinksProps) {
  const links: JSX.Element[] = []
  
  // rel=prev для страниц больше 1
  if (currentPage > 1) {
    const prevPage = currentPage - 1
    const prevUrl = prevPage === 1 
      ? baseUrl 
      : `${baseUrl}?page=${prevPage}`
    
    links.push(
      <link key="prev" rel="prev" href={prevUrl} />
    )
  }
  
  // rel=next для страниц меньше последней
  if (currentPage < totalPages) {
    const nextUrl = `${baseUrl}?page=${currentPage + 1}`
    links.push(
      <link key="next" rel="next" href={nextUrl} />
    )
  }
  
  return <>{links}</>
}

