'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import BackButton from '../../../components/BackButton'

const TOTAL_QUESTIONS = 6
const TIME_LIMIT = 20
const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

type ShapeType = 'circle' | 'rect' | 'triangle' | 'diamond' | 'star' | 'pentagon'

interface ShapeDef {
  type: ShapeType
  x: number
  y: number
  size: number
  rotation: number
  fill: string
  strokeWidth: number
  stroke: string
  opacity: number
}

const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316',
]

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function genShape(rand: () => number): ShapeDef {
  const types: ShapeType[] = ['circle', 'rect', 'triangle', 'diamond', 'star', 'pentagon']
  return {
    type: types[Math.floor(rand() * types.length)],
    x: 20 + rand() * 60,
    y: 20 + rand() * 60,
    size: 12 + rand() * 18,
    rotation: Math.floor(rand() * 12) * 30,
    fill: COLORS[Math.floor(rand() * COLORS.length)],
    strokeWidth: rand() > 0.5 ? 2 : 0,
    stroke: COLORS[Math.floor(rand() * COLORS.length)],
    opacity: 0.7 + rand() * 0.3,
  }
}

function mutateShape(s: ShapeDef, rand: () => number): ShapeDef {
  const copy = { ...s }
  const m = Math.floor(rand() * 5)
  if (m === 0) copy.fill = COLORS[(COLORS.indexOf(copy.fill) + 1 + Math.floor(rand() * (COLORS.length - 1))) % COLORS.length]
  else if (m === 1) copy.rotation = (copy.rotation + 30 + Math.floor(rand() * 5) * 30) % 360
  else if (m === 2) copy.size = copy.size * (rand() > 0.5 ? 1.3 : 0.7)
  else if (m === 3) { copy.x += (rand() > 0.5 ? 1 : -1) * 15; copy.y += (rand() > 0.5 ? 1 : -1) * 15 }
  else { const types: ShapeType[] = ['circle', 'rect', 'triangle', 'diamond', 'star', 'pentagon']; copy.type = types[Math.floor(rand() * types.length)] }
  return copy
}

function ShapePath({ s, mirror }: { s: ShapeDef; mirror: boolean }) {
  const x = mirror ? 100 - s.x : s.x
  const t = `translate(${x},${s.y}) rotate(${s.rotation})`
  const r = s.size / 2
  const strokeProps = s.strokeWidth > 0 ? { stroke: s.stroke, strokeWidth: s.strokeWidth } : {}
  switch (s.type) {
    case 'circle':
      return <circle cx={0} cy={0} r={r} fill={s.fill} opacity={s.opacity} transform={t} {...strokeProps} />
    case 'rect':
      return <rect x={-r} y={-r} width={s.size} height={s.size} fill={s.fill} opacity={s.opacity} transform={t} {...strokeProps} />
    case 'triangle': {
      const pts = `0,${-r} ${r},${r} ${-r},${r}`
      return <polygon points={pts} fill={s.fill} opacity={s.opacity} transform={t} {...strokeProps} />
    }
    case 'diamond': {
      const pts = `0,${-r} ${r},0 0,${r} ${-r},0`
      return <polygon points={pts} fill={s.fill} opacity={s.opacity} transform={t} {...strokeProps} />
    }
    case 'star': {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const outer = (i * 72 - 90) * (Math.PI / 180)
        const inner = ((i * 72 + 36) - 90) * (Math.PI / 180)
        return `${r * Math.cos(outer)},${r * Math.sin(outer)} ${(r * 0.4) * Math.cos(inner)},${(r * 0.4) * Math.sin(inner)}`
      }).join(' ')
      return <polygon points={pts} fill={s.fill} opacity={s.opacity} transform={t} {...strokeProps} />
    }
    case 'pentagon': {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 - 90) * (Math.PI / 180)
        return `${r * Math.cos(a)},${r * Math.sin(a)}`
      }).join(' ')
      return <polygon points={pts} fill={s.fill} opacity={s.opacity} transform={t} {...strokeProps} />
    }
  }
}

interface Card {
  shapes: ShapeDef[]
  id: number
}

function CardView({ card, label, selected, correct, wrong, onClick }: {
  card: Card
  label: string
  selected: boolean
  correct: boolean
  wrong: boolean
  onClick: () => void
}) {
  const border = correct ? 'border-green-400 bg-green-900/30' : wrong ? 'border-red-400 bg-red-900/30' : selected ? 'border-blue-400 bg-blue-900/20' : 'border-gray-700 hover:border-gray-500'
  return (
    <button onClick={onClick} className={`rounded-xl border-2 transition p-1 flex flex-col items-center gap-1 ${border}`} aria-label={`カード ${label}`}>
      <svg viewBox="0 0 100 100" width={120} height={120} className="bg-gray-800 rounded-lg">
        {card.shapes.map((s, i) => <ShapePath key={i} s={s} mirror={false} />)}
      </svg>
      <span className="text-sm font-bold text-gray-300">{label}</span>
    </button>
  )
}

