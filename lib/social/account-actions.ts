'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)

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
  const values = { user_id: user.id, likes: formData.get('likes') === 'on', follows: formData.get('follows') === 'on', messages: formData.get('messages') === 'on', updated_at: new Date().toISOString() }
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

export async function deleteAccount() {
  return { error: 'Use the confirmation form to delete your account.' }
}
