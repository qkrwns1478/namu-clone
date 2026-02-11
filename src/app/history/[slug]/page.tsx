import { getWikiHistory, revertWikiPage } from "@/app/actions";
import SlugTitle from "@/components/SlugTitle";
import { Metadata } from "next";
import { format } from 'date-fns';
import Link from "next/link";
import { FaCircle } from "react-icons/fa";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  return {
    title: `${decodedSlug} (역사) - 나무위키`,
  };
}

export default async function HistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const history = await getWikiHistory(slug);

  const viewButton = (rev: Number) => {
    return (
      <Link href={`/w/${slug}?rev=${rev}`} className="text-[#0275d8] hover:!underline text-xs">
        보기
      </Link>
    );
  };

  return (
    <div className="p-6 bg-white border border-[#ccc] rounded-t-none rounded-b-md sm:rounded-md overflow-hidden">
      <div className="mb-4 flex items-center gap-2">
        <SlugTitle slug={decodedSlug} />
        <span className="text-3xl font-bold text-[#373a3c]">(문서 역사)</span>
      </div>

      <div>
        <ul className="py-4">
          {history.map((rev) => (
            <li key={rev.id} className="flex justify-start items-center gap-2 my-1">
              <FaCircle size={6}/>
              <span>{format(rev.createdAt, 'yyyy-MM-dd HH:mm:ss')}</span>
              <div>
                <span className="text-xs">({viewButton(rev.rev)} | </span>
                <span className="text-[#0275d8] hover:!underline text-xs cursor-pointer">이 리비전으로 되돌리기</span>
                <span className="text-xs">)</span>
              </div>
              <span className="font-bold">r{rev.rev}</span>
              <span className={`text-[#0275d8] hover:!underline ${rev.author ? "font-bold" : ""}`}>{rev.author?.username || rev.ipAddress || "Unknown"}</span>
              ({rev.comment && rev.comment != "" ? <span className="text-gray-500">{rev.comment}</span> : ""})
            </li>
          ))}
        </ul>
      </div>

      {/* <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 w-16">번호</th>
              <th className="p-3">수정일시</th>
              <th className="p-3">수정자</th>
              <th className="p-3">기능</th>
            </tr>
          </thead>
          <tbody>
            {history.map((rev) => (
              <tr key={rev.id} className="border-t hover:bg-gray-50">
                <td className="p-3 text-gray-500">r{rev.rev}</td>
                <td className="p-3">{rev.createdAt.toLocaleString()}</td>
                <td className="p-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-700">
                      {rev.author?.username || rev.ipAddress || "Unknown"}
                    </span>
                    <span className="text-gray-500 text-xs">{rev.comment || "(-)"}</span>
                  </div>
                </td>
                <td className="p-3">
                  <Link 
                    href={`/w/${slug}?rev=${rev.rev}`} 
                    className="text-[#0275d8] hover:!underline text-xs"
                  >
                    보기
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await revertWikiPage(decodedSlug, rev.id);
                    }}
                  >
                    <button className="text-[#0275d8] hover:!underline text-xs" type="submit">
                      이 버전으로 되돌리기
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> */}

    </div>
  );
}
