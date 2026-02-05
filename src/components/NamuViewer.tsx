import Link from 'next/link'
import React from 'react'

export default function NamuViewer({ content }: { content: string }) {
  const footnotes: React.ReactNode[] = [];
  
  let keyCounter = 0;
  const getKey = (prefix: string) => `${prefix}-${keyCounter++}`;

  const parseInline = (text: string): React.ReactNode[] => {
    // [각주]
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
          <a 
            href={`#fn${noteId}`} 
            className="text-[#0275d8] font-bold mx-0.5 cursor-pointer" 
            title={noteContent}
          >
            [{noteId}]
          </a>
        </sup>,
        ...parseInline(after)
      ];
    }
    
    // [이미지]
    const imgRegex = /\{\{\{(.*?)\}\}\}/;
    const imgMatch = imgRegex.exec(text);
    if (imgMatch) {
      const before = text.slice(0, imgMatch.index);
      const filename = imgMatch[1];
      const after = text.slice(imgMatch.index + imgMatch[0].length);
      return [
        ...parseInline(before), 
        <div key={getKey('img')} className="my-2 inline-block"><img src={`/uploads/${filename}`} alt={filename} className="max-w-full h-auto rounded border" /></div>, 
        ...parseInline(after)
      ];
    }

    // [볼드]
    const boldRegex = /'''(.*?)'''/;
    const boldMatch = boldRegex.exec(text);
    if (boldMatch) {
      const before = text.slice(0, boldMatch.index);
      const inner = boldMatch[1];
      const after = text.slice(boldMatch.index + boldMatch[0].length);
      return [...parseInline(before), <b key={getKey('bold')}>{inner}</b>, ...parseInline(after)];
    }

    // [취소선]
    const delRegex = /~~(.*?)~~/;
    const delMatch = delRegex.exec(text);
    if (delMatch) {
      const before = text.slice(0, delMatch.index);
      const inner = delMatch[1];
      const after = text.slice(delMatch.index + delMatch[0].length);
      return [...parseInline(before), <del key={getKey('del')} className="text-gray-400">{inner}</del>, ...parseInline(after)];
    }

    // [링크]
    const linkRegex = /\[\[(.*?)(?:\|(.*?))?\]\]/;
    const linkMatch = linkRegex.exec(text);
    if (linkMatch) {
      const before = text.slice(0, linkMatch.index);
      const target = linkMatch[1];
      const label = linkMatch[2] || target;
      const after = text.slice(linkMatch.index + linkMatch[0].length);
      return [
        ...parseInline(before),
        <Link key={getKey('link')} href={`/w/${encodeURIComponent(target)}`} className="text-[#0275d8] hover:underline">{label}</Link>,
        ...parseInline(after)
      ];
    }

    return [text];
  };

  const parseLine = (rawLine: string) => {
    const line = rawLine.replace(/\r$/, '');
    
    // [리스트]
    const listMatch = line.match(/^(\s*)\*\s*(.*)$/);
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

    const trimmed = line.trim();

    if (!trimmed) return <br key={getKey('br')} />;

    // [분류 숨김]
    if (trimmed.startsWith('[[분류:') && trimmed.endsWith(']]')) return null;

    // [헤더]
    const headerMatch = trimmed.match(/^(=+)\s*(.+?)\s*\1$/);
    if (headerMatch) {
      const level = headerMatch[1].length; 
      const text = headerMatch[2];
      const sizes: { [key: number]: string } = {
        1: "text-3xl mt-6 mb-4 border-b-2 pb-2",
        2: "text-2xl font-bold mt-5 mb-3 border-b pb-1",
        3: "text-xl mt-4 mb-2 font-bold",
        4: "text-lg mt-3 mb-1 font-bold",
        5: "text-base mt-2 font-bold",
        6: "text-sm mt-2 font-bold"
      };
      return React.createElement(
        `h${level}`,
        { 
          key: getKey('header'), 
          className: `${sizes[level] || sizes[6]} border-gray-300 text-[#373a3c] flex items-center group w-full` 
        },
        text,
        <span className="ml-auto text-[#0275d8] text-xs cursor-pointer font-normal select-none">[편집]</span>
      );
    }

    // [가로줄]
    if (trimmed.match(/^-{4,}$/)) return <hr key={getKey('hr')} className="my-4 border-gray-300" />;

    // [인용문]
    if (trimmed.startsWith('>')) {
        return (
            <blockquote key={getKey('quote')} className="border-l-4 border-[#00A495] pl-4 py-1 my-2 bg-gray-50 text-gray-600">
                {parseInline(trimmed.slice(1).trim())}
            </blockquote>
        )
    }

    return (
      <div key={getKey('p')} className="min-h-[1.5em] leading-7 break-all">
        {parseInline(line)}
      </div>
    );
  };

  const parsedContent = content.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {parseLine(line)}
    </React.Fragment>
  ));

  return (
    <div>
      {/* 본문 영역 */}
      <div className="prose max-w-none text-gray-800 text-[15px]">
        {parsedContent}
      </div>

      {/* 각주 영역 */}
      {footnotes.length > 0 && (
        <div className="border-t mt-5 mb-5 pt-4 border-[#777]">
          <ol className="list-none space-y-1 text-sm text-gray-600">
            {footnotes.map((note, index) => {
              const num = index + 1;
              return (
                <li key={`fn-item-${num}`} id={`fn${num}`} className="flex gap-2 items-start">
                  <a 
                    href={`#r${num}`} 
                    className="text-[#0275d8] shrink-0 hover:underline min-w-[20px] text-right"
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