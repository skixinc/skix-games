'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import BackButton from '../../../components/BackButton'

const TOTAL_QUESTIONS = 6
const TIME_LIMIT = 18
const LABELS = ['A', 'B', 'C', 'D', 'E']

type ShapeType = 'circle' | 'rect' | 'triangle' | 'diamond' | 'star' | 'pentagon' | 'arrow'

interface Part {
  type: ShapeType
  x: number
  y: number
  w: number
  h: number
  rotation: number
  fill: string
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function genPart(rand: () => number): Part {
  const types: ShapeType[] = ['circle', 'rect', 'triangle', 'diamond', 'star', 'pentagon', 'arrow']
  return {
    type: types[Math.floor(rand() * types.length)],
    x: 15 + rand() * 55,
    y: 15 + rand() * 55,
    w: 14 + rand() * 20,
    h: 14 + rand() * 20,
    rotation: Math.floor(rand() * 8) * 45,
    fill: COLORS[Math.floor(rand() * COLORS.length)],
  }
}

function PartPath({ p, asSilhouette }: { p: Part; asSilhouette: boolean }) {
  const fill = asSilhouette ? '#1f2937' : p.fill
  const stroke = asSilhouette ? '#374151' : 'none'
  const sw = asSilhouette ? 1 : 0
  const t = `translate(${p.x},${p.y}) rotate(${p.rotation})`
  const rw = p.w / 2
  const rh = p.h / 2
  switch (p.type) {
    case 'circle':
      return <ellipse cx={0} cy={0} rx={rw} ry={rh} fill={fill} stroke={stroke} strokeWidth={sw} transform={t} />
    case 'rect':
      return <rect x={-rw} y={-rh} width={p.w} height={p.h} fill={fill} stroke={stroke} strokeWidth={sw} transform={t} />
    case 'triangle': {
      const pts = `0,${-rh} ${rw},${rh} ${-rw},${rh}`
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} transform={t} />
    }
    case 'diamond': {
      const pts = `0,${-rh} ${rw},0 0,${rh} ${-rw},0`
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} transform={t} />
    }
    case 'star': {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const ao = (i * 72 - 90) * (Math.PI / 180)
        const ai = ((i * 72 + 36) - 90) * (Math.PI / 180)
        return `${rw * Math.cos(ao)},${rh * Math.sin(ao)} ${rw * 0.4 * Math.cos(ai)},${rh * 0.4 * Math.sin(ai)}`
      }).join(' ')
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} transform={t} />
    }
    case 'pentagon': {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 - 90) * (Math.PI / 180)
        return `${rw * Math.cos(a)},${rh * Math.sin(a)}`
      }).join(' ')
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} transform={t} />
    }
    case 'arrow': {
      const pts = `0,${-rh} ${rw * 0.6},0 ${rw * 0.3},0 ${rw * 0.3},${rh} ${-rw * 0.3},${rh} ${-rw * 0.3},0 ${-rw * 0.6},0`
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} transform={t} />
    }
  }
}

function mutatePart(p: Part, rand: () => number): Part {
  const copy = { ...p }
  const m = Math.floor(rand() * 4)
  if (m === 0) { copy.w = p.w * (rand() > 0.5 ? 1.25 : 0.75); copy.h = p.h }
  else if (m === 1) { copy.h = p.h * (rand() > 0.5 ? 1.25 : 0.75); copy.w = p.w }
  else if (m === 2) copy.rotation = (p.rotation + 45 + Math.floor(rand() * 3) * 45) % 360
  else { copy.x = p.x + (rand() > 0.5 ? 1 : -1) * (8 + rand() * 8); copy.y = p.y + (rand() > 0.5 ? 1 : -1) * (8 + rand() * 8) }
  return copy
}

