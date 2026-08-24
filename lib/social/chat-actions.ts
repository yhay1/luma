'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { allowAction } from '@/lib/social/rate-limit'
import { isUuid, boundedText } from '@/lib/social/validation'

export async function startConversation(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isUuid(otherUserId) || user.id === otherUserId) return { error: 'Unable to start conversation.' }
  const { data: conversationId, error } = await supabase.rpc('start_direct_conversation', { other_user_id: otherUserId })
  if (error || !conversationId) return { error: 'Unable to start conversation.' }
  revalidatePath('/app/messages')
  return { conversationId }
}

export async function sendMessage(conversationId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const clean = boundedText(content, 2000)
  if (!user || !isUuid(conversationId) || !clean) return { error: 'Message must be between 1 and 2,000 characters.' }
  if (!allowAction(`message:${user.id}`, 60, 60_000)) return { error: 'You are sending messages too quickly. Try again shortly.' }
  const { data: member } = await supabase.from('conversation_members').select('conversation_id').eq('conversation_id', conversationId).eq('user_id', user.id).maybeSingle()
  if (!member) return { error: 'Conversation not found.' }
  const { data: message, error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: user.id, content: clean }).select('id, conversation_id, sender_id, content, created_at').single()
  if (error) return { error: 'Unable to send message.' }
  revalidatePath('/app/messages')
  return { message }
}

export async function editMessage(messageId: string, content: string) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); const clean = boundedText(content, 2000)
  if (!user || !isUuid(messageId) || !clean) return { error: 'Message must be between 1 and 2,000 characters.' }
  const { data, error } = await supabase.from('messages').update({ content: clean, edited_at: new Date().toISOString() }).eq('id', messageId).eq('sender_id', user.id).is('deleted_at', null).select('id, content, edited_at').single()
  return error || !data ? { error: 'Unable to edit message.' } : { message: data }
}

export async function deleteMessage(messageId: string, forEveryone = false) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isUuid(messageId)) return { error: 'Unable to delete message.' }
  const update = forEveryone ? { content: 'This message was deleted', deleted_at: new Date().toISOString(), deleted_for_everyone: true } : { deleted_at: new Date().toISOString() }
  const { error } = await supabase.from('messages').update(update).eq('id', messageId).eq('sender_id', user.id)
  return error ? { error: 'Unable to delete message.' } : { ok: true }
}

export async function toggleReaction(messageId: string, emoji: string) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isUuid(messageId) || !/^.{1,16}$/u.test(emoji)) return { error: 'Unable to update reaction.' }
  const { data: existing } = await supabase.from('message_reactions').select('message_id').eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji).maybeSingle()
  const result = existing ? await supabase.from('message_reactions').delete().match({ message_id: messageId, user_id: user.id, emoji }) : await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji })
  return result.error ? { error: 'Unable to update reaction.' } : { ok: true, active: !existing }
}

export async function createGroup(name: string, memberIds: string[]) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); const clean = boundedText(name, 80)
  const members = [...new Set(memberIds.filter(isUuid).filter((id) => id !== user?.id))].slice(0, 49)
  if (!user || !clean) return { error: 'Add a group name.' }
  const { data: conversation, error } = await supabase.from('conversations').insert({ name: clean, kind: 'group', created_by: user.id }).select('id').single()
  if (error || !conversation) return { error: 'Unable to create group.' }
  const { error: memberError } = await supabase.from('conversation_members').insert([{ conversation_id: conversation.id, user_id: user.id, role: 'owner' }, ...members.map((userId) => ({ conversation_id: conversation.id, user_id: userId, role: 'member' }))])
  if (memberError) { await supabase.from('conversations').delete().eq('id', conversation.id); return { error: 'Unable to add group members.' } }
  revalidatePath('/app/messages'); return { conversationId: conversation.id }
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }
  await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', conversationId).neq('sender_id', user.id).is('read_at', null)
  return { ok: true }
}

export async function getUnreadNotificationCount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { count: 0 }
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null)
  return { count: count ?? 0 }
}

export async function markNotificationRead(id?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }
  const query = supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id)
  if (id) query.eq('id', id)
  else query.is('read_at', null)
  const { error } = await query
  return error ? { error: 'Unable to update notifications.' } : { ok: true }
}
