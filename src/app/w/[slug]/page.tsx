import { getWikiPage, getCategoryDocs } from "@/app/actions";
import NamuViewer from "@/components/NamuViewer";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Star, Edit, MessageSquare, History, MoreVertical } from "lucide-react";
import { FaMessage, FaBook } from "react-icons/fa6";
import { FaEdit } from "react-icons/fa";
import { Metadata } from "next";

// Prisma 타입 정의
type WikiPageWithCategory = Prisma.WikiPageGetPayload<{
  include: {
    categories: {
      include: { category: true };
    };
  };
}>;

type Props = {
  params: Promise<{ slug: string }>;
};

// 탭 제목 변경을 위한 동적 메타데이터 생성
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  return {
    title: `${decodedSlug} - 나무위키`,
  };
}

export default async function WikiPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const rawPage = await getWikiPage(slug);
  const page = rawPage as WikiPageWithCategory | null;

  const isCategoryPage = decodedSlug.startsWith("분류:");
  const categoryName = isCategoryPage ? decodedSlug.replace("분류:", "") : null;
  const categoryDocs = categoryName ? await getCategoryDocs(categoryName) : [];

  const linkedCategories = page?.categories?.map((c) => c.category.name) || [];

  // 스타일 클래스
  const btnToolClass =
    "p-1 border border-[#ccc] rounded text-gray-600 hover:bg-gray-100 transition-colors bg-white flex items-center justify-center w-[32px] h-[32px]";
  const btnToolTextClass =
    "flex items-center gap-1 px-3 py-1.5 border border-[#ccc] rounded text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors bg-white h-[32px]";

  const btnToolLeftClass =
    "p-1 border border-r-0 border-[#ccc] rounded rounded-r-none text-[#212529BF] hover:bg-gray-100 transition-colors bg-white flex items-center justify-center w-[32px] h-[32px]";
  const btnToolMiddleClass =
    "flex items-center gap-1 px-3 py-1 border border-r-0 border-[#ccc] rounded rounded-l-none rounded-r-none text-sm text-[#212529BF] hover:bg-gray-100 transition-colors bg-white h-[32px]";
  const btnToolRightClass =
    "flex items-center gap-1 px-3 py-1 border border-[#ccc] rounded rounded-l-none text-sm text-[#212529BF] hover:bg-gray-100 transition-colors bg-white h-[32px]";

  if (!page) {
    return (
      <div className="bg-white p-10 border border-[#ccc] rounded text-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-700">'{decodedSlug}' 문서를 찾을 수 없습니다.</h1>
        <div className="text-sm text-gray-500 mb-6">문서가 존재하지 않습니다. 직접 문서를 생성해보세요.</div>
        <Link
          href={`/edit/${encodeURIComponent(decodedSlug)}`}
          className="px-6 py-2.5 bg-[#00A495] text-white rounded font-bold hover:bg-[#008f82] transition-colors inline-block"
        >
          새 문서 생성
        </Link>
      </div>
    );
  }

  const encodedSlug = encodeURIComponent(page.slug);

  return (
    <div className="p-5 bg-white border border-[#ccc] rounded-t-none rounded-b-md sm:rounded-md overflow-hidden">
      {/* 상단 툴바 */}
      <div className="flex justify-between">
        <div className="mb-4">
          <h1 className="text-4xl font-bold text-[#373a3c] leading-tight break-all">{page.slug}</h1>
          <div className="text-sm text-[#212529BF] mt-2">
            최근 수정 시각: {page.updatedAt.toLocaleString()}
          </div>
        </div>

        <div className="flex justify-end gap-2 flex-wrap">
          <div className="flex">
            <button className={btnToolLeftClass} title="북마크">
              <Star size={16} />
            </button>
            <Link href={`/edit/${encodedSlug}`} className={btnToolMiddleClass}>
              <FaEdit size={14} /> 편집
            </Link>
            <Link href="#" className={btnToolMiddleClass}>
              <FaMessage size={14} /> 토론
            </Link>
            <Link href={`/w/${encodedSlug}/history`} className={btnToolRightClass}>
              <FaBook size={14} /> 역사
            </Link>
          </div>
          <button className={btnToolClass}>
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* 분류 상자 */}
      {linkedCategories.length > 0 && (
        <div className="mb-[14px] px-2 py-1 rounded border border-[#e5e7eb] bg-white text-sm flex flex-wrap items-center gap-2">
          <span className="text-gray-500 text-xs">
            분류:
          </span>
          {linkedCategories.map((cat) => (
            <Link
              key={cat}
              href={`/w/${encodeURIComponent("분류:" + cat)}`}
              className="text-[#0275d8] hover:underline border-r pr-2 last:border-0 last:pr-0 border-gray-300"
            >
              {cat}
            </Link>
          ))}
        </div>
      )}

      {/* 본문 뷰어 */}
      <div className="min-h-[300px]">
        {isCategoryPage && (
          <div className="mb-8 bg-[#f5f5f5] border border-gray-300 rounded-sm">
            <h3 className="font-bold text-lg mb-3 text-gray-700 border-b border-gray-300 pb-2">
              '{categoryName}' 분류에 속한 문서
            </h3>
            {categoryDocs.length === 0 ? (
              <p className="text-sm text-gray-500 p-2">이 분류에 속한 문서가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                {categoryDocs.map((doc) => (
                  <Link
                    key={doc.page.slug}
                    href={`/w/${encodeURIComponent(doc.page.slug)}`}
                    className="text-[#0275d8] hover:underline block truncate text-[15px]"
                  >
                    {doc.page.slug}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <NamuViewer content={page.content} />
      </div>
    </div>
  );
}