"use client";

import Link from "next/link";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { IoLink } from "react-icons/io5";

// 목차 아이템 타입
type TocItem = {
  id: string;
  text: string;
  level: number;
  numberStr: string;
};

// Include 매크로 처리를 위한 내부 컴포넌트
const IncludeRenderer = ({
  rawArgs,
  fetchContent,
  existingSlugs = [],
  currentSlug,
  visitedSlugs = new Set<string>(),
  depth = 0,
}: {
  rawArgs: string;
  fetchContent?: (slug: string) => Promise<string | null>;
  existingSlugs?: string[];
  currentSlug?: string;
  visitedSlugs?: Set<string>;
  depth?: number;
}) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const MAX_INCLUDE_DEPTH = 5;

  // 인자 및 파라미터 미리 파싱
  const args = rawArgs.split(",");
  const slug = args[0].trim();
  const params: { [key: string]: string } = {};

  for (let i = 1; i < args.length; i++) {
    const parts = args[i].split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim();
      params[key] = val;
    }
  }

  const getLinkStyle = (target: string) => {
    const isExist = existingSlugs.includes(target) || target === currentSlug;
    return isExist ? "text-[#0275d8]" : "text-[#FF0000]";
  };

  useEffect(() => {
    // 특수 틀인 경우 fetch를 건너뜀
    if (slug === "틀:상세 내용" || slug === "틀:상위 문서") {
      setLoading(false);
      return;
    }

    if (!fetchContent || depth >= MAX_INCLUDE_DEPTH || visitedSlugs.has(slug)) {
      setLoading(false);
      if (visitedSlugs.has(slug)) {
        console.warn("Circular include detected:", slug);
      }
      return;
    }

    fetchContent(slug)
      .then((raw) => {
        if (raw) {
          let processed = raw;
          Object.keys(params).forEach((key) => {
            const val = params[key];
            const regex = new RegExp(`@${key}@`, "g");
            processed = processed.replace(regex, val);
          });
          setContent(processed);
        }
      })
      .catch((err) => {
        console.error("Include fetch error:", err);
      })
      .finally(() => setLoading(false));
  }, [slug, rawArgs, fetchContent]);

  if (loading) return <span className="text-gray-400 text-xs">[Loading...]</span>;

  // --- 특수 틀 대응 로직 ---
  if (slug === "틀:상세 내용") {
    const target = params["문서명"] || "내용";
    const linkColor = getLinkStyle(target);
    return (
      <div className="flex items-center gap-2 text-[15px]">
        <img src="/images/상세내용.svg" className="w-[21px] h-[21px]"/>
        <span>
          자세한 내용은{" "}
          <Link href={`/w/${encodeURIComponent(target)}`} className={`${linkColor} hover:!underline`}>
            {target}
          </Link>{" "}
          문서를 참고하십시오.
        </span>
      </div>
    );
  }

  if (slug === "틀:상위 문서") {
    const target = params["문서명1"] || "상위 문서";
    const linkColor = getLinkStyle(target);
    return (
      <div className="flex items-center gap-2 text-[15px]">
        <img src="/images/상위문서.svg" className="w-[21px] h-[21px]"/>
        <span>
          상위 문서:{" "}
          <Link href={`/w/${encodeURIComponent(target)}`} className={`${linkColor} hover:!underline`}>
            {target}
          </Link>
        </span>
      </div>
    );
  }

  if (!content) return <span className="text-red-500 text-xs">[Include Error: {slug}]</span>;

  return (
    <div>
      <NamuViewer
        content={content}
        slug={currentSlug}
        existingSlugs={existingSlugs}
        fetchContent={fetchContent}
        visitedSlugs={new Set([...visitedSlugs, slug])}
        includeDepth={depth + 1}
      />
    </div>
  );
};

