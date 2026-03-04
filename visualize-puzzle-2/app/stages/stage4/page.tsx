'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import BackButton from '../../../components/BackButton'

const TOTAL_QUESTIONS = 6
const TIME_LIMIT = 20
const LABELS = ['A', 'B', 'C', 'D']

type ShapeType = 'circle' | 'rect' | 'triangle' | 'diamond' | 'star' | 'pentagon' | 'arrow' | 'L'

interface Part {
  type: ShapeType
  x: number
  y: number
  w: number
  h: number
  rotation: number
  fill: string
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function genPart(rand: () => number): Part {
  const types: ShapeType[] = ['rect', 'triangle', 'diamond', 'star', 'pentagon', 'arrow', 'L']
  return {
    type: types[Math.floor(rand() * types.length)],
    x: 15 + rand() * 50,
    y: 15 + rand() * 50,
    w: 16 + rand() * 22,
    h: 16 + rand() * 22,
    rotation: Math.floor(rand() * 8) * 45,
    fill: COLORS[Math.floor(rand() * COLORS.length)],
  }
}

function mirrorPart(p: Part): Part {
  return { ...p, x: 100 - p.x }
}

// Distortions for wrong answers: rotation shift or small proportion change
function distortPart(p: Part, rand: () => number, mode: number): Part {
  const c = { ...p }
  if (mode === 0) c.rotation = (p.rotation + 90 + Math.floor(rand() * 3) * 90) % 360
  else if (mode === 1) { c.w = p.w * 1.3; c.h = p.h * 0.75 }
  else if (mode === 2) c.rotation = (p.rotation + 45 + Math.floor(rand() * 7) * 45) % 360
  else { c.x = 100 - p.x + (rand() > 0.5 ? 10 : -10) }
  return c
}

function PartPath({ p }: { p: Part }) {
  const t = `translate(${p.x},${p.y}) rotate(${p.rotation})`
  const rw = p.w / 2, rh = p.h / 2
  switch (p.type) {
    case 'circle':
      return <ellipse cx={0} cy={0} rx={rw} ry={rh} fill={p.fill} transform={t} />
    case 'rect':
      return <rect x={-rw} y={-rh} width={p.w} height={p.h} fill={p.fill} transform={t} />
    case 'triangle':
      return <polygon points={`0,${-rh} ${rw},${rh} ${-rw},${rh}`} fill={p.fill} transform={t} />
    case 'diamond':
      return <polygon points={`0,${-rh} ${rw},0 0,${rh} ${-rw},0`} fill={p.fill} transform={t} />
    case 'star': {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const ao = (i * 72 - 90) * (Math.PI / 180)
        const ai = ((i * 72 + 36) - 90) * (Math.PI / 180)
        return `${rw * Math.cos(ao)},${rh * Math.sin(ao)} ${rw * 0.4 * Math.cos(ai)},${rh * 0.4 * Math.sin(ai)}`
      }).join(' ')
      return <polygon points={pts} fill={p.fill} transform={t} />
    }
    case 'pentagon': {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 - 90) * (Math.PI / 180)
        return `${rw * Math.cos(a)},${rh * Math.sin(a)}`
      }).join(' ')
      return <polygon points={pts} fill={p.fill} transform={t} />
    }
    case 'arrow': {
      const pts = `0,${-rh} ${rw * 0.6},0 ${rw * 0.3},0 ${rw * 0.3},${rh} ${-rw * 0.3},${rh} ${-rw * 0.3},0 ${-rw * 0.6},0`
      return <polygon points={pts} fill={p.fill} transform={t} />
    }
    case 'L': {
      const pts = `${-rw},${-rh} ${-rw * 0.2},${-rh} ${-rw * 0.2},${rh * 0.2} ${rw},${rh * 0.2} ${rw},${rh} ${-rw},${rh}`
      return <polygon points={pts} fill={p.fill} transform={t} />
    }
  }
}

function ShapeView({ parts, size }: { parts: Part[]; size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="bg-gray-800 rounded-xl">
      {parts.map((p, i) => <PartPath key={i} p={p} />)}
    </svg>
  )
}

export default function Stage4() {
  const [question, setQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [gameOver, setGameOver] = useState(false)

  const puzzle = useMemo(() => {
    const rand = seededRandom(question * 3571 + 101)
    const partCount = 2 + Math.floor(question / 2)
    const original = Array.from({ length: partCount }, () => genPart(rand))
    const correctMirror = original.map(mirrorPart)
    const correctIdx = Math.floor(rand() * 4)
    const options = Array.from({ length: 4 }, (_, i) => {
      if (i === correctIdx) return correctMirror
      const mode = i % 4
      return original.map(p => distortPart(mirrorPart(p), rand, mode))
    })
    return { original, options, correctIdx }
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
    const correct = idx === puzzle.correctIdx
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
        <h1 className="text-3xl font-bold mb-4">Stage 4 クリア！</h1>
        <p className="text-xl mb-2">スコア: {score} / {TOTAL_QUESTIONS}</p>
        <p className="text-gray-400 mb-6">{score >= 5 ? '素晴らしい！' : score >= 3 ? 'よくできました！' : 'もう一度挑戦しよう！'}</p>
        <button onClick={restart} className="px-6 py-3 bg-green-600 rounded-xl hover:bg-green-500 transition">もう一度</button>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 flex flex-col items-center">
      <BackButton />
      <h1 className="text-2xl font-bold mb-1">Stage 4: 鏡像パズル</h1>
      <p className="text-sm text-gray-400 mb-1">Mirror Image</p>
      <div className="flex gap-4 mb-4 text-sm text-gray-400">
        <span>問 {question + 1}/{TOTAL_QUESTIONS}</span>
        <span>正解 {score}</span>
        <span className={timeLeft <= 5 ? 'text-red-400 font-bold' : ''}>残り {timeLeft}秒</span>
      </div>

      <div className="flex items-center gap-6 mb-6">
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-gray-400">元の図形</p>
          <ShapeView parts={puzzle.original} size={150} />
        </div>
        <div className="text-3xl text-gray-500">→</div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-gray-400">正しい鏡像は？</p>
          <div className="w-36 h-36 rounded-xl border-2 border-dashed border-gray-600 flex items-center justify-center">
            <span className="text-gray-500 text-3xl">?</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm font-bold ${feedback === 'correct' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
          {feedback === 'correct' ? '正解！' : `不正解... 答えは ${LABELS[puzzle.correctIdx]}`}
        </div>
      )}

      <p className="text-sm text-gray-300 mb-3">左右反転した正しい鏡像を選んでください</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {puzzle.options.map((parts, i) => {
          const isSelected = selected === i
          const isCorrect = feedback !== null && i === puzzle.correctIdx
          const isWrong = feedback === 'wrong' && isSelected
          const border = isCorrect
            ? 'border-green-400 bg-green-900/30'
            : isWrong
            ? 'border-red-400 bg-red-900/30'
            : isSelected
            ? 'border-green-400'
            : 'border-gray-700 hover:border-gray-500'
          return (
            <button key={i} onClick={() => handleClick(i)} className={`rounded-xl border-2 transition p-1 flex flex-col items-center gap-1 ${border}`} aria-label={`選択肢 ${LABELS[i]}`}>
              <ShapeView parts={parts} size={120} />
              <span className="text-sm font-bold text-gray-300">{LABELS[i]}</span>
            </button>
          )
        })}
      </div>
    </main>
  )
}
