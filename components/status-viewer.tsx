'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import { recordStatusView } from '@/lib/social/status-actions'

type Status = { id: string; username: string; displayName: string; url: string; caption: string | null; viewed: boolean }

export function StatusViewer({ statuses, start, onClose }: { statuses: Status[]; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(start)
  const [paused, setPaused] = useState(false)
  const touchStart = useRef<number | null>(null)
  const current = statuses[index]
  useEffect(() => {
    statuses.forEach((status) => {
      const image = new Image()
      image.decoding = 'async'
      image.src = status.url
    })
  }, [statuses])
  useEffect(() => { if (current) recordStatusView(current.id) }, [current])
  useEffect(() => { if (paused) return; const timer = setTimeout(() => index === statuses.length - 1 ? onClose() : setIndex((i) => i + 1), 5000); return () => clearTimeout(timer) }, [index, paused, statuses.length, onClose])
  if (!current) return null
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4" role="dialog" aria-label="Status viewer"><div className="relative flex h-full w-full max-w-lg flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card"><div className="absolute inset-x-4 top-4 z-10 flex gap-1">{statuses.map((_, i) => <span key={i} className="h-1 flex-1 rounded-full bg-muted"><span className={`block h-full rounded-full bg-primary ${i < index ? 'w-full' : i === index ? 'w-1/2' : 'w-0'}`} /></span>)}</div><div className="relative flex flex-1 items-center justify-center" onTouchStart={(event) => { touchStart.current = event.changedTouches[0]?.clientX ?? null }} onTouchEnd={(event) => { const start = touchStart.current; const end = event.changedTouches[0]?.clientX; touchStart.current = null; if (start === null || end === undefined || Math.abs(end - start) < 48) return; if (end < start && index < statuses.length - 1) setIndex((i) => i + 1); if (end > start && index > 0) setIndex((i) => i - 1) }}><img key={current.id} src={current.url} alt={`Status by ${current.displayName}`} loading="eager" decoding="async" fetchPriority="high" className="max-h-full max-w-full object-contain" /><button onClick={onClose} aria-label="Close status" className="absolute right-4 top-10 rounded-full bg-background/70 p-2"><X className="size-5" /></button><button onClick={() => setIndex((i) => Math.max(0, i - 1))} aria-label="Previous status" className="absolute left-2 rounded-full bg-background/70 p-2"><ChevronLeft className="size-5" /></button><button onClick={() => index === statuses.length - 1 ? onClose() : setIndex((i) => i + 1)} aria-label="Next status" className="absolute right-2 rounded-full bg-background/70 p-2"><ChevronRight className="size-5" /></button></div><div className="flex items-end justify-between gap-4 p-5"><div><p className="font-medium">{current.displayName}</p>{current.caption && <p className="mt-1 text-sm text-muted-foreground">{current.caption}</p>}</div><button onClick={() => setPaused((v) => !v)} aria-label={paused ? 'Resume status' : 'Pause status'} className="rounded-full bg-muted p-2">{paused ? <Play className="size-4" /> : <Pause className="size-4" />}</button></div></div></div>
}
