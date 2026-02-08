"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";

export default function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo || "/"} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
        <input
          name="username"
          type="text"
          required
          autoComplete="username"
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
          autoComplete="current-password"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00a69c]"
          placeholder="비밀번호 입력"
        />
      </div>

      <div className="flex items-center">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            name="remember"
            type="checkbox"
            className="w-4 h-4 border-gray-300 rounded text-[#00a69c] focus:ring-[#00a69c]"
          />
          <span className="text-sm text-gray-600">자동 로그인</span>
        </label>
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
  );
}
