import { redirect } from 'next/navigation'

export default function Home() {
  redirect(`/w/${encodeURIComponent('대문')}`)
}