import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LumaFeed } from '@/components/luma-feed'
import { StatusRail } from '@/components/status-rail'
import { cleanupExpiredStatuses } from '@/lib/social/status-cleanup'

export default async function AppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  await cleanupExpiredStatuses(supabase)
  const [{ data: profile }, { data: posts }, { data: statuses }] = await Promise.all([
    supabase.from('profiles').select('username, display_name').eq('id', user.id).maybeSingle(),
    supabase.from('posts').select('id, content, created_at, author:profiles!posts_author_id_fkey(username, display_name), post_likes(user_id), comments(id, content, created_at, author:profiles!comments_author_id_fkey(username, display_name))').order('created_at', { ascending: false }).limit(20),
    supabase.from('statuses').select('id, image_path, caption, expires_at, author:profiles!statuses_author_id_fkey(id, username, display_name), status_views(viewer_id)').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true }).limit(100),
  ])
  const statusItems = await Promise.all((statuses ?? []).map(async (status) => {
    const author = Array.isArray(status.author) ? status.author[0] : status.author
    const signed = await supabase.storage.from('statuses').createSignedUrl(status.image_path, 3600)
    const views = Array.isArray(status.status_views) ? status.status_views : []
    return { id: status.id, username: author?.username ?? 'unknown', displayName: author?.display_name ?? 'Unknown user', url: signed.data?.signedUrl ?? '', caption: status.caption, viewed: views.some((view) => view.viewer_id === user.id) }
  }))

  const normalizedPosts = (posts ?? []).map((post) => {
    const author = Array.isArray(post.author) ? post.author[0] : post.author
    const likes = Array.isArray(post.post_likes) ? post.post_likes : []
    const comments = Array.isArray(post.comments) ? post.comments : []
    return { id: post.id, content: post.content, created_at: post.created_at, author: author ?? { username: 'unknown', display_name: 'Unknown user' }, likes: likes.length, liked: likes.some((like) => like.user_id === user.id), replies: comments.map((comment) => { const replyAuthor = Array.isArray(comment.author) ? comment.author[0] : comment.author; return { id: comment.id, content: comment.content, created_at: comment.created_at, author: replyAuthor ?? { username: 'unknown', display_name: 'Unknown user' } } }) }
  })

  return <LumaFeed posts={normalizedPosts} email={user.email ?? ''} profile={profile} statusRail={<StatusRail statuses={statusItems.filter((status) => status.url)} currentUserId={user.id} />} />
}
