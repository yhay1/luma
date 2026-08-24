'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)

export async function updateAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in again.' }
  const file = formData.get('avatar')
  if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return { error: 'Choose a JPG, PNG, or WebP image up to 5 MB.' }
  const path = `${user.id}/avatar-${Date.now()}.${file.type.split('/')[1]}`
  const upload = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: false })
  if (upload.error) return { error: `We could not upload your avatar: ${upload.error.message}` }
  const { error } = await supabase.from('profiles').update({ avatar_path: path, updated_at: new Date().toISOString() }).eq('id', user.id)
  if (error) return { error: 'We could not save your avatar.' }
  revalidatePath('/app', 'layout')
  return { ok: true }
}

export async function updateAvatarVisibility(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in again.' }
  const { error } = await supabase.from('profiles').update({ avatar_visible: formData.get('avatar_visible') === 'on', updated_at: new Date().toISOString() }).eq('id', user.id)
  return error ? { error: 'We could not save avatar visibility.' } : { ok: true }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in again.' }
  const display_name = clean(formData.get('display_name'), 80)
  const username = clean(formData.get('username'), 24).toLowerCase()
  const bio = clean(formData.get('bio'), 240)
  if (!/^[a-z0-9_]{3,24}$/.test(username) || !display_name) return { error: 'Use a valid username and display name.' }
  const { error } = await supabase.from('profiles').update({ display_name, username, bio, updated_at: new Date().toISOString() }).eq('id', user.id)
  if (error) return { error: error.code === '23505' ? 'That username is already taken.' : 'We could not save your profile.' }
  revalidatePath('/app', 'layout')
  return { ok: true }
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '')
  if (password.length < 8) return { error: 'Use at least 8 characters.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in again.' }
  const { error } = await supabase.auth.updateUser({ password })
  return error ? { error: 'We could not update your password.' } : { ok: true }
}

export async function updateNotificationPreferences(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in again.' }
  const values = { user_id: user.id, likes: formData.get('likes') === 'on', follows: formData.get('follows') === 'on', messages: formData.get('messages') === 'on', comments: formData.get('comments') === 'on', friend_requests: formData.get('friend_requests') === 'on', status_views: formData.get('status_views') === 'on', updated_at: new Date().toISOString() }
  const { error } = await supabase.from('notification_preferences').upsert(values)
  return error ? { error: 'We could not save preferences.' } : { ok: true }
}

export async function searchProfiles(query: string, offset = 0) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in again.', profiles: [] }
  const q = query.trim().replace(/[%_]/g, '').slice(0, 40)
  if (!q) return { profiles: [] }
  const { data, error } = await supabase.from('profiles').select('id, username, display_name, bio').or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).neq('id', user.id).order('display_name').range(offset, offset + 19)
  return error ? { error: 'Search is unavailable right now.', profiles: [] } : { profiles: data ?? [] }
}

export async function searchPosts(query: string, offset = 0) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in again.', posts: [] }
  const q = query.trim().replace(/[%_]/g, '').slice(0, 80)
  if (!q) return { posts: [] }
  const { data, error } = await supabase.from('posts').select('id, content, created_at, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_path, avatar_visible)').ilike('content', `%${q}%`).order('created_at', { ascending: false }).range(offset, offset + 19)
  const posts = (data ?? []).map((post) => ({ ...post, author: Array.isArray(post.author) ? post.author[0] : post.author }))
  return error ? { error: 'Search is unavailable right now.', posts: [] } : { posts }
}

export async function getExploreData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in again.', posts: [], profiles: [] }
  const [{ data: posts }, { data: profiles }] = await Promise.all([
    supabase.from('posts').select('id, content, created_at, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_path, avatar_visible), post_likes(count)').order('created_at', { ascending: false }).limit(30),
    supabase.from('profiles').select('id, username, display_name, bio, avatar_path, avatar_visible').neq('id', user.id).order('updated_at', { ascending: false }).limit(8),
  ])
  return { posts: (posts ?? []).map((post) => ({ ...post, author: Array.isArray(post.author) ? post.author[0] : post.author })), profiles: profiles ?? [] }
}

export async function deleteAccount() {
  return { error: 'Use the confirmation form to delete your account.' }
}
