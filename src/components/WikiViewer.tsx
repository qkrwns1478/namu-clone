import Link from 'next/link'
import React from 'react'

export default function NamuViewer({ content }: { content: string }) {
  // 각주 내용을 저장할 배열
  const footnotes: React.ReactNode[] = [];

  // 재귀적 파서 (스타일 + 링크 + 각주 처리)
  const parseText = (text: string): React.ReactNode[] => {
    
    // 1. 각주 ([* 내용]) 처리
    // 주의: 각주는 가장 먼저 처리해서 번호를 매깁니다.
    const noteRegex = /\[\*(.*?)\]/;
    const noteMatch = noteRegex.exec(text);
    
    if (noteMatch) {
      const before = text.slice(0, noteMatch.index);
      const noteContent = noteMatch[1]; // 각주 내용
      const after = text.slice(noteMatch.index + noteMatch[0].length);

      // 각주 저장소에 내용 추가 (나중에 하단에 렌더링)
      // 각주 내부에도 볼드/링크가 있을 수 있으므로 재귀 파싱
      footnotes.push(
        <span key={`fn-content-${footnotes.length}`}>
            {parseText(noteContent)}
        </span>
      );
      
      const noteId = footnotes.length; // 현재 각주 번호 (1부터 시작)

      return [
        ...parseText(before),
        // 본문에 표시될 번호표 [1]
        <sup key={`fn-ref-${noteId}`} id={`r${noteId}`}>
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

    // 2. 볼드체 ('''텍스트''')
    const boldRegex = /'''(.*?)'''/;
    const boldMatch = boldRegex.exec(text);
    if (boldMatch) {
      const before = text.slice(0, boldMatch.index);
      const inner = boldMatch[1];
      const after = text.slice(boldMatch.index + boldMatch[0].length);
      return [...parseText(before), <b key={`b-${boldMatch.index}`}>{inner}</b>, ...parseText(after)];
    }

    // 3. 취소선 (~~텍스트~~)
    const delRegex = /~~(.*?)~~/;
    const delMatch = delRegex.exec(text);
    if (delMatch) {
      const before = text.slice(0, delMatch.index);
      const inner = delMatch[1];
      const after = text.slice(delMatch.index + delMatch[0].length);
      return [...parseText(before), <del key={`del-${delMatch.index}`} className="text-gray-400">{inner}</del>, ...parseText(after)];
    }

    // 4. 링크 ([[링크]])
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
          key={`link-${linkMatch.index}`}
          href={`/w/${target}`} 
          className="text-[#00A495] hover:underline"
        >
          {label}
        </Link>,
        ...parseText(after)
      ];
    }

    return [text];
  };

  // 전체 본문 파싱 실행
  // 줄바꿈 단위로 나누되, 각주 번호가 이어지도록 로직을 구성해야 하지만
  // 간단한 구현을 위해 여기서는 줄바꿈을 포함한 전체 텍스트를 한번에 처리하거나
  // 줄 단위로 처리하되 footnotes 배열은 공유합니다.
  const parsedContent = content.split('\n').map((line, i) => (
    <div key={i} className="min-h-[1.5em] leading-7">
        {line === '' ? <br/> : parseText(line)}
    </div>
  ));

  return (
    <div>
      {/* 1. 본문 영역 */}
      <div className="prose max-w-none text-gray-800 mb-10">
        {parsedContent}
      </div>

      {/* 2. 각주 영역 (각주가 있을 때만 표시) */}
      {footnotes.length > 0 && (
        <div className="border-t mt-8 pt-4">
          <h3 className="font-bold text-lg mb-2 text-gray-700">각주</h3>
          <ol className="list-none space-y-1 text-sm text-gray-600">
            {footnotes.map((note, index) => {
              const num = index + 1;
              return (
                <li key={num} id={`fn${num}`} className="flex gap-2">
                  <a 
                    href={`#r${num}`} 
                    className="text-[#00A495] shrink-0 hover:underline"
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