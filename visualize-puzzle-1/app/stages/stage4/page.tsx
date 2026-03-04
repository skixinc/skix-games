'use client'
import { useState, useMemo, useCallback } from 'react'
import BackButton from '../../../components/BackButton'

const TOTAL_QUESTIONS = 3

function seededRandom(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

type Cell = { wall: boolean; blue: boolean; red: boolean }

function generateMaze(rand: () => number, w: number, h: number) {
  // Simple maze with random walls
  const grid: Cell[][] = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({ wall: false, blue: false, red: false }))
  )

  // Add random walls (~30%)
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if ((r === 0 && c === 0) || (r === h - 1 && c === w - 1)) continue
      if (rand() < 0.3) grid[r][c].wall = true
    }
  }

  // Ensure path exists using BFS, remove walls if needed
  const ensurePath = (sr: number, sc: number, er: number, ec: number) => {
    const visited = new Set<string>()
    const queue: [number, number, [number, number][]][] = [[sr, sc, [[sr, sc]]]]
    visited.add(`${sr},${sc}`)
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
    while (queue.length > 0) {
      const [r, c, path] = queue.shift()!
      if (r === er && c === ec) return path
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= h || nc < 0 || nc >= w) continue
        if (visited.has(`${nr},${nc}`)) continue
        if (grid[nr][nc].wall) continue
        visited.add(`${nr},${nc}`)
        queue.push([nr, nc, [...path, [nr, nc]]])
      }
    }
    // No path: clear some walls along a simple route
    let cr = sr, cc = sc
    const forcedPath: [number, number][] = [[cr, cc]]
    while (cr !== er || cc !== ec) {
      if (cr < er) cr++
      else if (cr > er) cr--
      else if (cc < ec) cc++
      else cc--
      grid[cr][cc].wall = false
      forcedPath.push([cr, cc])
    }
    return forcedPath
  }

  const path1 = ensurePath(0, 0, h - 1, w - 1)

  // Place blue dots on some path1 cells, red dots elsewhere
  const path1Set = new Set(path1.map(([r, c]) => `${r},${c}`))
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (grid[r][c].wall) continue
      if ((r === 0 && c === 0) || (r === h - 1 && c === w - 1)) continue
      if (path1Set.has(`${r},${c}`) && rand() < 0.3) {
        grid[r][c].blue = true
      } else if (!path1Set.has(`${r},${c}`) && rand() < 0.25) {
        grid[r][c].red = true
      }
    }
  }

  // Ensure return path exists (avoiding blue dots)
  const path2 = ensurePathAvoiding(grid, h - 1, w - 1, 0, 0, 'blue', h, w)

  // Place red dots on some return path cells
  const path2Set = new Set(path2.map(([r, c]) => `${r},${c}`))
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (grid[r][c].wall || grid[r][c].blue) continue
      if ((r === 0 && c === 0) || (r === h - 1 && c === w - 1)) continue
      if (path2Set.has(`${r},${c}`) && !grid[r][c].red && rand() < 0.3) {
        grid[r][c].red = true
      }
    }
  }

  return grid
}

function ensurePathAvoiding(grid: Cell[][], sr: number, sc: number, er: number, ec: number, avoid: 'blue' | 'red', h: number, w: number): [number, number][] {
  const visited = new Set<string>()
  const queue: [number, number, [number, number][]][] = [[sr, sc, [[sr, sc]]]]
  visited.add(`${sr},${sc}`)
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  while (queue.length > 0) {
    const [r, c, path] = queue.shift()!
    if (r === er && c === ec) return path
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc
      if (nr < 0 || nr >= h || nc < 0 || nc >= w) continue
      if (visited.has(`${nr},${nc}`)) continue
      if (grid[nr][nc].wall || grid[nr][nc][avoid]) continue
      visited.add(`${nr},${nc}`)
      queue.push([nr, nc, [...path, [nr, nc]]])
    }
  }
  // Fallback: remove blocking dots
  let cr = sr, cc = sc
  const fp: [number, number][] = [[cr, cc]]
  while (cr !== er || cc !== ec) {
    if (cr > er) cr--; else if (cr < er) cr++
    else if (cc > ec) cc--; else cc++
    grid[cr][cc].wall = false
    grid[cr][cc][avoid] = false
    fp.push([cr, cc])
  }
  return fp
}

