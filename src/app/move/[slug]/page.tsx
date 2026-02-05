'use client'

import { useActionState } from 'react'
import { moveWikiPage } from '@/app/actions'
import { useRouter } from 'next/navigation'
import React from 'react'

// 초기 상태 타입 정의
const initialState = {
  success: false,
  message: '',
}

export default function MovePage({ params }: { params: Promise<{ slug: string }> }) {
  // Promise 언랩핑
  const resolvedParams = React.use(params);
  const decodedSlug = decodeURIComponent(resolvedParams.slug);
  
  const [state, formAction, isPending] = useActionState(moveWikiPage, initialState);
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto bg-white border border-[#ccc] rounded p-6">
      <h1 className="text-2xl font-bold mb-2 text-[#373a3c]">문서 이동</h1>
      <p className="text-gray-500 mb-6 text-sm">
        '{decodedSlug}' 문서의 이름을 변경합니다.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="oldSlug" value={decodedSlug} />

        <div>
          <label className="block text-sm font-bold mb-1 text-gray-700">변경할 문서 제목</label>
          <input 
            type="text" 
            name="newSlug"
            defaultValue={decodedSlug}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#00A495]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1 text-gray-700">이동 사유</label>
          <input 
            type="text" 
            name="comment"
            placeholder="문서 이동 사유를 입력하세요 (선택)"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#00A495]"
          />
        </div>

        {/* 에러 메시지 표시 */}
        {state?.message && (
          <div className="text-red-600 text-sm font-bold">
            ⚠ {state.message}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button 
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded hover:bg-gray-100 text-sm"
          >
            취소
          </button>
          <button 
            type="submit" 
            disabled={isPending}
            className="px-6 py-2 bg-[#00A495] text-white font-bold rounded hover:bg-[#008f82] text-sm disabled:opacity-50"
          >
            {isPending ? '이동 중...' : '이동'}
          </button>
        </div>
      </form>
    </div>
  )
}