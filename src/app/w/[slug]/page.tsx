import { getWikiPage, getCategoryDocs } from '@/app/actions'
import NamuViewer from '@/components/NamuViewer'
import Link from 'next/link'

// params 타입 변경: Promise<{ slug: string }>
export default async function WikiPage({ params }: { params: Promise<{ slug: string }> }) {
  // 1. await로 params 풀기
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)
  const page = await getWikiPage(slug)

  const isCategoryPage = decodedSlug.startsWith('분류:')
  const categoryName = isCategoryPage ? decodedSlug.replace('분류:', '') : null
  const categoryDocs = categoryName ? await getCategoryDocs(categoryName) : []

  if (!page) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">'{decodedSlug}' 문서가 없습니다.</h1>
        {/* params.slug 대신 await된 slug 사용 */}
        <Link 
          href={`/edit/${slug}`} 
          className="px-4 py-2 bg-[#00A495] text-white rounded hover:bg-[#008f82]"
        >
          새 문서 생성하기
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold">{page.slug}</h1>
        <div className="space-x-2 text-sm">
          <Link href={`/edit/${slug}`} className="text-gray-500 hover:underline">
            [편집]
          </Link>
          <span className="text-gray-300">|</span>
          <Link href={`/w/${slug}/history`} className="text-gray-500 hover:underline">
            [역사]
          </Link>
        </div>
      </div>
      <NamuViewer content={page.content} />
      
      {/* 분류 페이지일 경우 하단에 목록 표시 */}
      {isCategoryPage && categoryDocs.length > 0 && (
        <div className="mt-10 border-t pt-6">
          <h2 className="text-xl font-bold mb-4">'{categoryName}' 분류에 속한 문서</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {categoryDocs.map((doc) => (
              <Link 
                key={doc.page.slug} 
                href={`/w/${doc.page.slug}`}
                className="text-[#00A495] hover:underline p-2 border rounded hover:bg-gray-50"
              >
                {doc.page.slug}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}