import { redirect } from 'next/navigation'

export default function Home() {
  redirect(`/w/${encodeURIComponent('나무위키:대문')}`)
}