'use client'

import Link from 'next/link'
import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

// 목차 아이템 타입
type TocItem = {
  id: string;
  text: string;
  level: number;
  numberStr: string;
}

export default function NamuViewer({ content }: { content: string }) {
  const [isTocExpanded, setIsTocExpanded] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set()); 

  // 섹션 토글 함수
  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
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

    const lines = content.split('\n');
    lines.forEach((rawLine, lineIndex) => {
      const line = rawLine.replace(/\r$/, '').trim();
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
                
                const numberStr = numberParts.join('.') + '.';
                const id = `s-${numberStr.slice(0, -1)}`; 

                items.push({ id, text, level, numberStr });
                hMap[lineIndex] = numberStr; 
            }
        }
      }
    });
    return { tocItems: items, headerMap: hMap };
  }, [content]);

  // 2. [가시성 계산]
  const lines = content.split('\n');
  const visibilityMap = new Array(lines.length).fill(true);
  
  let currentHideLevel = 0; 

  lines.forEach((line, i) => {
    const rawLine = line.replace(/\r$/, '').trim();
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
    const noteRegex = /\[\*(.*?)\]/;
    const noteMatch = noteRegex.exec(text);
    if (noteMatch) {
      const before = text.slice(0, noteMatch.index);
      const noteContent = noteMatch[1];
      const after = text.slice(noteMatch.index + noteMatch[0].length);
      
      footnotes.push(
        <span key={getKey('fn-content')}>
            {parseInline(noteContent)}
        </span>
      );
      const noteId = footnotes.length;

      return [
        ...parseInline(before),
        <sup key={getKey('fn-ref')} id={`r${noteId}`}>
          <a href={`#fn${noteId}`} className="text-[#0275d8] hover:!underline font-bold mx-0.5 cursor-pointer" title="각주">{`[${noteId}]`}</a>
        </sup>,
        ...parseInline(after)
      ];
    }
    
    const imgRegex = /\{\{\{(.*?)\}\}\}/;
    const imgMatch = imgRegex.exec(text);
    if (imgMatch) {
      const before = text.slice(0, imgMatch.index);
      const filename = imgMatch[1];
      const after = text.slice(imgMatch.index + imgMatch[0].length);
      return [
        ...parseInline(before), 
        <div key={getKey('img')} className="my-2 inline-block"><img src={`/uploads/${filename}`} alt={filename} className="max-w-full h-auto" /></div>, 
        ...parseInline(after)
      ];
    }

    const boldRegex = /'''(.*?)'''/;
    const boldMatch = boldRegex.exec(text);
    if (boldMatch) {
      const before = text.slice(0, boldMatch.index);
      const inner = boldMatch[1];
      const after = text.slice(boldMatch.index + boldMatch[0].length);
      return [...parseInline(before), <b key={getKey('bold')}>{inner}</b>, ...parseInline(after)];
    }

    const delRegex = /~~(.*?)~~/;
    const delMatch = delRegex.exec(text);
    if (delMatch) {
      const before = text.slice(0, delMatch.index);
      const inner = delMatch[1];
      const after = text.slice(delMatch.index + delMatch[0].length);
      return [...parseInline(before), <del key={getKey('del')} className="text-gray-400">{inner}</del>, ...parseInline(after)];
    }

    const linkRegex = /\[\[(.*?)(?:\|(.*?))?\]\]/;
    const linkMatch = linkRegex.exec(text);
    if (linkMatch) {
      const before = text.slice(0, linkMatch.index);
      const target = linkMatch[1];
      const label = linkMatch[2] || target;
      const after = text.slice(linkMatch.index + linkMatch[0].length);
      return [
        ...parseInline(before),
        <Link key={getKey('link')} href={`/w/${encodeURIComponent(target)}`} className="text-[#0275d8] hover:!underline">{label}</Link>,
        ...parseInline(after)
      ];
    }

    return [text];
  };

  // 5. 라인 파서
  const parseLine = (rawLine: string, lineIndex: number) => {
    const line = rawLine.replace(/\r$/, '').trim();

    // [헤더]
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
        6: "text-sm mt-2 font-bold"
      };

      const numberStr = headerMap[lineIndex];
      const id = numberStr ? `s-${numberStr.slice(0, -1)}` : undefined;
      const isCollapsed = id ? collapsedSections.has(id) : false;

      const headerContent = (
        // [수정] 제목 전체 영역 클릭 시 토글 (cursor-pointer 추가, onClick 이동)
        <span 
          className="flex items-center w-full group cursor-pointer"
          onClick={() => {
            if (id) toggleSection(id);
          }}
        >
          {/* 화살표 아이콘 (클릭 이벤트 제거 -> 부모 이벤트 따름) */}
          {id && (
            <span className="text-[#666] mr-2 text-xs font-normal">
              {isCollapsed ? <ChevronRight /> : <ChevronDown />}
            </span>
          )}
          
          {/* 섹션 번호 (클릭 시 토글 방지, 링크 기능만 수행) */}
          {numberStr && (
            <a 
              href={`#${id}`} 
              className="mr-2 text-[#0275d8] hover:!underline"
              onClick={(e) => e.stopPropagation()} 
            >
              <span>{numberStr}</span>
            </a>
          )}
          
          {/* 제목 텍스트 */}
          <span>{text}</span>
          
          {/* 우측 편집 버튼 (클릭 시 토글 방지) */}
          <div 
            className="ml-auto flex gap-2 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[#0275d8] text-xs cursor-pointer font-normal hover:!underline">[편집]</span>
          </div>
        </span>
      );

      const headerElement = React.createElement(
        `h${level}`,
        { 
          key: getKey('header'), 
          id: id,
          // 접혔을 때 opacity-50 적용
          className: `${sizes[level] || sizes[6]} border-gray-300 text-[#373a3c] flex items-center scroll-mt-[60px] ${isCollapsed ? 'opacity-50' : ''}`
        },
        headerContent
      );

      const isFirstTocHeader = tocItems.length > 0 && tocItems[0].numberStr === numberStr;
      
      if (isFirstTocHeader) {
        return (
          <React.Fragment key={getKey('toc-fragment')}>
            <div className="px-5 py-3 mb-6 border border-[#ccc] bg-white inline-block min-w-[120px] max-w-full">
              <div 
                className="flex justify-between items-center cursor-pointer select-none"
                onClick={() => setIsTocExpanded(!isTocExpanded)}
              >
                <span className="text-lg">목차</span>
                <span className="text-gray-500 text-xs font-normal">{isTocExpanded ? <ChevronDown size={20} /> : <ChevronLeft size={20} />}</span>
              </div>
              
              {isTocExpanded && (
                <div className="mt-3 leading-6">
                  {tocItems.map((item) => (
                    <div className="flex" key={item.id} style={{ paddingLeft: `${(item.level - 2) * 15}px` }}>
                      <a href={`#${item.id}`} className="mr-1 text-[#0275d8] hover:!underline block truncate">
                        <span>{item.numberStr}</span>
                      </a>
                      <span className='text-[#373a3c]'>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {headerElement}
          </React.Fragment>
        );
      }

      return headerElement;
    }

    // [리스트]
    const listMatch = rawLine.replace(/\r$/, '').match(/^(\s*)\*\s*(.*)$/);
    if (listMatch) {
      const indentLevel = listMatch[1].length; 
      const content = listMatch[2]; 
      
      return (
        <div key={getKey('list')} className="flex items-start leading-7 relative" style={{ marginLeft: `${indentLevel * 20}px` }}>
            <span className="mr-2 mt-[10px] w-[5px] h-[5px] bg-black rounded-full shrink-0 block"></span>
            <span className="break-all">{parseInline(content)}</span>
        </div>
      );
    }

    if (!line) return <br key={getKey('br')} />;
    if (line.startsWith('[[분류:') && line.endsWith(']]')) return null;
    if (line.match(/^-{4,}$/)) return <hr key={getKey('hr')} className="my-4 border-gray-300" />;

    if (line.startsWith('>')) {
        return (
            <blockquote key={getKey('quote')} className="border-l-4 border-[#00A495] pl-4 py-1 my-2 bg-gray-50 text-gray-600">
                {parseInline(line.slice(1).trim())}
            </blockquote>
        )
    }

    return (
      <div key={getKey('p')} className="min-h-[1.5em] leading-7 break-all">
        {parseInline(line)}
      </div>
    );
  };

  // 6. 최종 렌더링
  const parsedContent = lines.map((line, i) => {
      if (!visibilityMap[i]) return null;
      return (
        <React.Fragment key={i}>
            {parseLine(line, i)}
        </React.Fragment>
      );
  });

  return (
    <div>
      <div className="prose max-w-none text-gray-800 text-[15px]">
        {parsedContent}
      </div>

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
              )
            })}
          </ol>
        </div>
      )}
    </div>
  );
}