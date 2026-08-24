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

export async function sendFriendRequest(addresseeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isUuid(addresseeId) || user.id === addresseeId) return { error: 'That action could not be saved.' }
  const { data: blocked } = await supabase.from('user_blocks').select('blocker_id').or(`and(blocker_id.eq.${user.id},blocked_id.eq.${addresseeId}),and(blocker_id.eq.${addresseeId},blocked_id.eq.${user.id})`).limit(1)
  if (blocked?.length) return { error: 'This connection is unavailable.' }
  const { data, error } = await supabase.from('friendships').upsert({ requester_id: user.id, addressee_id: addresseeId, status: 'pending' }, { onConflict: 'requester_id,addressee_id' }).select('id').single()
  if (error || !data) return { error: 'Unable to send friend request.' }
  await supabase.from('notifications').insert({ user_id: addresseeId, actor_id: user.id, type: 'friend_request' })
  revalidatePath('/app', 'layout')
  return { ok: true }
}

export async function respondToFriendRequest(friendshipId: string, status: 'accepted' | 'declined') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isUuid(friendshipId)) return { error: 'That action could not be saved.' }
  const { error } = await supabase.from('friendships').update({ status, updated_at: new Date().toISOString() }).eq('id', friendshipId).eq('addressee_id', user.id)
  if (error) return { error: 'Unable to update friend request.' }
  revalidatePath('/app', 'layout')
  return { ok: true }
}

export async function respondToFriendRequestFromUser(requesterId: string, status: 'accepted' | 'declined') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isUuid(requesterId)) return { error: 'That action could not be saved.' }
  const { error } = await supabase.from('friendships').update({ status, updated_at: new Date().toISOString() }).eq('requester_id', requesterId).eq('addressee_id', user.id).eq('status', 'pending')
  if (error) return { error: 'Unable to update friend request.' }
  revalidatePath('/app', 'layout')
  return { ok: true }
}

export async function removeFriend(friendshipId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isUuid(friendshipId)) return { error: 'That action could not be saved.' }
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId).or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
  if (error) return { error: 'Unable to remove connection.' }
  revalidatePath('/app', 'layout')
  return { ok: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
}
