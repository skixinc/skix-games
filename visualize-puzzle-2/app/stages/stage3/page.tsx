'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import BackButton from '../../../components/BackButton'

const TOTAL_QUESTIONS = 6
const TIME_LIMIT = 25

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

interface Cell {
  shape: number  // 0=circle,1=rect,2=triangle,3=diamond,4=star
  colorIdx: number
  size: number
  rotation: number
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
const SHAPE_COUNT = 5
type PatternRule = 'color-progress' | 'shape-cycle' | 'size-progress' | 'rotation-cycle'

function applyRule(base: Cell, rule: PatternRule, step: number): Cell {
  const c = { ...base }
  if (rule === 'color-progress') c.colorIdx = (base.colorIdx + step) % COLORS.length
  else if (rule === 'shape-cycle') c.shape = (base.shape + step) % SHAPE_COUNT
  else if (rule === 'size-progress') c.size = Math.max(15, Math.min(62, base.size + step * 13))
  else c.rotation = (base.rotation + step * 45) % 360
  return c
}

function generateGrid(rand: () => number): Cell[][] {
  const rules: PatternRule[] = ['color-progress', 'shape-cycle', 'size-progress', 'rotation-cycle']
  const rowRule = rules[Math.floor(rand() * rules.length)]
  const remaining = rules.filter(r => r !== rowRule)
  const colRule = remaining[Math.floor(rand() * remaining.length)]
  const base: Cell = {
    shape: Math.floor(rand() * SHAPE_COUNT),
    colorIdx: Math.floor(rand() * COLORS.length),
    size: 22 + Math.floor(rand() * 20),
    rotation: Math.floor(rand() * 8) * 45,
  }
  return Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 3 }, (_, col) => applyRule(applyRule(base, rowRule, row), colRule, col))
  )
}

function mutateCell(cell: Cell, rand: () => number): Cell {
  const c = { ...cell }
  const m = Math.floor(rand() * 4)
  if (m === 0) c.colorIdx = (cell.colorIdx + 1 + Math.floor(rand() * (COLORS.length - 1))) % COLORS.length
  else if (m === 1) c.shape = (cell.shape + 1 + Math.floor(rand() * (SHAPE_COUNT - 1))) % SHAPE_COUNT
  else if (m === 2) c.size = Math.max(15, Math.min(62, cell.size + (rand() > 0.5 ? 16 : -16)))
  else c.rotation = (cell.rotation + 45 + Math.floor(rand() * 7) * 45) % 360
  return c
}

function CellSVG({ cell, size }: { cell: Cell; size: number }) {
  const fill = COLORS[cell.colorIdx % COLORS.length]
  const r = cell.size / 2
  const t = `translate(50,50) rotate(${cell.rotation})`
  const sharedProps = { viewBox: '0 0 100 100', width: size, height: size, className: 'bg-gray-800 rounded-lg' }
  if (cell.shape === 0) return <svg {...sharedProps}><circle cx={0} cy={0} r={r} fill={fill} transform={t} /></svg>
  if (cell.shape === 1) return <svg {...sharedProps}><rect x={-r} y={-r} width={cell.size} height={cell.size} fill={fill} transform={t} /></svg>
  if (cell.shape === 2) return <svg {...sharedProps}><polygon points={`0,${-r} ${r},${r} ${-r},${r}`} fill={fill} transform={t} /></svg>
  if (cell.shape === 3) return <svg {...sharedProps}><polygon points={`0,${-r} ${r},0 0,${r} ${-r},0`} fill={fill} transform={t} /></svg>
  const pts = Array.from({ length: 5 }, (_, i) => {
    const ao = (i * 72 - 90) * (Math.PI / 180)
    const ai = ((i * 72 + 36) - 90) * (Math.PI / 180)
    return `${r * Math.cos(ao)},${r * Math.sin(ao)} ${r * 0.4 * Math.cos(ai)},${r * 0.4 * Math.sin(ai)}`
  }).join(' ')
  return <svg {...sharedProps}><polygon points={pts} fill={fill} transform={t} /></svg>
}

export default function Stage3() {
  const [question, setQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [gameOver, setGameOver] = useState(false)

  const puzzle = useMemo(() => {
    const rand = seededRandom(question * 7919 + 53)
    const grid = generateGrid(rand)
    const answer = grid[2][2]
    const correctIdx = Math.floor(rand() * 4)
    const choices = Array.from({ length: 4 }, (_, i) =>
      i === correctIdx ? answer : mutateCell(answer, rand)
    )
    return { grid, choices, correctIdx }
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
        <h1 className="text-3xl font-bold mb-4">Stage 3 クリア！</h1>
        <p className="text-xl mb-2">スコア: {score} / {TOTAL_QUESTIONS}</p>
        <p className="text-gray-400 mb-6">{score >= 5 ? '素晴らしい！' : score >= 3 ? 'よくできました！' : 'もう一度挑戦しよう！'}</p>
        <button onClick={restart} className="px-6 py-3 bg-amber-600 rounded-xl hover:bg-amber-500 transition">もう一度</button>
      </main>
    )
  }

  const cellSize = 80

  return (
    <main className="min-h-screen p-4 flex flex-col items-center">
      <BackButton />
      <h1 className="text-2xl font-bold mb-1">Stage 3: パターン完成</h1>
      <p className="text-sm text-gray-400 mb-1">Pattern Completion</p>
      <div className="flex gap-4 mb-4 text-sm text-gray-400">
        <span>問 {question + 1}/{TOTAL_QUESTIONS}</span>
        <span>正解 {score}</span>
        <span className={timeLeft <= 5 ? 'text-red-400 font-bold' : ''}>残り {timeLeft}秒</span>
      </div>

      <p className="text-sm text-gray-300 mb-3">パターンに従って「?」に入るものを選んでください</p>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {puzzle.grid.map((row, ri) =>
          row.map((cell, ci) => {
            const isLast = ri === 2 && ci === 2
            return (
              <div key={`${ri}-${ci}`} className={`rounded-lg border-2 ${isLast ? 'border-amber-400' : 'border-gray-700'}`}>
                {isLast ? (
                  <div
                    className="bg-gray-800 rounded-lg flex items-center justify-center font-bold text-amber-400 text-2xl"
                    style={{ width: cellSize, height: cellSize }}
                  >
                    ?
                  </div>
                ) : (
                  <CellSVG cell={cell} size={cellSize} />
                )}
              </div>
            )
          })
        )}
      </div>

      {feedback && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm font-bold ${feedback === 'correct' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
          {feedback === 'correct' ? '正解！' : '不正解...'}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {puzzle.choices.map((cell, i) => {
          const isSelected = selected === i
          const isCorrect = feedback !== null && i === puzzle.correctIdx
          const isWrong = feedback === 'wrong' && isSelected
          const border = isCorrect
            ? 'border-green-400 bg-green-900/30'
            : isWrong
            ? 'border-red-400 bg-red-900/30'
            : isSelected
            ? 'border-amber-400'
            : 'border-gray-700 hover:border-gray-500'
          return (
            <button key={i} onClick={() => handleClick(i)} className={`rounded-xl border-2 transition p-1 flex flex-col items-center gap-1 ${border}`} aria-label={`選択肢 ${i + 1}`}>
              <CellSVG cell={cell} size={70} />
              <span className="text-xs text-gray-400">{i + 1}</span>
            </button>
          )
        })}
      </div>
    </main>
  )
}
