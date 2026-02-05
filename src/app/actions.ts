'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { writeFile } from 'fs/promises'
import { join } from 'path'

const prisma = new PrismaClient()

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
  if (!query) return []
  
  return await prisma.wikiPage.findMany({
    where: {
      OR: [
        { slug: { contains: query } },    // 제목에 포함
        { content: { contains: query } }  // 내용에 포함
      ]
    },
    select: { slug: true, updatedAt: true } // 필요한 필드만 가져오기
  })
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

    // 파일명 충돌 방지를 위해 시간값 추가
    const filename = `${Date.now()}_${file.name.replace(/\s/g, '_')}`
    const path = join(process.cwd(), 'public/uploads', filename)

    await writeFile(path, buffer)
    
    // 성공 시 파일명 반환
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
  const comment = formData.get('comment') as string

  if (!slug) return

  const headerList = await headers() 
  const ip = headerList.get('x-forwarded-for') || '127.0.0.1'

  try {
    // 나무위키 방식: DB에서 완전 삭제보다는 '내용 비우기' 또는 '삭제 기록 남기기'가 일반적이지만,
    // 여기서는 요청하신 대로 '삭제' 기능을 구현하되, Prisma Schema 설정에 따라 동작이 다를 수 있습니다.
    // (Cascade Delete가 설정되어 있다면 WikiPage 삭제 시 하위 Revision도 삭제됨)
    
    // 여기서는 안전하게 '삭제되었습니다' 라는 내용으로 덮어쓰거나, 
    // 레코드를 아예 지우는 방식 중 **레코드를 삭제**하는 방식으로 구현합니다.
    
    await prisma.wikiPage.delete({
      where: { slug }
    })
    
    // 만약 로그를 남겨야 한다면 별도의 Log 테이블이 필요합니다. 
    // 현재 구조에서는 페이지가 사라지면 리비전을 남길 수 없으므로 바로 삭제합니다.

  } catch (error) {
    console.error("Delete failed:", error)
    // 에러 처리 로직 (필요 시)
    return
  }

  redirect('/')
}