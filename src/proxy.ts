import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function proxy(request: NextRequest) {
  const rawSecret = process.env.JWT_SECRET;
  if (!rawSecret) {
    console.error("JWT_SECRET is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const JWT_SECRET = new TextEncoder().encode(rawSecret);
  const token = request.cookies.get("session")?.value;
  const { pathname } = request.nextUrl;

  // 1. 토큰 유효성 검사
  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch (err) {
      isAuthenticated = false;
    }
  }

  // 2. 접근 제어 로직

  // 로그인한 사용자가 로그인/회원가입 페이지에 접근하려는 경우
  if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
    // 메인 페이지로 리다이렉트
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 로그인하지 않은 사용자가 설정 페이지에 접근하려는 경우
  if (!isAuthenticated && pathname === "/settings") {
    // 로그인 페이지로 리다이렉트
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// 미들웨어가 실행될 경로 지정
export const config = {
  matcher: ["/login", "/signup", "/settings"],
};
