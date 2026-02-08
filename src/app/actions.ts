"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { writeFile, access } from "fs/promises";
import { join, parse, basename } from "path";
import { constants } from "fs";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) throw new Error("JWT_SECRET is required");
const JWT_SECRET = new TextEncoder().encode(rawSecret);

// Include 매크로용 문서 내용 조회
export async function fetchWikiContent(slug: string) {
  const decodedSlug = decodeURIComponent(slug);
  const page = await prisma.wikiPage.findUnique({
    where: { slug: decodedSlug },
    select: { content: true },
  });
  return page?.content || null;
}

// 문서 조회
export async function getWikiPage(slug: string) {
  const decodedSlug = decodeURIComponent(slug);
  return await prisma.wikiPage.findUnique({
    where: { slug: decodedSlug },
    include: {
      categories: {
        include: { category: true },
      },
    },
  });
}

// 최근 변경 문서 목록
export async function getRecentChanges() {
  return await prisma.wikiPage.findMany({
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: { slug: true, updatedAt: true },
  });
}

// 문서 히스토리
export async function getWikiHistory(slug: string) {
  const decodedSlug = decodeURIComponent(slug);
  return await prisma.wikiRevision.findMany({
    where: {
      page: { slug: decodedSlug },
    },
    include: {
      author: { select: { username: true } },
    },
    orderBy: { rev: "desc" },
  });
}

// 리비전 번호 계산 헬퍼 함수
async function getNextRev(tx: any, pageId: number) {
  const lastRev = await tx.wikiRevision.findFirst({
    where: { pageId },
    orderBy: { rev: "desc" },
    select: { rev: true },
  });
  return (lastRev?.rev || 0) + 1;
}

// 문서 저장
export async function saveWikiPage(formData: FormData) {
  const slug = formData.get("slug") as string;
  const content = formData.get("content") as string;
  const comment = formData.get("comment") as string;

  if (!slug || !content) return;

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") || "127.0.0.1";

  // 1. 분류 추출 로직
  // [[분류:카테고리명]] 패턴 찾기
  const categoryRegex = /\[\[분류:(.*?)\]\]/g;
  const categories = new Set<string>();
  let match;
  while ((match = categoryRegex.exec(content)) !== null) {
    categories.add(match[1].trim());
  }

  // 재시도 로직 추가
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      await prisma.$transaction(async (tx) => {
        // 2. 페이지 생성/수정
        const page = await tx.wikiPage.upsert({
          where: { slug },
          update: { content },
          create: { slug, content },
        });

        // 3. 기존 카테고리 연결 모두 삭제 (초기화)
        await tx.categoryOnPage.deleteMany({
          where: { pageId: page.id },
        });

        // 4. 새로운 카테고리 연결 생성
        for (const catName of categories) {
          // 카테고리가 없으면 생성, 있으면 가져오기
          const category = await tx.category.upsert({
            where: { name: catName },
            update: {},
            create: { name: catName },
          });

          // 연결 테이블에 추가
          await tx.categoryOnPage.create({
            data: {
              pageId: page.id,
              categoryId: category.id,
            },
          });
        }

        // 5. 리비전 저장
        const session = await getSession();
        const nextRev = await getNextRev(tx, page.id);
        await tx.wikiRevision.create({
          data: {
            rev: nextRev,
            content,
            comment: comment || "문서 수정",
            ipAddress: session ? null : ip,
            pageId: page.id,
            authorId: session?.userId,
          },
        });
      });
      break;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          retryCount++;
          if (retryCount >= maxRetries) throw error;
          continue;
        }
        throw error;
    }
  }

  revalidatePath(`/w/${slug}`);
  revalidatePath(`/w/${slug}/history`);
  redirect(`/w/${encodeURIComponent(slug)}`);
}

