"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";
import Link from "next/link";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="max-w-[400px] mx-auto mt-12 p-6 border border-gray-300 rounded bg-white shadow-sm">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">로그인</h1>

      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
          <input
            name="username"
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00a69c]"
            placeholder="아이디 입력"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
          <input
            name="password"
            type="password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00a69c]"
            placeholder="비밀번호 입력"
          />
        </div>

        {state?.message && <p className="text-red-500 text-sm mt-1">{state.message}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#00a69c] text-white py-2 rounded font-bold hover:bg-[#008c84] transition-colors disabled:bg-gray-400"
        >
          {isPending ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-[#00a69c] hover:underline">
          회원가입하기
        </Link>
      </div>
    </div>
  );
}
