// app/search/page.tsx
import { searchDocs } from '@/app/actions'
import Link from 'next/link'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q: string }
}) {
  const query = searchParams.q || ''
  const results = await searchDocs(query)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        '{query}' 검색 결과 ({results.length}건)
      </h1>

      {results.length === 0 ? (
        <p className="text-gray-500">검색 결과가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {results.map((page) => (
            <li key={page.slug} className="border-b pb-2">
              <Link 
                href={`/w/${page.slug}`} 
                className="text-lg font-bold text-[#00A495] hover:underline"
              >
                {page.slug}
              </Link>
              <div className="text-xs text-gray-400 mt-1">
                수정일: {page.updatedAt.toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}