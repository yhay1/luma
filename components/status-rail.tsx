'use client'

import { useState, useTransition } from 'react'
import { Plus, Upload } from 'lucide-react'
import { StatusViewer } from './status-viewer'

type Status = { id: string; username: string; displayName: string; url: string; caption: string | null; viewed: boolean }

export function StatusRail({ statuses, currentUserId }: { statuses: Status[]; currentUserId: string }) {
  const [viewer, setViewer] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  async function upload(file: File) {
    const data = new FormData(); data.append('image', file)
    startTransition(async () => { const response = await fetch('/api/statuses', { method: 'POST', body: data }); const result = await response.json(); setMessage(result.error ?? 'Status shared.'); if (response.ok) window.location.reload() })
  }
  const grouped = statuses.reduce<Record<string, Status[]>>((acc, status) => ((acc[status.username] ??= []).push(status), acc), {})
  const groups = Object.values(grouped)
  return <section aria-label="Statuses" className="flex flex-col gap-3"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Today</p><h2 className="font-serif text-2xl">Statuses</h2></div><label className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-2 text-sm hover:bg-muted"><Upload className="size-4" />Share image<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { if (e.currentTarget.files?.[0]) upload(e.currentTarget.files[0]) }} /><form className="hidden"><input name="image" type="file" /></form></label></div>{message && <p className="text-sm text-muted-foreground" role="status">{pending ? 'Uploading…' : message}</p>}<div className="flex gap-3 overflow-x-auto pb-1">{groups.map((group, i) => <button key={group[0].username} onClick={() => setViewer(i)} className="flex min-w-16 flex-col items-center gap-1"><span className={`grid size-14 place-items-center rounded-full border-2 p-0.5 ${group.some((s) => !s.viewed) ? 'border-primary' : 'border-muted'}`}><span className="grid size-full place-items-center rounded-full bg-muted font-serif text-xl">{group[0].displayName.charAt(0)}</span></span><span className="max-w-16 truncate text-xs">{group[0].username}</span></button>)}{groups.length === 0 && <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="grid size-14 place-items-center rounded-full border border-dashed border-border"><Plus className="size-5" /></span>Be the first to share</div>}</div>{viewer !== null && <StatusViewer statuses={groups[viewer]} start={0} onClose={() => setViewer(null)} />}</section>
}
