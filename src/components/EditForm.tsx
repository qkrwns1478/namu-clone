'use client'

import { useState } from 'react'
import { saveWikiPage, getExistingSlugs, fetchWikiContent } from '@/app/actions'
import NamuViewer from '@/components/NamuViewer'

export default function EditForm({ 
  slug, 
  initialContent 
}: { 
  slug: string, 
  initialContent: string 
}) {
  const [content, setContent] = useState(initialContent)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const [previewLinks, setPreviewLinks] = useState<string[]>([])

  // 탭 변경 핸들러 (미리보기 시 링크 존재 여부 확인)
  const handleTabChange = async (tab: 'edit' | 'preview') => {
    setActiveTab(tab)
    
    if (tab === 'preview') {
      // 본문에서 링크([[...]]) 추출
      const linkRegex = /\[\[(.*?)(?:\|(.*?))?\]\]/g
      const targets = new Set<string>()
      let match
      while ((match = linkRegex.exec(content)) !== null) {
        let target = match[1]
        if (target.includes('#')) target = target.split('#')[0]
        if (target) targets.add(target)
      }

      // 서버 액션으로 링크 존재 여부 확인
      if (targets.size > 0) {
        const existings = await getExistingSlugs(Array.from(targets))
        setPreviewLinks(existings)
      } else {
        setPreviewLinks([])
      }
    }
  }

  return (
    <form action={saveWikiPage} className="flex flex-col">
      <input type="hidden" name="slug" value={slug} />

      {/* 탭 버튼 */}
      <div className="flex mb-1 select-none">
        <button
          type="button"
          onClick={() => handleTabChange('edit')}
          className={`px-4 py-2 text-sm border border-b-0 rounded-t-sm -mb-[1px] cursor-pointer ${
            activeTab === 'edit'
              ? 'text-[#55595C] border-[#ccc]'
              : 'text-[#000000] border-transparent'
          }`}
        >
          RAW 편집
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('preview')}
          className={`px-4 py-2 text-sm border border-b-0 rounded-t-sm -mb-[1px] cursor-pointer ${
            activeTab === 'preview'
              ? 'text-[#55595C] border-[#ccc]'
              : 'text-[#000000] border-transparent'
          }`}
        >
          미리보기
        </button>
      </div>

      {/* 편집 영역 (RAW 편집) */}
      <div className={activeTab === 'edit' ? 'block' : 'hidden'}>
        <textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-[60vh] p-4 border border-[#ccc] rounded-b-sm focus:outline-none font-mono text-[14px] leading-relaxed resize-y"
          placeholder="여기에 내용을 입력하세요..."
        />
      </div>

      {/* 미리보기 영역 */}
      {activeTab === 'preview' && (
        <div className="w-full h-[60vh] p-4 border border-[#ccc] rounded-b-sm bg-white overflow-y-auto">
          <NamuViewer 
            content={content} 
            existingSlugs={previewLinks} 
            fetchContent={fetchWikiContent}
          />
        </div>
      )}

      {/* 요약 입력 */}
      <div className="mt-4">
        <label className="block text-sm mb-1 text-gray-700">요약</label>
        <input
          name="comment"
          type="text"
          placeholder="수정 사유를 입력해주세요"
          className="w-full px-3 py-1.5 border border-[#ccc] rounded-sm text-sm focus:outline-none focus:border-[#00A495]"
        />
      </div>

      {/* 저작권 동의 문구 */}
      <div className="mt-4 text-xs text-gray-600 leading-relaxed">
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" className="mt-0.5" required />
          <span>
            문서 편집을 <strong>저장</strong>하면 당신은 기여한 내용을{" "}
            <strong>CC-BY-NC-SA 2.0 KR</strong>으로 배포하고 기여한 문서에 대한 하이퍼링크나 URL을
            이용하여 저작자 표시를 하는 것에 동의한다는 것입니다. 이{" "}
            <strong>동의는 철회할 수 없습니다.</strong> 또한 생성형 인공지능의 사용은 일부 예외를
            제외하고 금지되어 있습니다. 자세한 내용은 관련 공지를 참고하세요.
          </span>
        </label>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          type="submit"
          className="px-8 py-1 bg-[#0275d8] text-white hover:bg-[#0263b8] transition-colors text-sm font-bold rounded-sm"
        >
          저장
        </button>
      </div>
    </form>
  )
}