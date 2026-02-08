import React from "react";
import Link from "next/link";
import { IoLink } from "react-icons/io5";
import { ChevronDown, ChevronRight } from "lucide-react";
import { IncludeRenderer } from "./IncludeRenderer";
import { Folding } from "./Folding";
import { FootnoteRef } from "./FootnoteRef";
import { parseCssStyle, splitCells, parseCellAttributes } from "@/utils/wikiUtils";

// 타입 정의
export type FootnoteData = {
  id: number;
  label: string;
  content: React.ReactNode;
};

// 파싱에 필요한 컨텍스트 (상태 및 콜백)
export type ParserContext = {
  slug?: string;
  fetchContent?: (slug: string) => Promise<string | null>;
  existingSlugs: string[];
  visitedSlugs: Set<string>;
  includeDepth: number;
  footnotes: FootnoteData[];
  headerMap?: { [line: number]: string };
  collapsedSections?: Set<string>;
  toggleSection?: (id: string) => void;
  tocRenderer?: () => React.ReactNode;
  keyGenerator?: (prefix: string) => string;
};

const getKey = (prefix: string, ctx: ParserContext) => {
  if (ctx.keyGenerator) {
    return ctx.keyGenerator(prefix);
  }

  console.warn('WikiParser: keyGenerator not provided, using fallback');
  return `${prefix}-fallback-${Date.now()}`;
};

