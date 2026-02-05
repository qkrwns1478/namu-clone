import Link from 'next/link'
import { getRecentChanges } from '@/app/actions'
import { ChevronRight } from 'lucide-react'

export default async function RightSidebar() {
  const recentChanges = await getRecentChanges()

  return (
    <aside className="w-[280px] hidden lg:block space-y-4">
      {/* 실시간 검색어 (더미) */}
      <div className="bg-white border border-[#ccc] rounded shadow-sm">
        <div className="p-2 border-b font-bold text-sm text-gray-700 flex justify-between items-center">
          <span>실시간 검색어</span>
        </div>
        <div className="p-4 text-center text-sm text-gray-400">
          데이터 없음
        </div>
      </div>

      {/* 최근 변경 내역 */}
      <div className="bg-white border border-[#ccc] rounded shadow-sm">
        <div className="p-2 border-b font-bold text-sm text-gray-700 flex justify-between items-center bg-gray-50">
          <span>최근 변경</span>
          <Link href="/recent-changes" className="text-gray-500 hover:text-gray-800">
            <ChevronRight size={16} />
          </Link>
        </div>
        <ul className="text-sm">
          {recentChanges.map((page) => (
            <li key={page.slug} className="border-b last:border-0 px-3 py-2 flex justify-between items-center hover:bg-gray-50">
              <Link href={`/w/${page.slug}`} className="truncate max-w-[150px] text-gray-800 hover:underline">
                {page.slug}
              </Link>
              <span className="text-xs text-green-600 font-mono">
                {/* 시간 계산 로직 대신 간단히 표시 */}
                update
              </span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* 광고 영역 흉내 */}
      <div className="bg-gray-200 h-[200px] border flex items-center justify-center text-gray-400 text-sm">
        Ad Area
      </div>
    </aside>
  )
}