'use client'
import Link from 'next/link'

export default function BackButton() {
  return (
    <Link href="/" className="inline-block mb-4 text-gray-400 hover:text-white transition-colors">
      ← ステージ選択に戻る
    </Link>
  )
}
