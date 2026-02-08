import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인 - 나무위키",
};

export default function LoginPage() {
  return (
    <div className="p-6 bg-white h-[412px] border border-[#ccc] rounded-t-none rounded-b-md sm:rounded-md overflow-hidden">
      <h1 className="text-4xl font-bold text-[#373a3c] leading-tight break-all mb-4">로그인</h1>
      <div className="max-w-[400px] mx-auto">
        <LoginForm />
        <div className="mt-6 text-center text-sm text-gray-600">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-[#00a69c] hover:!underline">
            회원가입하기
          </Link>
        </div>
      </div>
    </div>
  );
}
