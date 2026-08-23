import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MessagesClient } from '@/components/messages-client'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/app/messages')
  const { data: memberships } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', user.id)
  const ids = (memberships ?? []).map((row) => row.conversation_id)
  const { data: conversations } = ids.length ? await supabase.from('conversation_members').select('conversation_id, user_id, profile:profiles!conversation_members_user_id_fkey(id, username, display_name)').in('conversation_id', ids).neq('user_id', user.id) : { data: [] }
  const items = (conversations ?? []).map((row) => { const p = Array.isArray(row.profile) ? row.profile[0] : row.profile; return { conversationId: row.conversation_id, userId: row.user_id, username: p?.username ?? 'unknown', displayName: p?.display_name ?? 'Unknown user' } })
  return <MessagesClient currentUserId={user.id} conversations={items} />
}
