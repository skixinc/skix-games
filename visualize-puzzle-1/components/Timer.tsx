'use client'
import { useEffect, useState } from 'react'

export default function Timer({ running, onTick }: { running: boolean; onTick?: (s: number) => void }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSeconds((s) => {
        const n = s + 1
        onTick?.(n)
        return n
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, onTick])
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return (
    <span className="font-mono text-lg">
      {m}:{s.toString().padStart(2, '0')}
    </span>
  )
}
