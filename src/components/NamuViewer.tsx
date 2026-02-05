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

// Folding 컴포넌트
const Folding = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-2">
      <div
        className="cursor-pointer select-none inline-block"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-bold text-gray-800">{title}</span>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// 각주 툴팁 컴포넌트
const FootnoteRef = ({ id, content }: { id: number; content: React.ReactNode }) => {
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
          [{id}]
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
            <span className="text-[#0275d8]">[{id}]</span>
            {content}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-[6px] border-t-[#ccc]"></div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default function NamuViewer({ content, existingSlugs = [] }: { content: string; existingSlugs?: string[] }) {
  const [isTocExpanded, setIsTocExpanded] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const existingSet = useMemo(() => new Set(existingSlugs), [existingSlugs]);

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

    const lines = content.split("\n");
    lines.forEach((rawLine, lineIndex) => {
      const line = rawLine.replace(/\r$/, "").trim();
      const headerMatch = line.match(/^(=+)\s*(.+?)\s*\1$/);

      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[2];

        if (level >= 1) {
          const counterIndex = level - 2;
          if (counterIndex >= 0) {
            counters[counterIndex]++;
            for (let i = counterIndex + 1; i < counters.length; i++) counters[i] = 0;

            const numberParts = [];
            for (let i = 0; i <= counterIndex; i++) numberParts.push(counters[i]);

            const numberStr = numberParts.join(".") + ".";
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
              <span className="text-[#373a3c]">{item.text}</span>
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
  const footnotes: React.ReactNode[] = [];
  let keyCounter = 0;
  const getKey = (prefix: string) => `${prefix}-${keyCounter++}`;

  // 4. 인라인 파서
  const parseInline = (text: string): React.ReactNode[] => {
    // [각주 파싱]
    const noteRegex = /\[\*(.*?)\]/;
    const noteMatch = noteRegex.exec(text);
    if (noteMatch) {
      const before = text.slice(0, noteMatch.index);
      const noteContentRaw = noteMatch[1];
      const after = text.slice(noteMatch.index + noteMatch[0].length);

      const parsedNoteContent = parseInline(noteContentRaw);

      footnotes.push(<span key={getKey("fn-content")}>{parsedNoteContent}</span>);
      const noteId = footnotes.length;

      return [
        ...parseInline(before),
        <FootnoteRef key={getKey("fn-ref")} id={noteId} content={parsedNoteContent} />,
        ...parseInline(after),
      ];
    }

    // 텍스트 크기 {{{+1 ...}}} / {{{-1 ...}}}
    const sizeRegex = /\{\{\{([+-])([1-5])\s*(.*?)\}\}\}/;
    const sizeMatch = sizeRegex.exec(text);

    if (sizeMatch) {
      const before = text.slice(0, sizeMatch.index);
      const sign = sizeMatch[1]; // + 또는 -
      const level = sizeMatch[2]; // 1 ~ 5
      const innerContent = sizeMatch[3]; // 내부 텍스트
      const after = text.slice(sizeMatch.index + sizeMatch[0].length);

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

    // 유튜브 파서 [youtube(ID)]
    const youtubeRegex = /\[youtube\((.*?)\)\]/i;
    const youtubeMatch = youtubeRegex.exec(text);

    if (youtubeMatch) {
      const before = text.slice(0, youtubeMatch.index);
      const argsRaw = youtubeMatch[1];
      const after = text.slice(youtubeMatch.index + youtubeMatch[0].length);

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
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ maxWidth: "100%", width: width, height: height }}
            className="border-0"
          />
        </div>,
        ...parseInline(after),
      ];
    }

    // [통합 위키 문법]
    const wikiRegex = /\[\[((?:[^[\]]|\[\[(?:[^[\]])*\]\])*)\]\]/;
    const match = wikiRegex.exec(text);

    if (match) {
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
        options.forEach((opt) => {
          const trimmed = opt.trim();
          if (trimmed.startsWith("width=")) {
            const val = trimmed.split("=")[1];
            width = /^\d+$/.test(val) ? `${val}px` : val;
          }
        });

        return [
          ...parseInline(before),
          <span key={getKey("file")} className="inline-block align-middle">
            <img
              src={`/uploads/${filename}`}
              alt={filename}
              style={{ width: width }}
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
        const targetSlug = target.includes("#") ? target.split("#")[0] : target;
        const isExist = existingSet.has(targetSlug);
        const linkColor = isExist ? "text-[#0275d8]" : "text-[#FF0000]";

        return [
          ...parseInline(before),
          <Link
            key={getKey("int-link")}
            href={`/w/${encodeURIComponent(target)}`}
            className={`${linkColor} hover:!underline`}
          >
            {labelNodes}
          </Link>,
          ...parseInline(after),
        ];
      }
    }

    const boldRegex = /'''(.*?)'''/;
    const boldMatch = boldRegex.exec(text);
    if (boldMatch) {
      const before = text.slice(0, boldMatch.index);
      const inner = boldMatch[1];
      const after = text.slice(boldMatch.index + boldMatch[0].length);
      return [...parseInline(before), <b key={getKey("bold")}>{inner}</b>, ...parseInline(after)];
    }

    const delRegex = /~~(.*?)~~/;
    const delMatch = delRegex.exec(text);
    if (delMatch) {
      const before = text.slice(0, delMatch.index);
      const inner = delMatch[1];
      const after = text.slice(delMatch.index + delMatch[0].length);
      return [
        ...parseInline(before),
        <del key={getKey("del")} className="text-gray-400">
          {inner}
        </del>,
        ...parseInline(after),
      ];
    }

    return [text];
  };

  // --- [Helper] 색상 값 파싱 ---
  const parseColorValue = (val: string) => {
    if (!val) return "";
    if (val.includes(",")) {
      return val.split(",")[0].trim();
    }
    return val.trim();
  };

  // --- [5. 파서 로직] ---
  const parseCellAttributes = (rawContent: string) => {
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
      }
      else if (lowerInner.startsWith("tablealign=")) {
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
      }
      else if (lowerInner.startsWith("tablewidth=")) {
        const v = tagContent.split("=")[1];
        tableStyle.width = formatSize(v); 
        handled = true;
      }
      else if (lowerInner.startsWith("table")) {
        const optsStr = tagContent.substring(5).trim();
        const opts = optsStr.split(/\s+/);
        opts.forEach((opt) => {
          const parts = opt.split("=");
          if (parts.length === 2) {
            const k = parts[0].toLowerCase();
            const v = parseColorValue(parts[1]);

            if (k === "bordercolor") {
              tableStyle.borderColor = v;
            } else if (k === "bgcolor") {
              tableStyle.backgroundColor = v;
            } 
            else if (k === "width") {
              tableStyle.width = formatSize(v);
            }
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
      }
      else if (lowerInner.startsWith("rowbgcolor=")) {
        rowStyle.backgroundColor = parseColorValue(tagContent.split("=")[1]);
        handled = true;
      } else if (lowerInner.startsWith("rowcolor=")) {
        rowStyle.color = parseColorValue(tagContent.split("=")[1]);
        handled = true;
      }
      else if (lowerInner.startsWith("colbgcolor=")) {
        colStyle.backgroundColor = parseColorValue(tagContent.split("=")[1]);
        handled = true;
      } else if (lowerInner.startsWith("colcolor=")) {
        colStyle.color = parseColorValue(tagContent.split("=")[1]);
        handled = true;
      }
      else if (lowerInner === "nopad") {
        style.padding = "0px";
        handled = true;
      }
      else if (lowerInner.startsWith("bgcolor=")) {
        style.backgroundColor = parseColorValue(tagContent.split("=")[1]);
        handled = true;
      } else if (tagContent.startsWith("#")) {
        style.backgroundColor = parseColorValue(tagContent);
        handled = true;
      }
      else if (lowerInner.startsWith("color=")) {
        style.color = parseColorValue(tagContent.split("=")[1]);
        handled = true;
      }
      else if (tagContent === "(") {
        style.textAlign = "left";
        handled = true;
      } else if (tagContent === ":") {
        style.textAlign = "center";
        handled = true;
      } else if (tagContent === ")") {
        style.textAlign = "right";
        handled = true;
      }
      else if (tagContent.startsWith("-")) {
        const val = parseInt(tagContent.slice(1));
        if (!isNaN(val)) {
          colSpan = val;
          handled = true;
        }
      } else if (tagContent.startsWith("|")) {
        const val = parseInt(tagContent.slice(1));
        if (!isNaN(val)) {
          rowSpan = val;
          handled = true;
        }
      }
      else if (lowerInner.startsWith("width=")) {
        style.width = formatSize(tagContent.split("=")[1]);
        handled = true;
      } else if (lowerInner.startsWith("height=")) {
        style.height = formatSize(tagContent.split("=")[1]);
        handled = true;
      }

      if (handled) {
        const realTagIndex = content.indexOf("<" + tagContent + ">");
        if (realTagIndex !== -1) {
          content = content.slice(realTagIndex + tagContent.length + 2);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (!style.textAlign) {
      if (content.startsWith(" ") && content.endsWith(" ")) {
        style.textAlign = "center";
      } else if (content.startsWith(" ") && !content.endsWith(" ")) {
        style.textAlign = "right";
      } else if (!content.startsWith(" ") && content.endsWith(" ")) {
        style.textAlign = "left";
      }
    }

    content = content.trim();

    return { style, tableStyle, rowStyle, colStyle, colSpan, rowSpan, content };
  };

  // --- [6. 테이블 파서] ---
  const parseTable = (lines: string[]) => {
    const rows = lines.map((line) => {
      const trimmed = line.trim();
      const rawCells = trimmed.split("||");
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
      marginBottom: "10px",
    };

    const colStyles: React.CSSProperties[] = [];
    let maxCols = 0;

    if (rows.length > 0) {
      rows.forEach((r) => maxCols = Math.max(maxCols, r.length));

      rows.forEach((cells) => {
        cells.forEach((cell, cIdx) => {
          if (Object.keys(cell.colStyle).length > 0) {
            colStyles[cIdx] = { ...(colStyles[cIdx] || {}), ...cell.colStyle };
          }
        });
      });

      if (rows[0].length > 0) {
        const first = rows[0][0];
        if (first.tableStyle && Object.keys(first.tableStyle).length > 0) {
          containerStyle = { ...containerStyle, ...first.tableStyle };
        }
      }
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

    const tableStyleCleaned = { ...containerStyle };
    if (isFloat) {
      delete tableStyleCleaned.float;
      delete tableStyleCleaned.marginLeft;
      delete tableStyleCleaned.marginRight;
    }

    return (
      <div
        className={`overflow-x-auto my-4 ${isFloat ? "inline-block" : "w-full block"}`}
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
  };

  const parseLine = (rawLine: string, lineIndex: number) => {
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

    const headerMatch = line.match(/^(=+)\s*(.+?)\s*\1$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      const sizes: { [key: number]: string } = {
        1: "text-3xl mt-6 mb-4 border-b-2 pb-2",
        2: "text-2xl mt-5 mb-3 border-b pb-1 font-bold",
        3: "text-xl mt-4 mb-2 font-bold",
        4: "text-lg mt-3 mb-1 font-bold",
        5: "text-base mt-2 font-bold",
        6: "text-sm mt-2 font-bold",
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
          <span>{text}</span>
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
          className="border-l-4 border-[#00A495] pl-4 py-1 my-2 bg-gray-50 text-gray-600"
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
  };

  const renderSubBlock = (subLines: string[]) => {
    const nodes: React.ReactNode[] = [];
    let j = 0;
    while (j < subLines.length) {
      const l = subLines[j].trim();
      if (l.startsWith("||")) {
        const tLines = [];
        let m = j;
        while (m < subLines.length && subLines[m].trim().startsWith("||")) {
          tLines.push(subLines[m]);
          m++;
        }
        nodes.push(parseTable(tLines));
        j = m;
      } else {
        nodes.push(parseLine(subLines[j], -1));
        j++;
      }
    }
    return nodes;
  };

  const renderedContent: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    if (!visibilityMap[i]) {
      i++;
      continue;
    }

    const line = lines[i].replace(/\r$/, "").trim();

    // [접기/펼치기 파서]
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
        
        depth += (openMatches * 3);
        depth -= (closeMatches * 3);

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
          </Folding>
        );
        continue;
      }
    }

    if (line.startsWith("||")) {
      const tableLines = [];
      let j = i;

      while (j < lines.length) {
        const nextLine = lines[j].replace(/\r$/, "").trim();
        if (nextLine.startsWith("||")) {
          tableLines.push(lines[j]);
          j++;
        } else {
          break;
        }
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
            {footnotes.map((note, index) => {
              const num = index + 1;
              return (
                <li key={`fn-item-${num}`} id={`fn${num}`} className="flex gap-2 items-start">
                  <a
                    href={`#r${num}`}
                    className="text-[#0275d8] shrink-0 hover:!underline min-w-[20px] text-right"
                    title="본문으로 이동"
                  >
                    [{num}]
                  </a>
                  <span>{note}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}