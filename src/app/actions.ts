'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { writeFile, access } from 'fs/promises'
import { join, parse } from 'path'
import { constants } from 'fs'

const prisma = new PrismaClient()

// Include 매크로용 문서 내용 조회
export async function fetchWikiContent(slug: string) {
  const decodedSlug = decodeURIComponent(slug)
  const page = await prisma.wikiPage.findUnique({
    where: { slug: decodedSlug },
    select: { content: true }
  })
  return page?.content || null
}

// 문서 조회
export async function getWikiPage(slug: string) {
  const decodedSlug = decodeURIComponent(slug)
  return await prisma.wikiPage.findUnique({
    where: { slug: decodedSlug },
    include: {
      categories: {
        include: { category: true }
      }
    }
  })
}

// 최근 변경 문서 목록
export async function getRecentChanges() {
  return await prisma.wikiPage.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 10,
    select: { slug: true, updatedAt: true }
  })
}

// 문서 히스토리
export async function getWikiHistory(slug: string) {
  const decodedSlug = decodeURIComponent(slug)
  return await prisma.wikiRevision.findMany({
    where: {
      page: { slug: decodedSlug }
    },
    orderBy: { createdAt: 'desc' },
  })
}

// 문서 저장
export async function saveWikiPage(formData: FormData) {
  const slug = formData.get('slug') as string
  const content = formData.get('content') as string
  const comment = formData.get('comment') as string

  if (!slug || !content) return

  const headerList = await headers() 
  const ip = headerList.get('x-forwarded-for') || '127.0.0.1'

  // 1. 분류 추출 로직
  // [[분류:카테고리명]] 패턴 찾기
  const categoryRegex = /\[\[분류:(.*?)\]\]/g
  const categories = new Set<string>()
  let match
  while ((match = categoryRegex.exec(content)) !== null) {
    categories.add(match[1].trim())
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 2. 페이지 생성/수정
      const page = await tx.wikiPage.upsert({
        where: { slug },
        update: { content },
        create: { slug, content },
      })

      // 3. 기존 카테고리 연결 모두 삭제 (초기화)
      await tx.categoryOnPage.deleteMany({
        where: { pageId: page.id }
      })

      // 4. 새로운 카테고리 연결 생성
      for (const catName of categories) {
        // 카테고리가 없으면 생성, 있으면 가져오기
        const category = await tx.category.upsert({
          where: { name: catName },
          update: {},
          create: { name: catName }
        })

        // 연결 테이블에 추가
        await tx.categoryOnPage.create({
          data: {
            pageId: page.id,
            categoryId: category.id
          }
        })
      }

      // 5. 리비전 저장 (기존 코드)
      await tx.wikiRevision.create({
          data: {
          content,
          comment: comment || '문서 수정',
          ipAddress: ip,
          pageId: page.id,
        },
      })
    })
  } catch (error) {
    console.error("Save failed:", error)
    return 
  }

  revalidatePath(`/w/${slug}`)
  revalidatePath(`/w/${slug}/history`) 
  redirect(`/w/${encodeURIComponent(slug)}`)
}

// 검색 기능
export async function searchDocs(query: string) {
  if (!query.trim()) return { exactMatch: null, titleMatches: [], contentMatches: [] }
  
  const decodedQuery = query.trim()

  // 1. 제목이 정확히 일치하는 문서
  const exactMatch = await prisma.wikiPage.findUnique({
    where: { slug: decodedQuery },
    select: { slug: true, updatedAt: true, content: true }
  })

  // 2. 제목에 검색어가 포함된 문서 (정확히 일치하는 것 제외)
  const titleMatches = await prisma.wikiPage.findMany({
    where: {
      slug: { 
        contains: decodedQuery,
        not: decodedQuery 
      }
    },
    select: { slug: true, updatedAt: true, content: true },
    orderBy: { updatedAt: 'desc' },
    take: 15
  })

  // 3. 내용에 검색어가 포함된 문서 (제목 포함 검색 결과와 중복 방지)
  const contentMatches = await prisma.wikiPage.findMany({
    where: {
      content: { contains: decodedQuery },
      NOT: {
        slug: { contains: decodedQuery }
      }
    },
    select: { slug: true, updatedAt: true, content: true },
    orderBy: { updatedAt: 'desc' },
    take: 20
  })

  return { exactMatch, titleMatches, contentMatches }
}
// 특정 리비전으로 되돌리기
export async function revertWikiPage(slug: string, revisionId: number) {
  // 1. 되돌리려는 과거 리비전 데이터 가져오기
  const oldRevision = await prisma.wikiRevision.findUnique({
    where: { id: revisionId }
  })

  if (!oldRevision) throw new Error("리비전을 찾을 수 없습니다.")

  // 2. 현재 문서를 과거 내용으로 업데이트 (새로운 리비전 생성 포함)
  await prisma.$transaction(async (tx) => {
    // 페이지 본문 업데이트
    const page = await tx.wikiPage.update({
      where: { slug },
      data: { content: oldRevision.content }
    })

    // 되돌리기 기록도 '새로운 리비전'으로 저장 (누가 되돌렸는지 알기 위해)
    await tx.wikiRevision.create({
      data: {
        content: oldRevision.content,
        comment: `(되돌리기) r${revisionId} 버전으로 복구`,
        pageId: page.id,
      }
    })
  })

  revalidatePath(`/w/${slug}`)
  revalidatePath(`/w/${slug}/history`)
  redirect(`/w/${encodeURIComponent(slug)}`)
}