export default function Stage2() {
  const [question, setQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [gameOver, setGameOver] = useState(false)

  const { original, options, correctIdx } = useMemo(() => {
    const rand = seededRandom(question * 1337 + 19)
    const partCount = 2 + Math.floor(question / 2)
    const parts = Array.from({ length: partCount }, () => genPart(rand))
    const ci = Math.floor(rand() * 5)
    const opts = Array.from({ length: 5 }, (_, i) => {
      if (i === ci) return parts
      const mutCount = 1 + Math.floor(rand() * 2)
      let mutated = parts.map(p => ({ ...p }))
      for (let m = 0; m < mutCount; m++) {
        const idx = Math.floor(rand() * mutated.length)
        mutated = mutated.map((p, j) => j === idx ? mutatePart(p, rand) : p)
      }
      return mutated
    })
    return { original: parts, options: opts, correctIdx: ci }
  }, [question])

  const advance = useCallback((correct: boolean) => {
    if (correct) setScore(s => s + 1)
    if (question + 1 >= TOTAL_QUESTIONS) {
      setGameOver(true)
    } else {
      setQuestion(q => q + 1)
      setSelected(null)
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
    setSelected(idx)
    const correct = idx === correctIdx
    setFeedback(correct ? 'correct' : 'wrong')
    setTimeout(() => advance(correct), 1200)
  }

  const restart = () => {
    setQuestion(0); setScore(0); setSelected(null); setFeedback(null)
    setTimeLeft(TIME_LIMIT); setGameOver(false)
  }

  if (gameOver) {
    return (
      <main className="min-h-screen p-4 flex flex-col items-center justify-center">
        <BackButton />
        <h1 className="text-3xl font-bold mb-4">Stage 2 クリア！</h1>
        <p className="text-xl mb-2">スコア: {score} / {TOTAL_QUESTIONS}</p>
        <p className="text-gray-400 mb-6">{score >= 5 ? '素晴らしい！' : score >= 3 ? 'よくできました！' : 'もう一度挑戦しよう！'}</p>
        <button onClick={restart} className="px-6 py-3 bg-purple-600 rounded-xl hover:bg-purple-500 transition">もう一度</button>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 flex flex-col items-center">
      <BackButton />
      <h1 className="text-2xl font-bold mb-1">Stage 2: 影を探せ</h1>
      <p className="text-sm text-gray-400 mb-1">Find the Shadow</p>
      <div className="flex gap-4 mb-4 text-sm text-gray-400">
        <span>問 {question + 1}/{TOTAL_QUESTIONS}</span>
        <span>正解 {score}</span>
        <span className={timeLeft <= 5 ? 'text-red-400 font-bold' : ''}>残り {timeLeft}秒</span>
      </div>

      <div className="mb-5">
        <p className="text-center text-sm text-gray-400 mb-2">この図形の影はどれ？</p>
        <svg viewBox="0 0 100 100" width={160} height={160} className="bg-gray-800 rounded-xl border-2 border-gray-700 mx-auto block">
          {original.map((p, i) => <PartPath key={i} p={p} asSilhouette={false} />)}
        </svg>
      </div>

      {feedback && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm font-bold ${feedback === 'correct' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
          {feedback === 'correct' ? '正解！' : `不正解... 答えは ${LABELS[correctIdx]}`}
        </div>
      )}

      <p className="text-sm text-gray-300 mb-3">正しい影を選んでください</p>
      <div className="grid grid-cols-5 gap-2 max-w-xl">
        {options.map((opt, i) => {
          const isSelected = selected === i
          const isCorrect = feedback !== null && i === correctIdx
          const isWrong = feedback === 'wrong' && isSelected
          const border = isCorrect ? 'border-green-400 bg-green-900/30' : isWrong ? 'border-red-400 bg-red-900/30' : isSelected ? 'border-purple-400' : 'border-gray-700 hover:border-gray-500'
          return (
            <button key={i} onClick={() => handleClick(i)} className={`rounded-xl border-2 transition p-1 flex flex-col items-center gap-1 ${border}`} aria-label={`選択肢 ${LABELS[i]}`}>
              <svg viewBox="0 0 100 100" width={100} height={100} className="bg-gray-900 rounded-lg">
                {opt.map((p, j) => <PartPath key={j} p={p} asSilhouette={true} />)}
              </svg>
              <span className="text-sm font-bold text-gray-300">{LABELS[i]}</span>
            </button>
          )
        })}
      </div>
    </main>
  )
}
