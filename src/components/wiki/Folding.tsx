"use client";
import React, { useState } from "react";

export const Folding = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-[calc(100%-4px)] mx-[2px]">
      <div className="cursor-pointer select-none" onClick={() => setIsOpen(!isOpen)}>
        <span className="font-bold text-[15px] text-gray-800">{title}</span>
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
};