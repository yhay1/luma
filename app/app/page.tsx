import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LumaFeed } from '@/components/luma-feed'

export default async function AppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: posts }] = await Promise.all([
    supabase.from('profiles').select('username, display_name').eq('id', user.id).maybeSingle(),
    supabase.from('posts').select('id, content, created_at, author:profiles!posts_author_id_fkey(username, display_name), post_likes(user_id)').order('created_at', { ascending: false }).limit(20),
  ])

  const normalizedPosts = (posts ?? []).map((post) => {
    const author = Array.isArray(post.author) ? post.author[0] : post.author
    const likes = Array.isArray(post.post_likes) ? post.post_likes : []
    return { id: post.id, content: post.content, created_at: post.created_at, author: author ?? { username: 'unknown', display_name: 'Unknown user' }, likes: likes.length, liked: likes.some((like) => like.user_id === user.id) }
  })

  return <LumaFeed posts={normalizedPosts} email={user.email ?? ''} profile={profile} />
}