// 검색 기능
export async function searchDocs(query: string) {
  if (!query.trim()) return { exactMatch: null, titleMatches: [], contentMatches: [] };

  const decodedQuery = query.trim();

  // 1. 제목이 정확히 일치하는 문서
  const exactMatch = await prisma.wikiPage.findUnique({
    where: { slug: decodedQuery },
    select: { slug: true, updatedAt: true, content: true },
  });

  // 2. 제목에 검색어가 포함된 문서 (정확히 일치하는 것 제외)
  const titleMatches = await prisma.wikiPage.findMany({
    where: {
      slug: {
        contains: decodedQuery,
        not: decodedQuery,
      },
    },
    select: { slug: true, updatedAt: true, content: true },
    orderBy: { updatedAt: "desc" },
    take: 15,
  });

  // 3. 내용에 검색어가 포함된 문서 (제목 포함 검색 결과와 중복 방지)
  const contentMatches = await prisma.wikiPage.findMany({
    where: {
      content: { contains: decodedQuery },
      NOT: {
        slug: { contains: decodedQuery },
      },
    },
    select: { slug: true, updatedAt: true, content: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return { exactMatch, titleMatches, contentMatches };
}
// 특정 리비전으로 되돌리기
export async function revertWikiPage(slug: string, revisionId: number) {
  const oldRevision = await prisma.wikiRevision.findUnique({
    where: { id: revisionId },
  });
  if (!oldRevision) throw new Error("리비전을 찾을 수 없습니다.");

  const session = await getSession();
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") || "127.0.0.1";

  await prisma.$transaction(async (tx) => {
    const page = await tx.wikiPage.update({
      where: { slug },
      data: { content: oldRevision.content },
    });

    const nextRev = await getNextRev(tx, page.id);

    await tx.wikiRevision.create({
      data: {
        rev: nextRev,
        content: oldRevision.content,
        comment: `(되돌리기) r${oldRevision.rev} 버전으로 복구`,
        pageId: page.id,
        ipAddress: session ? null : ip,
        authorId: session?.userId,
      },
    });
  });

  revalidatePath(`/w/${slug}`);
  revalidatePath(`/w/${slug}/history`);
  redirect(`/w/${encodeURIComponent(slug)}`);
}

// 이미지 업로드 핸들러
export async function uploadImage(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file || file.size === 0) {
    return { success: false, message: "파일이 없습니다." };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. 기본 파일명 정리 (공백 -> 언더바)
    const originalName = file.name;
    let filename = basename(originalName)
      .replace(/\s/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const uploadDir = join(process.cwd(), "public/uploads");
    let savePath = join(uploadDir, filename);

    // 2. 파일명 중복 체크 및 이름 변경 로직
    const { name: stem, ext } = parse(filename);
    let counter = 1;

    while (true) {
      try {
        await access(savePath, constants.F_OK);

        // 파일이 존재하므로 이름 변경 (예: image_1.png)
        filename = `${stem}_${counter}${ext}`;
        savePath = join(uploadDir, filename);
        counter++;
      } catch (error) {
        break;
      }
    }

    // 3. 파일 저장
    await writeFile(savePath, buffer);

    return { success: true, filename };
  } catch (error) {
    console.error(error);
    return { success: false, message: "업로드 실패" };
  }
}

export async function getCategoryDocs(categoryName: string) {
  const categories = await prisma.category.findMany({
    where: {
      OR: [{ name: categoryName }, { name: { startsWith: `${categoryName}#` } }],
    },
    include: {
      pages: {
        include: { page: true },
      },
    },
  });

  if (categories.length === 0) return [];

  const allPages = categories.flatMap((cat) => cat.pages);
  const uniquePages = Array.from(new Map(allPages.map((item) => [item.pageId, item])).values());

  return uniquePages;
}

// 문서 이동 (이름 변경)
export async function moveWikiPage(prevState: any, formData: FormData) {
  const oldSlug = formData.get("oldSlug") as string;
  const newSlug = formData.get("newSlug") as string;
  const comment = formData.get("comment") as string;

  if (!oldSlug || !newSlug) {
    return { success: false, message: "문서 제목을 입력해주세요." };
  }

  // 1. 이동하려는 제목의 문서가 이미 존재하는지 확인
  const existingPage = await prisma.wikiPage.findUnique({
    where: { slug: newSlug },
  });

  if (existingPage) {
    return { success: false, message: "이미 존재하는 문서 이름입니다." };
  }

  const session = await getSession();
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") || "127.0.0.1";

  try {
    await prisma.$transaction(async (tx) => {
      const page = await tx.wikiPage.update({
        where: { slug: oldSlug },
        data: { slug: newSlug },
      });

      const nextRev = await getNextRev(tx, page.id);

      await tx.wikiRevision.create({
        data: {
          rev: nextRev,
          pageId: page.id,
          content: page.content,
          comment: `(문서 이동) ${oldSlug} → ${newSlug} ${comment ? `: ${comment}` : ""}`,
          ipAddress: session ? null : ip,
          authorId: session?.userId,
        },
      });
    });
  } catch (error) {
    console.error(error);
    return { success: false, message: "문서 이동 중 오류가 발생했습니다." };
  }

  // 캐시 갱신 및 리다이렉트
  revalidatePath(`/w/${oldSlug}`);
  redirect(`/w/${encodeURIComponent(newSlug)}`);
}

// 문서 삭제
export async function deleteWikiPage(formData: FormData) {
  const slug = formData.get("slug") as string;

  if (!slug) return;

  try {
    // 1. 삭제할 문서의 ID를 먼저 조회
    const page = await prisma.wikiPage.findUnique({
      where: { slug },
    });

    if (!page) {
      console.error("Page not found");
      return;
    }

    // 2. 트랜잭션으로 하위 데이터부터 순차적으로 삭제
    await prisma.$transaction(async (tx) => {
      // (1) 해당 문서의 모든 리비전(수정 기록) 삭제
      await tx.wikiRevision.deleteMany({
        where: { pageId: page.id },
      });

      // (2) 해당 문서의 분류 연결 정보 삭제
      await tx.categoryOnPage.deleteMany({
        where: { pageId: page.id },
      });

      // (3) 마지막으로 문서 자체 삭제
      await tx.wikiPage.delete({
        where: { id: page.id },
      });
    });
  } catch (error) {
    console.error("Delete failed:", error);
    return;
  }

  redirect("/");
}

// 링크된 문서들의 존재 여부 확인
export async function getExistingSlugs(slugs: string[]) {
  if (!slugs || slugs.length === 0) return [];

  const pages = await prisma.wikiPage.findMany({
    where: {
      slug: { in: slugs },
    },
    select: { slug: true },
  });

  return pages.map((p) => p.slug);
}

// 자동완성용 제목 검색
export async function searchTitles(query: string) {
  if (!query.trim()) return [];

  return await prisma.wikiPage.findMany({
    where: {
      slug: { contains: query },
    },
    take: 10,
    select: { slug: true },
  });
}

// 세션 가져오기
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: number; username: string };
  } catch (err) {
    return null;
  }
}

