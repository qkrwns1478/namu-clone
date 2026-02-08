"use client";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export const FootnoteRef = ({ id, label, content }: { id: number; label: string; content: React.ReactNode }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
      setIsHovered(true);
    }
  };

  return (
    <>
      <sup
        ref={ref}
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
      >
        <a
          id={`r${id}`}
          href={`#fn${id}`}
          className="text-[#0275d8] hover:!underline font-bold mx-0.5 cursor-pointer text-xs"
        >
          [{label}]
        </a>
      </sup>

      {mounted &&
        isHovered &&
        createPortal(
          <div
            className="fixed z-[9999] p-2 bg-white border border-[#ccc] rounded text-sm text-gray-700 font-normal leading-normal whitespace-normal break-words text-left"
            style={{
              top: coords.top - 8,
              left: coords.left,
              width: "max-content",
              maxWidth: "300px",
              transform: "translate(-50%, -100%)",
              pointerEvents: "none",
            }}
          >
            <span className="text-[#0275d8] mr-1">[{label}]</span>
            {content}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-[6px] border-t-[#ccc]"></div>
          </div>,
          document.body,
        )}
    </>
  );
};