export default function Stage4() {
  const [question, setQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [phase, setPhase] = useState<'forward' | 'backward' | 'done'>('forward')
  const [path, setPath] = useState<Set<string>>(new Set(['0,0']))
  const [complete, setComplete] = useState(false)

  const mazeSize = 6 + question
  const grid = useMemo(() => {
    const rand = seededRandom(question * 555 + 31)
    return generateMaze(rand, mazeSize, mazeSize)
  }, [question, mazeSize])

  const isAdjacent = (a: string, b: string) => {
    const [ar, ac] = a.split(',').map(Number)
    const [br, bc] = b.split(',').map(Number)
    return Math.abs(ar - br) + Math.abs(ac - bc) === 1
  }

  const handleCellClick = (r: number, c: number) => {
    if (complete || gameOver) return
    const key = `${r},${c}`
    const cell = grid[r][c]
    if (cell.wall) return

    // Check dot restrictions
    if (phase === 'forward' && cell.red) return
    if (phase === 'backward' && cell.blue) return

    const pathArr = Array.from(path)
    const last = pathArr[pathArr.length - 1]

    if (path.has(key)) {
      // Allow undo: if clicking second-to-last, remove last
      if (pathArr.length >= 2 && key === pathArr[pathArr.length - 2]) {
        const np = new Set(path)
        np.delete(last)
        setPath(np)
      }
      return
    }

    if (!isAdjacent(last, key)) return

    const np = new Set(path)
    np.add(key)
    setPath(np)

    // Check completion
    if (phase === 'forward' && r === mazeSize - 1 && c === mazeSize - 1) {
      setPhase('backward')
      setPath(new Set([`${mazeSize - 1},${mazeSize - 1}`]))
    } else if (phase === 'backward' && r === 0 && c === 0) {
      setComplete(true)
      setScore((s) => s + 1)
    }
  }

  const advance = () => {
    if (question + 1 >= TOTAL_QUESTIONS) {
      setGameOver(true)
    } else {
      setQuestion((q) => q + 1)
      setPhase('forward')
      setPath(new Set(['0,0']))
      setComplete(false)
    }
  }

  if (gameOver) {
    return (
      <main className="min-h-screen p-4 flex flex-col items-center justify-center">
        <BackButton />
        <h1 className="text-3xl font-bold mb-4">🎉 Stage 4 クリア！</h1>
        <p className="text-xl mb-2">スコア: {score} / {TOTAL_QUESTIONS}</p>
        <button onClick={() => { setQuestion(0); setScore(0); setGameOver(false); setPhase('forward'); setPath(new Set(['0,0'])); setComplete(false) }}
          className="mt-4 px-6 py-3 bg-green-600 rounded-xl hover:bg-green-500 transition">もう一度</button>
      </main>
    )
  }

  const cellSize = Math.min(40, Math.floor(320 / mazeSize))

  return (
    <main className="min-h-screen p-4 flex flex-col items-center">
      <BackButton />
      <h1 className="text-2xl font-bold mb-1">Stage 4: 行って戻って</h1>
      <div className="flex gap-4 mb-2 text-sm text-gray-400">
        <span>問 {question + 1}/{TOTAL_QUESTIONS}</span>
        <span>正解 {score}</span>
      </div>
      <div className={`mb-2 text-sm font-bold ${phase === 'forward' ? 'text-blue-400' : 'text-red-400'}`}>
        {phase === 'forward' ? '🔵 往路: 入口→出口（青ドットOK/赤ドットNG）' : phase === 'backward' ? '🔴 復路: 出口→入口（赤ドットOK/青ドットNG）' : ''}
      </div>
      {complete && (
        <div className="mb-2">
          <span className="text-green-400 font-bold">✓ 完了！</span>
          <button onClick={advance} className="ml-4 px-4 py-2 bg-green-600 rounded-lg text-sm">次へ</button>
        </div>
      )}
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${mazeSize}, ${cellSize}px)` }}>
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`
            const inPath = path.has(key)
            const isStart = r === 0 && c === 0
            const isEnd = r === mazeSize - 1 && c === mazeSize - 1
            return (
              <button key={key} onClick={() => handleCellClick(r, c)}
                aria-label={`行${r + 1}列${c + 1}${cell.wall ? ' 壁' : isStart ? ' スタート' : isEnd ? ' ゴール' : cell.blue ? ' 青ドット' : cell.red ? ' 赤ドット' : ''}`}
                aria-disabled={cell.wall || (phase === 'forward' && cell.red) || (phase === 'backward' && cell.blue)}
                style={{ width: cellSize, height: cellSize }}
                className={`text-xs flex items-center justify-center rounded-sm transition-all ${
                  cell.wall ? 'bg-gray-800' :
                  inPath ? (phase === 'forward' ? 'bg-blue-600/60 border border-blue-400' : 'bg-red-600/60 border border-red-400') :
                  'bg-gray-700 hover:bg-gray-600 border border-gray-600'
                } ${isStart ? 'ring-2 ring-yellow-400' : ''} ${isEnd ? 'ring-2 ring-yellow-400' : ''}`}>
                {cell.wall ? '' : isStart ? '🏠' : isEnd ? '🏁' : cell.blue ? '🔵' : cell.red ? '🔴' : ''}
              </button>
            )
          })
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={() => { setPath(new Set([phase === 'forward' ? '0,0' : `${mazeSize-1},${mazeSize-1}`])) }}
          className="px-4 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600">リセット</button>
        {phase === 'forward' && (
          <button onClick={() => { setPhase('forward'); setPath(new Set(['0,0'])); setComplete(false) }}
            className="px-4 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600">最初から</button>
        )}
      </div>
    </main>
  )
}
