// app/page.tsx
import { redirect } from 'next/navigation'

export default function Home() {
  // 한글은 반드시 encodeURIComponent로 감싸야 합니다.
  redirect(`/w/${encodeURIComponent('대문')}`)
}