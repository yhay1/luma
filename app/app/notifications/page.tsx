import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotificationsClient } from '@/components/notifications-client'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/app/notifications')
  const { data } = await supabase.from('notifications').select('id, type, read_at, created_at, actor:profiles!notifications_actor_id_fkey(username, display_name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
  const notifications = (data ?? []).map((row) => { const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor; return { id: row.id, type: row.type, readAt: row.read_at, createdAt: row.created_at, actor: actor?.display_name ?? 'Someone', username: actor?.username ?? '' } })
  return <NotificationsClient initialNotifications={notifications} />
}
