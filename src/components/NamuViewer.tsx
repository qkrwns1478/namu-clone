"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";

import { parseCssStyle } from "@/utils/wikiUtils";
import { Folding } from "./wiki/Folding";
import { ParserContext, FootnoteData, parseLine, renderSubBlock, parseTable } from "./wiki/WikiParser";

type TocItem = {
  id: string;
  text: string;
  level: number;
  numberStr: string;
};

export default function NamuViewer({
  content,
  slug,
  existingSlugs = [],
  fetchContent,
  visitedSlugs = new Set<string>(),
  includeDepth = 0,
}: {
  content: string;
  slug?: string;
  existingSlugs?: string[];
  fetchContent?: (slug: string) => Promise<string | null>;
  visitedSlugs?: Set<string>;
  includeDepth?: number;
}) {
  const [isTocExpanded, setIsTocExpanded] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    // 초기 접힘 상태 계산 (헤더 파싱)
    const initialSet = new Set<string>();
    const lines = content.split("\n");
    const counters = [0, 0, 0, 0, 0, 0];
    lines.forEach((rawLine) => {
      const line = rawLine.replace(/\r$/, "").trim();
      const headerMatch = line.match(/^(=+)\s*#\s*(.+?)\s*#\s*\1$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        if (level >= 1) {
          const counterIndex = level - 2;
          if (counterIndex >= 0) {
            counters[counterIndex]++;
            for (let i = counterIndex + 1; i < counters.length; i++) counters[i] = 0;
            const numberParts = [];
            for (let i = 0; i <= counterIndex; i++) numberParts.push(counters[i]);
            const id = `s-${numberParts.join(".")}`;
            initialSet.add(id);
          }
        }
      } else {
        const normalMatch = line.match(/^(=+)\s*(.+?)\s*\1$/);
        if (normalMatch) {
          const level = normalMatch[1].length;
          const counterIndex = level - 2;
          if(counterIndex >= 0) {
            counters[counterIndex]++;
            for(let i = counterIndex+1; i < counters.length; i++) counters[i] = 0;
          }
        }
      }
    });
    return initialSet;
  });

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // 목차 및 헤더맵 생성
  const { tocItems, headerMap } = useMemo(() => {
    const items: TocItem[] = [];
    const hMap: { [lineIndex: number]: string } = {};
    const counters = [0, 0, 0, 0, 0, 0];

    content.split("\n").forEach((rawLine, lineIndex) => {
      const line = rawLine.replace(/\r$/, "").trim();
      const headerMatch = line.match(/^(=+)\s*(#?)\s*(.+?)\s*\2\s*\1$/);

      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[3];
        if (level >= 1) {
          const counterIndex = level - 2;
          if (counterIndex >= 0) {
            counters[counterIndex]++;
            for (let i = counterIndex + 1; i < counters.length; i++) counters[i] = 0;
            const numberStr = counters.slice(0, counterIndex + 1).join(".") + ".";
            const id = `s-${numberStr.slice(0, -1)}`;
            items.push({ id, text, level, numberStr });
            hMap[lineIndex] = numberStr;
          }
        }
      }
    });
    return { tocItems: items, headerMap: hMap };
  }, [content]);

  // 목차 렌더링 함수
  const renderToc = () => (
    <div className="px-5 py-3 border border-[#ccc] bg-white inline-block min-w-[120px] max-w-full">
      <div
        className="flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsTocExpanded(!isTocExpanded)}
      >
        <span className="text-lg">목차</span>
        <span className="text-gray-500 text-xs font-normal">
          {isTocExpanded ? <ChevronDown size={20} /> : <ChevronLeft size={20} />}
        </span>
      </div>
      {isTocExpanded && (
        <div className="mt-3 leading-6">
          {tocItems.map((item) => (
            <div className="flex" key={item.id} style={{ paddingLeft: `${(item.level - 2) * 15}px` }}>
              <a href={`#${item.id}`} className="mr-1 text-[#0275d8] hover:!underline block truncate">
                <span>{item.numberStr}</span>
              </a>
              <span className="text-[#373a3c]">{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // 헤더 가시성 맵 계산
  const lines = content.split("\n");
  const visibilityMap = new Array(lines.length).fill(true);
  let currentHideLevel = 0;

  lines.forEach((line, i) => {
    const rawLine = line.replace(/\r$/, "").trim();
    const headerMatch = rawLine.match(/^(=+)\s*(.+?)\s*\1$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      if (currentHideLevel > 0 && level <= currentHideLevel) {
        currentHideLevel = 0;
      }
      if (currentHideLevel > 0 && level > currentHideLevel) {
        visibilityMap[i] = false;
        return;
      }
      const numberStr = headerMap[i];
      const id = numberStr ? `s-${numberStr.slice(0, -1)}` : undefined;
      if (id && collapsedSections.has(id)) {
        currentHideLevel = level;
      }
    } else {
      if (currentHideLevel > 0) {
        visibilityMap[i] = false;
      }
    }
  });

  const footnotes: FootnoteData[] = [];

  // 파서 컨텍스트 생성
  const parserCtx: ParserContext = {
    slug,
    fetchContent,
    existingSlugs,
    visitedSlugs,
    includeDepth,
    footnotes,
    headerMap,
    collapsedSections,
    toggleSection,
    tocRenderer: renderToc,
  };

  let keyCounter = 0;
  const getKey = (prefix: string) => `${prefix}-${keyCounter++}`;

  const renderedContent: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!visibilityMap[i]) {
      i++;
      continue;
    }

    const line = lines[i].replace(/\r$/, "").trim();

    // 블록 레벨 파싱
    if (line.startsWith("{{{#!raw")) {
        let currentLineContent = line.replace(/^\{\{\{#!raw\s*/, "");
        const contentLines: string[] = [];
        let depth = 3;
        let k = i;
        let foundEnd = false;
        while(k < lines.length) {
            let textToAnalyze = lines[k];
            if(k===i) textToAnalyze = currentLineContent;
            const openMatches = (textToAnalyze.match(/\{\{\{/g) || []).length;
            const closeMatches = (textToAnalyze.match(/\}\}\}/g) || []).length;
            depth += openMatches*3; depth -= closeMatches*3;
            if(depth <=0){
                let contentToAdd = textToAnalyze.replace(/\}\}\}(?!.*\}\}\})/, "");
                if(contentToAdd.trim() || k!==i) contentLines.push(contentToAdd);
                i = k+1; foundEnd=true; break;
            }
            contentLines.push(textToAnalyze); k++;
        }
        if(foundEnd){
            renderedContent.push(<div key={getKey("raw-block-main")} className="whitespace-pre-wrap">{contentLines.join("\n")}</div>);
            continue;
        }
    }

    if (line.startsWith("{{{#!wiki")) {
      const styleMatch = line.match(/style="([^"]*)"/);
      const styleString = styleMatch ? styleMatch[1] : "";
      const customStyle = parseCssStyle(styleString);
      let currentLineContent = line.replace(/^\{\{\{#!wiki(\s+style="[^"]*")?/, "");
      const contentLines: string[] = [];
      let depth = 3;
      let k = i;
      let foundEnd = false;
      while (k < lines.length) {
        let textToAnalyze = lines[k];
        if (k === i) textToAnalyze = currentLineContent;
        const openMatches = (textToAnalyze.match(/\{\{\{/g) || []).length;
        const closeMatches = (textToAnalyze.match(/\}\}\}/g) || []).length;
        depth += openMatches * 3;
        depth -= closeMatches * 3;
        if (depth <= 0) {
          let contentToAdd = textToAnalyze.replace(/\}\}\}(?!.*\}\}\})/, "");
          if (contentToAdd.trim() || k !== i) if (contentToAdd.trim()) contentLines.push(contentToAdd);
          i = k + 1;
          foundEnd = true;
          break;
        }
        if (k === i) { if(textToAnalyze.trim()) contentLines.push(textToAnalyze); }
        else contentLines.push(textToAnalyze);
        k++;
      }
      if (foundEnd) {
        renderedContent.push(
          <div key={getKey("wiki-block")} style={customStyle} className="wiki-block">
            {renderSubBlock(contentLines, parserCtx)}
          </div>,
        );
        continue;
      }
    }

    if (line.startsWith("{{{#!folding")) {
      const title = line.replace("{{{#!folding", "").trim();
      const contentLines: string[] = [];
      let depth = 3;
      let k = i + 1;
      let foundEnd = false;
      while (k < lines.length) {
        const currentLine = lines[k];
        const openMatches = (currentLine.match(/\{\{\{/g) || []).length;
        const closeMatches = (currentLine.match(/\}\}\}/g) || []).length;
        depth += openMatches * 3;
        depth -= closeMatches * 3;
        if (depth <= 0) {
          const cleanedLine = currentLine.replace(/\}\}\}(?!.*\}\}\})/, "");
          if (cleanedLine.trim()) contentLines.push(cleanedLine);
          i = k + 1;
          foundEnd = true;
          break;
        }
        contentLines.push(currentLine);
        k++;
      }
      if (foundEnd) {
        renderedContent.push(
          <Folding key={getKey("folding")} title={title}>
            {renderSubBlock(contentLines, parserCtx)}
          </Folding>,
        );
        continue;
      }
    }

    if (line.startsWith("||")) {
      const tableLines = [];
      let j = i;
      let tableDepth = 0;
      while (j < lines.length) {
        const curr = lines[j];
        const open = (curr.match(/\{\{\{/g) || []).length;
        const close = (curr.match(/\}\}\}/g) || []).length;
        tableDepth += open - close;
        tableLines.push(curr);
        j++;
        if (tableDepth <= 0 && j < lines.length && !lines[j].trim().startsWith("||")) break;
      }
      if (tableLines.length > 0) {
        renderedContent.push(parseTable(tableLines, parserCtx));
        i = j;
        continue;
      }
    }

    // 일반 라인 파싱 (WikiParser 함수 호출)
    renderedContent.push(
      <React.Fragment key={i}>
        {parseLine(lines[i], parserCtx, i)}
      </React.Fragment>
    );
    i++;
  }

  const OuterTag = includeDepth > 0 ? "span" : "div";
  const isIncluded = includeDepth > 0;

  return (
    <OuterTag style={isIncluded ? { display: "contents" } : {}}>
      <OuterTag
        className={`${isIncluded ? "" : "prose max-w-none"} text-gray-800 text-[15px]`}
        style={isIncluded ? { display: "contents" } : {}}
      >
        {renderedContent}
      </OuterTag>

      {footnotes.length > 0 && (
        <div className="border-t mt-5 mb-5 pt-4 border-[#777]">
          <ol className="list-none space-y-1 text-sm text-gray-600">
            {footnotes.map((note) => {
              return (
                <li key={`fn-item-${note.id}`} id={`fn${note.id}`} className="flex gap-2 items-start">
                  <a
                    href={`#r${note.id}`}
                    className="text-[#0275d8] shrink-0 hover:!underline min-w-[20px] text-right"
                  >
                    [{note.label}]
                  </a>
                  <span>{note.content}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </OuterTag>
  );
}