// Folding 컴포넌트
const Folding = ({ title, children }: { title: string; children: React.ReactNode }) => {
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

// 각주 툴팁 컴포넌트
const FootnoteRef = ({ id, label, content }: { id: number; label: string; content: React.ReactNode }) => {
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

// CSS 스타일 문자열을 React Style 객체로 변환하는 헬퍼 함수
const parseCssStyle = (styleString: string): React.CSSProperties => {
  const style: any = {};
  const rules = styleString.split(";");

  rules.forEach((rule) => {
    const parts = rule.split(":");
    if (parts.length < 2) return;

    const key = parts[0].trim().replace(/-(\w)/g, (_, c) => c.toUpperCase());
    const value = parts.slice(1).join(":").trim();

    if (key && value) {
      style[key] = value;
    }
  });

  return style;
};

// 각주 데이터 타입 정의
type FootnoteData = {
  id: number;
  label: string;
  content: React.ReactNode;
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
    const initialSet = new Set<string>();
    const lines = content.split("\n");
    const counters = [0, 0, 0, 0, 0, 0];

    lines.forEach((rawLine) => {
      const line = rawLine.replace(/\r$/, "").trim();
      // #이 포함된 헤더 정규식: (=+)\s*#\s*(.+?)\s*#\s*\1
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
            initialSet.add(id); // 초기 접힘 목록에 추가
          }
        }
      } else {
        // 일반 헤더인 경우에도 카운터는 올려줘야 ID 정합성이 맞음
        const normalMatch = line.match(/^(=+)\s*(.+?)\s*\1$/);
        if (normalMatch) {
          const level = normalMatch[1].length;
          const counterIndex = level - 2;
          if (counterIndex >= 0) {
            counters[counterIndex]++;
            for (let i = counterIndex + 1; i < counters.length; i++) counters[i] = 0;
          }
        }
      }
    });
    return initialSet;
  });

  const existingSet = useMemo(() => {
    const set = new Set(existingSlugs);
    if (slug) {
      set.add(slug);
    } 
    return set;
  }, [existingSlugs, slug]);

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 1. [목차 및 헤더 정보 생성]
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

  // 목차 렌더링
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
              <span className="text-[#373a3c]">{parseInline(item.text)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // 2. [가시성 계산]
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

  // 3. [각주 저장소]
  const footnotes: FootnoteData[] = [];
  let keyCounter = 0;
  const getKey = (prefix: string) => `${prefix}-${keyCounter++}`;

  // [Helper] Brace Depth를 고려하여 "||" 로 셀을 분리하는 함수
  function splitCells(text: string): string[] {
    const res: string[] = [];
    let buf = "";
    let depth = 0;

    for (let i = 0; i < text.length; i++) {
      if (text.startsWith("{{{", i)) {
        depth++;
        buf += "{{{";
        i += 2;
      } else if (text.startsWith("}}}", i)) {
        depth--;
        buf += "}}}";
        i += 2;
      } else if (depth === 0 && text.startsWith("||", i)) {
        res.push(buf);
        buf = "";
        i++;
      } else {
        buf += text[i];
      }
    }
    res.push(buf);
    return res;
  }

  // [Sub Block Renderer]
  function renderSubBlock(subLines: string[]) {
    const nodes: React.ReactNode[] = [];
    let j = 0;
    while (j < subLines.length) {
      const l = subLines[j].replace(/\r$/, "").trim();

      if (l.startsWith("{{{#!wiki")) {
        const styleMatch = l.match(/style="([^"]*)"/);
        const styleString = styleMatch ? styleMatch[1] : "";
        const customStyle = parseCssStyle(styleString);
        let currentLineContent = l.replace(/^\{\{\{#!wiki(\s+style="[^"]*")?/, "");

        const contentLines: string[] = [];
        let depth = 3;
        let k = j;
        let foundEnd = false;

        while (k < subLines.length) {
          let textToAnalyze = subLines[k];
          if (k === j) textToAnalyze = currentLineContent;

          const openMatches = (textToAnalyze.match(/\{\{\{/g) || []).length;
          const closeMatches = (textToAnalyze.match(/\}\}\}/g) || []).length;

          depth += openMatches * 3;
          depth -= closeMatches * 3;

          if (depth <= 0) {
            let contentToAdd = textToAnalyze.replace(/\}\}\}(?!.*\}\}\})/, "");
            if (contentToAdd.trim() || k !== j) {
              if (contentToAdd.trim()) contentLines.push(contentToAdd);
            }
            j = k + 1;
            foundEnd = true;
            break;
          }

          if (k === j) {
            if (textToAnalyze.trim()) contentLines.push(textToAnalyze);
          } else {
            contentLines.push(textToAnalyze);
          }
          k++;
        }

        if (foundEnd) {
          nodes.push(
            <div key={getKey("wiki-block-sub")} style={customStyle} className="wiki-block">
              {renderSubBlock(contentLines)}
            </div>,
          );
          continue;
        }
      }

      if (l.startsWith("{{{#!folding")) {
        const title = l.replace("{{{#!folding", "").trim();
        const contentLines: string[] = [];
        let depth = 3;
        let k = j + 1;
        let foundEnd = false;

        while (k < subLines.length) {
          const currentLine = subLines[k];
          const openMatches = (currentLine.match(/\{\{\{/g) || []).length;
          const closeMatches = (currentLine.match(/\}\}\}/g) || []).length;
          depth += openMatches * 3;
          depth -= closeMatches * 3;

          if (depth <= 0) {
            const cleanedLine = currentLine.replace(/\}\}\}(?!.*\}\}\})/, "");
            if (cleanedLine.trim()) contentLines.push(cleanedLine);
            j = k + 1;
            foundEnd = true;
            break;
          }
          contentLines.push(currentLine);
          k++;
        }

        if (foundEnd) {
          nodes.push(
            <Folding key={getKey("folding-sub")} title={title}>
              {renderSubBlock(contentLines)}
            </Folding>,
          );
          continue;
        }
      }

      if (l.startsWith("{{{#!raw")) {
        let currentLineContent = l.replace(/^\{\{\{#!raw\s*/, "");
        const contentLines: string[] = [];
        let depth = 3;
        let k = j;
        let foundEnd = false;

        while (k < subLines.length) {
          let textToAnalyze = subLines[k];
          if (k === j) textToAnalyze = currentLineContent;
          const openMatches = (textToAnalyze.match(/\{\{\{/g) || []).length;
          const closeMatches = (textToAnalyze.match(/\}\}\}/g) || []).length;
          depth += openMatches * 3;
          depth -= closeMatches * 3;
          if (depth <= 0) {
            let contentToAdd = textToAnalyze.replace(/\}\}\}(?!.*\}\}\})/, "");
            if (contentToAdd.trim() || k !== j) contentLines.push(contentToAdd);
            j = k + 1;
            foundEnd = true;
            break;
          }
          contentLines.push(textToAnalyze);
          k++;
        }
        if (foundEnd) {
          nodes.push(
            <div key={getKey("raw-block")} className="whitespace-pre-wrap">
              {contentLines.join("\n")}
            </div>,
          );
          continue;
        }
      }

      if (l.startsWith("||")) {
        const tLines = [];
        let m = j;
        let tableDepth = 0;
        while (m < subLines.length) {
          const line = subLines[m];
          const open = (line.match(/\{\{\{/g) || []).length;
          const close = (line.match(/\}\}\}/g) || []).length;
          tableDepth += open - close;
          tLines.push(line);
          m++;
          if (tableDepth <= 0 && m < subLines.length && !subLines[m].trim().startsWith("||")) break;
        }
        nodes.push(parseTable(tLines));
        j = m;
      } else {
        nodes.push(parseLine(subLines[j], -1));
        j++;
      }
    }
    return nodes;
  }

  // [Inline Parser]
  function parseInline(text: string): React.ReactNode[] {
    // 1. Note 감지
    const noteStartRegex = /\[\*/;
    const noteStartMatch = noteStartRegex.exec(text);

    const includeRegex = /\[include\((.*?)\)\]/i;
    const includeMatch = includeRegex.exec(text);

    const braceIdx = text.indexOf("{{{");

    const youtubeRegex = /\[youtube\((.*?)\)\]/i;
    const youtubeMatch = youtubeRegex.exec(text);

    const wikiRegex = /\[\[((?:[^[\]]|\[\[(?:[^[\]])*\]\])*)\]\]/;
    const wikiMatch = wikiRegex.exec(text);

    const brRegex = /\[br\]/i;
    const brMatch = brRegex.exec(text);

    const boldRegex = /'''(.*?)'''/;
    const boldMatch = boldRegex.exec(text);

    const italicRegex = /''(.*?)''/;
    const italicMatch = italicRegex.exec(text);

    const underlineRegex = /__(.*?)__/;
    const underlineMatch = underlineRegex.exec(text);

    const delRegex = /~~(.*?)~~/;
    const delMatch = delRegex.exec(text);

    const dashDelRegex = /--(.*?)--/;
    const dashDelMatch = dashDelRegex.exec(text);

    const supRegex = /\^\^(.*?)\^\^/;
    const supMatch = supRegex.exec(text);

    const subRegex = /,,(.*?),,/;
    const subMatch = subRegex.exec(text);

    const candidates = [
      { type: "note", idx: noteStartMatch ? noteStartMatch.index : Infinity, match: noteStartMatch },
      { type: "include", idx: includeMatch ? includeMatch.index : Infinity, match: includeMatch },
      { type: "brace", idx: braceIdx !== -1 ? braceIdx : Infinity, match: null },
      { type: "youtube", idx: youtubeMatch ? youtubeMatch.index : Infinity, match: youtubeMatch },
      { type: "wiki", idx: wikiMatch ? wikiMatch.index : Infinity, match: wikiMatch },
      { type: "br", idx: brMatch ? brMatch.index : Infinity, match: brMatch },
      { type: "bold", idx: boldMatch ? boldMatch.index : Infinity, match: boldMatch },
      { type: "italic", idx: italicMatch ? italicMatch.index : Infinity, match: italicMatch },
      { type: "underline", idx: underlineMatch ? underlineMatch.index : Infinity, match: underlineMatch },
      { type: "del", idx: delMatch ? delMatch.index : Infinity, match: delMatch },
      { type: "dashDel", idx: dashDelMatch ? dashDelMatch.index : Infinity, match: dashDelMatch },
      { type: "sup", idx: supMatch ? supMatch.index : Infinity, match: supMatch },
      { type: "sub", idx: subMatch ? subMatch.index : Infinity, match: subMatch },
    ].sort((a, b) => a.idx - b.idx);

    for (const candidate of candidates) {
      if (candidate.idx === Infinity) break;

      if (candidate.type === "note" && candidate.match) {
        const startIdx = candidate.idx;
        let depth = 0;
        let endIdx = -1;

        // [* ... ] 중첩 대괄호 처리
        for (let i = startIdx; i < text.length; i++) {
          if (text[i] === "[") depth++;
          else if (text[i] === "]") {
            depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
        }

        if (endIdx !== -1) {
          const before = text.slice(0, startIdx);
          const rawContent = text.slice(startIdx + 2, endIdx); // [* 와 ] 제거
          const after = text.slice(endIdx + 1);

          let label = "";
          let contentText = rawContent;

          // 공백으로 시작하면 일반 텍스트(자동 번호), 아니면 커스텀 라벨
          if (!rawContent.startsWith(" ")) {
            // 커스텀 라벨 파싱: 첫 공백 전까지가 라벨
            const spaceIdx = rawContent.indexOf(" ");
            if (spaceIdx !== -1) {
              label = rawContent.slice(0, spaceIdx);
              contentText = rawContent.slice(spaceIdx + 1);
            } else {
              // 공백이 없으면 전체가 라벨 (내용 없음)
              label = rawContent;
              contentText = "";
            }
          } else {
            // 자동 번호 (맨 앞 공백 제거)
            contentText = rawContent.slice(1);
          }

          const parsedContent = parseInline(contentText);
          const noteId = footnotes.length + 1;
          const displayLabel = label || `${noteId}`;

          footnotes.push({
            id: noteId,
            label: displayLabel,
            content: parsedContent,
          });

          return [
            ...parseInline(before),
            <FootnoteRef key={getKey("fn-ref")} id={noteId} label={displayLabel} content={parsedContent} />,
            ...parseInline(after),
          ];
        }
        continue;
      }

      if (candidate.type === "include" && candidate.match) {
        const match = candidate.match;
        const before = text.slice(0, match.index);
        const rawArgs = match[1];
        const after = text.slice(match.index + match[0].length);
        return [
          ...parseInline(before),
          <IncludeRenderer
            key={getKey("include")}
            rawArgs={rawArgs}
            fetchContent={fetchContent}
            existingSlugs={existingSlugs}
            currentSlug={slug}
          />,
          ...parseInline(after),
        ];
      }

      if (candidate.type === "brace") {
        let depth = 0;
        let endIdx = -1;
        for (let i = candidate.idx; i < text.length; i++) {
          if (text.startsWith("{{{", i)) {
            depth++;
            i += 2;
          } else if (text.startsWith("}}}", i)) {
            depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
            i += 2;
          }
        }
        if (endIdx !== -1) {
          const before = text.slice(0, candidate.idx);
          const rawContent = text.slice(candidate.idx + 3, endIdx);
          const after = text.slice(endIdx + 3);

          if (rawContent.startsWith("#!raw")) {
            const inner = rawContent.replace(/^#!raw\s?/, "");
            return [
              ...parseInline(before),
              <span key={getKey("raw-inline")} className="whitespace-pre-wrap">
                {inner}
              </span>,
              ...parseInline(after),
            ];
          }
          if (rawContent.startsWith("#!folding")) {
            const parts = rawContent.replace("#!folding", "").trim();
            let title = "more";
            let foldingContent = parts;
            const titleMatch = parts.match(/^\[(.*?)\]/);
            if (titleMatch) {
              title = titleMatch[0];
              foldingContent = parts.substring(titleMatch[0].length).trim();
            }
            const contentLines = foldingContent.split("\n");
            return [
              ...parseInline(before),
              <Folding key={getKey("folding-inline")} title={title}>
                {renderSubBlock(contentLines)}
              </Folding>,
              ...parseInline(after),
            ];
          }
          if (rawContent.startsWith("#!wiki")) {
            const styleMatch = rawContent.match(/style="([^"]*)"/);
            const styleString = styleMatch ? styleMatch[1] : "";
            const customStyle = parseCssStyle(styleString);
            const innerContent = rawContent.replace(/^#!wiki(\s+style="[^"]*")?/, "").trim();
            const contentLines = innerContent.split("\n");
            return [
              ...parseInline(before),
              <div key={getKey("wiki-inline")} style={customStyle}>
                {renderSubBlock(contentLines)}
              </div>,
              ...parseInline(after),
            ];
          }

          if (rawContent.trim().startsWith("#")) {
            const spaceIdx = rawContent.indexOf(" ");
            let colorDef = "";
            let innerContent = "";
            if (spaceIdx !== -1) {
              colorDef = rawContent.slice(0, spaceIdx);
              innerContent = rawContent.slice(spaceIdx + 1);
            } else {
              colorDef = rawContent;
            }
            let colorVal = colorDef.split(",")[0].trim();
            if (colorVal === "#transparent") colorVal = "transparent";
            else if (colorVal.startsWith("#") && !/^#[0-9A-Fa-f]{3,8}$/.test(colorVal)) {
              colorVal = colorVal.substring(1);
            }
            return [
              ...parseInline(before),
              <span key={getKey("color")} style={{ color: colorVal }}>
                {parseInline(innerContent)}
              </span>,
              ...parseInline(after),
            ];
          }

          const sizeMatch = rawContent.match(/^\s*([+-])([1-5])\s+([\s\S]*)$/);
          if (sizeMatch) {
            const sign = sizeMatch[1];
            const level = sizeMatch[2];
            const innerContent = sizeMatch[3];
            const sizeMapping: { [key: string]: string } = {
              "+1": "1.28889em",
              "+2": "1.38889em",
              "+3": "1.48144em",
              "+4": "1.57400em",
              "+5": "1.66667em",
              "-1": "0.92589em",
              "-2": "0.83333em",
              "-3": "0.74067em",
              "-4": "0.64811em",
              "-5": "0.62222em",
            };
            const targetSize = sizeMapping[`${sign}${level}`] || "1em";
            return [
              ...parseInline(before),
              <span key={getKey("size")} style={{ fontSize: targetSize }}>
                {parseInline(innerContent)}
              </span>,
              ...parseInline(after),
            ];
          }

          return [...parseInline(before), ...parseInline(rawContent), ...parseInline(after)];
        }
      }

      if (candidate.type === "br" && candidate.match) {
        const before = text.slice(0, candidate.idx);
        const after = text.slice(candidate.idx + candidate.match[0].length);
        return [...parseInline(before), <br key={getKey("br-inline")} />, ...parseInline(after)];
      }

      if (candidate.type === "youtube" && candidate.match) {
        const match = candidate.match;
        const before = text.slice(0, match.index);
        const argsRaw = match[1];
        const after = text.slice(match.index + match[0].length);
        const args = argsRaw.split(",");
        const videoId = args[0].trim();
        let width = "640px";
        let height = "360px";
        for (let i = 1; i < args.length; i++) {
          const arg = args[i].trim();
          if (arg.startsWith("width=")) width = arg.split("=")[1];
          if (arg.startsWith("height=")) height = arg.split("=")[1];
        }
        return [
          ...parseInline(before),
          <div key={getKey("youtube")} className="block max-w-full">
            <iframe
              width={width.replace("px", "")}
              height={height.replace("px", "")}
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
              frameBorder="0"
              allowFullScreen
              style={{ maxWidth: "100%", width, height }}
              className="border-0"
            />
          </div>,
          ...parseInline(after),
        ];
      }

      if (candidate.type === "wiki" && candidate.match) {
        const match = candidate.match;
        const before = text.slice(0, match.index);
        const rawContent = match[1];
        const after = text.slice(match.index + match[0].length);
        let splitIndex = -1;
        let depth = 0;
        for (let i = 0; i < rawContent.length; i++) {
          if (rawContent[i] === "[") depth++;
          else if (rawContent[i] === "]") depth--;
          else if (rawContent[i] === "|" && depth === 0) {
            splitIndex = i;
            break;
          }
        }
        const target = splitIndex !== -1 ? rawContent.slice(0, splitIndex) : rawContent;
        const optionsRaw = splitIndex !== -1 ? rawContent.slice(splitIndex + 1) : "";
        if (/^(파일|File|이미지):/i.test(target)) {
          const filename = target.split(":")[1];
          const options = optionsRaw.split("|");
          let width: string | undefined = undefined;
          let align: 'left' | 'center' | 'right' | undefined = undefined;
          options.forEach((opt) => {
            const trimmed = opt.trim();
            if (trimmed.startsWith("width=")) {
              const val = trimmed.split("=")[1];
              width = /^\d+$/.test(val) ? `${val}px` : val;
            }
            if (trimmed.startsWith("align=")) {
              const val = trimmed.split("=")[1].toLowerCase();
              if (val === "center" || val === "left" || val === "right") {
                align = val as any;
              }
            }
          });

          let containerClass = "inline-block align-middle mx-0.5";
          if (align === "center") {
            containerClass = "flex justify-center w-full my-2";
          } else if (align === "left") {
            containerClass = "float-left mr-2 my-1";
          } else if (align === "right") {
            containerClass = "float-right ml-2 my-1";
          }

          return [
            ...parseInline(before),
            <span
              key={getKey("file")}
              className={containerClass}
            >
              <img
                src={`/uploads/${filename}`}
                alt={filename}
                style={{ width: width || "auto" }}
                className="max-w-full h-auto"
              />
            </span>,
            ...parseInline(after),
          ];
        }
        const isExternal = /^https?:\/\//i.test(target);
        const labelNodes = optionsRaw ? parseInline(optionsRaw) : [target];
        if (isExternal) {
          const hasImageInLabel = /\[\[(?:파일|File|이미지):/i.test(optionsRaw);
          return [
            ...parseInline(before),
            <a
              key={getKey("ext-link")}
              href={target}
              target="_blank"
              rel="noreferrer"
              className="text-[#090] hover:!underline inline-flex items-center gap-1"
            >
              {!hasImageInLabel && (
                <span className="inline-flex items-center justify-center bg-[#008000] text-white p-[2px] text-[15px] shrink-0">
                  <IoLink size={12} />
                </span>
              )}
              {labelNodes}
            </a>,
            ...parseInline(after),
          ];
        } else {
          const hashIndex = target.indexOf("#");
          let targetSlug = target.trim();
          let anchor = "";
          if (hashIndex !== -1) {
            targetSlug = target.substring(0, hashIndex).trim();
            anchor = target.substring(hashIndex);
          }
          const isExist = existingSet.has(targetSlug);
          const linkColor = isExist ? "text-[#0275d8]" : "text-[#FF0000]";
          return [
            ...parseInline(before),
            <Link
              key={getKey("int-link")}
              href={`/w/${encodeURIComponent(targetSlug)}${anchor}`}
              className={`${linkColor} hover:!underline`}
              title={targetSlug}
            >
              {labelNodes}
            </Link>,
            ...parseInline(after),
          ];
        }
      }

      if (candidate.type === "bold" && candidate.match) {
        const match = candidate.match;
        const before = text.slice(0, match.index);
        const inner = match[1];
        const after = text.slice(match.index + match[0].length);
        return [
          ...parseInline(before),
          <b key={getKey("bold")}>{parseInline(inner)}</b>,
          ...parseInline(after),
        ];
      }

      if (candidate.type === "italic" && candidate.match) {
        const match = candidate.match;
        const before = text.slice(0, match.index);
        const inner = match[1];
        const after = text.slice(match.index + match[0].length);
        return [
          ...parseInline(before),
          <i key={getKey("italic")}>{parseInline(inner)}</i>,
          ...parseInline(after),
        ];
      }

      if (candidate.type === "underline" && candidate.match) {
        const match = candidate.match;
        const before = text.slice(0, match.index);
        const inner = match[1];
        const after = text.slice(match.index + match[0].length);
        return [
          ...parseInline(before),
          <u key={getKey("underline")}>{parseInline(inner)}</u>,
          ...parseInline(after),
        ];
      }

      if (candidate.type === "del" && candidate.match) {
        const match = candidate.match;
        const before = text.slice(0, match.index);
        const inner = match[1];
        const after = text.slice(match.index + match[0].length);
        return [
          ...parseInline(before),
          <del key={getKey("del")} className="text-gray-400">
            {parseInline(inner)}
          </del>,
          ...parseInline(after),
        ];
      }

      if (candidate.type === "dashDel" && candidate.match) {
        const match = candidate.match;
        const before = text.slice(0, match.index);
        const inner = match[1];
        const after = text.slice(match.index + match[0].length);
        return [
          ...parseInline(before),
          <del key={getKey("dash-del")} className="text-gray-400">
            {parseInline(inner)}
          </del>,
          ...parseInline(after),
        ];
      }

      if (candidate.type === "sup" && candidate.match) {
        const match = candidate.match;
        const before = text.slice(0, match.index);
        const inner = match[1];
        const after = text.slice(match.index + match[0].length);
        return [
          ...parseInline(before),
          <sup key={getKey("sup")}>{parseInline(inner)}</sup>,
          ...parseInline(after),
        ];
      }

      if (candidate.type === "sub" && candidate.match) {
        const match = candidate.match;
        const before = text.slice(0, match.index);
        const inner = match[1];
        const after = text.slice(match.index + match[0].length);
        return [
          ...parseInline(before),
          <sub key={getKey("sub")}>{parseInline(inner)}</sub>,
          ...parseInline(after),
        ];
      }
    }

    return [text];
  }

  function parseColorValue(val: string) {
    if (!val) return "";
    if (val.includes(",")) return val.split(",")[0].trim();
    return val.trim();
  }

  function parseCellAttributes(rawContent: string) {
    let content = rawContent;
    let style: React.CSSProperties = {};
    let tableStyle: React.CSSProperties = {};
    let rowStyle: React.CSSProperties = {};
    let colStyle: React.CSSProperties = {};
    let colSpan = 1;
    let rowSpan = 1;

    const formatSize = (val: string) => {
      if (!val) return undefined;
      const trimVal = val.trim();
      return /^\d+$/.test(trimVal) ? `${trimVal}px` : trimVal;
    };

    while (true) {
      const trimmedCheck = content.trimStart();
      if (!trimmedCheck.startsWith("<")) break;
      const endIdx = trimmedCheck.indexOf(">");
      if (endIdx === -1) break;
      const tagContent = trimmedCheck.slice(1, endIdx);
      const lowerInner = tagContent.toLowerCase().trim();
      let handled = false;

      if (lowerInner.startsWith("tablebordercolor=")) {
        const v = parseColorValue(tagContent.split("=")[1]);
        tableStyle.border = `2px solid ${v}`;
        handled = true;
      } else if (lowerInner.startsWith("tablebgcolor=")) {
        const v = parseColorValue(tagContent.split("=")[1]);
        tableStyle.backgroundColor = v;
        style.backgroundColor = v;
        handled = true;
      } else if (lowerInner.startsWith("tablealign=")) {
        const v = lowerInner.split("=")[1];
        if (v === "right") {
          tableStyle.float = "right";
          tableStyle.marginLeft = "10px";
        } else if (v === "left") {
          tableStyle.float = "left";
          tableStyle.marginRight = "10px";
        } else if (v === "center") {
          tableStyle.marginLeft = "auto";
          tableStyle.marginRight = "auto";
          tableStyle.float = "none";
        }
        handled = true;
      } else if (lowerInner.startsWith("tablewidth=")) {
        tableStyle.width = formatSize(tagContent.split("=")[1]);
        handled = true;
      } else if (lowerInner.startsWith("table")) {
        const optsStr = tagContent.substring(5).trim();
        const opts = optsStr.split(/\s+/);
        opts.forEach((opt) => {
          const parts = opt.split("=");
          if (parts.length === 2) {
            const k = parts[0].toLowerCase();
            const v = parseColorValue(parts[1]);
            if (k === "bordercolor") tableStyle.borderColor = v;
            else if (k === "bgcolor") {
              tableStyle.backgroundColor = v;
              style.backgroundColor = v;
            } else if (k === "width") tableStyle.width = formatSize(v);
            else if (k === "align") {
              if (v === "right") {
                tableStyle.float = "right";
                tableStyle.marginLeft = "10px";
              } else if (v === "left") {
                tableStyle.float = "left";
                tableStyle.marginRight = "10px";
              } else if (v === "center") {
                tableStyle.marginLeft = "auto";
                tableStyle.marginRight = "auto";
              }
            }
          }
        });
        handled = true;
      } else if (lowerInner.startsWith("rowbgcolor=")) {
        rowStyle.backgroundColor = parseColorValue(tagContent.split("=")[1]);
        handled = true;
      } else if (lowerInner.startsWith("rowcolor=")) {
        rowStyle.color = parseColorValue(tagContent.split("=")[1]);
        handled = true;
      } else if (lowerInner.startsWith("colbgcolor=")) {
        colStyle.backgroundColor = parseColorValue(tagContent.split("=")[1]);
        handled = true;
      } else if (lowerInner.startsWith("colcolor=")) {
        colStyle.color = parseColorValue(tagContent.split("=")[1]);
        handled = true;
      } else if (lowerInner === "nopad") {
        style.padding = "0px";
        handled = true;
      } else if (lowerInner.startsWith("bgcolor=")) {
        style.backgroundColor = parseColorValue(tagContent.split("=")[1]);
        handled = true;
      } else if (tagContent.startsWith("#")) {
        style.backgroundColor = parseColorValue(tagContent);
        handled = true;
      } else if (lowerInner.startsWith("color=")) {
        style.color = parseColorValue(tagContent.split("=")[1]);
        handled = true;
      } else if (tagContent.startsWith("^|")) {
        style.verticalAlign = "top";
        const val = parseInt(tagContent.slice(2));
        if (!isNaN(val)) rowSpan = val;
        handled = true;
      } else if (tagContent.startsWith("v|")) {
        style.verticalAlign = "bottom";
        const val = parseInt(tagContent.slice(2));
        if (!isNaN(val)) rowSpan = val;
        handled = true;
      } else if (tagContent.startsWith("|")) {
        style.verticalAlign = "middle";
        const val = parseInt(tagContent.slice(1));
        if (!isNaN(val)) {
          rowSpan = val;
          handled = true;
        }
      } else if (tagContent === "(") {
        style.textAlign = "left";
        handled = true;
      } else if (tagContent === ":") {
        style.textAlign = "center";
        handled = true;
      } else if (tagContent === ")") {
        style.textAlign = "right";
        handled = true;
      } else if (tagContent.startsWith("-")) {
        const val = parseInt(tagContent.slice(1));
        if (!isNaN(val)) {
          colSpan = val;
          handled = true;
        }
      } else if (lowerInner.startsWith("width=")) {
        style.width = formatSize(tagContent.split("=")[1]);
        handled = true;
      } else if (lowerInner.startsWith("height=")) {
        style.height = formatSize(tagContent.split("=")[1]);
        handled = true;
      }

      if (handled) {
        const tagString = "<" + tagContent + ">";
        const tagIndex = content.indexOf(tagString);
        if (tagIndex !== -1) content = content.slice(tagIndex + tagString.length);
        else break;
      } else break;
    }

    if (!style.textAlign) {
      if (content.startsWith(" ") && content.endsWith(" ")) style.textAlign = "center";
      else if (content.startsWith(" ") && !content.endsWith(" ")) style.textAlign = "right";
      else if (!content.startsWith(" ") && content.endsWith(" ")) style.textAlign = "left";
    }
    content = content.trim();
    return { style, tableStyle, rowStyle, colStyle, colSpan, rowSpan, content };
  }

  function parseTable(lines: string[]) {
    const mergedRows: string[] = [];
    let currentBuffer = "";
    let braceDepth = 0;

    for (const line of lines) {
      const open = (line.match(/\{\{\{/g) || []).length;
      const close = (line.match(/\}\}\}/g) || []).length;

      if (braceDepth === 0 && currentBuffer === "") {
        currentBuffer = line;
        braceDepth += open - close;
      } else {
        currentBuffer += "\n" + line;
        braceDepth += open - close;
      }

      if (braceDepth <= 0) {
        mergedRows.push(currentBuffer);
        currentBuffer = "";
        braceDepth = 0;
      }
    }
    if (currentBuffer) mergedRows.push(currentBuffer);

    const rows = mergedRows.map((line) => {
      const trimmed = line.trim();
      const rawCells = splitCells(trimmed);
      const cells = [];
      for (let i = 0; i < rawCells.length; i++) {
        if (i === 0 && rawCells[i] === "" && trimmed.startsWith("||")) continue;
        if (i === rawCells.length - 1 && rawCells[i].trim() === "" && trimmed.endsWith("||")) continue;
        cells.push(parseCellAttributes(rawCells[i]));
      }
      return cells;
    });

    let containerStyle: React.CSSProperties = {
      borderCollapse: "collapse",
      border: "1px solid #ccc",
      fontSize: "14px",
      width: "auto",
      maxWidth: "100%",
      display: "table",
    };

    const colStyles: React.CSSProperties[] = [];
    let maxCols = 0;

    if (rows.length > 0) {
      rows.forEach((r) => {
        maxCols = Math.max(maxCols, r.length);
      });

      rows.forEach((cells) => {
        cells.forEach((cell) => {
          if (cell.tableStyle && Object.keys(cell.tableStyle).length > 0) {
            containerStyle = { ...containerStyle, ...cell.tableStyle };
          }
        });
      });

      rows.forEach((cells) => {
        cells.forEach((cell, cIdx) => {
          if (Object.keys(cell.colStyle).length > 0) {
            colStyles[cIdx] = { ...(colStyles[cIdx] || {}), ...cell.colStyle };
          }
        });
      });
    }

    const isFloat = containerStyle.float === "left" || containerStyle.float === "right";

    const wrapperStyle: React.CSSProperties = isFloat
      ? {
          float: containerStyle.float,
          marginLeft: containerStyle.marginLeft,
          marginRight: containerStyle.marginRight,
          marginBottom: "10px",
        }
      : { marginBottom: "10px" };

    if (containerStyle.width === "100%" && !isFloat) {
      wrapperStyle.width = "100%";
      wrapperStyle.display = "block";
    }

    const tableStyleCleaned = { ...containerStyle };
    if (isFloat) {
      delete tableStyleCleaned.float;
      delete tableStyleCleaned.marginLeft;
      delete tableStyleCleaned.marginRight;
    }

    return (
      <div
        className={`overflow-x-auto my-2 ${isFloat ? "inline-block" : "w-full block"}`}
        style={wrapperStyle}
        key={getKey("table-wrap")}
      >
        <table className="text-gray-800" style={tableStyleCleaned}>
          {maxCols > 0 && (
            <colgroup>
              {Array.from({ length: maxCols }).map((_, i) => (
                <col key={i} style={colStyles[i] || {}} />
              ))}
            </colgroup>
          )}

          <tbody>
            {rows.map((cells, rIdx) => {
              let trStyle: React.CSSProperties = {};
              const rowStyleCell = cells.find((c) => Object.keys(c.rowStyle).length > 0);
              if (rowStyleCell) trStyle = rowStyleCell.rowStyle;

              return (
                <tr key={getKey(`tr-${rIdx}`)} style={trStyle}>
                  {cells.map((cell, cIdx) => {
                    const currentValColStyle = colStyles[cIdx] || {};
                    return (
                      <td
                        key={getKey(`td-${rIdx}-${cIdx}`)}
                        className="border px-2 py-1 align-middle break-words"
                        style={{
                          borderColor: containerStyle.borderColor || "#ccc",
                          ...currentValColStyle,
                          ...trStyle,
                          ...cell.style,
                        }}
                        colSpan={cell.colSpan}
                        rowSpan={cell.rowSpan}
                      >
                        {parseInline(cell.content)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function parseLine(rawLine: string, lineIndex: number) {
    const line = rawLine.replace(/\r$/, "").trim();

    if (line === "[목차]") {
      return (
        <div key={getKey("toc-macro")} className="my-2">
          {renderToc()}
        </div>
      );
    }
    if (line.toLowerCase() === "[clearfix]") {
      return <div key={getKey("clearfix")} className="clear-both" />;
    }

    const headerMatch = line.match(/^(=+)\s*(#?)\s*(.+?)\s*\2\s*\1$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[3];
      const sizes: { [key: number]: string } = {
        1: "text-3xl mt-6 mb-4 border-b-2 pb-2",
        2: "text-2xl mt-5 mb-3 border-b pb-1 font-bold",
        3: "text-xl mt-4 mb-2 border-b pb-1 font-bold",
        4: "text-lg mt-3 mb-1 border-b pb-1 font-bold",
        5: "text-base mt-2 border-b pb-1 font-bold",
        6: "text-sm mt-2 border-b pb-1 font-bold",
      };
      const numberStr = headerMap[lineIndex];
      const id = numberStr ? `s-${numberStr.slice(0, -1)}` : undefined;
      const isCollapsed = id ? collapsedSections.has(id) : false;

      const headerContent = (
        <span
          className="flex items-center w-full group cursor-pointer"
          onClick={() => {
            if (id) toggleSection(id);
          }}
        >
          {id && (
            <span className="text-[#666] mr-2 text-xs font-normal">
              {isCollapsed ? <ChevronRight /> : <ChevronDown />}
            </span>
          )}
          {numberStr && (
            <a
              href={`#${id}`}
              className="mr-2 text-[#0275d8] hover:!underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span>{numberStr}</span>
            </a>
          )}
          <span>{parseInline(text)}</span>
          <div className="ml-auto flex gap-2 select-none" onClick={(e) => e.stopPropagation()}>
            <span className="text-[#0275d8] text-xs cursor-pointer font-normal hover:!underline">
              [편집]
            </span>
          </div>
        </span>
      );

      return React.createElement(
        `h${level}`,
        {
          key: getKey("header"),
          id: id,
          className: `${sizes[level] || sizes[6]} border-gray-300 text-[#373a3c] flex items-center scroll-mt-[60px] ${isCollapsed ? "opacity-50" : ""}`,
        },
        headerContent,
      );
    }

    const listMatch = rawLine.replace(/\r$/, "").match(/^(\s*)\*\s*(.*)$/);
    if (listMatch) {
      const indentLevel = listMatch[1].length;
      const content = listMatch[2];
      return (
        <div
          key={getKey("list")}
          className="flex items-start leading-7 relative"
          style={{ marginLeft: `${indentLevel * 20}px` }}
        >
          <span className="mr-2 mt-[10px] w-[5px] h-[5px] bg-black rounded-full shrink-0 block"></span>
          <span className="break-all">{parseInline(content)}</span>
        </div>
      );
    }

    if (!line) return <br key={getKey("br")} />;
    if (line.startsWith("[[분류:") && line.endsWith("]]")) return null;
    if (line.match(/^-{4,}$/)) return <hr key={getKey("hr")} className="my-4 border-gray-300" />;

    if (line.startsWith(">")) {
      return (
        <blockquote
          key={getKey("quote")}
          className="bg-[#eee] border-2 border-dashed border-[#ccc] border-l-4 border-l-[#71bc6d] [border-left-style:solid] table my-4 p-4"
        >
          {parseInline(line.slice(1).trim())}
        </blockquote>
      );
    }

    return (
      <div key={getKey("p")} className="min-h-[1.5em] leading-7 break-all">
        {parseInline(line)}
      </div>
    );
  }

  const renderedContent: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!visibilityMap[i]) {
      i++;
      continue;
    }
    const line = lines[i].replace(/\r$/, "").trim();

    if (line.startsWith("{{{#!raw")) {
      let currentLineContent = line.replace(/^\{\{\{#!raw\s*/, "");
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
          if (contentToAdd.trim() || k !== i) contentLines.push(contentToAdd);
          i = k + 1;
          foundEnd = true;
          break;
        }
        contentLines.push(textToAnalyze);
        k++;
      }
      if (foundEnd) {
        renderedContent.push(
          <div key={getKey("raw-block-main")} className="whitespace-pre-wrap">
            {contentLines.join("\n")}
          </div>,
        );
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
        if (k === i) {
          if (textToAnalyze.trim()) contentLines.push(textToAnalyze);
        } else contentLines.push(textToAnalyze);
        k++;
      }
      if (foundEnd) {
        renderedContent.push(
          <div key={getKey("wiki-block")} style={customStyle} className="wiki-block">
            {renderSubBlock(contentLines)}
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
            {renderSubBlock(contentLines)}
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
        renderedContent.push(parseTable(tableLines));
        i = j;
        continue;
      }
    }

    renderedContent.push(<React.Fragment key={i}>{parseLine(lines[i], i)}</React.Fragment>);
    i++;
  }

  return (
    <div>
      <div className="prose max-w-none text-gray-800 text-[15px]">{renderedContent}</div>

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
    </div>
  );
}