export default function Stage1() {
  const [question, setQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<number[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [gameOver, setGameOver] = useState(false)

  const { cards, pairIdx } = useMemo(() => {
    const rand = seededRandom(question * 999 + 37)
    const shapeCount = 2 + Math.floor(question / 2)
    const baseShapes = Array.from({ length: shapeCount }, () => genShape(rand))
    const pA = Math.floor(rand() * 6)
    let pB = Math.floor(rand() * 5)
    if (pB >= pA) pB++
    const cardsArr: Card[] = Array.from({ length: 6 }, (_, i) => {
      if (i === pA || i === pB) return { shapes: baseShapes, id: i }
      const mutCount = 1 + Math.floor(rand() * 2)
      let shapes = baseShapes.map(s => ({ ...s }))
      for (let m = 0; m < mutCount; m++) shapes = shapes.map(s => mutateShape(s, rand))
      return { shapes, id: i }
    })
    return { cards: cardsArr, pairIdx: [pA, pB] }
  }, [question])

  const advance = useCallback((correct: boolean) => {
    if (correct) setScore(s => s + 1)
    if (question + 1 >= TOTAL_QUESTIONS) {
      setGameOver(true)
    } else {
      setQuestion(q => q + 1)
      setSelected([])
      setFeedback(null)
      setTimeLeft(TIME_LIMIT)
    }
  }, [question])

  useEffect(() => {
    if (gameOver || feedback) return
    if (timeLeft <= 0) {
      setFeedback('wrong')
      setTimeout(() => advance(false), 1200)
      return
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, gameOver, feedback, advance])

  const handleClick = (idx: number) => {
    if (feedback || gameOver) return
    if (selected.includes(idx)) {
      setSelected(s => s.filter(x => x !== idx))
      return
    }
    const next = [...selected, idx]
    if (next.length < 2) { setSelected(next); return }
    const correct = next.includes(pairIdx[0]) && next.includes(pairIdx[1])
    setSelected(next)
    setFeedback(correct ? 'correct' : 'wrong')
    setTimeout(() => advance(correct), 1200)
  }

  const restart = () => {
    setQuestion(0); setScore(0); setSelected([]); setFeedback(null)
    setTimeLeft(TIME_LIMIT); setGameOver(false)
  }

  if (gameOver) {
    return (
      <main className="min-h-screen p-4 flex flex-col items-center justify-center">
        <BackButton />
        <h1 className="text-3xl font-bold mb-4">Stage 1 クリア！</h1>
        <p className="text-xl mb-2">スコア: {score} / {TOTAL_QUESTIONS}</p>
        <p className="text-gray-400 mb-6">{score >= 5 ? '素晴らしい！' : score >= 3 ? 'よくできました！' : 'もう一度挑戦しよう！'}</p>
        <button onClick={restart} className="px-6 py-3 bg-blue-600 rounded-xl hover:bg-blue-500 transition">もう一度</button>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 flex flex-col items-center">
      <BackButton />
      <h1 className="text-2xl font-bold mb-1">Stage 1: そっくりさん発見</h1>
      <p className="text-sm text-gray-400 mb-1">Spot the Match</p>
      <div className="flex gap-4 mb-4 text-sm text-gray-400">
        <span>問 {question + 1}/{TOTAL_QUESTIONS}</span>
        <span>正解 {score}</span>
        <span className={timeLeft <= 5 ? 'text-red-400 font-bold' : ''}>残り {timeLeft}秒</span>
      </div>
      {feedback && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm font-bold ${feedback === 'correct' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
          {feedback === 'correct' ? '正解！' : `不正解... 答えは ${LABELS[pairIdx[0]]} と ${LABELS[pairIdx[1]]}`}
        </div>
      )}
      <p className="text-sm text-gray-300 mb-4">まったく同じ図形の2枚を選んでください</p>
      <div className="grid grid-cols-3 gap-3 max-w-md">
        {cards.map((card, i) => (
          <CardView
            key={i}
            card={card}
            label={LABELS[i]}
            selected={selected.includes(i)}
            correct={feedback !== null && pairIdx.includes(i)}
            wrong={feedback === 'wrong' && selected.includes(i) && !pairIdx.includes(i)}
            onClick={() => handleClick(i)}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4">2枚クリックして選んでください</p>
    </main>
  )
}
