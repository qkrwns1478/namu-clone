import { getWikiPage } from "@/app/actions";
import EditForm from "@/components/EditForm";
import Link from "next/link";
import { FaAnchor } from "react-icons/fa";
import { FaCircleArrowRight, FaTrashCan } from "react-icons/fa6";
import { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  return {
    title: `${decodedSlug} (편집) - 나무위키`,
  };
}

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const page = await getWikiPage(slug);
  const encodedSlug = encodeURIComponent(decodedSlug);

  return (
    <div className="p-5 bg-white border border-[#ccc] rounded-t-none rounded-b-md sm:rounded-md overflow-hidden">
      {/* 상단 헤더 및 버튼 그룹 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
        <a href={`/w/${decodedSlug}`} className="hover:!underline" >
          <h1 className="text-4xl font-bold text-[#373a3c] leading-tight break-all">{decodedSlug}</h1>
        </a>

        <div className="flex">
          {/* 역링크 */}
          <Link
            href="#"
            className="px-3 py-1.5 border border-r-0 border-[#ccc] rounded rounded-r-none bg-white text-[15px] text-gray-700 hover:bg-gray-50 flex items-center gap-1 transition-colors"
          >
            <FaAnchor size={15} />
            <span>역링크</span>
          </Link>

          {/* 이동 버튼 */}
          <Link
            href={`/move/${encodedSlug}`}
            className="px-3 py-1.5 border border-r-0 border-[#ccc] bg-white text-[15px] text-gray-700 hover:bg-gray-50 flex items-center gap-1 transition-colors"
          >
            <FaCircleArrowRight size={15} />
            <span>이동</span>
          </Link>

          {/* 삭제 버튼 */}
          <Link
            href={`/delete/${encodedSlug}`}
            className="px-3 py-1.5 border border-[#ccc] rounded rounded-l-none bg-[#da4453] text-[15px] text-white hover:bg-[#c9302c] flex items-center gap-1 transition-colors"
          >
            <FaTrashCan size={15} />
            <span>삭제</span>
          </Link>
        </div>
      </div>

      <EditForm slug={decodedSlug} initialContent={page?.content || ""} />
    </div>
  );
}