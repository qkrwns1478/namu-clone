import { deleteWikiPage } from '@/app/actions'
import Link from 'next/link'

export default async function DeletePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)

  return (
    <div className="max-w-3xl mx-auto bg-white border border-[#ccc] rounded p-6">
      <h1 className="text-2xl font-bold mb-2 text-red-600">문서 삭제</h1>
      
      <div className="bg-red-50 border border-red-200 p-4 rounded mb-6 text-sm text-red-800">
        <p className="font-bold mb-1">⚠ 경고</p>
        <p>
          정말로 <strong>'{decodedSlug}'</strong> 문서를 삭제하시겠습니까?<br/>
          삭제된 문서는 복구하기 어려울 수 있습니다.
        </p>
      </div>

      <form action={deleteWikiPage} className="flex flex-col gap-4">
        <input type="hidden" name="slug" value={decodedSlug} />

        <div>
          <label className="block text-sm font-bold mb-1 text-gray-700">삭제 사유</label>
          <input 
            type="text" 
            name="comment"
            placeholder="삭제 사유를 입력하세요"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-red-500"
            required
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Link
            href={`/w/${slug}`}
            className="px-4 py-2 border rounded hover:bg-gray-100 text-sm flex items-center"
          >
            취소
          </Link>
          <button 
            type="submit" 
            className="px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 text-sm"
          >
            삭제
          </button>
        </div>
      </form>
    </div>
  )
}