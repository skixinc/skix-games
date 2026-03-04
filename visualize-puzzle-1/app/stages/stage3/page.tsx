'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import BackButton from '../../../components/BackButton'

const TOTAL_QUESTIONS = 5
const SYMBOLS = ['⭐', '🔶', '🔵', '🟢', '🔺', '💜', '🟥', '⬛']
const TIME_LIMIT = 20

function seededRandom(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

function generateGrid(rand: () => number, size: number) {
  // Pick symbols for rows and columns
  const pool = [...SYMBOLS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const rowSymbols = pool.slice(0, size)
  const colSymbols = pool.slice(size, size * 2)

  // Build correct grid: each cell has [rowSymbol, colSymbol]
  const grid: [string, string][] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      grid.push([rowSymbols[r], colSymbols[c]])
    }
  }

  // Pick one cell to be wrong
  const wrongIdx = Math.floor(rand() * (size * size))
  const wrongR = Math.floor(wrongIdx / size)
  const wrongC = wrongIdx % size

  // Replace one symbol in the wrong cell with a different one
  if (rand() > 0.5) {
    // Wrong row symbol
    let newSym = rowSymbols[Math.floor(rand() * size)]
    while (newSym === rowSymbols[wrongR]) newSym = rowSymbols[Math.floor(rand() * size)]
    grid[wrongIdx] = [newSym, colSymbols[wrongC]]
  } else {
    // Wrong col symbol
    let newSym = colSymbols[Math.floor(rand() * size)]
    while (newSym === colSymbols[wrongC]) newSym = colSymbols[Math.floor(rand() * size)]
    grid[wrongIdx] = [rowSymbols[wrongR], newSym]
  }

  return { grid, rowSymbols, colSymbols, size, wrongIdx }
}

export default function Stage3() {
  const [question, setQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)

  const gridSize = 4 + Math.floor(question / 2)
  const data = useMemo(() => {
    const rand = seededRandom(question * 999 + 7)
    return generateGrid(rand, Math.min(gridSize, 6))
  }, [question, gridSize])

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

  // Timer — mirrors the correct pattern from Stage 1
  useEffect(() => {
    if (gameOver || feedback) return
    if (timeLeft <= 0) {
      setFeedback('wrong')
      setTimeout(() => advance(false), 1000)
      return
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, gameOver, feedback, advance])

  const handleClick = (idx: number) => {
    if (feedback || gameOver) return
    setSelected(idx)
    const correct = idx === data.wrongIdx
    setFeedback(correct ? 'correct' : 'wrong')
    setTimeout(() => advance(correct), 1200)
  }

  if (gameOver) {
    return (
      <main className="min-h-screen p-4 flex flex-col items-center justify-center">
        <BackButton />
        <h1 className="text-3xl font-bold mb-4">🎉 Stage 3 クリア！</h1>
        <p className="text-xl mb-2">スコア: {score} / {TOTAL_QUESTIONS}</p>
        <button onClick={() => { setQuestion(0); setScore(0); setGameOver(false); setSelected(null); setFeedback(null); setTimeLeft(TIME_LIMIT) }}
          className="mt-4 px-6 py-3 bg-amber-600 rounded-xl hover:bg-amber-500 transition">もう一度</button>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 flex flex-col items-center">
      <BackButton />
      <h1 className="text-2xl font-bold mb-1">Stage 3: 仲間はずれ探し</h1>
      <div className="flex gap-4 mb-2 text-sm text-gray-400">
        <span>問 {question + 1}/{TOTAL_QUESTIONS}</span>
        <span>正解 {score}</span>
        <span className={timeLeft <= 5 ? 'text-red-400' : ''}>残り {timeLeft}秒</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">各セルは「行の見出し＋列の見出し」。ルール違反のセルをクリック！</p>
      {/* Column headers */}
      <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `2rem repeat(${data.size}, 1fr)`, maxWidth: `${data.size * 56 + 32}px` }}>
        <div />
        {data.colSymbols.map((s, i) => (
          <div key={i} className="text-center text-xl">{s}</div>
        ))}
      </div>
      {/* Grid with row headers */}
      {Array.from({ length: data.size }, (_, r) => (
        <div key={r} className="grid gap-1 mb-1" style={{ gridTemplateColumns: `2rem repeat(${data.size}, 1fr)`, maxWidth: `${data.size * 56 + 32}px` }}>
          <div className="text-xl flex items-center justify-center">{data.rowSymbols[r]}</div>
          {Array.from({ length: data.size }, (_, c) => {
            const idx = r * data.size + c
            const cell = data.grid[idx]
            const isSelected = selected === idx
            const isWrong = feedback && idx === data.wrongIdx
            return (
              <button key={c} onClick={() => handleClick(idx)}
                aria-label={`行${r + 1}列${c + 1}: ${cell[0]}${cell[1]}`}
                aria-pressed={isSelected}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-lg border-2 flex items-center justify-center text-lg transition ${
                  isWrong ? 'border-green-400 bg-green-900/40' :
                  isSelected && feedback === 'wrong' ? 'border-red-400 bg-red-900/40' :
                  'border-gray-700 bg-gray-800 hover:border-gray-500'
                }`}>
                {cell[0]}{cell[1]}
              </button>
            )
          })}
        </div>
      ))}
    </main>
  )
}
