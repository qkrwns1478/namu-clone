import { searchDocs } from '@/app/actions'
import Link from 'next/link'

function getSnippet(content: string, query: string, length = 160) {
  const index = content.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return content.slice(0, length) + '...'

  const start = Math.max(0, index - 60)
  const end = Math.min(content.length, index + length)
  return (start > 0 ? '...' : '') + content.slice(start, end).replace(/\n/g, ' ') + '...'
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q: string }>
}) {
  // 1. searchParams를 await 하여 query 추출
  const { q: query = '' } = await searchParams
  
  // 2. 고도화된 검색 액션 호출
  const { exactMatch, titleMatches, contentMatches } = await searchDocs(query)
  const totalCount = (exactMatch ? 1 : 0) + titleMatches.length + contentMatches.length

  return (
    <div className="p-6 bg-white border border-[#ccc] rounded-t-none rounded-b-md sm:rounded-md overflow-hidden">
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-[#373a3c] leading-tight break-all">검색</h1>
      </div>

      <h2 className="text-2xl font-bold pb-2">
        &apos;{query}&apos; 검색 결과 <span className="text-gray-500 text-lg">({totalCount}건)</span>
      </h2>

      {/* {exactMatch && (
        <div className="mb-8 p-4 bg-gray-50 border-l-4 border-[#00A495] rounded">
          <p className="text-sm text-gray-500 mb-1">문서로 이동하기</p>
          <Link 
            href={`/w/${encodeURIComponent(exactMatch.slug)}`}
            className="text-xl font-bold text-[#00A495] hover:underline"
          >
            {exactMatch.slug}
          </Link>
        </div>
      )} */}

      {totalCount === 0 ? (
        <div className="py-20 text-center">
          <p className="text-gray-500 text-lg mb-4">해당하는 문서가 없습니다.</p>
          <Link 
            href={`/edit/${encodeURIComponent(query)}`} 
            className="px-4 py-2 bg-[#00A495] text-white rounded hover:bg-[#008f82] transition-colors"
          >
            &apos;{query}&apos; 문서 직접 만들기
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {/* 정확히 일치하는 결과 */}
          {exactMatch && (
            <section className='mb-6'>
              <ul className="divide-y border-t border-b">
                <li key={exactMatch.slug} className="py-3">
                  <Link href={`/w/${encodeURIComponent(exactMatch.slug)}`} className="text-[#00A495] font-semibold hover:underline">
                    {exactMatch.slug}
                  </Link>
                  <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                    {getSnippet(exactMatch.content || '', query)}
                  </p>
                  <div className="text-xs text-gray-400 mt-1">최근 수정: {new Date(exactMatch.updatedAt).toLocaleDateString()}</div>
                </li>
              </ul>
            </section>
          )}

          {/* 제목 검색 결과 */}
          {titleMatches.length > 0 && (
            <section>
              <ul className="divide-y border-t border-b">
                {titleMatches.map((page) => (
                  <li key={page.slug} className="py-3">
                    <Link href={`/w/${encodeURIComponent(page.slug)}`} className="text-[#00A495] font-semibold hover:underline">
                      {page.slug}
                    </Link>
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                      {getSnippet(page.content || '', query)}
                    </p>
                    <div className="text-xs text-gray-400 mt-1">최근 수정: {new Date(page.updatedAt).toLocaleDateString()}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 본문 검색 결과 */}
          {contentMatches.length > 0 && (
            <section>
              <ul className="space-y-6">
                {contentMatches.map((page) => (
                  <li key={page.slug} className="border-b pb-4 last:border-0">
                    <Link href={`/w/${encodeURIComponent(page.slug)}`} className="text-[#00A495] font-semibold hover:underline block mb-1">
                      {page.slug}
                    </Link>
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                      {getSnippet(page.content || '', query)}
                    </p>
                    <div className="text-xs text-gray-400 mt-2">최근 수정: {new Date(page.updatedAt).toLocaleDateString()}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}