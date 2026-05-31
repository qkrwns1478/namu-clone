import { getMoreRecentChanges } from "@/app/actions";
import { differenceInMinutes, differenceInHours, differenceInDays, differenceInYears } from 'date-fns';
import Link from "next/link";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "최근 변경내역 - 나무위키",
  };
}

export default async function RecentChanges() {
  const recentChanges = await getMoreRecentChanges();
  const curr = new Date();

  const getTimeString = (updatedAt: Date) => {
    const diffMin = differenceInMinutes(curr, updatedAt);
    if (diffMin == 0) return "방금";
    else if (diffMin < 60) return `${diffMin}분`;
    else {
      const diffHour = differenceInHours(curr, updatedAt);
      if (diffHour < 24) return `${diffHour}시간`;
      else {
        const diffDay = differenceInDays(curr, updatedAt);
        if (diffDay < 365) return `${diffDay}일`;
        else {
          const diffYear = differenceInYears(curr, updatedAt);
          return `${diffYear}년`
        }
      }
    }
  };

  return (
    <div className="p-6 bg-white border border-[#ccc] rounded-t-none rounded-b-md sm:rounded-md overflow-hidden">
      <h1 className="text-4xl font-bold text-[#373a3c] leading-tight break-all mb-4">최근 변경내역</h1>
      <table className="w-full text-left">
        <thead className="border-b-2 border-[#ccc]">
          <tr>
            <th className="p-3">문서</th>
            <th className="p-3">수정자</th>
            <th className="p-3">수정 시간</th>
          </tr>
        </thead>
        <tbody>
          {recentChanges.map((change) => (
            <tr key={change.slug} className="border-b border-gray-300 hover:bg-gray-50">
              <td className="p-3">
                <Link href={`/w/${encodeURIComponent(change.slug)}`} className="text-[#0275d8] hover:!underline">{change.slug}</Link>
              </td>
              <td className="p-3">-</td>
              <td className="p-3">{getTimeString(change.updatedAt)} 전</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
