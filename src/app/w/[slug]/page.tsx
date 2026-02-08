import { getWikiPage, getCategoryDocs, getExistingSlugs, fetchWikiContent } from "@/app/actions";
import NamuViewer from "@/components/NamuViewer";
import SlugTitle from "@/components/SlugTitle";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Star, MoreVertical } from "lucide-react";
import { FaMessage, FaBook } from "react-icons/fa6";
import { FaEdit } from "react-icons/fa";
import { Metadata } from "next";
import { redirect } from "next/navigation";

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
  searchParams: Promise<{ from?: string; noredirect?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  return {
    title: `${decodedSlug} - 나무위키`,
  };
}

const CHO_SUNG = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

function getInitial(char: string) {
  const code = char.charCodeAt(0);
  // 한글 유니코드 범위: 0xAC00(가) ~ 0xD7A3(힣)
  if (code >= 0xac00 && code <= 0xd7a3) {
    const initialOffset = Math.floor((code - 0xac00) / 28 / 21);
    return CHO_SUNG[initialOffset];
  }
  // 한글 자음만 있는 경우 (ㄱ, ㄴ...)
  if (code >= 0x3131 && code <= 0x314e) {
    return char;
  }
  // 영문이나 숫자는 그대로 대문자로 반환하거나 기타 처리
  if (/[a-zA-Z]/.test(char)) return char.toUpperCase();
  if (/[0-9]/.test(char)) return char; // 숫자는 숫자 그대로 그룹화 or '0-9'로 묶기

  return "기타";
}