// 정규식 패턴 추출
const INLINE_PATTERNS = {
  note: /\[\*/,
  include: /\[include\((.*?)\)\]/i,
  youtube: /\[youtube\((.*?)\)\]/i,
  wiki: /\[\[((?:[^[\]]|\[\[(?:[^[\]])*\]\])*)\]\]/,
  br: /\[br\]/i,
  bold: /'''(.*?)'''/,
  italic: /''(.*?)''/,
  underline: /__(.*?)__/,
  del: /~~(.*?)~~/,
  dashDel: /--(.*?)--/,
  sup: /\^\^(.*?)\^\^/,
  sub: /,,(.*?),,/,
  redirect: /^#redirect\s+(.*)$/i,
} as const;

// 블록 파싱용 정규식 패턴
const BLOCK_PATTERNS = {
  header: /^(=+)\s*(#?)\s*(.+?)\s*\2\s*\1$/,
  list: /^(\s*)\*\s*(.*)$/,
  hr: /^-{4,}$/,
  quote: /^>/,
} as const;

// 1. 인라인 파서
export function parseInline(text: string, ctx: ParserContext): React.ReactNode[] {
  const noteMatch = INLINE_PATTERNS.note.exec(text);
  const includeMatch = INLINE_PATTERNS.include.exec(text);
  const youtubeMatch = INLINE_PATTERNS.youtube.exec(text);
  const wikiMatch = INLINE_PATTERNS.wiki.exec(text);
  const brMatch = INLINE_PATTERNS.br.exec(text);
  const boldMatch = INLINE_PATTERNS.bold.exec(text);
  const italicMatch = INLINE_PATTERNS.italic.exec(text);
  const underlineMatch = INLINE_PATTERNS.underline.exec(text);
  const delMatch = INLINE_PATTERNS.del.exec(text);
  const dashDelMatch = INLINE_PATTERNS.dashDel.exec(text);
  const supMatch = INLINE_PATTERNS.sup.exec(text);
  const subMatch = INLINE_PATTERNS.sub.exec(text);

  const braceIdx = text.indexOf("{{{");

  const candidates = [
    { type: "note", idx: noteMatch ? noteMatch.index : Infinity, match: noteMatch },
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

    // [각주]
    if (candidate.type === "note" && candidate.match) {
      const startIdx = candidate.idx;
      let depth = 0;
      let endIdx = -1;
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
        const rawContent = text.slice(startIdx + 2, endIdx);
        const after = text.slice(endIdx + 1);

        let label = "";
        let contentText = rawContent;

        if (!rawContent.startsWith(" ")) {
          const spaceIdx = rawContent.indexOf(" ");
          if (spaceIdx !== -1) {
            label = rawContent.slice(0, spaceIdx);
            contentText = rawContent.slice(spaceIdx + 1);
          } else {
            label = rawContent;
            contentText = "";
          }
        } else {
          contentText = rawContent.slice(1);
        }

        const parsedContent = parseInline(contentText, ctx);
        const noteId = ctx.footnotes.length + 1;
        const displayLabel = label || `${noteId}`;

        ctx.footnotes.push({
          id: noteId,
          label: displayLabel,
          content: parsedContent,
        });

        return [
          ...parseInline(before, ctx),
          <FootnoteRef key={getKey("fn-ref", ctx)} id={noteId} label={displayLabel} content={parsedContent} />,
          ...parseInline(after, ctx),
        ];
      }
      continue;
    }

    // [Include]
    if (candidate.type === "include" && candidate.match) {
      const match = candidate.match;
      const before = text.slice(0, match.index);
      const rawArgs = match[1];
      const after = text.slice(match.index + match[0].length);
      return [
        ...parseInline(before, ctx),
        <IncludeRenderer
          key={getKey("include", ctx)}
          rawArgs={rawArgs}
          fetchContent={ctx.fetchContent}
          existingSlugs={ctx.existingSlugs}
          currentSlug={ctx.slug}
          visitedSlugs={ctx.visitedSlugs}
          depth={ctx.includeDepth}
        />,
        ...parseInline(after, ctx),
      ];
    }

    // [Brace {{{...}}}]
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

        // {{{#!raw ... }}}
        if (rawContent.startsWith("#!raw")) {
          const inner = rawContent.replace(/^#!raw\s?/, "");
          return [
            ...parseInline(before, ctx),
            <span key={getKey("raw-inline", ctx)} className="whitespace-pre-wrap">
              {inner}
            </span>,
            ...parseInline(after, ctx),
          ];
        }
        // {{{#!folding ... }}}
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
            ...parseInline(before, ctx),
            <Folding key={getKey("folding-inline", ctx)} title={title}>
              {renderSubBlock(contentLines, ctx)}
            </Folding>,
            ...parseInline(after, ctx),
          ];
        }
        // {{{#!wiki ... }}}
        if (rawContent.startsWith("#!wiki")) {
          const styleMatch = rawContent.match(/style="([^"]*)"/);
          const styleString = styleMatch ? styleMatch[1] : "";
          const customStyle = parseCssStyle(styleString);
          const innerContent = rawContent.replace(/^#!wiki(\s+style="[^"]*")?/, "").trim();
          const contentLines = innerContent.split("\n");
          return [
            ...parseInline(before, ctx),
            <div key={getKey("wiki-inline", ctx)} style={customStyle}>
              {renderSubBlock(contentLines, ctx)}
            </div>,
            ...parseInline(after, ctx),
          ];
        }

        // {{{#color ... }}}
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
            ...parseInline(before, ctx),
            <span key={getKey("color", ctx)} style={{ color: colorVal }}>
              {parseInline(innerContent, ctx)}
            </span>,
            ...parseInline(after, ctx),
          ];
        }

        // {{{+1 ... }}}
        const sizeMatch = rawContent.match(/^\s*([+-])([1-5])\s+([\s\S]*)$/);
        if (sizeMatch) {
          const sign = sizeMatch[1];
          const level = sizeMatch[2];
          const innerContent = sizeMatch[3];
          const sizeMapping: { [key: string]: string } = {
            "+1": "1.28889em", "+2": "1.38889em", "+3": "1.48144em", "+4": "1.57400em", "+5": "1.66667em",
            "-1": "0.92589em", "-2": "0.83333em", "-3": "0.74067em", "-4": "0.64811em", "-5": "0.62222em",
          };
          const targetSize = sizeMapping[`${sign}${level}`] || "1em";
          return [
            ...parseInline(before, ctx),
            <span key={getKey("size", ctx)} style={{ fontSize: targetSize }}>
              {parseInline(innerContent, ctx)}
            </span>,
            ...parseInline(after, ctx),
          ];
        }

        return [...parseInline(before, ctx), ...parseInline(rawContent, ctx), ...parseInline(after, ctx)];
      }
    }

    // [br]
    if (candidate.type === "br" && candidate.match) {
      const before = text.slice(0, candidate.idx);
      const after = text.slice(candidate.idx + candidate.match[0].length);
      return [...parseInline(before, ctx), <br key={getKey("br-inline", ctx)} />, ...parseInline(after, ctx)];
    }

    // [youtube]
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
        ...parseInline(before, ctx),
        <div key={getKey("youtube", ctx)} className="block max-w-full">
          <iframe
            width={width.replace("px", "")}
            height={height.replace("px", "")}
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            allowFullScreen
            style={{ maxWidth: "100%", width, height }}
            className="border-0"
          />
        </div>,
        ...parseInline(after, ctx),
      ];
    }

    // [Wiki Link]
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

      // Image
      if (/^(파일|File|이미지):/i.test(target)) {
        const filename = target.split(":")[1];
        const options = optionsRaw.split("|");
        let width: string | undefined = undefined;
        let align: "left" | "center" | "right" | undefined = undefined;
        options.forEach((opt) => {
          const trimmed = opt.trim();
          if (trimmed.startsWith("width=")) {
            const val = trimmed.split("=")[1];
            width = /^\d+$/.test(val) ? `${val}px` : val;
          }
          if (trimmed.startsWith("align=")) {
            const val = trimmed.split("=")[1].toLowerCase();
            if (val === "center" || val === "left" || val === "right") {
              align = val;
            }
          }
        });

        let containerClass = "inline-block align-middle";
        if (align === "center") containerClass = "flex justify-center w-full my-2";
        else if (align === "left") containerClass = "float-left mr-2 my-1";
        else if (align === "right") containerClass = "float-right ml-2 my-1";

        return [
          ...parseInline(before, ctx),
          <span key={getKey("file", ctx)} className={containerClass}>
            <img
              src={`/uploads/${filename}`}
              alt={filename}
              style={{ width: width || "auto" }}
              className="max-w-full h-auto"
            />
          </span>,
          ...parseInline(after, ctx),
        ];
      }

      // External / Internal Link
      const isExternal = /^https?:\/\//i.test(target);
      const labelNodes = optionsRaw ? parseInline(optionsRaw, ctx) : [target];

      if (isExternal) {
        const hasImageInLabel = /\[\[(?:파일|File|이미지):/i.test(optionsRaw);
        return [
          ...parseInline(before, ctx),
          <a
            key={getKey("ext-link", ctx)}
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
          ...parseInline(after, ctx),
        ];
      } else if (target.startsWith("!NW:")) {
        const nwTargetRaw = target.slice(4);

        const hashIndex = nwTargetRaw.indexOf("#");
        let targetSlug = nwTargetRaw;
        let anchor = "";

        if (hashIndex !== -1) {
          targetSlug = nwTargetRaw.substring(0, hashIndex);
          anchor = nwTargetRaw.substring(hashIndex);
        }

        const labelNodes = optionsRaw ? parseInline(optionsRaw, ctx) : [nwTargetRaw];

        return [
          ...parseInline(before, ctx),
          <a
            key={getKey("nw-link", ctx)}
            href={`https://namu.wiki/w/${encodeURIComponent(targetSlug)}${anchor}`}
            target="blank"
            rel="noreferrer"
            className="text-[#0275d8] hover:!underline"
            title={nwTargetRaw}
          >
            {labelNodes}
          </a>,
          ...parseInline(after, ctx),
        ];
      } else {
        const hashIndex = target.indexOf("#");
        let targetSlug = target.trim();
        let anchor = "";
        if (hashIndex !== -1) {
          targetSlug = target.substring(0, hashIndex).trim();
          anchor = target.substring(hashIndex);
        }
        const isExist = ctx.existingSlugs.includes(targetSlug);
        const linkColor = isExist ? "text-[#0275d8]" : "text-[#FF0000]";
        return [
          ...parseInline(before, ctx),
          <Link
            key={getKey("int-link", ctx)}
            href={`/w/${encodeURIComponent(targetSlug)}${anchor}`}
            className={`${linkColor} hover:!underline`}
            title={targetSlug}
          >
            {labelNodes}
          </Link>,
          ...parseInline(after, ctx),
        ];
      }
    }

    // Bold, Italic, etc.
    if (candidate.type === "bold" && candidate.match) {
      const match = candidate.match;
      return [
        ...parseInline(text.slice(0, match.index), ctx),
        <b key={getKey("bold", ctx)}>{parseInline(match[1], ctx)}</b>,
        ...parseInline(text.slice(match.index + match[0].length), ctx),
      ];
    }
    if (candidate.type === "italic" && candidate.match) {
        const match = candidate.match;
        return [
          ...parseInline(text.slice(0, match.index), ctx),
          <i key={getKey("italic", ctx)}>{parseInline(match[1], ctx)}</i>,
          ...parseInline(text.slice(match.index + match[0].length), ctx),
        ];
    }
    if (candidate.type === "underline" && candidate.match) {
        const match = candidate.match;
        return [
          ...parseInline(text.slice(0, match.index), ctx),
          <u key={getKey("underline", ctx)}>{parseInline(match[1], ctx)}</u>,
          ...parseInline(text.slice(match.index + match[0].length), ctx),
        ];
    }
    if (candidate.type === "del" && candidate.match) {
        const match = candidate.match;
        return [
          ...parseInline(text.slice(0, match.index), ctx),
          <del key={getKey("del", ctx)} className="text-gray-400">{parseInline(match[1], ctx)}</del>,
          ...parseInline(text.slice(match.index + match[0].length), ctx),
        ];
    }
    if (candidate.type === "dashDel" && candidate.match) {
        const match = candidate.match;
        return [
          ...parseInline(text.slice(0, match.index), ctx),
          <del key={getKey("dash-del", ctx)} className="text-gray-400">{parseInline(match[1], ctx)}</del>,
          ...parseInline(text.slice(match.index + match[0].length), ctx),
        ];
    }
    if (candidate.type === "sup" && candidate.match) {
        const match = candidate.match;
        return [
          ...parseInline(text.slice(0, match.index), ctx),
          <sup key={getKey("sup", ctx)}>{parseInline(match[1], ctx)}</sup>,
          ...parseInline(text.slice(match.index + match[0].length), ctx),
        ];
    }
    if (candidate.type === "sub" && candidate.match) {
        const match = candidate.match;
        return [
          ...parseInline(text.slice(0, match.index), ctx),
          <sub key={getKey("sub", ctx)}>{parseInline(match[1], ctx)}</sub>,
          ...parseInline(text.slice(match.index + match[0].length), ctx),
        ];
    }
  }

  return [text];
}

