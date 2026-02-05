import { getWikiPage, saveWikiPage } from "@/app/actions";
import ImageUploader from "@/components/ImageUploader";
import Link from "next/link";
import { FaAnchor } from "react-icons/fa";
import { FaCircleArrowRight, FaTrashCan } from "react-icons/fa6";

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const page = await getWikiPage(slug);
  const encodedSlug = encodeURIComponent(decodedSlug);

  return (
    <div className="p-5 bg-white border border-[#ccc] rounded-t-none rounded-b-md sm:rounded-md overflow-hidden">
      {/* 상단 헤더 및 버튼 그룹 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-4">
        <h1 className="text-3xl font-bold text-[#373a3c]">{decodedSlug}</h1>

        <div className="flex">
          {/* 역링크 */}
          <Link
            href="#"
            className="px-3 py-1.5 border border-r-0 border-[#ccc] rounded rounded-r-none bg-white text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1 transition-colors"
          >
            <FaAnchor size={14} />
            <span>역링크</span>
          </Link>

          {/* 이동 버튼 */}
          <Link
            href={`/move/${encodedSlug}`}
            className="px-3 py-1.5 border border-r-0 border-[#ccc] bg-white text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1 transition-colors"
          >
            <FaCircleArrowRight size={14} />
            <span>이동</span>
          </Link>

          {/* 삭제 버튼 */}
          <Link
            href={`/delete/${encodedSlug}`}
            className="px-3 py-1.5 border border-[#ccc] rounded rounded-l-none bg-[#da4453] text-sm text-white hover:bg-[#c9302c] flex items-center gap-1 transition-colors"
          >
            <FaTrashCan size={14} />
            <span>삭제</span>
          </Link>
        </div>
      </div>

      <form action={saveWikiPage} className="flex flex-col">
        <input type="hidden" name="slug" value={decodedSlug} />

        {/* 편집기 탭 */}
        <div className="flex border-b border-[#ccc] mb-0">
          <button
            type="button"
            className="px-4 py-2 text-sm font-bold text-[#373a3c] border border-[#ccc] border-b-white -mb-[1px] rounded-t-sm bg-white"
          >
            RAW 편집
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm text-[#0275d8] hover:underline flex items-center"
          >
            미리보기
          </button>
        </div>

        {/* 텍스트 에디터 */}
        <textarea
          name="content"
          defaultValue={page?.content || ""}
          className="w-full h-[60vh] p-4 border border-[#ccc] border-t-0 rounded-b-sm focus:outline-none focus:ring-2 focus:ring-[#00A495] inset-ring font-mono text-[14px] leading-relaxed resize-y"
          placeholder="여기에 내용을 입력하세요..."
        />

        {/* 요약 입력 */}
        <div className="mt-4">
          <label className="block text-sm mb-1 text-gray-700">요약</label>
          <input
            name="comment"
            type="text"
            placeholder="수정 사유를 입력해주세요"
            className="w-full px-3 py-1.5 border border-[#ccc] rounded-sm text-sm focus:outline-none focus:border-[#00A495]"
          />
        </div>

        {/* 저작권 동의 문구 */}
        <div className="mt-4 text-xs text-gray-600 leading-relaxed">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" className="mt-0.5" required />
            <span>
              문서 편집을 <strong>저장</strong>하면 당신은 기여한 내용을{" "}
              <strong>CC-BY-NC-SA 2.0 KR</strong>으로 배포하고 기여한 문서에 대한 하이퍼링크나 URL을
              이용하여 저작자 표시를 하는 것에 동의한다는 것입니다. 이{" "}
              <strong>동의는 철회할 수 없습니다.</strong> 또한 생성형 인공지능의 사용은 일부 예외를
              제외하고 금지되어 있습니다. 자세한 내용은 관련 공지를 참고하세요.
            </span>
          </label>
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="submit"
            className="px-8 py-1 bg-[#0275d8] text-white hover:bg-[#0263b8] transition-colors text-sm"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  );
}