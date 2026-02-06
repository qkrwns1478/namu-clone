"use client";

import { Search, Menu, ArrowRight, MessagesSquare, Settings, History, LogOut, UserPlus, LogIn } from "lucide-react";
import { TbClockEdit } from "react-icons/tb";
import { FaUser } from "react-icons/fa6";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { searchTitles, getSession, logout } from "@/app/actions";

export default function Header() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [user, setUser] = useState<{ username: string } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      if (session) {
        setUser({ username: session.username });
      } else {
        setUser(null);
      }
    };

    fetchSession();
    setShowUserMenu(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 0) {
        const results = await searchTitles(query);
        setSuggestions(results.map((r) => r.slug));
      } else {
        setSuggestions([]);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <nav
      className="h-[56px] flex items-center justify-center w-full z-50"
      style={{
        backgroundImage: "linear-gradient(90deg, rgb(0, 166, 156), rgb(0, 166, 156), rgb(40, 180, 114))",
      }}
    >
      <div className="w-full max-w-[1300px] px-2 sm:px-4 flex justify-between items-center h-full">
        {/* 좌측: 로고 + 메뉴 */}
        <div className="flex items-center gap-3">
          <button className="text-white lg:hidden">
            <Menu size={24} />
          </button>
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo.png"
              alt="namu.wiki"
              width={100}
              height={40}
              className="object-contain h-[40px] w-auto"
              priority
            />
          </Link>
          <div className="hidden lg:flex gap-1 text-white text-[16px] font-bold ml-2">
            <Link
              href="/recent-changes"
              className="rounded hover:bg-white/20 p-2 flex items-center gap-2 transition-colors"
            >
              <TbClockEdit size={20} /> 최근 변경
            </Link>
            <Link
              href="/recent-discuss"
              className="rounded hover:bg-white/20 p-2 flex items-center gap-2 transition-colors"
            >
              <MessagesSquare size={20} /> 최근 토론
            </Link>
          </div>
        </div>

        {/* 우측: 검색창 + 아이콘 */}
        <div className="flex items-center gap-2">
          {/* 검색창 영역 */}
          <div ref={wrapperRef} className="relative hidden sm:block w-[270px]">
            <form onSubmit={handleSearch}>
              <div className="flex items-center bg-white w-full h-[36px] px-3 rounded-[4px] hover:shadow-[0_0_0_.25rem_hsla(0,0%,100%,0.4)] transition duration-150 ease-in-out relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none min-w-0"
                  placeholder="여기에서 검색"
                />
                <div className="flex items-center gap-1 text-gray-500 shrink-0">
                  <Search
                    size={16}
                    className="cursor-pointer hover:text-gray-700"
                    onClick={handleSearch}
                  />
                  <button
                    type="submit"
                    className="flex items-center justify-center hover:text-gray-700"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </form>

            {/* 자동완성 드롭다운 */}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute top-[40px] left-0 w-full bg-white border border-gray-300 rounded shadow-lg overflow-hidden z-[60]">
                {suggestions.map((slug, index) => (
                  <li key={index}>
                    <Link
                      href={`/w/${encodeURIComponent(slug)}`}
                      className="block px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 truncate"
                      onClick={() => {
                        setQuery(slug);
                        setShowSuggestions(false);
                      }}
                    >
                      {slug}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-2 rounded hover:bg-white/20 transition-colors text-white"
            >
              <FaUser size={20} />
            </button>

            {/* 드롭다운 메뉴 */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-xl py-2 z-[70] text-gray-800 text-sm">
                {user ? (
                  <>
                    <div className="px-4 py-2 border-b border-gray-100 flex flex-col gap-0.5">
                      <span className="text-sm">사용자</span>
                      <span className="text-lg">{user.username}</span>
                    </div>
                    <Link
                      href={`/contributions/${user.username}`}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
                    >
                      <History size={16} /> 내 기여 내역
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
                    >
                      <Settings size={16} /> 설정
                    </Link>
                    <button
                      onClick={async () => {
                        await logout();
                        setUser(null);
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-red-500"
                    >
                      <LogOut size={16} /> 로그아웃
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
                    >
                      <LogIn size={16} /> 로그인
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
                    >
                      <UserPlus size={16} /> 회원가입
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}