import { deleteWikiPage } from '@/app/actions'
import SlugTitle from "@/components/SlugTitle";

export default async function DeletePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)

  return (
    <div className="p-6 bg-white border border-[#ccc] rounded-t-none rounded-b-md sm:rounded-md overflow-hidden">
      <div className="mb-4 flex items-center gap-2">
        <SlugTitle slug={decodedSlug}/>
        <span className='text-3xl font-bold text-[#373a3c]'>(삭제)</span>
      </div>

      <form action={deleteWikiPage} className="flex flex-col gap-2">
        <input type="hidden" name="slug" value={decodedSlug} />

        <div>
          <label className="block text-sm mb-1 text-gray-700">요약</label>
          <input 
            type="text" 
            name="comment"
            className="w-full px-3 py-1.5 border border-[#ccc] rounded-sm text-sm focus:outline-none focus:border-[#00A495]"
          />
        </div>

        <div className="mt-4 text-sm text-gray-600 leading-relaxed">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" className="mt-0.5" required />
            <span>
              문서 이동 및 일부 내용 제거가 아닌 문서 전체를 삭제하기 위한 기능임을 확인합니다.
            </span>
          </label>
        </div>

        <div>
          <span className='font-bold'>
            알림! : 문서의 제목을 변경하려는 경우 <a href={`/move/${decodedSlug}`} className="text-[#0275d8] hover:!underline">문서 이동기능</a>을 사용 해주세요. 문서 이동 기능을 사용할 수 없는 경우 토론 기능이나 게시판을 통해 대행 요청을 해주세요.
          </span>
        </div>

        <div className="flex justify-end mt-4">
          <button 
            type="submit" 
            className="px-3 py-1 bg-[#d9534f] text-white hover:bg-[#ab3b46] text-sm"
          >
            삭제
          </button>
        </div>
      </form>
    </div>
  )
}