// 2. 테이블 파서
export function parseTable(lines: string[], ctx: ParserContext) {
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
    <div className={`my-2 ${isFloat ? "inline-block" : "w-full block"}`} style={wrapperStyle} key={getKey("table-wrap", ctx)}>
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
              <tr key={getKey(`tr-${rIdx}`, ctx)} style={trStyle}>
                {cells.map((cell, cIdx) => {
                  const currentValColStyle = colStyles[cIdx] || {};
                  let cellLocalCounter = 0;
                  const cellCtx: ParserContext = {
                    ...ctx,
                    keyGenerator: (p: string) => {
                      if (ctx.keyGenerator) {
                        return ctx.keyGenerator(`${p}-c${rIdx}-${cIdx}`);
                      }
                      return `${p}-c${rIdx}-${cIdx}-${cellLocalCounter++}`;
                    }
                  };

                  return (
                    <td
                      key={getKey(`td-${rIdx}-${cIdx}`, ctx)}
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
                      {parseInline(cell.content, cellCtx)}
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

// 3. 서브 블록 렌더러
export function renderSubBlock(subLines: string[], ctx: ParserContext) {
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
          if (contentToAdd.trim() || k !== j) if (contentToAdd.trim()) contentLines.push(contentToAdd);
          j = k + 1;
          foundEnd = true;
          break;
        }
        if (k === j) { if (textToAnalyze.trim()) contentLines.push(textToAnalyze); }
        else contentLines.push(textToAnalyze);
        k++;
      }

      if (foundEnd) {
        nodes.push(
          <div key={getKey("wiki-block-sub", ctx)} style={customStyle} className="wiki-block">
            {renderSubBlock(contentLines, ctx)}
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
          <Folding key={getKey("folding-sub", ctx)} title={title}>
            {renderSubBlock(contentLines, ctx)}
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
        while(k < subLines.length) {
            let textToAnalyze = subLines[k];
            if(k===j) textToAnalyze = currentLineContent;
            const openMatches = (textToAnalyze.match(/\{\{\{/g) || []).length;
            const closeMatches = (textToAnalyze.match(/\}\}\}/g) || []).length;
            depth += openMatches * 3;
            depth -= closeMatches * 3;
            if(depth <=0){
                let contentToAdd = textToAnalyze.replace(/\}\}\}(?!.*\}\}\})/, "");
                if(contentToAdd.trim() || k!==j) contentLines.push(contentToAdd);
                j = k+1; foundEnd=true; break;
            }
            contentLines.push(textToAnalyze); k++;
        }
        if(foundEnd){
            nodes.push(<div key={getKey("raw-block", ctx)} className="whitespace-pre-wrap">{contentLines.join("\n")}</div>);
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
      
      let tableCounter = 0;
      const tableCtx: ParserContext = {
        ...ctx,
        keyGenerator: (p) => {
          if (ctx.keyGenerator) return ctx.keyGenerator(`${p}-tbl-${j}`);
          return `${p}-tbl-${j}-${tableCounter++}`;
        }
      };

      nodes.push(parseTable(tLines, tableCtx));
      j = m;
    } else {
      nodes.push(parseLine(subLines[j], ctx, j));
      j++;
    }
  }
  return nodes;
}

