'use client'

import { useOptimistic, useRef, useTransition } from 'react'
import { Heart, Home, LogOut, MessageCircle, Search, Send, Sparkles, UserRound } from 'lucide-react'
import { createPost, signOut, togglePostLike } from '@/lib/social/actions'

type Post = {
  id: string
  content: string
  created_at: string
  author: { username: string; display_name: string }
  likes: number
  liked: boolean
}

type FeedProps = { posts: Post[]; email: string; profile: { username: string; display_name: string } | null }

function relativeTime(date: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60000))
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 1440)}d`
}

export function LumaFeed({ posts, email, profile }: FeedProps) {
  const [isPending, startTransition] = useTransition()
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <a href="/app" className="flex items-center gap-2 font-serif text-2xl tracking-tight"><span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><Sparkles className="size-4" /></span>luma</a>
          <div className="flex items-center gap-3"><span className="hidden text-sm text-muted-foreground md:block">{profile?.display_name || email}</span><button aria-label="Sign out" onClick={() => signOut()} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="size-4" /></button></div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-6 md:grid-cols-[190px_minmax(0,640px)_220px] md:px-8">
        <nav className="hidden flex-col gap-2 md:flex" aria-label="Primary navigation">
          <a className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-sm font-medium" href="/app"><Home className="size-4" />Home</a>
          <a className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted" href="#discover"><Search className="size-4" />Discover</a>
          <a className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted" href={profile ? `/app/profile/${profile.username}` : '#profile'}><UserRound className="size-4" />Profile</a>
        </nav>
        <main className="flex flex-col gap-5">
          <div><p className="text-sm font-medium text-muted-foreground">Tuesday, August 23</p><h1 className="font-serif text-4xl tracking-tight md:text-5xl">Your circle</h1><p className="mt-2 text-muted-foreground">A quiet place for the people you keep close.</p></div>
          <form ref={formRef} action={publish} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><textarea name="content" required maxLength={5000} rows={3} placeholder="Share something with your circle…" className="w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground" /><div className="mt-3 flex items-center justify-between border-t border-border pt-3"><span className="text-xs text-muted-foreground">Text only · up to 5,000 characters</span><button disabled={isPending} className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"><Send className="size-4" />{isPending ? 'Posting…' : 'Post'}</button></div></form>
          <section className="flex flex-col gap-3" aria-label="Your feed">
            {optimisticPosts.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center"><Sparkles className="mx-auto size-6 text-muted-foreground" /><h2 className="mt-3 font-serif text-2xl">The beginning of something good.</h2><p className="mt-2 text-sm text-muted-foreground">Follow a few people or write the first post.</p></div> : optimisticPosts.map((post) => <article key={post.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-muted font-serif text-lg">{post.author.display_name.charAt(0)}</div><div><a href={`/app/profile/${post.author.username}`} className="font-medium hover:underline">{post.author.display_name}</a><p className="text-sm text-muted-foreground">@{post.author.username} · {relativeTime(post.created_at)}</p></div></div></div><p className="mt-4 whitespace-pre-wrap text-[15px] leading-7">{post.content}</p><div className="mt-5 flex items-center gap-5 text-sm text-muted-foreground"><button aria-label={post.liked ? 'Unlike post' : 'Like post'} onClick={() => like(post)} className={`flex items-center gap-2 rounded-full px-2 py-1 hover:bg-muted ${post.liked ? 'text-primary' : ''}`}><Heart className={`size-4 ${post.liked ? 'fill-current' : ''}`} />{post.likes}</button><button className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-muted"><MessageCircle className="size-4" />Reply</button></div></article>)}
          </section>
        </main>
        <aside className="hidden rounded-2xl border border-border bg-card p-5 md:block"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">A small note</p><p className="mt-4 font-serif text-2xl leading-tight">Good things feel better when they are shared.</p><p className="mt-4 text-sm leading-6 text-muted-foreground">luma is designed for thoughtful updates, not endless scrolling.</p></aside>
      </div>
    </div>
  )
}
