'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isUuid, boundedText } from '@/lib/social/validation'

const reasons = new Set(['harassment', 'spam', 'hate', 'sexual', 'violence', 'privacy', 'illegal', 'other'])

async function currentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function blockUser(blockedId: string) {
  const { supabase, user } = await currentUser()
  if (!user || !isUuid(blockedId) || blockedId === user.id) return { error: 'That action could not be saved.' }
  const { error } = await supabase.from('user_blocks').upsert({ blocker_id: user.id, blocked_id: blockedId })
  if (error) return { error: 'Unable to block this member.' }
  await supabase.from('follows').delete().or(`and(follower_id.eq.${user.id},following_id.eq.${blockedId}),and(follower_id.eq.${blockedId},following_id.eq.${user.id})`)
  await supabase.from('friendships').delete().or(`and(requester_id.eq.${user.id},addressee_id.eq.${blockedId}),and(requester_id.eq.${blockedId},addressee_id.eq.${user.id})`)
  revalidatePath('/app', 'layout')
  return { ok: true }
}

export async function unblockUser(blockedId: string) {
  const { supabase, user } = await currentUser()
  if (!user || !isUuid(blockedId)) return { error: 'That action could not be saved.' }
  const { error } = await supabase.from('user_blocks').delete().match({ blocker_id: user.id, blocked_id: blockedId })
  return error ? { error: 'Unable to unblock this member.' } : { ok: true }
}

export async function reportTarget(targetType: string, targetId: string, reason: string, details?: string) {
  const { supabase, user } = await currentUser()
  if (!user || !['user', 'post', 'comment', 'message', 'status'].includes(targetType) || !isUuid(targetId) || !reasons.has(reason)) return { error: 'Choose a valid report reason.' }
  const { error } = await supabase.from('reports').insert({ reporter_id: user.id, target_type: targetType, target_id: targetId, reason, details: boundedText(details, 500) || null })
  if (error?.code === '23505') return { error: 'You already reported this item.' }
  return error ? { error: 'Unable to submit report.' } : { ok: true }
}

export async function listModerationReports() {
  const { supabase, user } = await currentUser()
  const admin = Boolean(user?.app_metadata?.is_admin)
  if (!user || !admin) return { error: 'Not authorized.', reports: [] }
  const { data, error } = await supabase.from('reports').select('id, reporter_id, target_type, target_id, reason, details, status, created_at, resolution_notes').in('status', ['open', 'reviewing']).order('created_at', { ascending: false }).limit(100)
  return error ? { error: 'Unable to load moderation queue.', reports: [] } : { reports: data ?? [] }
}

export async function resolveReport(reportId: string, status: 'resolved' | 'dismissed', notes?: string) {
  const { supabase, user } = await currentUser()
  if (!user || !user.app_metadata?.is_admin || !isUuid(reportId)) return { error: 'Not authorized.' }
  const { error } = await supabase.from('reports').update({ status, resolver_id: user.id, resolution_notes: boundedText(notes, 1000) || null, resolved_at: new Date().toISOString() }).eq('id', reportId)
  if (error) return { error: 'Unable to resolve report.' }
  await supabase.from('moderation_events').insert({ report_id: reportId, moderator_id: user.id, action: status, notes: boundedText(notes, 1000) || null })
  revalidatePath('/app/admin/moderation')
  return { ok: true }
}