// 이미지 업로드 핸들러
export async function uploadImage(formData: FormData) {
  const file = formData.get('file') as File
  if (!file || file.size === 0) {
    return { success: false, message: '파일이 없습니다.' }
  }

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 1. 기본 파일명 정리 (공백 -> 언더바)
    let filename = file.name.replace(/\s/g, '_')
    const uploadDir = join(process.cwd(), 'public/uploads')
    let savePath = join(uploadDir, filename)

    // 2. 파일명 중복 체크 및 이름 변경 로직
    const { name: stem, ext } = parse(filename)
    let counter = 1

    while (true) {
      try {
        await access(savePath, constants.F_OK)
        
        // 파일이 존재하므로 이름 변경 (예: image_1.png)
        filename = `${stem}_${counter}${ext}`
        savePath = join(uploadDir, filename)
        counter++
      } catch (error) {
        break
      }
    }

    // 3. 파일 저장
    await writeFile(savePath, buffer)

    return { success: true, filename }
  } catch (error) {
    console.error(error)
    return { success: false, message: '업로드 실패' }
  }
}

export async function getCategoryDocs(categoryName: string) {
  const category = await prisma.category.findUnique({
    where: { name: categoryName },
    include: {
      pages: {
        include: { page: true } // 연결된 페이지 정보 가져오기
      }
    }
  })

  if (!category) return []
  return category.pages
}

// 문서 이동 (이름 변경)
export async function moveWikiPage(prevState: any, formData: FormData) {
  const oldSlug = formData.get('oldSlug') as string
  const newSlug = formData.get('newSlug') as string
  const comment = formData.get('comment') as string

  if (!oldSlug || !newSlug) {
    return { success: false, message: '문서 제목을 입력해주세요.' }
  }

  // 1. 이동하려는 제목의 문서가 이미 존재하는지 확인
  const existingPage = await prisma.wikiPage.findUnique({
    where: { slug: newSlug }
  })

  if (existingPage) {
    return { success: false, message: '이미 존재하는 문서 이름입니다.' }
  }

  const headerList = await headers() 
  const ip = headerList.get('x-forwarded-for') || '127.0.0.1'

  try {
    await prisma.$transaction(async (tx) => {
      // 2. 페이지 슬러그 업데이트 (이름 변경)
      const page = await tx.wikiPage.update({
        where: { slug: oldSlug },
        data: { slug: newSlug }
      })

      // 3. 이동 기록 남기기 (리비전 생성)
      await tx.wikiRevision.create({
        data: {
          pageId: page.id,
          content: page.content, // 내용은 그대로
          comment: `(문서 이동) ${oldSlug} → ${newSlug} ${comment ? `: ${comment}` : ''}`,
          ipAddress: ip,
        }
      })
    })
  } catch (error) {
    console.error(error)
    return { success: false, message: '문서 이동 중 오류가 발생했습니다.' }
  }

  // 캐시 갱신 및 리다이렉트
  revalidatePath(`/w/${oldSlug}`)
  redirect(`/w/${encodeURIComponent(newSlug)}`)
}

// 문서 삭제
export async function deleteWikiPage(formData: FormData) {
  const slug = formData.get('slug') as string
  
  if (!slug) return

  try {
    // 1. 삭제할 문서의 ID를 먼저 조회
    const page = await prisma.wikiPage.findUnique({
      where: { slug }
    })

    if (!page) {
      console.error("Page not found")
      return
    }

    // 2. 트랜잭션으로 하위 데이터부터 순차적으로 삭제
    await prisma.$transaction(async (tx) => {
      // (1) 해당 문서의 모든 리비전(수정 기록) 삭제
      await tx.wikiRevision.deleteMany({
        where: { pageId: page.id }
      })

      // (2) 해당 문서의 분류 연결 정보 삭제
      await tx.categoryOnPage.deleteMany({
        where: { pageId: page.id }
      })

      // (3) 마지막으로 문서 자체 삭제
      await tx.wikiPage.delete({
        where: { id: page.id }
      })
    })

  } catch (error) {
    console.error("Delete failed:", error)
    return
  }

  redirect('/')
}

// 링크된 문서들의 존재 여부 확인
export async function getExistingSlugs(slugs: string[]) {
  if (!slugs || slugs.length === 0) return []
  
  const pages = await prisma.wikiPage.findMany({
    where: {
      slug: { in: slugs }
    },
    select: { slug: true }
  })
  
  return pages.map(p => p.slug)
}

// 자동완성용 제목 검색
export async function searchTitles(query: string) {
  if (!query.trim()) return []

  return await prisma.wikiPage.findMany({
    where: {
      slug: { contains: query }
    },
    take: 10,
    select: { slug: true }
  })
}