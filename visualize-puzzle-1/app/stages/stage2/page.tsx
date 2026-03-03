'use client'
import { useState, useMemo, useCallback } from 'react'
import BackButton from '../../../components/BackButton'

const TOTAL_QUESTIONS = 4

function seededRandom(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

function generateCables(rand: () => number, count: number) {
  const right = Array.from({ length: count }, (_, i) => i)
  // Fisher-Yates shuffle
  for (let i = right.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [right[i], right[j]] = [right[j], right[i]]
  }
  // Generate control points for tangled curves
  const cables = right.map((targetIdx, sourceIdx) => {
    const y1 = (sourceIdx + 0.5) / count * 100
    const y2 = (targetIdx + 0.5) / count * 100
    const numPoints = 4 + Math.floor(rand() * 3)
    const points: { x: number; y: number }[] = [{ x: 5, y: y1 }]
    for (let p = 1; p < numPoints - 1; p++) {
      const t = p / (numPoints - 1)
      const baseY = y1 + (y2 - y1) * t
      const offset = (rand() - 0.5) * 60
      points.push({ x: 5 + t * 90, y: Math.max(2, Math.min(98, baseY + offset)) })
    }
    points.push({ x: 95, y: y2 })
    return { source: sourceIdx, target: targetIdx, points }
  })
  return { cables, mapping: right }
}

function cubicPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const cx1 = p0.x + (p1.x - p0.x) * 0.5
    const cx2 = p1.x - (p1.x - p0.x) * 0.5
    d += ` C ${cx1} ${p0.y}, ${cx2} ${p1.y}, ${p1.x} ${p1.y}`
  }
  return d
}

const LABELS = 'ABCDEFGH'

export default function Stage2() {
  const [question, setQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [highlightCable, setHighlightCable] = useState<number | null>(null)

  const cableCount = 4 + question
  const { cables, mapping } = useMemo(() => {
    const rand = seededRandom(question * 777 + 13)
    return generateCables(rand, cableCount)
  }, [question, cableCount])

  const handleAnswer = (source: number, target: number) => {
    if (submitted) return
    setAnswers((a) => ({ ...a, [source]: target }))
  }

  const handleSubmit = () => {
    setSubmitted(true)
    const allCorrect = cables.every((c) => answers[c.source] === c.target)
    if (allCorrect) setScore((s) => s + 1)
    setTimeout(() => {
      if (question + 1 >= TOTAL_QUESTIONS) {
        setGameOver(true)
        if (allCorrect) setScore((s) => s) // already counted
      } else {
        setQuestion((q) => q + 1)
        setAnswers({})
        setSubmitted(false)
        setHighlightCable(null)
      }
    }, 2000)
  }

  if (gameOver) {
    return (
      <main className="min-h-screen p-4 flex flex-col items-center justify-center">
        <BackButton />
        <h1 className="text-3xl font-bold mb-4">🎉 Stage 2 クリア！</h1>
        <p className="text-xl mb-2">スコア: {score} / {TOTAL_QUESTIONS}</p>
        <button onClick={() => { setQuestion(0); setScore(0); setGameOver(false); setAnswers({}); setSubmitted(false) }}
          className="mt-4 px-6 py-3 bg-purple-600 rounded-xl hover:bg-purple-500 transition">もう一度</button>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 flex flex-col items-center">
      <BackButton />
      <h1 className="text-2xl font-bold mb-1">Stage 2: ケーブルパズル</h1>
      <p className="text-sm text-gray-400 mb-4">問 {question + 1}/{TOTAL_QUESTIONS} | 正解 {score}</p>
      <div className="relative w-full max-w-lg aspect-[4/3] bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          {cables.map((c, i) => (
            <path key={i} d={cubicPath(c.points)}
              fill="none" stroke={highlightCable === i ? '#facc15' : submitted ? (answers[c.source] === c.target ? '#22c55e' : '#ef4444') : '#94a3b8'}
              strokeWidth={highlightCable === i ? 1.2 : 0.7}
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHighlightCable(i)}
              onMouseLeave={() => setHighlightCable(null)}
            />
          ))}
        </svg>
        {/* Left labels */}
        {Array.from({ length: cableCount }, (_, i) => (
          <div key={`l${i}`} className="absolute left-0 text-xs font-bold bg-gray-800 border border-gray-600 rounded-r px-1"
            style={{ top: `${(i + 0.5) / cableCount * 100}%`, transform: 'translateY(-50%)' }}>
            {i + 1}
          </div>
        ))}
        {/* Right labels */}
        {Array.from({ length: cableCount }, (_, i) => (
          <div key={`r${i}`} className="absolute right-0 text-xs font-bold bg-gray-800 border border-gray-600 rounded-l px-1"
            style={{ top: `${(i + 0.5) / cableCount * 100}%`, transform: 'translateY(-50%)' }}>
            {LABELS[i]}
          </div>
        ))}
      </div>
      {/* Answer grid */}
      <div className="mt-4 grid gap-2 max-w-lg w-full" style={{ gridTemplateColumns: `repeat(${cableCount}, 1fr)` }}>
        {Array.from({ length: cableCount }, (_, src) => (
          <div key={src} className="text-center">
            <div className="text-sm font-bold mb-1">{src + 1} →</div>
            <select value={answers[src] ?? -1} onChange={(e) => handleAnswer(src, parseInt(e.target.value))}
              disabled={submitted}
              className="w-full bg-gray-800 border border-gray-600 rounded px-1 py-1 text-sm text-center">
              <option value={-1}>?</option>
              {Array.from({ length: cableCount }, (_, t) => (
                <option key={t} value={t}>{LABELS[t]}</option>
              ))}
            </select>
            {submitted && (
              <div className={`text-xs mt-1 ${answers[src] === mapping[src] ? 'text-green-400' : 'text-red-400'}`}>
                {answers[src] === mapping[src] ? '✓' : `→${LABELS[mapping[src]]}`}
              </div>
            )}
          </div>
        ))}
      </div>
      {!submitted && (
        <button onClick={handleSubmit}
          disabled={Object.keys(answers).length < cableCount || Object.values(answers).includes(-1)}
          className="mt-4 px-6 py-3 bg-purple-600 rounded-xl hover:bg-purple-500 transition disabled:opacity-40">
          回答する
        </button>
      )}
    </main>
  )
}
