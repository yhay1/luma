'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera, MoreVertical, Plus, Search } from 'lucide-react'
import { StatusViewer } from './status-viewer'

type Status = { id: string; username: string; displayName: string; url: string; caption: string | null; viewed: boolean }
type Profile = { username?: string | null; display_name?: string | null; avatar_path?: string | null }

export function StatusRail({ statuses, currentUserId: _currentUserId, profile }: { statuses: Status[]; currentUserId: string; profile?: Profile | null }) {
  const [viewer, setViewer] = useState<number | null>(null)
  const [caption, setCaption] = useState('')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const grouped = statuses.reduce<Record<string, Status[]>>((acc, status) => ((acc[status.username] ??= []).push(status), acc), {})
  const groups = Object.values(grouped)
  const me = profile?.display_name || profile?.username || 'My status'
  const initials = me.charAt(0).toUpperCase()
  function upload(file: File) {
    const data = new FormData(); data.append('image', file); data.append('caption', caption)
    startTransition(async () => { const response = await fetch('/api/statuses', { method: 'POST', body: data }); const result = await response.json(); setMessage(result.error ?? 'Status shared.'); if (response.ok) { setCaption(''); window.location.reload() } })
  }
  return <section aria-label="Updates" className="overflow-hidden rounded-[2rem] bg-[#091014] px-4 py-5 text-[#f4f7f8] shadow-sm sm:px-6"><header className="flex items-center justify-between"><h2 className="text-[2rem] font-medium tracking-tight">Updates</h2><nav aria-label="Updates actions" className="flex items-center gap-5"><button type="button" aria-label="Take a status photo" className="hover:text-[#20c776]"><Camera className="size-7" /></button><button type="button" aria-label="Search updates" className="hover:text-[#20c776]"><Search className="size-7" /></button><button type="button" aria-label="More update options" className="hover:text-[#20c776]"><MoreVertical className="size-7" /></button></nav></header><h3 className="mt-8 text-xl font-semibold">Status</h3><div className="mt-5 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]"> <div className="relative min-w-[9.5rem] overflow-hidden rounded-[1.45rem] bg-[#26343a] shadow-lg"><button type="button" onClick={() => inputRef.current?.click()} className="relative flex h-[16.5rem] w-full flex-col justify-end text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20c776]"><div className="absolute inset-0 grid place-items-center bg-[#24343a]"><span className="grid size-20 place-items-center rounded-full border-4 border-[#20c776] bg-[#132126] text-4xl font-semibold">{initials}</span></div><span className="absolute left-1/2 top-[6.8rem] grid size-10 -translate-x-1/2 place-items-center rounded-full border-4 border-[#091014] bg-[#f4f7f8] text-[#091014]"><Plus className="size-6" /></span><span className="relative z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-4 pb-4 pt-12 text-sm font-semibold">My status</span></button><input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.currentTarget.files?.[0]; if (file) upload(file) }} /></div>{groups.map((group, i) => <button type="button" key={group[0].username} onClick={() => setViewer(i)} className="relative min-w-[9.5rem] overflow-hidden rounded-[1.45rem] bg-[#162228] text-left shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20c776]"><div className="flex h-[16.5rem] flex-col justify-between"><div className="p-3"><span className={`grid size-16 place-items-center rounded-full border-4 p-1 ${group.some((s) => !s.viewed) ? 'border-[#20c776]' : 'border-[#829096]'}`}><span className="grid size-full place-items-center rounded-full bg-[#21404a] text-2xl font-semibold">{group[0].displayName.charAt(0).toUpperCase()}</span></span></div><div className="bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-4 pt-14"><p className="truncate text-sm font-semibold">{group[0].displayName}</p>{group[0].caption && <p className="mt-1 truncate text-xs text-white/75">{group[0].caption}</p>}</div></div></button>)} </div>{message && <p className="mt-2 text-xs text-white/70" role="status">{pending ? 'Sharing status…' : message}</p>}<label className="sr-only" htmlFor="status-caption">Status caption</label><input id="status-caption" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={280} placeholder="Add a caption before sharing" className="sr-only" />{viewer !== null && <StatusViewer statuses={groups[viewer]} start={0} onClose={() => setViewer(null)} />}</section>
}

