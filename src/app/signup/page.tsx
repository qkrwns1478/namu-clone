import Link from "next/link";
import SignupForm from "@/components/auth/SignupForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원가입 - 나무위키",
};

export default function SignUpPage() {
  return (
    <div className="p-6 bg-white h-[412px] border border-[#ccc] rounded-t-none rounded-b-md sm:rounded-md overflow-hidden">
      <h1 className="text-4xl font-bold text-[#373a3c] leading-tight break-all mb-4">회원가입</h1>
      <div className="max-w-[400px] mx-auto">
        <SignupForm />
        <div className="mt-6 text-center text-sm text-gray-600">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-[#00a69c] hover:!underline">
            로그인하기
          </Link>
        </div>
      </div>
    </div>
  );
}
