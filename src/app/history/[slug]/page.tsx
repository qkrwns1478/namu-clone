import { getWikiHistory, revertWikiPage } from '@/app/actions'
import Link from 'next/link'

export default async function HistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)
  const history = await getWikiHistory(slug)
  const colonIndex = decodedSlug.indexOf(":");

  return (
    <div className="p-6 bg-white border border-[#ccc] rounded-t-none rounded-b-md sm:rounded-md overflow-hidden">
      <div className="mb-4 flex items-center gap-2">
        <a href={`/w/${decodedSlug}`} className="hover:!underline">
          <h1 className="text-4xl font-bold text-[#373a3c] leading-tight break-all">
            {colonIndex !== -1 ? (
              <>
                <span style={{ boxShadow: "inset 0 -0.5rem 0 #d4f0e3" }}>
                  {decodedSlug.substring(0, colonIndex)}
                </span>
                {decodedSlug.substring(colonIndex)}
              </>
            ) : (
              decodedSlug
            )}
          </h1>
        </a>
        <span className='text-3xl font-bold text-[#373a3c]'>(문서 역사)</span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3">수정일시</th>
              <th className="p-3">수정자</th>
              <th className="p-3">기능</th>
            </tr>
          </thead>
          <tbody>
            {history.map((rev) => (
              <tr key={rev.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{rev.createdAt.toLocaleString()}</td>
                <td className="p-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-700">{rev.ipAddress || 'Unknown'}</span>
                    <span className="text-gray-500 text-xs">{rev.comment || '(-)'}</span>
                  </div>
                </td>
                <td className="p-3">
                  <form action={async () => {
                      'use server'
                      await revertWikiPage(decodedSlug, rev.id)
                  }}>
                    <button className="text-blue-500 hover:underline text-xs" type="submit">
                      이 버전으로 되돌리기
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}