// 4. 라인 파서
export function parseLine(rawLine: string, ctx: ParserContext, lineIndex: number) {
  const line = rawLine.replace(/\r$/, "").trim();

  let localCounter = 0;
  const scopedCtx: ParserContext = {
    ...ctx,
    keyGenerator: (prefix: string) => {
      if (ctx.keyGenerator) {
        return ctx.keyGenerator(`${prefix}-L${lineIndex}`);
      }
      return `${prefix}-L${lineIndex}-${localCounter++}`;
    }
  };

  // 리다이렉트 구문 처리
  if (line.startsWith("#redirect ")) {
    const target = line.replace("#redirect ", "").trim();
    let targetSlug = target;
    let anchor = "";

    if (target.includes("#")) {
      const parts = target.split("#");
      targetSlug = parts[0];
      anchor = "#" + parts[1];
    }

    const isExist = ctx.existingSlugs.includes(targetSlug);
    const linkColor = isExist ? "text-[#0275d8]" : "text-[#FF0000]";

    return (
      <div key={getKey("redirect", scopedCtx)} className="min-h-[1.5em] leading-7 break-all">
        #redirect{" "}
        <Link
          href={`/w/${encodeURIComponent(targetSlug)}${anchor}`}
          className={`${linkColor} hover:underline`}
        >
          {target}
        </Link>
      </div>
    );
  }

  if (line === "[목차]") {
    return (
      <div key={getKey("toc-macro", scopedCtx)} className="my-2">
        {ctx.tocRenderer ? ctx.tocRenderer() : null}
      </div>
    );
  }
  if (line.toLowerCase() === "[clearfix]") {
    return <div key={getKey("clearfix", scopedCtx)} className="clear-both" />;
  }

  // 헤더
  const headerMatch = line.match(BLOCK_PATTERNS.header);
  if (headerMatch && ctx.headerMap && ctx.toggleSection) {
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
    const numberStr = ctx.headerMap[lineIndex];
    const id = numberStr ? `s-${numberStr.slice(0, -1)}` : undefined;
    const isCollapsed = id && ctx.collapsedSections ? ctx.collapsedSections.has(id) : false;

    const headerContent = (
      <span
        className="flex items-center w-full group cursor-pointer"
        onClick={() => {
          if (id && ctx.toggleSection) ctx.toggleSection(id);
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
        <span>{parseInline(text, scopedCtx)}</span>
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
        key: getKey("header", scopedCtx),
        id: id,
        className: `${sizes[level] || sizes[6]} border-gray-300 text-[#373a3c] flex items-center scroll-mt-[60px] ${isCollapsed ? "opacity-50" : ""}`,
      },
      headerContent,
    );
  }

  // 리스트
  const listMatch = rawLine.replace(/\r$/, "").match(BLOCK_PATTERNS.list);
  if (listMatch) {
    const indentLevel = listMatch[1].length;
    const content = listMatch[2];
    return (
      <div
        key={getKey("list", scopedCtx)}
        className="flex items-start leading-7 relative"
        style={{ marginLeft: `${indentLevel * 20}px` }}
      >
        <span className="mr-2 mt-[10px] w-[5px] h-[5px] bg-black rounded-full shrink-0 block"></span>
        <span className="break-all">{parseInline(content, scopedCtx)}</span>
      </div>
    );
  }

  if (!line) return <br key={getKey("br", scopedCtx)} />;
  if (line.startsWith("[[분류:") && line.endsWith("]]")) return null;
  if (line.match(BLOCK_PATTERNS.hr)) return <hr key={getKey("hr", scopedCtx)} className="my-4 border-gray-300" />;

  if (line.match(BLOCK_PATTERNS.quote)) {
    return (
      <blockquote
        key={getKey("quote", scopedCtx)}
        className="bg-[#eee] border-2 border-dashed border-[#ccc] border-l-4 border-l-[#71bc6d] [border-left-style:solid] table my-4 p-4"
      >
        {parseInline(line.slice(1).trim(), scopedCtx)}
      </blockquote>
    );
  }

  const Tag = ctx.includeDepth > 0 ? "span" : "div";
  return (
    <Tag key={getKey("p", scopedCtx)} className={`${ctx.includeDepth > 0 ? "inline" : "min-h-[1.5em] leading-7"} break-all`}>
      {parseInline(line, scopedCtx)}
    </Tag>
  );
}
