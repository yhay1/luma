'use client'

import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import { Bell, Heart, Home, LogOut, MessageCircle, Search, Send, Sparkles, UserRound, MoreHorizontal } from 'lucide-react'
import { createPost, signOut, togglePostLike } from '@/lib/social/actions'
import { ReplyThread } from '@/components/reply-thread'
import type { Reply } from '@/lib/social/reply-actions'

type Post = {
  id: string
  content: string
  created_at: string
  author: { username: string; display_name: string }
  likes: number
  liked: boolean
  replies: Reply[]
}

type FeedProps = { posts: Post[]; email: string; profile: { username: string; display_name: string } | null; statusRail?: React.ReactNode }

function relativeTime(date: string, now: number) {
  if (!now) return '…'
  const minutes = Math.max(1, Math.round((now - new Date(date).getTime()) / 60000))
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 1440)}d`
}

export function LumaFeed({ posts, email, profile, statusRail }: FeedProps) {
  const [isPending, startTransition] = useTransition()
  const [now, setNow] = useState(0)
  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [])
  const [optimisticPosts, setOptimisticPosts] = useOptimistic(posts, (state, update: { id: string; liked: boolean }) => state.map((post) => post.id === update.id ? { ...post, liked: update.liked, likes: post.likes + (update.liked ? 1 : -1) } : post))
  const formRef = useRef<HTMLFormElement>(null)

  async function publish(formData: FormData) {
    startTransition(async () => {
      const result = await createPost(formData)
      if (result.ok) formRef.current?.reset()
    })
  }

  function like(post: Post) {
    startTransition(async () => {
      setOptimisticPosts({ id: post.id, liked: !post.liked })
      await togglePostLike(post.id, post.liked)
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <a href="/app" className="flex items-center gap-2 font-serif text-2xl tracking-tight"><span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><Sparkles className="size-4" /></span>luma</a>
          <div className="flex items-center gap-3"><span className="hidden text-sm text-muted-foreground md:block">{profile?.display_name || email}</span><button aria-label="Sign out" onClick={() => signOut()} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="size-4" /></button></div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-5 md:grid-cols-[210px_minmax(0,680px)_240px] md:gap-10 md:px-8 md:py-8">
        <nav className="hidden flex-col gap-2 md:flex" aria-label="Primary navigation">
          <a className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-sm font-medium" href="/app"><Home className="size-4" />Home</a>
          <a className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted" href="/app/settings"><Sparkles className="size-4" />Settings</a>
          <a className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted" href="/app/search"><Search className="size-4" />Discover</a>
          <a className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted" href="/app/messages"><MessageCircle className="size-4" />Messages</a>
          <a className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted" href="/app/notifications"><Bell className="size-4" />Notifications</a>
          <a className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted" href={profile ? `/app/profile/${profile.username}` : '#profile'}><UserRound className="size-4" />Profile</a>
        </nav>
        <main className="flex flex-col gap-5">
          {statusRail}
          <div className="border-b border-border/60"><div className="flex items-center justify-between pb-3"><h1 className="text-xl font-semibold tracking-tight">Home</h1><button aria-label="Feed options" className="rounded-full p-2 text-muted-foreground hover:bg-muted"><MoreHorizontal className="size-5" /></button></div><div className="grid grid-cols-2 text-center text-sm font-medium"><button className="border-b-2 border-primary py-3 text-foreground">For you</button><button className="py-3 text-muted-foreground hover:text-foreground">Following</button></div></div>
          <form ref={formRef} action={publish} className="rounded-3xl border border-border bg-card p-4 shadow-[0_18px_55px_-35px_hsl(var(--foreground))] md:p-5"><div className="flex gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-serif text-lg text-primary-foreground">{profile?.display_name?.charAt(0) || '?'}</div><textarea name="content" required maxLength={5000} rows={3} placeholder="What is on your mind?" className="min-h-24 w-full resize-none bg-transparent pt-1 text-base leading-7 outline-none placeholder:text-muted-foreground" /></div><div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3"><span className="text-xs text-muted-foreground">Text only · up to 5,000 characters</span><button disabled={isPending} className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50"><Send className="size-4" />{isPending ? 'Posting…' : 'Post'}</button></div></form>
          <section className="flex flex-col gap-3" aria-label="Your feed">
            {optimisticPosts.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center"><Sparkles className="mx-auto size-6 text-muted-foreground" /><h2 className="mt-3 font-serif text-2xl">The beginning of something good.</h2><p className="mt-2 text-sm text-muted-foreground">Follow a few people or write the first post.</p></div> : optimisticPosts.map((post) => <article key={post.id} className="group border-b border-border/70 bg-background px-1 py-5 transition-colors hover:bg-muted/30 md:px-3"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-muted font-serif text-lg">{post.author.display_name.charAt(0)}</div><div><a href={`/app/profile/${post.author.username}`} className="font-medium hover:underline">{post.author.display_name}</a><p className="text-sm text-muted-foreground">@{post.author.username} · {relativeTime(post.created_at, now)}</p></div></div></div><p className="mt-4 whitespace-pre-wrap text-[15px] leading-7">{post.content}</p><div className="mt-5 flex items-center gap-5 text-sm text-muted-foreground"><button aria-label={post.liked ? 'Unlike post' : 'Like post'} onClick={() => like(post)} className={`flex items-center gap-2 rounded-full px-2 py-1 hover:bg-muted ${post.liked ? 'text-primary' : ''}`}><Heart className={`size-4 ${post.liked ? 'fill-current' : ''}`} />{post.likes}</button><ReplyThread postId={post.id} replies={post.replies} /></div></article>)}
          </section>
        </main>
        <aside className="hidden self-start md:block"><div className="rounded-2xl bg-card p-5"><h2 className="text-lg font-semibold">Who to follow</h2><div className="mt-4 flex flex-col gap-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-full bg-muted font-medium">M</span><div><p className="text-sm font-medium">Maya Chen</p><p className="text-xs text-muted-foreground">@mayachen</p></div></div><button className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Follow</button></div><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-full bg-muted font-medium">J</span><div><p className="text-sm font-medium">Jon Bell</p><p className="text-xs text-muted-foreground">@jonbell</p></div></div><button className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Follow</button></div></div><button className="mt-5 text-sm text-primary hover:underline">Show more</button></div><div className="mt-4 px-2 text-xs leading-5 text-muted-foreground">About · Help · Privacy · Terms<br />© 2026 luma</div></aside>
      </div>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-background/95 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden"><a href="/app" aria-label="Home" className="rounded-full p-3 text-primary"><Home className="size-5" /></a><a href="/app/search" aria-label="Search" className="rounded-full p-3 text-muted-foreground"><Search className="size-5" /></a><a href="/app/messages" aria-label="Messages" className="rounded-full p-3 text-muted-foreground"><MessageCircle className="size-5" /></a><a href="/app/notifications" aria-label="Notifications" className="rounded-full p-3 text-muted-foreground"><Bell className="size-5" /></a><a href="/app/settings" aria-label="Settings" className="rounded-full p-3 text-muted-foreground"><Sparkles className="size-5" /></a></nav>
    </div>
  )
}
