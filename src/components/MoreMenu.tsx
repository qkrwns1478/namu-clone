'use client'

import { MoreVertical, Trash2, ArrowRightLeft } from 'lucide-react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

export default function MoreMenu({ slug }: { slug: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const btnToolClass = "p-1 border border-[#ccc] rounded text-gray-600 hover:bg-gray-100 transition-colors bg-white flex items-center justify-center w-[32px] h-[32px]"

  return (
    <div className="relative" ref={menuRef}>
      <button 
        className={btnToolClass} 
        onClick={() => setIsOpen(!isOpen)}
        title="더보기"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-[#ccc] rounded shadow-lg z-50 py-1">
          <Link 
            href={`/move/${slug}`} 
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <ArrowRightLeft size={14} /> 이동
          </Link>
          <Link 
            href={`/delete/${slug}`} 
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} /> 삭제
          </Link>
        </div>
      )}
    </div>
  )
}