'use client'

import { useState, useTransition } from 'react'
import { Search, ArrowLeft, UserRound } from 'lucide-react'
import { searchProfiles } from '@/lib/social/account-actions'
import { toggleFollow } from '@/lib/social/actions'

export function SearchClient() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  function submit(event: React.FormEvent) { event.preventDefault(); startTransition(async () => { const result = await searchProfiles(query); setResults(result.profiles ?? []); setMessage(result.error ?? '') }) }
  return <main className="min-h-screen bg-background px-4 pb-24 text-foreground md:px-8"><div className="mx-auto flex max-w-2xl flex-col gap-6 py-6"><a href="/app" className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Back to feed</a><div><p className="text-sm text-muted-foreground">Find your people</p><h1 className="font-serif text-4xl">Discover</h1></div><form onSubmit={submit} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"><Search className="size-5 text-muted-foreground" /><input aria-label="Search people" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or username" className="min-w-0 flex-1 bg-transparent outline-none" /><button disabled={pending} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{pending ? 'Searching…' : 'Search'}</button></form>{message && <p role="alert" className="text-sm text-destructive">{message}</p>}<section className="flex flex-col gap-3" aria-live="polite">{!pending && query && !results.length && !message ? <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">No people found.</div> : results.map(profile => <article key={profile.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4"><a href={`/app/profile/${profile.username}`} className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-muted font-serif text-xl"><UserRound className="size-5" /></span><span className="min-w-0"><strong className="block truncate">{profile.display_name}</strong><span className="block truncate text-sm text-muted-foreground">@{profile.username}</span></span></a><button onClick={() => startTransition(async () => { await toggleFollow(profile.id, false) })} className="min-h-10 rounded-full border border-border px-4 text-sm">Follow</button></article>)}</section></div></main>
}
