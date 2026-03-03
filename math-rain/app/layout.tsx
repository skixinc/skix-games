import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Math Rain - 計算の雨',
  description: '雲から降ってくる計算式に答えよう！',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gradient-to-b from-sky-300 via-sky-200 to-green-300 min-h-screen">
        {children}
      </body>
    </html>
  )
}