export default async function WikiPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { from, noredirect } = await searchParams;
  const decodedSlug = decodeURIComponent(slug);
  const decodedFrom = from ? decodeURIComponent(from) : null;

  const rawPage = await getWikiPage(slug);
  const page = rawPage as WikiPageWithCategory | null;

  // 리다이렉트 처리 로직
  if (page && page.content.trim().startsWith("#redirect ") && noredirect !== "1") {
    const target = page.content.trim().replace("#redirect ", "").trim();
    let targetSlug = target;
    let anchor = "";

    if (target.includes("#")) {
      const parts = target.split("#");
      targetSlug = parts[0];
      anchor = "#" + parts[1];
    }

    if (targetSlug && decodedSlug !== targetSlug) {
      redirect(`/w/${encodeURIComponent(targetSlug)}?from=${encodeURIComponent(decodedSlug)}${anchor}`);
    }
  }

  const isCategoryPage = decodedSlug.startsWith("분류:");
  const categoryName = isCategoryPage ? decodedSlug.replace("분류:", "") : null;
  const categoryDocs = categoryName ? await getCategoryDocs(categoryName) : [];

  const linkedCategories = page?.categories?.map((c) => c.category.name) || [];

  // 분류 문서 그룹화 로직
  const groupedDocs: { [key: string]: typeof categoryDocs } = {};

  if (isCategoryPage && categoryDocs.length > 0) {
    categoryDocs.sort((a, b) => a.page.slug.localeCompare(b.page.slug));
    categoryDocs.forEach((doc) => {
      const initial = getInitial(doc.page.slug.charAt(0));
      if (!groupedDocs[initial]) {
        groupedDocs[initial] = [];
      }
      groupedDocs[initial].push(doc);
    });
  }

  // 그룹 키 정렬 (ㄱ -> ㅎ -> A -> Z -> 기타)
  const sortedKeys = Object.keys(groupedDocs).sort((a, b) => a.localeCompare(b, "ko"));

  // 스타일 클래스
  const btnToolClass =
    "p-1 border border-[#ccc] rounded text-gray-600 hover:bg-gray-100 transition-colors bg-white flex items-center justify-center w-[32px] h-[32px]";

  const btnToolMiddleClass =
    "flex items-center gap-1 px-3 py-1 border border-r-0 border-[#ccc] rounded rounded-l-none rounded-r-none text-[15px] text-[#212529BF] hover:bg-gray-100 transition-colors bg-white h-[32px]";
  const btnToolRightClass =
    "flex items-center gap-1 px-3 py-1 border border-[#ccc] rounded rounded-l-none text-[15px] text-[#212529BF] hover:bg-gray-100 transition-colors bg-white h-[32px]";
  const btnToolLeftClass =
    "p-1 border border-r-0 border-[#ccc] rounded rounded-r-none text-[#212529BF] hover:bg-gray-100 transition-colors bg-white flex items-center justify-center w-[32px] h-[32px]";

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

  // 본문 내 링크 파싱하여 존재 여부 확인
  let existingSlugs: string[] = [];
  if (page) {
    const targets = new Set<string>();

    if (page.content.trim().startsWith("#redirect ")) {
      const redirectTarget = page.content.trim().replace("#redirect ", "").split("#")[0].trim();
      if (redirectTarget) targets.add(redirectTarget);
    }

    const linkRegex = /\[\[(.*?)(?:\|(.*?))?\]\]/g;
    let match;

    while ((match = linkRegex.exec(page.content)) !== null) {
      let target = match[1];
      if (target.includes("#")) {
        target = target.split("#")[0];
      }
      if (target) targets.add(target);
    }

    // DB에서 존재 여부 조회
    if (targets.size > 0) {
      existingSlugs = await getExistingSlugs(Array.from(targets));
    }
  }

  const encodedSlug = encodeURIComponent(page.slug);

  return (
    <div className="p-6 bg-white border border-[#ccc] rounded-t-none rounded-b-md sm:rounded-md overflow-hidden">
      {/* 상단 툴바 */}
      <div className="flex justify-between">
        <div className="mb-4">
          <SlugTitle slug={page.slug} />
          <div className="text-sm text-[#212529BF] mt-2">
            최근 수정 시각: {page.updatedAt.toLocaleString()}
          </div>
        </div>

        <div className="flex justify-end gap-2 flex-wrap">
          <div className="flex">
            <button className={btnToolLeftClass} title="북마크">
              <Star size={15} />
            </button>
            <Link href={`/edit/${encodedSlug}`} className={btnToolMiddleClass}>
              <FaEdit size={15} /> 편집
            </Link>
            <Link href="#" className={btnToolMiddleClass}>
              <FaMessage size={15} /> 토론
            </Link>
            <Link href={`/history/${encodedSlug}`} className={btnToolRightClass}>
              <FaBook size={15} /> 역사
            </Link>
          </div>
          <button className={btnToolClass} title="더보기">
            <MoreVertical size={15} />
          </button>
        </div>
      </div>
      {/* 리다이렉트 안내 메시지 */}
      {decodedFrom && (
        <div className="mb-4 flex items-center text-[15px] text-[#373a3c] bg-[#aacdec] border border-[#2378c3] rounded p-3">
          <Link 
            href={`/w/${encodeURIComponent(decodedFrom)}?noredirect=1`} 
            className="text-[#0275d8] hover:!underline"
          >
            {decodedFrom}
          </Link>
          <span>에서 넘어옴</span>
        </div>
      )}

      {/* 분류 상자 */}
      {linkedCategories.length > 0 && (
        <div className="mb-[14px] px-2 py-1 rounded border border-[#e5e7eb] bg-white text-sm flex flex-wrap items-center gap-2">
          <span className="text-gray-500 text-xs">분류:</span>
          {linkedCategories.map((cat) => {
            const hasBlur = cat.includes("#blur");
            const cleanName = hasBlur ? cat.replace("#blur", "") : cat;

            return (
              <Link
                key={cat}
                href={`/w/${encodeURIComponent("분류:" + cleanName)}`}
                className={`text-[#0275d8] hover:!underline border-r pr-2 last:border-0 last:pr-0 border-gray-300 ${
                  hasBlur
                    ? "text-transparent [text-shadow:0_0_6px_#0275d8] hover:text-[#0275d8] hover:text-shadow-none"
                    : ""
                }`}
                title={`분류:${cleanName}`}
              >
                {cleanName}
              </Link>
            );
          })}
        </div>
      )}

      {/* 본문 뷰어 */}
      <div className="min-h-[300px]">
        <NamuViewer
          content={page.content}
          slug={decodedSlug}
          existingSlugs={existingSlugs}
          fetchContent={fetchWikiContent}
        />

        {isCategoryPage && (
          <div className="mt-8">
            <h2 className="font-bold text-2xl mb-1 text-[#373a3c] mb-6 pb-2 border-b border-[#ccc]">
              "{categoryName}" 분류에 속하는 문서
            </h2>
            <div className="text-sm text-gray-500">전체 {categoryDocs.length}개 문서</div>

            {categoryDocs.length === 0 ? (
              <p className="text-sm text-gray-500 p-2">이 분류에 속한 문서가 없습니다.</p>
            ) : (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8">
                {sortedKeys.map((key) => (
                  <div key={key} className="break-inside-avoid-column mb-6">
                    {/* 초성 헤더 */}
                    <h3 className="font-bold text-xl mb-2 text-[#373a3c] border-b border-gray-300 pb-1">
                      {key}
                    </h3>
                    {/* 문서 리스트 */}
                    <ul className="list-disc list-inside space-y-1">
                      {groupedDocs[key].map((doc) => (
                        <li key={doc.page.slug} className="text-[15px]">
                          <Link
                            href={`/w/${encodeURIComponent(doc.page.slug)}`}
                            className="text-[#0275d8] hover:underline"
                          >
                            {doc.page.slug}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
