import { getWikiPage, saveWikiPage } from '@/app/actions'
import ImageUploader from '@/components/ImageUploader'

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)
  const page = await getWikiPage(slug)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">편집: {decodedSlug}</h1>
      
      <form action={saveWikiPage} className="flex flex-col gap-4">
        <input type="hidden" name="slug" value={decodedSlug} />
        
        <textarea 
          name="content" 
          defaultValue={page?.content || ''}
          className="w-full h-[60vh] p-4 border rounded focus:outline-none focus:ring-2 focus:ring-[#00A495] font-mono"
          placeholder="여기에 내용을 입력하세요..."
        />
        
        <input 
          name="comment" 
          type="text" 
          placeholder="수정 사유를 입력해주세요 (예: 오타 수정)"
          className="w-full p-2 border rounded text-sm"
        />

        <div className="flex justify-end gap-2">
            <button 
                type="submit" 
                className="px-6 py-2 bg-[#00A495] text-white font-bold rounded hover:bg-[#008f82]"
            >
                저장
            </button>
        </div>
      </form>

      <ImageUploader />
    </div>
  )
}