import { redirect } from 'next/navigation'
import { ArrowLeft, Compass } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getExploreData } from '@/lib/social/account-actions'
import { Avatar } from '@/components/avatar'

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { posts, profiles } = await getExploreData()
  return <main className="min-h-screen bg-background px-4 pb-24 text-foreground md:px-8"><div className="mx-auto flex max-w-3xl flex-col gap-6 py-6"><a href="/app" className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Back to feed</a><header className="flex items-center gap-3"><Compass className="size-6 text-primary" /><div><p className="text-sm text-muted-foreground">Fresh from Luma</p><h1 className="font-serif text-4xl">Explore</h1></div></header><section><h2 className="mb-3 text-lg font-semibold">People to discover</h2><div className="grid gap-3 sm:grid-cols-2">{profiles.map((profile: any) => <a key={profile.id} href={`/app/profile/${profile.username}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"><Avatar name={profile.display_name} path={profile.avatar_path} visible={profile.avatar_visible !== false} size="md" /><span><strong className="block">{profile.display_name}</strong><span className="text-sm text-muted-foreground">@{profile.username}</span></span></a>)}</div></section><section><h2 className="mb-3 text-lg font-semibold">Recent conversations</h2><div className="flex flex-col gap-3">{posts.map((post: any) => <article key={post.id} className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-3"><Avatar name={post.author?.display_name} path={post.author?.avatar_path} visible={post.author?.avatar_visible !== false} size="sm" /><a href={`/app/profile/${post.author?.username}`} className="text-sm font-medium">{post.author?.display_name}</a></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{post.content}</p></article>)}</div></section></div></main>
}
