import { getUserContributions } from '@/app/actions'
import Link from 'next/link'
import { Metadata } from "next";
import { format } from 'date-fns'

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);
  return {
    title: `"${decodedUsername}" 기여 목록 - 나무위키`,
  };
}

export default async function ContributionsPage({ 
  params 
}: { 
  params: Promise<{ username: string }> 
}) {
  const { username } = await params
  const decodedUsername = decodeURIComponent(username)
  const contributions = await getUserContributions(decodedUsername)

  return (
    <div className="p-6 bg-white border border-[#ccc] rounded-t-none rounded-b-md sm:rounded-md overflow-hidden">
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-[#373a3c] leading-tight break-all">"{decodedUsername}" 기여 목록</h1>
      </div>

      {contributions.length === 0 ? (
        <p className="text-gray-500 py-10 text-center">기여 내역이 없습니다.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {contributions.map((rev) => (
              <li key={rev.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/w/${encodeURIComponent(rev.page.slug)}`}
                      className="text-[#00a69c] font-bold hover:underline"
                    >
                      {rev.page.slug}
                    </Link>
                    <span className="text-xs text-gray-400">
                      (r{rev.id})
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {format(new Date(rev.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                  </div>
                </div>

                {rev.comment && (
                  <p className="mt-2 text-sm text-gray-600 italic bg-gray-50 p-2 rounded border-l-4 border-gray-200">
                    {rev.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}