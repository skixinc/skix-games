'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface FallingExpression {
  id: number
  expression: string
  answer: number
  x: number
  y: number
  speed: number
}

type GameState = 'title' | 'playing' | 'gameover'

function generateExpression(maxNum: number): { expression: string; answer: number } {
  const ops = ['+', '-', '×', '÷'] as const
  const op = ops[Math.floor(Math.random() * ops.length)]

  let a: number, b: number, answer: number, expression: string

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * maxNum) + 1
      b = Math.floor(Math.random() * (maxNum - a)) + 1
      answer = a + b
      expression = `${a} + ${b}`
      break
    case '-':
      a = Math.floor(Math.random() * maxNum) + 1
      b = Math.floor(Math.random() * a) + 1
      answer = a - b
      expression = `${a} - ${b}`
      break
    case '×':
      a = Math.floor(Math.random() * 12) + 1
      b = Math.floor(Math.random() * 12) + 1
      answer = a * b
      expression = `${a} × ${b}`
      break
    case '÷':
      b = Math.floor(Math.random() * 12) + 1
      answer = Math.floor(Math.random() * 12) + 1
      a = b * answer
      expression = `${a} ÷ ${b}`
      break
    default:
      a = 1; b = 1; answer = 2; expression = '1 + 1'
  }

  return { expression, answer }
}

