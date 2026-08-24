'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { allowAction } from '@/lib/social/rate-limit'
import { isUuid, boundedText } from '@/lib/social/validation'

export async function startConversation(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isUuid(otherUserId) || user.id === otherUserId) return { error: 'Unable to start conversation.' }
  const { data: existing } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', user.id)
  const ids = (existing ?? []).map((row) => row.conversation_id)
  if (ids.length) {
    const { data: match } = await supabase.from('conversation_members').select('conversation_id').in('conversation_id', ids).eq('user_id', otherUserId).maybeSingle()
    if (match) return { conversationId: match.conversation_id }
  }
  const { data: conversation, error } = await supabase.from('conversations').insert({}).select('id').single()
  if (error || !conversation) return { error: 'Unable to start conversation.' }
  const { error: memberError } = await supabase.from('conversation_members').insert([{ conversation_id: conversation.id, user_id: user.id }, { conversation_id: conversation.id, user_id: otherUserId }])
  if (memberError) return { error: 'Unable to start conversation.' }
  revalidatePath('/app/messages')
  return { conversationId: conversation.id }
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

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized.' }
  await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', conversationId).neq('sender_id', user.id).is('read_at', null)
  return { ok: true }
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
