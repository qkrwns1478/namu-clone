import Link from 'next/link'
import React from 'react'

export default function NamuViewer({ content }: { content: string }) {
  // 1. 각주 저장소
  const footnotes: React.ReactNode[] = [];
  
  // 2. 키 생성을 위한 전역 카운터 (렌더링 시마다 초기화)
  let keyCounter = 0;
  const getKey = (prefix: string) => `${prefix}-${keyCounter++}`;

  // 3. 재귀적 파서
  const parseText = (text: string): React.ReactNode[] => {

    // [우선순위 0] 이미지: {{{파일명}}}
    // 너비 조절 기능 등은 복잡하므로 일단 기본 표시만 구현
    const imgRegex = /\{\{\{(.*?)\}\}\}/;
    const imgMatch = imgRegex.exec(text);
    if (imgMatch) {
      const before = text.slice(0, imgMatch.index);
      const filename = imgMatch[1];
      const after = text.slice(imgMatch.index + imgMatch[0].length);

      return [
        ...parseText(before),
        <img 
            key={getKey('img')} 
            src={`/uploads/${filename}`} 
            alt={filename} 
            className="max-w-full h-auto my-2 rounded shadow-sm" 
        />,
        ...parseText(after)
      ];
    }
    
    // [우선순위 1] 각주: [* 내용]
    const noteRegex = /\[\*(.*?)\]/;
    const noteMatch = noteRegex.exec(text);
    
    if (noteMatch) {
      const before = text.slice(0, noteMatch.index);
      const noteContent = noteMatch[1];
      const after = text.slice(noteMatch.index + noteMatch[0].length);

      // 각주 내용 파싱 (재귀) 및 저장
      footnotes.push(
        <span key={getKey('fn-content')}>
            {parseText(noteContent)}
        </span>
      );
      
      const noteId = footnotes.length; // 1, 2, 3...

      return [
        ...parseText(before),
        <sup key={getKey('fn-ref')} id={`r${noteId}`}>
          <a 
            href={`#fn${noteId}`} 
            className="text-[#00A495] font-bold hover:underline mx-0.5"
            title={noteContent}
          >
            [{noteId}]
          </a>
        </sup>,
        ...parseText(after)
      ];
    }

    // [우선순위 2] 볼드: '''텍스트'''
    const boldRegex = /'''(.*?)'''/;
    const boldMatch = boldRegex.exec(text);
    if (boldMatch) {
      const before = text.slice(0, boldMatch.index);
      const inner = boldMatch[1];
      const after = text.slice(boldMatch.index + boldMatch[0].length);
      return [
        ...parseText(before), 
        <b key={getKey('bold')}>{inner}</b>, 
        ...parseText(after)
      ];
    }

    // [우선순위 3] 취소선: ~~텍스트~~
    const delRegex = /~~(.*?)~~/;
    const delMatch = delRegex.exec(text);
    if (delMatch) {
      const before = text.slice(0, delMatch.index);
      const inner = delMatch[1];
      const after = text.slice(delMatch.index + delMatch[0].length);
      return [
        ...parseText(before), 
        <del key={getKey('del')} className="text-gray-400">{inner}</del>, 
        ...parseText(after)
      ];
    }

    // [우선순위 4] 링크: [[링크]] or [[링크|텍스트]]
    const linkRegex = /\[\[(.*?)(?:\|(.*?))?\]\]/;
    const linkMatch = linkRegex.exec(text);
    if (linkMatch) {
      const before = text.slice(0, linkMatch.index);
      const target = linkMatch[1];
      const label = linkMatch[2] || target;
      const after = text.slice(linkMatch.index + linkMatch[0].length);
      
      return [
        ...parseText(before),
        <Link 
          key={getKey('link')}
          href={`/w/${target}`} 
          className="text-[#00A495] hover:underline"
        >
          {label}
        </Link>,
        ...parseText(after)
      ];
    }

    // 매칭 없으면 텍스트 반환
    return [text];
  };

  // 전체 라인별 파싱
  const parsedContent = content.split('\n').map((line, i) => (
    <div key={`line-${i}`} className="min-h-[1.5em] leading-7">
        {line === '' ? <br/> : parseText(line)}
    </div>
  ));

  return (
    <div>
      {/* 본문 */}
      <div className="prose max-w-none text-gray-800 mb-10 break-all">
        {parsedContent}
      </div>

      {/* 각주 영역 */}
      {footnotes.length > 0 && (
        <div className="border-t mt-8 pt-4 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold text-lg mb-2 text-gray-700">각주</h3>
          <ol className="list-none space-y-1 text-sm text-gray-600">
            {footnotes.map((note, index) => {
              const num = index + 1;
              return (
                <li key={`fn-item-${num}`} id={`fn${num}`} className="flex gap-2 items-start">
                  <a 
                    href={`#r${num}`} 
                    className="text-[#00A495] shrink-0 hover:underline min-w-[20px]"
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