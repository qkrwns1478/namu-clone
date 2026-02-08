"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import NamuViewer from "../NamuViewer";
import { getExistingSlugs } from "@/app/actions";

export const IncludeRenderer = ({
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
  const [internalExistingSlugs, setInternalExistingSlugs] = useState<string[]>(existingSlugs);
  const MAX_INCLUDE_DEPTH = 5;

  const { slug, params } = useMemo(() => {
    const args = rawArgs.split(",");
    const nextSlug = args[0].trim();
    const nextParams: { [key: string]: string } = {};
    
    for (let i = 1; i < args.length; i++) {
      const parts = args[i].split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join("=").trim();
        nextParams[key] = val;
      }
    }
    return { slug: nextSlug, params: nextParams };
  }, [rawArgs]);

  const nextVisitedSlugs = useMemo(() => {
    const next = new Set(visitedSlugs);
    next.add(slug);
    return next;
  }, [visitedSlugs, slug]);

  useEffect(() => {
    if (JSON.stringify(internalExistingSlugs) !== JSON.stringify(existingSlugs)) {
      setInternalExistingSlugs(existingSlugs);
    }
  }, [existingSlugs]);

  // 특수 틀 문서 존재 여부 체크
  useEffect(() => {
    const targets: string[] = [];
    if (slug === "틀:상세 내용" && params["문서명"]) targets.push(params["문서명"]);
    if (slug === "틀:상위 문서" && params["문서명1"]) targets.push(params["문서명1"]);
    if (slug === "틀:다른 뜻") {
      for (let i = 1; i <= 10; i++) {
        const t = params[`문서명${i}`];
        if (t) targets.push(t);
      }
    }

    const newTargets = targets.filter(t => !internalExistingSlugs.includes(t));

    if (newTargets.length > 0) {
      getExistingSlugs(newTargets).then((found) => {
        if (found.length > 0) {
          setInternalExistingSlugs((prev) => Array.from(new Set([...prev, ...found])));
        }
      });
    }
  }, [slug, params]);

  useEffect(() => {
    const specialTemplates = ["틀:상세 내용", "틀:상위 문서", "틀:다른 뜻"];
    if (specialTemplates.includes(slug)) {
      setLoading(false);
      return;
    }
    if (!fetchContent || depth >= MAX_INCLUDE_DEPTH || visitedSlugs.has(slug)) {
      setLoading(false);
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
      .finally(() => setLoading(false));
  }, [slug, fetchContent, params, depth, visitedSlugs]);

  useEffect(() => {
    if (!content) return;
    const targets = new Set<string>();
    const linkRegex = /\[\[(.*?)(?:\|(.*?))?\]\]/g;
    let m;
    while ((m = linkRegex.exec(content)) !== null) {
      let t = m[1].split("#")[0].trim();
      if (t) targets.add(t);
    }
    if (content.trim().startsWith("#redirect ")) {
      const rt = content.trim().replace("#redirect ", "").split("#")[0].trim();
      if (rt) targets.add(rt);
    }
    if (targets.size > 0) {
      getExistingSlugs(Array.from(targets)).then((found) => {
        setInternalExistingSlugs((prev) => {
          const newSet = new Set([...prev, ...found]);
          return Array.from(newSet);
        });
      });
    }
  }, [content]);

  if (loading) return <span className="text-gray-400 text-xs">[Loading...]</span>;

  const getLinkStyle = (target: string) => {
    const isExist = internalExistingSlugs.includes(target) || target === currentSlug;
    return isExist ? "text-[#0275d8]" : "text-[#FF0000]";
  };

  // 렌더링: 상세 내용
  if (slug === "틀:상세 내용") {
    const target = params["문서명"] || "내용";
    const linkColor = getLinkStyle(target);
    return (
      <div className="flex items-center gap-2 text-[15px]">
        <img src="/images/상세내용.svg" alt="" aria-hidden="true" className="w-[21px] h-[21px]" />
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

  // 렌더링: 상위 문서
  if (slug === "틀:상위 문서") {
    const target = params["문서명1"] || "상위 문서";
    const linkColor = getLinkStyle(target);
    return (
      <div className="flex items-center gap-2 text-[15px]">
        <img src="/images/상위문서.svg" alt="" aria-hidden="true" className="w-[21px] h-[21px]" />
        <span>
          상위 문서:{" "}
          <Link href={`/w/${encodeURIComponent(target)}`} className={`${linkColor} hover:!underline`}>
            {target}
          </Link>
        </span>
      </div>
    );
  }

  // 렌더링: 다른 뜻
  if (slug === "틀:다른 뜻") {
    const items = [];
    for (let i = 1; i <= 10; i++) {
      const desc = params[`설명${i}`];
      const target = params[`문서명${i}`];
      if (desc && target) items.push({ desc, target });
    }
    if (items.length === 0) return null;

    return (
      <div className="flex flex-col">
        {items.map((item, idx) => {
          const linkColor = getLinkStyle(item.target);
          return (
            <div key={idx} className="flex items-center gap-2 text-[15px]">
              <img src="/images/다른뜻.svg" alt="" aria-hidden="true" className="w-[21px] h-[21px]" />
              <span>
                {item.desc}에 대한 내용은{" "}
                <Link href={`/w/${encodeURIComponent(item.target)}`} className={`${linkColor} hover:!underline`}>
                  {item.target}
                </Link>{" "}
                문서를 참고하십시오.
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (!content) return <span className="text-red-500 text-xs">[Include Error: {slug}]</span>;

  return (
    <span style={{ display: "contents" }}>
      <NamuViewer
        content={content}
        slug={currentSlug}
        existingSlugs={internalExistingSlugs}
        fetchContent={fetchContent}
        visitedSlugs={nextVisitedSlugs}
        includeDepth={depth + 1}
      />
    </span>
  );
};