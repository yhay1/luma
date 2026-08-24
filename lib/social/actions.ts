'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { allowAction } from '@/lib/social/rate-limit'
import { isUuid, boundedText } from '@/lib/social/validation'

const MAX_POST_LENGTH = 5000

export async function createPost(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in to post.' }

  if (!allowAction(`post:${user.id}`, 20, 60_000)) return { error: 'You are posting too quickly. Try again in a minute.' }
  const content = boundedText(formData.get('content'), MAX_POST_LENGTH)
  if (!content) return { error: 'Write between 1 and 5,000 characters.' }

  const { error } = await supabase.from('posts').insert({ author_id: user.id, content })
  if (error) return { error: 'We could not publish that post.' }
  revalidatePath('/app')
  return { ok: true }
}

export async function togglePostLike(postId: string, liked: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isUuid(postId)) return { error: 'That action could not be saved.' }
  if (!allowAction(`like:${user.id}`, 60, 60_000)) return { error: 'You are moving too quickly. Try again shortly.' }
  const result = liked
    ? await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
    : await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
  if (result.error) return { error: 'That action could not be saved.' }
  revalidatePath('/app')
  return { ok: true }
}

export async function toggleFollow(followingId: string, following: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id === followingId) return { error: 'That action could not be saved.' }
  const result = following
    ? await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', followingId)
    : await supabase.from('follows').insert({ follower_id: user.id, following_id: followingId })
  if (result.error) return { error: 'That action could not be saved.' }
  if (!following) {
    const { data: preferences } = await supabase.from('notification_preferences').select('follows').eq('user_id', followingId).maybeSingle()
    if (preferences?.follows !== false) {
      await supabase.from('notifications').insert({ user_id: followingId, actor_id: user.id, type: 'follow' })
    }
  }
  revalidatePath('/app', 'layout')
  revalidatePath('/app/notifications')
  return { ok: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
}
