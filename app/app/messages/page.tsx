import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MessagesClient } from '@/components/messages-client'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/app/messages')
  const { data: memberships } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', user.id)
  const ids = (memberships ?? []).map((row) => row.conversation_id)
  const { data: conversations } = ids.length ? await supabase.from('conversation_members').select('conversation_id, user_id').in('conversation_id', ids).neq('user_id', user.id) : { data: [] }
  const { data: profiles } = await supabase.from('profiles').select('id, username, display_name').neq('id', user.id).order('display_name')
  const conversationByUser = new Map((conversations ?? []).map((row) => [row.user_id, row.conversation_id]))
  const items = (profiles ?? []).map((profile) => ({ conversationId: conversationByUser.get(profile.id) ?? '', userId: profile.id, username: profile.username, displayName: profile.display_name }))
  return <MessagesClient currentUserId={user.id} conversations={items} />
}
