'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { allowAction } from '@/lib/social/rate-limit'
import { boundedText, isUuid } from '@/lib/social/validation'

export async function createReply(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const postId = String(formData.get('postId') ?? '')
  const content = boundedText(formData.get('content'), 1000)
  if (!user || !isUuid(postId) || !content) return { error: 'Write a reply between 1 and 1,000 characters.' }
  if (!allowAction(`reply:${user.id}`, 40, 60_000)) return { error: 'You are replying too quickly. Try again shortly.' }
  const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).maybeSingle()
  if (!post) return { error: 'That post is no longer available.' }
  const { error } = await supabase.from('comments').insert({ post_id: postId, author_id: user.id, content })
  if (error) return { error: 'We could not publish your reply.' }
  if (post.author_id !== user.id) await supabase.from('notifications').insert({ user_id: post.author_id, actor_id: user.id, type: 'comment', post_id: postId })
  revalidatePath('/app')
  return { ok: true }
}

export async function deleteReply(commentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isUuid(commentId)) return { error: 'That reply could not be deleted.' }
  const { error } = await supabase.from('comments').delete().eq('id', commentId).eq('author_id', user.id)
  if (error) return { error: 'That reply could not be deleted.' }
  revalidatePath('/app')
  return { ok: true }
}

export type Reply = { id: string; content: string; created_at: string; author: { username: string; display_name: string } }