export default function MathRainGame() {
  const [gameState, setGameState] = useState<GameState>('title')
  const [expressions, setExpressions] = useState<FallingExpression[]>([])
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(5)
  const [input, setInput] = useState('')
  const [combo, setCombo] = useState(0)
  const [flash, setFlash] = useState<{ id: number; x: number; y: number } | null>(null)

  const nextId = useRef(0)
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const frameRef = useRef<number>(0)
  const lastSpawn = useRef(0)
  const expressionsRef = useRef(expressions)
  const livesRef = useRef(lives)
  const scoreRef = useRef(score)
  const levelRef = useRef(level)

  expressionsRef.current = expressions
  livesRef.current = lives
  scoreRef.current = score
  levelRef.current = level

  const spawnInterval = useCallback(() => Math.max(1200 - levelRef.current * 100, 400), [])
  const fallSpeed = useCallback(() => 0.3 + levelRef.current * 0.08, [])

  const startGame = () => {
    setGameState('playing')
    setExpressions([])
    setScore(0)
    setLevel(1)
    setLives(5)
    setInput('')
    setCombo(0)
    nextId.current = 0
    lastSpawn.current = 0
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  useEffect(() => {
    if (gameState !== 'playing') return

    const loop = (time: number) => {
      if (!lastSpawn.current) lastSpawn.current = time

      // Spawn new expressions
      if (time - lastSpawn.current > spawnInterval()) {
        lastSpawn.current = time
        const { expression, answer } = generateExpression(100)
        const maxX = (gameAreaRef.current?.clientWidth || 400) - 160
        const x = Math.random() * Math.max(maxX, 100) + 10
        setExpressions(prev => [
          ...prev,
          { id: nextId.current++, expression, answer, x, y: 0, speed: fallSpeed() }
        ])
      }

      // Move expressions down
      setExpressions(prev => {
        const gameHeight = gameAreaRef.current?.clientHeight || 600
        const fallen: number[] = []
        const updated = prev.map(e => ({ ...e, y: e.y + e.speed })).filter(e => {
          if (e.y > gameHeight - 60) {
            fallen.push(e.id)
            return false
          }
          return true
        })

        if (fallen.length > 0) {
          setLives(l => {
            const newLives = l - fallen.length
            if (newLives <= 0) {
              setGameState('gameover')
            }
            return Math.max(newLives, 0)
          })
          setCombo(0)
        }

        return updated
      })

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [gameState, spawnInterval, fallSpeed])

  // Level up
  useEffect(() => {
    const newLevel = Math.floor(score / 50) + 1
    if (newLevel !== level && newLevel <= 20) {
      setLevel(newLevel)
    }
  }, [score, level])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(input)
    if (isNaN(num)) { setInput(''); return }

    const idx = expressions.findIndex(ex => ex.answer === num)
    if (idx !== -1) {
      const matched = expressions[idx]
      setFlash({ id: matched.id, x: matched.x, y: matched.y })
      setTimeout(() => setFlash(null), 400)
      setExpressions(prev => prev.filter(e => e.id !== matched.id))
      const newCombo = combo + 1
      setCombo(newCombo)
      const comboBonus = Math.min(newCombo, 5)
      setScore(s => s + 10 * comboBonus)
    } else {
      setCombo(0)
    }
    setInput('')
  }

  // Title screen
  if (gameState === 'title') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
        <div className="text-center">
          <div className="text-6xl md:text-8xl mb-2" aria-hidden="true">🌧️</div>
          <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg">Math Rain</h1>
          <p className="text-xl md:text-2xl text-white/80 mt-2">計算の雨</p>
        </div>
        <div className="bg-white/30 backdrop-blur rounded-xl p-6 max-w-md text-center text-white">
          <p className="mb-2">☁️ 雲から計算式が降ってきます</p>
          <p className="mb-2">⌨️ 答えを入力して消しましょう</p>
          <p className="mb-2">⚡ レベルが上がると速くなります</p>
          <p>❤️ 地面に落ちるとライフが減ります</p>
        </div>
        <button
          onClick={startGame}
          className="px-10 py-4 bg-white text-sky-600 font-bold text-2xl rounded-full shadow-lg hover:scale-105 transition-transform active:scale-95"
        >
          スタート
        </button>
      </div>
    )
  }

  // Game over
  if (gameState === 'gameover') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
        <h1 className="text-4xl md:text-6xl font-bold text-red-500 drop-shadow-lg">ゲームオーバー</h1>
        <div className="bg-white/30 backdrop-blur rounded-xl p-8 text-center">
          <p className="text-3xl text-white font-bold mb-2">スコア: {score}</p>
          <p className="text-xl text-white/80">レベル: {level}</p>
        </div>
        <button
          onClick={startGame}
          className="px-10 py-4 bg-white text-sky-600 font-bold text-2xl rounded-full shadow-lg hover:scale-105 transition-transform active:scale-95"
        >
          もう一回
        </button>
      </div>
    )
  }

  // Playing
  return (
    <div className="relative w-full h-screen select-none overflow-hidden">
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-4 py-2 bg-black/20 backdrop-blur-sm">
        <div className="flex gap-4 text-white font-bold text-sm md:text-lg">
          <span>⭐ {score}</span>
          <span>📊 Lv.{level}</span>
          {combo > 1 && <span className="text-yellow-300 animate-pulse">🔥 x{combo}</span>}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`text-lg md:text-2xl ${i < lives ? '' : 'opacity-30'}`}>
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* Clouds */}
      <div className="absolute top-8 left-0 right-0 flex justify-around z-10 pointer-events-none">
        {['☁️', '⛅', '☁️', '🌥️', '☁️'].map((c, i) => (
          <span key={i} className="text-4xl md:text-6xl opacity-80" style={{ animationDelay: `${i * 0.5}s` }}>
            {c}
          </span>
        ))}
      </div>

      {/* Game area */}
      <div ref={gameAreaRef} className="absolute inset-0 pt-16">
        {expressions.map(expr => (
          <div
            key={expr.id}
            className="absolute bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 md:px-4 md:py-2 shadow-lg border-2 border-sky-300 text-sky-800 font-bold text-sm md:text-xl whitespace-nowrap transition-none"
            style={{
              left: expr.x,
              top: expr.y,
              transform: 'translateX(-50%)',
            }}
          >
            {expr.expression} = ?
          </div>
        ))}

        {/* Flash effect */}
        {flash && (
          <div
            className="absolute text-3xl animate-ping pointer-events-none"
            style={{ left: flash.x, top: flash.y }}
          >
            ✨
          </div>
        )}
      </div>

      {/* Ground */}
      <div className="absolute bottom-12 left-0 right-0 h-2 bg-green-600/50" />

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="absolute bottom-0 left-0 right-0 z-20 flex gap-2 p-2 md:p-3 bg-black/30 backdrop-blur-sm"
      >
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="答えを入力..."
          aria-label="計算の答えを入力"
          className="flex-1 px-4 py-3 rounded-xl text-lg md:text-xl font-bold text-center bg-white/90 outline-none focus:ring-2 focus:ring-sky-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          autoFocus
        />
        <button
          type="submit"
          aria-label="答えを送信"
          className="px-6 py-3 bg-sky-500 text-white font-bold text-lg rounded-xl hover:bg-sky-600 active:scale-95 transition-transform"
        >
          ✓
        </button>
      </form>
    </div>
  )
}
