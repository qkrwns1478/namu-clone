"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { GoAlertFill } from "react-icons/go";

export default function Disclaimer() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative p-4 bg-[#f2938c] border border-[#d83933] rounded text-[#3f0404] mb-4">
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 p-1 hover:bg-[#d8393322] rounded transition-colors"
        aria-label="닫기"
      >
        <X size={20} />
      </button>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">
          <GoAlertFill />
        </span>
        <span className="font-bold text-lg">프로젝트 안내</span>
      </div>

      <div className="pl-7 text-[13.5px] leading-relaxed space-y-1">
        <p>
          본 사이트는 <strong>학습 및 포트폴리오 목적으로 제작된 나무위키 클론 프로젝트</strong>입니다.
        </p>
        <p>실제 나무위키 사이트가 아니며, 내부의 모든 기능과 데이터는 개발 테스트 용도로만 사용됩니다.</p>
        <p>제공되는 정보의 정확성을 보장하지 않으므로 이용에 참고하시기 바랍니다.</p>
      </div>
    </div>
  );
}
