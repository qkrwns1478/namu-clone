"use client";

import { useActionState } from "react";
import { signUp } from "@/app/actions";

export default function SignupForm() {
  const [state, formAction, isPending] = useActionState(signUp, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
          autoComplete="new-password"
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
        {isPending ? "가입 중..." : "회원가입"}
      </button>
    </form>
  );
}
