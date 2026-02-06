'use client'

import { useActionState } from 'react'
import { moveWikiPage } from '@/app/actions'
import SlugTitle from "@/components/SlugTitle";
import { useRouter } from 'next/navigation'
import React from 'react'

const initialState = {
  success: false,
  message: '',
}

export default function MovePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = React.use(params);
  const decodedSlug = decodeURIComponent(resolvedParams.slug);
  
  const [state, formAction, isPending] = useActionState(moveWikiPage, initialState);
  const router = useRouter();

  return (
    <div className="p-6 bg-white border border-[#ccc] rounded-t-none rounded-b-md sm:rounded-md overflow-hidden">
      <div className="mb-4 flex items-center gap-2">
        <SlugTitle slug={decodedSlug}/>
        <span className='text-3xl font-bold text-[#373a3c]'>(문서 이동)</span>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="oldSlug" value={decodedSlug} />

        <div>
          <label className="block text-sm mb-1 text-gray-700">변경할 문서 제목</label>
          <input 
            type="text" 
            name="newSlug"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#00A495]"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-700">요약</label>
          <input 
            type="text" 
            name="comment"
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
            type="submit" 
            disabled={isPending}
            className="px-3 py-1 bg-[#0275d8] text-white hover:bg-[#0263b8] text-sm disabled:opacity-50"
          >
            {isPending ? '이동 중...' : '이동'}
          </button>
        </div>
      </form>
    </div>
  )
}