'use client'

import { Search, Menu, User, Bell, Compass, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Header() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <nav 
      className="h-[54px] flex items-center justify-center fixed top-0 w-full z-50 shadow-md border-b border-[#008f82]"
      style={{
        backgroundImage: 'linear-gradient(90deg, rgb(0, 166, 156), rgb(0, 166, 156), rgb(40, 180, 114))'
      }}
    >
      <div className="w-full max-w-[1300px] px-2 sm:px-4 flex justify-between items-center h-full">
        
        {/* 좌측: 로고 + 메뉴 */}
        <div className="flex items-center gap-3">
          <button className="text-white lg:hidden">
            <Menu size={24} />
          </button>
          <Link href="/" className="flex items-center">
            <Image 
                src="/images/logo.png" 
                alt="namu.wiki" 
                width={100} 
                height={40} 
                className="object-contain h-[35px] w-auto"
                priority
            />
          </Link>
          <div className="hidden lg:flex gap-1 text-white text-[13px] font-bold ml-2">
            <Link href="/recent-changes" className="hover:bg-[#008f82] px-3 py-4 flex items-center gap-1 transition-colors">
              <Compass size={14} /> 최근 변경
            </Link>
            <Link href="/recent-discuss" className="hover:bg-[#008f82] px-3 py-4 flex items-center gap-1 transition-colors">
              <Compass size={14} /> 최근 토론
            </Link>
          </div>
        </div>

        {/* 우측: 검색창 + 아이콘 */}
        <div className="flex items-center gap-2">
          
          {/* 검색창 */}
          <form onSubmit={handleSearch} className="hidden sm:block w-[270px]">
            <div className="flex items-center bg-white w-full h-[36px] px-3 rounded-[2px] shadow-sm">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none min-w-0"
                placeholder="여기에서 검색"
              />
              <div className="flex items-center gap-1 text-gray-500 shrink-0">
                <Search size={18} className="cursor-pointer hover:text-gray-700" onClick={handleSearch} />
                <button type="submit" className="flex items-center justify-center hover:text-gray-700">
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </form>

          {/* 아이콘 버튼들 */}
          <div className="flex items-center text-white">
            <button className="p-3 hover:bg-[#008f82] transition-colors"><Bell size={20} /></button>
            <button className="p-3 hover:bg-[#008f82] transition-colors"><User size={20} /></button>
          </div>
        </div>

      </div>
    </nav>
  )
}