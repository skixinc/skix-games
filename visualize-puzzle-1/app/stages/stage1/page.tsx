'use client'
import { useState, useCallback, useMemo, useEffect } from 'react'
import BackButton from '../../../components/BackButton'

interface Shape {
  type: 'circle' | 'rect' | 'triangle' | 'diamond'
  x: number
  y: number
  size: number
  rotation: number
  fill: string
}

interface Pattern {
  shapes: Shape[]
  mirrored: boolean
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6']
const TYPES: Shape['type'][] = ['circle', 'rect', 'triangle', 'diamond']
const TOTAL_QUESTIONS = 5
const TIME_LIMIT = 15

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function generatePattern(rand: () => number, count: number): Shape[] {
  return Array.from({ length: count }, () => ({
    type: TYPES[Math.floor(rand() * TYPES.length)],
    x: 20 + rand() * 60,
    y: 20 + rand() * 60,
    size: 10 + rand() * 15,
    rotation: Math.floor(rand() * 4) * 90,
    fill: COLORS[Math.floor(rand() * COLORS.length)],
  }))
}

function mutatePattern(shapes: Shape[], rand: () => number): Shape[] {
  const copy = shapes.map((s) => ({ ...s }))
  const idx = Math.floor(rand() * copy.length)
  const mutation = Math.floor(rand() * 4)
  if (mutation === 0) copy[idx].type = TYPES[Math.floor(rand() * TYPES.length)]
  else if (mutation === 1) copy[idx].rotation = (copy[idx].rotation + 90) % 360
  else if (mutation === 2) copy[idx].fill = COLORS[Math.floor(rand() * COLORS.length)]
  else { copy[idx].x += (rand() > 0.5 ? 1 : -1) * 12; copy[idx].y += (rand() > 0.5 ? 1 : -1) * 12 }
  return copy
}

function ShapeSVG({ shape, mirror }: { shape: Shape; mirror: boolean }) {
  const tx = mirror ? 100 - shape.x : shape.x
  const transform = `translate(${tx},${shape.y}) rotate(${shape.rotation})`
  switch (shape.type) {
    case 'circle':
      return <circle cx={0} cy={0} r={shape.size / 2} fill={shape.fill} transform={transform} />
    case 'rect':
      return <rect x={-shape.size / 2} y={-shape.size / 2} width={shape.size} height={shape.size} fill={shape.fill} transform={transform} />
    case 'triangle': {
      const s = shape.size / 2
      return <polygon points={`0,${-s} ${s},${s} ${-s},${s}`} fill={shape.fill} transform={transform} />
    }
    case 'diamond': {
      const s = shape.size / 2
      return <polygon points={`0,${-s} ${s},0 0,${s} ${-s},0`} fill={shape.fill} transform={transform} />
    }
  }
}

function PatternView({ shapes, mirror, size }: { shapes: Shape[]; mirror: boolean; size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="bg-gray-800 rounded-xl border-2 border-gray-700">
      {shapes.map((s, i) => <ShapeSVG key={i} shape={s} mirror={mirror} />)}
    </svg>
  )
}

export default function Stage1() {
  const [question, setQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [gameOver, setGameOver] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)

  const { target, choices, correctIdx } = useMemo(() => {
    const rand = seededRandom(question * 1000 + 42)
    const shapeCount = 3 + Math.floor(question / 2)
    const base = generatePattern(rand, shapeCount)
    const mirrored = rand() > 0.6
    const numChoices = 5 + (question >= 3 ? 1 : 0)
    const ci = Math.floor(rand() * numChoices)
    const ch = Array.from({ length: numChoices }, (_, i) => {
      if (i === ci) return { shapes: base, mirrored: false }
      return { shapes: mutatePattern(base, rand), mirrored: false }
    })
    return { target: { shapes: base, mirrored }, choices: ch, correctIdx: ci }
  }, [question])

  useEffect(() => {
    if (gameOver || feedback) return
    if (timeLeft <= 0) {
      setFeedback('wrong')
      setTimeout(() => advance(false), 1000)
      return
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, gameOver, feedback])

  const advance = useCallback((correct: boolean) => {
    if (correct) setScore((s) => s + 1)
    if (question + 1 >= TOTAL_QUESTIONS) {
      setGameOver(true)
    } else {
      setQuestion((q) => q + 1)
      setSelected(null)
      setFeedback(null)
      setTimeLeft(TIME_LIMIT)
    }
  }, [question])

  const handleSelect = (idx: number) => {
    if (feedback || gameOver) return
    setSelected(idx)
    const correct = idx === correctIdx
    setFeedback(correct ? 'correct' : 'wrong')
    setTimeout(() => advance(correct), 1000)
  }

  if (gameOver) {
    return (
      <main className="min-h-screen p-4 flex flex-col items-center justify-center">
        <BackButton />
        <h1 className="text-3xl font-bold mb-4">🎉 Stage 1 クリア！</h1>
        <p className="text-xl mb-2">スコア: {score} / {TOTAL_QUESTIONS}</p>
        <button onClick={() => { setQuestion(0); setScore(0); setGameOver(false); setFeedback(null); setTimeLeft(TIME_LIMIT); setSelected(null) }} className="mt-4 px-6 py-3 bg-blue-600 rounded-xl hover:bg-blue-500 transition">もう一度</button>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 flex flex-col items-center">
      <BackButton />
      <h1 className="text-2xl font-bold mb-1">Stage 1: シェイプスタンプ</h1>
      <div className="flex gap-4 mb-4 text-sm text-gray-400">
        <span>問 {question + 1}/{TOTAL_QUESTIONS}</span>
        <span>正解 {score}</span>
        <span className={timeLeft <= 5 ? 'text-red-400' : ''}>残り {timeLeft}秒</span>
      </div>
      <div className="mb-4">
        <p className="text-center text-sm text-gray-400 mb-2">ターゲット{target.mirrored ? '（鏡像）' : ''}</p>
        <PatternView shapes={target.shapes} mirror={target.mirrored} size={160} />
      </div>
      <p className="text-sm text-gray-400 mb-2">同じパターンを選んでください</p>
      <div className="grid grid-cols-3 gap-3 max-w-lg">
        {choices.map((c, i) => (
          <button key={i} onClick={() => handleSelect(i)}
            className={`rounded-xl border-2 transition ${
              selected === i ? (feedback === 'correct' ? 'border-green-400 bg-green-900/30' : 'border-red-400 bg-red-900/30')
              : i === correctIdx && feedback === 'wrong' ? 'border-green-400/50'
              : 'border-gray-700 hover:border-gray-500'
            }`}>
            <PatternView shapes={c.shapes} mirror={false} size={120} />
          </button>
        ))}
      </div>
    </main>
  )
}
