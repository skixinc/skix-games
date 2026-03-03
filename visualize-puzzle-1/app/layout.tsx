import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Visualize Puzzle 1 - 視覚化パズル',
  description: '視覚化力を鍛える4ステージのパズルゲーム',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-950 text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
