import Link from 'next/link'
import { getRecentChanges } from '@/app/actions'
import { ChevronRight } from 'lucide-react'
import { IoPodium } from "react-icons/io5";
import { TbClockEdit } from "react-icons/tb";

export default async function RightSidebar() {
  const recentChanges = await getRecentChanges()

  return (
    <aside className="w-[280px] hidden lg:block space-y-4">
      {/* 실시간 검색어 */}
      <div className="px-5 py-4 bg-white border border-[#ccc] rounded rounded-md">
        <div className="mb-3 font-bold text-sm text-gray-700 flex gap-2 justify-start items-center">
          <IoPodium size={16} color='#21252980' />
          <span>실시간 검색어</span>
        </div>
        <div className="text-center text-sm text-gray-400">
          데이터 없음
        </div>
      </div>

      {/* 최근 변경 내역 */}
      <div className="flex flex-col gap-4 p-4 bg-white border border-[#ccc] rounded rounded-md">
        <div className="font-bold text-md text-gray-700 flex justify-between items-center">
          <div className='flex justify-start items-center gap-2'>
            <TbClockEdit size={18} color='#21252980' />
            <span>최근 변경</span>
          </div>
          <Link href="/recent-changes" className="text-gray-800">
            <ChevronRight size={18} />
          </Link>
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {recentChanges.map((page) => (
            <li key={page.slug} className="flex justify-between items-center">
              <Link href={`/w/${page.slug}`} className="truncate max-w-[150px] text-[#0275d8] hover:!underline">
                {page.slug}
              </Link>
              <span className="text-xs">
                {/* 시간 계산 로직 대신 간단히 표시 */}
                0분 전
              </span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* 광고 영역 */}
      {/* <div className="bg-gray-200 h-[200px] border flex items-center justify-center text-gray-400 text-sm">
        Ad Area
      </div> */}
    </aside>
  )
}