'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function SlideshowHero({ slides }: { slides: string[] }) {
  // Start empty so SSR and the hydration pass agree — populated after mount.
  const [order, setOrder] = useState<string[]>([])
  const [current, setCurrent] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    setOrder(shuffle(slides))
  }, [slides])

  useEffect(() => {
    if (order.length === 0) return
    const timer = setInterval(() => {
      const next = (current + 1) % order.length
      // Render overlay (old image) and base (new image) simultaneously,
      // then fade the overlay out after one frame so the transition is smooth.
      setPrev(current)
      setCurrent(next)
      setTimeout(() => setFading(true), 50)
      setTimeout(() => {
        setFading(false)
        setPrev(null)
      }, 850)
    }, 7000)
    return () => clearInterval(timer)
  }, [current, order.length])

  if (order.length === 0) return null

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base layer — incoming image, always at full opacity */}
      <Image
        src={order[current]}
        alt=""
        fill
        priority={current === 0}
        className="object-cover object-center"
        sizes="100vw"
      />
      {/* Overlay — outgoing image fades to transparent */}
      {prev !== null && (
        <Image
          src={order[prev]}
          alt=""
          fill
          className={`object-cover object-center transition-opacity duration-700 ease-in-out ${
            fading ? 'opacity-0' : 'opacity-100'
          }`}
          sizes="100vw"
        />
      )}
    </div>
  )
}
