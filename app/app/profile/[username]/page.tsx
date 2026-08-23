import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FollowButton } from '@/components/follow-button'

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('id, username, display_name, bio, created_at').eq('username', username.toLowerCase()).maybeSingle()
  if (!profile) notFound()
  const [{ data: posts }, { data: follow }] = await Promise.all([
    supabase.from('posts').select('id, content, created_at').eq('author_id', profile.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', profile.id).maybeSingle(),
  ])
  return <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-8"><a href="/app" className="text-sm text-muted-foreground hover:text-foreground">← Back to feed</a><section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-4"><div className="grid size-16 place-items-center rounded-full bg-muted font-serif text-3xl">{profile.display_name.charAt(0)}</div><div><h1 className="font-serif text-3xl">{profile.display_name}</h1><p className="text-sm text-muted-foreground">@{profile.username}</p></div></div>{profile.id !== user.id && <FollowButton userId={profile.id} initialFollowing={Boolean(follow)} />}</div>{profile.bio && <p className="mt-5 leading-7 text-muted-foreground">{profile.bio}</p>}</section><section className="flex flex-col gap-3">{(posts ?? []).map((post) => <article key={post.id} className="rounded-2xl border border-border bg-card p-5"><p className="whitespace-pre-wrap leading-7">{post.content}</p><p className="mt-4 text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p></article>)}</section></main>
}
