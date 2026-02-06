'use client'

import { Search, Menu, Bell, Compass, ArrowRight, MessagesSquare } from 'lucide-react'
import { TbClockEdit } from "react-icons/tb";
import { FaUser } from "react-icons/fa6";
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { searchTitles } from '@/app/actions'

export default function Header() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 0) {
        const results = await searchTitles(query)
        setSuggestions(results.map(r => r.slug))
      } else {
        setSuggestions([])
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setShowSuggestions(false)
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <nav 
      className="h-[56px] flex items-center justify-center w-full z-50"
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
                className="object-contain h-[40px] w-auto"
                priority
            />
          </Link>
          <div className="hidden lg:flex gap-1 text-white text-[16px] font-bold ml-2">
            <Link href="/recent-changes" className="rounded hover:bg-white/20 p-2 flex items-center gap-2 transition-colors">
              <TbClockEdit size={20} /> 최근 변경
            </Link>
            <Link href="/recent-discuss" className="rounded hover:bg-white/20 p-2 flex items-center gap-2 transition-colors">
              <MessagesSquare size={20} /> 최근 토론
            </Link>
          </div>
        </div>

        {/* 우측: 검색창 + 아이콘 */}
        <div className="flex items-center gap-2">
          
          {/* 검색창 영역 */}
          <div ref={wrapperRef} className="relative hidden sm:block w-[270px]">
            <form onSubmit={handleSearch}>
              <div className="flex items-center bg-white w-full h-[36px] px-3 rounded-[4px] hover:shadow-[0_0_0_.25rem_hsla(0,0%,100%,0.4)] transition duration-150 ease-in-out relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none min-w-0"
                  placeholder="여기에서 검색"
                />
                <div className="flex items-center gap-1 text-gray-500 shrink-0">
                  <Search size={16} className="cursor-pointer hover:text-gray-700" onClick={handleSearch} />
                  <button type="submit" className="flex items-center justify-center hover:text-gray-700">
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </form>

            {/* 자동완성 드롭다운 */}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute top-[40px] left-0 w-full bg-white border border-gray-300 rounded shadow-lg overflow-hidden z-[60]">
                {suggestions.map((slug, index) => (
                  <li key={index}>
                    <Link 
                      href={`/w/${encodeURIComponent(slug)}`}
                      className="block px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 truncate"
                      onClick={() => {
                        setQuery(slug)
                        setShowSuggestions(false)
                      }}
                    >
                      {slug}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 아이콘 버튼들 */}
          <div className="flex items-center text-white">
            <button className="p-2 rounded hover:bg-white/20 transition-colors"><FaUser size={20} /></button>
          </div>
        </div>

      </div>
    </nav>
  )
}