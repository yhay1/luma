'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const MAX_POST_LENGTH = 5000

export async function createPost(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in to post.' }

  const content = String(formData.get('content') ?? '').trim()
  if (!content || content.length > MAX_POST_LENGTH) return { error: 'Write between 1 and 5,000 characters.' }

  const { error } = await supabase.from('posts').insert({ author_id: user.id, content })
  if (error) return { error: 'We could not publish that post.' }
  revalidatePath('/app')
  return { ok: true }
}

export async function togglePostLike(postId: string, liked: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in first.' }
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
  revalidatePath('/app', 'layout')
  return { ok: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
}
