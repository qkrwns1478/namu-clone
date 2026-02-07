"use client";

export default function SlugTitle({ slug }: { slug: string }) {
  const colonIndex = slug.indexOf(":");
  const hrefSlug = encodeURIComponent(slug);

  return (
    <a href={`/w/${hrefSlug}`} className="hover:!underline">
      <h1 className="text-4xl font-bold text-[#373a3c] leading-tight break-all">
        {colonIndex !== -1 ? (
          <>
            <span style={{ boxShadow: "inset 0 -0.5rem 0 #d4f0e3" }}>
              {slug.substring(0, colonIndex)}
            </span>
            {slug.substring(colonIndex)}
          </>
        ) : (
          slug
        )}
      </h1>
    </a>
  );
}