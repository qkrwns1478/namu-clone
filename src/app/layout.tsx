// app/layout.tsx
import './globals.css'
import Link from 'next/link'
import { getRecentChanges } from './actions'
import SearchForm from '@/components/SearchForm'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const recentChanges = await getRecentChanges()

  return (
    <html lang="ko">
      <body className="bg-gray-100 flex min-h-screen">
        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-6 max-w-4xl mx-auto bg-white shadow-sm min-h-screen">
            {children}
        </main>

        {/* 우측 사이드바 (나무위키 스타일) */}
        <aside className="w-64 bg-white border-l p-4 hidden lg:block text-sm">
          <div className="mb-4">
            <Link href="/" className="text-xl font-bold text-[#00A495]">namu.wiki clone</Link>
            <SearchForm />
          </div>
          <h3 className="font-bold mb-2 text-gray-700">최근 변경내역</h3>
          <ul>
            {recentChanges.map((page) => (
              <li key={page.slug} className="border-b py-1 truncate">
                <Link href={`/w/${page.slug}`} className="hover:underline">
                  {page.slug}
                </Link>
                <span className="text-xs text-gray-400 block">
                  {page.updatedAt.toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </body>
    </html>
  )
}