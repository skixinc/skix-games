'use client'
import Link from 'next/link'

const stages = [
  {
    id: 1,
    title: 'そっくりさん発見',
    subtitle: 'Spot the Match',
    desc: '6つの図形の中から、まったく同じ2つを見つけ出せ！',
    icon: '🔍',
    color: 'from-blue-600 to-cyan-500',
  },
  {
    id: 2,
    title: '影を探せ',
    subtitle: 'Find the Shadow',
    desc: 'カラフルな図形にぴったり合う影はどれ？',
    icon: '🌑',
    color: 'from-purple-600 to-pink-500',
  },
  {
    id: 3,
    title: 'パターン完成',
    subtitle: 'Pattern Completion',
    desc: '3×3グリッドのパターンを読み解き、欠けたピースを選べ！',
    icon: '🧩',
    color: 'from-amber-600 to-orange-500',
  },
  {
    id: 4,
    title: '鏡像パズル',
    subtitle: 'Mirror Image',
    desc: '図形の正しい鏡像を4つの選択肢から選べ！',
    icon: '🪞',
    color: 'from-green-600 to-emerald-500',
  },
]

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <h1 className="text-3xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-amber-400 bg-clip-text text-transparent">
        Visualize Puzzle 2
      </h1>
      <p className="text-gray-400 mb-8 text-center">視覚的思考力を鍛える4つのステージ</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-2xl w-full">
        {stages.map((s) => (
          <Link
            key={s.id}
            href={`/stages/stage${s.id}`}
            className={`block rounded-2xl bg-gradient-to-br ${s.color} p-6 hover:scale-105 transition-transform shadow-lg`}
          >
            <div className="text-4xl mb-2">{s.icon}</div>
            <div className="text-xs uppercase tracking-wider opacity-80">Stage {s.id}</div>
            <h2 className="text-xl font-bold">{s.title}</h2>
            <p className="text-sm opacity-80 mt-1">{s.subtitle}</p>
            <p className="text-xs opacity-70 mt-2">{s.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
