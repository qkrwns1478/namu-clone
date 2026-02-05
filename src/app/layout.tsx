import './globals.css'
import Header from '@/components/Header'
import RightSidebar from '@/components/RightSidebar'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <Header />
        
        <div className="max-w-[1300px] mx-auto min-h-[calc(100vh-193px)] px-2 sm:px-4 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 mt-4">
          {/* 메인 콘텐츠 영역 */}
          <main className="min-w-0">
            {children}
          </main>

          {/* 우측 사이드바 */}
          <RightSidebar />
        </div>
        
        {/* 푸터 */}
        <footer className="mt-10 py-8 bg-white text-center text-xs text-gray-500 border-t border-[#ccc]">
          <p>Powered by Next.js & Prisma (Clone Project)</p>
        </footer>
      </body>
    </html>
  )
}