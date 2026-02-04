// components/SearchForm.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SearchForm() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <form onSubmit={handleSearch} className="mb-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="문서 검색..."
        className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#00A495]"
      />
    </form>
  )
}