// 회원가입
export async function signUp(prevState: any, formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { success: false, message: "아이디와 비밀번호를 모두 입력해주세요." };
  }

  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return { success: false, message: "아이디는 3-20자의 영문, 숫자, 밑줄, 하이픈만 사용 가능합니다." };
  }

  if (password.length < 8) {
    return { success: false, message: "비밀번호는 8자 이상이어야 합니다." };
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { username, password: hashedPassword },
    });
  } catch (error) {
    console.error(error);
    return { success: false, message: "이미 존재하는 아이디입니다." };
  }

  redirect("/login");
}

// 로그인
export async function login(prevState: any, formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const remember = formData.get("remember") === "on";
  const redirectTo = (formData.get("redirectTo") as string) || "/";

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return { success: false, message: "아이디 또는 비밀번호가 일치하지 않습니다." };
  }

  const expirationTime = remember ? "30d" : "24h";
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24;

  const token = await new SignJWT({ userId: user.id, username: user.username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expirationTime)
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAge,
  });

  redirect(redirectTo);
}

// 로그아웃
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  return { success: true };
}

// 사용자 문서 기역 내역 보기
export async function getUserContributions(username: string, page: number = 1) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const pageSize = 25;
  const skip = (safePage - 1) * pageSize;

  const whereCondition = {
    OR: [{ author: { username: username } }, { ipAddress: username }],
  };

  const [contributions, total] = await Promise.all([
    prisma.wikiRevision.findMany({
      where: whereCondition,
      include: {
        page: {
          select: { slug: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: skip,
      take: pageSize,
    }),
    prisma.wikiRevision.count({
      where: whereCondition,
    }),
  ]);

  return {
    contributions,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}
