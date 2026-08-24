'use client'

import { useEffect, useState, useTransition } from 'react'
import { ArrowLeft, Search, UserRound } from 'lucide-react'
import { searchProfiles, searchPosts } from '@/lib/social/account-actions'
import { Avatar } from '@/components/avatar'
import { toggleFollow } from '@/lib/social/actions'

export function SearchClient() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'people' | 'posts'>('people')
  const [results, setResults] = useState<any[]>([])
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  useEffect(() => {
    const value = query.trim()
    if (!value) { setResults([]); return }
    const timer = window.setTimeout(() => startTransition(async () => { const result: any = tab === 'people' ? await searchProfiles(value) : await searchPosts(value); setResults(tab === 'people' ? result.profiles ?? [] : result.posts ?? []); setMessage(result.error ?? '') }), 300)
    return () => window.clearTimeout(timer)
  }, [query, tab])
  return <main className="min-h-screen bg-background px-4 pb-24 text-foreground md:px-8"><div className="mx-auto flex max-w-2xl flex-col gap-6 py-6"><a href="/app" className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Back to feed</a><div><p className="text-sm text-muted-foreground">Find your people and ideas</p><h1 className="font-serif text-4xl">Discover</h1></div><label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"><Search className="size-5 text-muted-foreground" /><span className="sr-only">Search</span><input aria-label="Search people and posts" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search people or posts" className="min-w-0 flex-1 bg-transparent outline-none" />{pending && <span className="text-xs text-muted-foreground">Searching</span>}</label><div className="grid grid-cols-2 rounded-xl bg-muted p-1"><button type="button" onClick={() => setTab('people')} className={`rounded-lg py-2 text-sm ${tab === 'people' ? 'bg-background font-medium' : 'text-muted-foreground'}`}>People</button><button type="button" onClick={() => setTab('posts')} className={`rounded-lg py-2 text-sm ${tab === 'posts' ? 'bg-background font-medium' : 'text-muted-foreground'}`}>Posts</button></div>{message && <p role="alert" className="text-sm text-destructive">{message}</p>}<section className="flex flex-col gap-3" aria-live="polite">{!pending && query && !results.length && !message && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">No {tab} found.</div>}{tab === 'people' ? results.map(profile => <article key={profile.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4"><a href={`/app/profile/${profile.username}`} className="flex min-w-0 items-center gap-3"><Avatar name={profile.display_name} path={profile.avatar_path} visible={profile.avatar_visible !== false} size="md" /><span className="min-w-0"><strong className="block truncate">{profile.display_name}</strong><span className="block truncate text-sm text-muted-foreground">@{profile.username}</span>{profile.bio && <span className="block truncate text-xs text-muted-foreground">{profile.bio}</span>}</span></a><button type="button" onClick={() => startTransition(async () => { await toggleFollow(profile.id, false) })} className="min-h-10 rounded-full border border-border px-4 text-sm">Follow</button></article>) : results.map(post => <article key={post.id} className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-3"><Avatar name={post.author?.display_name} path={post.author?.avatar_path} visible={post.author?.avatar_visible !== false} size="sm" /><a href={`/app/profile/${post.author?.username}`} className="text-sm font-medium">{post.author?.display_name}</a></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{post.content}</p><time className="mt-3 block text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</time></article>)}</section></div></main>
}
